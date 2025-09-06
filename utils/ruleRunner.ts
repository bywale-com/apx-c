// utils/ruleRunner.ts
export type RunnerStep =
  | { type: 'navigate'; url: string }
  | { type: 'openTab'; url: string }
  | { type: 'click'; selector: string; name?: string }
  | { type: 'input'; selector: string; value?: string }
  | { type: 'submit'; selector?: string }
  | { type: 'wait'; ms: number };

type RunnerOpts = {
  maxOpenTabs?: number;              // safety cap for openTab
  emitEvents?: boolean;              // log to /api/observe/events
  onUpdate?: (line: string) => void; // UI callback
};

const NDJSON_ENDPOINT = '/api/observe/events';

const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));
const nowIso = () => new Date().toISOString();
const uuid = () =>
  (crypto as any)?.randomUUID?.() ??
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0, v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });

function hostSlice() { return `${location.hostname}:${nowIso().slice(0, 15)}`; }

function log(onUpdate?: RunnerOpts['onUpdate'], msg?: string) {
  if (onUpdate && msg) onUpdate(msg);
}

function eventLine(type: string, payload: any) {
  return JSON.stringify({
    id: uuid(),
    ts: nowIso(),
    source: 'runner',
    app: { name: 'web', url: location.href },
    action: { type, ...payload },
    session_id: sessionStorage.getItem('apx_runner_session') || sessionStorage.setItem('apx_runner_session', uuid()),
    episode_id: `runner:${hostSlice()}`
  });
}

const queue: string[] = [];
let flushing = false;
async function flush() {
  if (flushing || queue.length === 0) return;
  flushing = true;
  try {
    const body = queue.splice(0).join('\n') + '\n';
    await fetch(NDJSON_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/x-ndjson' }, body });
  } catch { /* best-effort */ }
  finally { flushing = false; }
}

function emit(emitEvents: boolean | undefined, type: string, payload: any) {
  if (!emitEvents) return;
  queue.push(eventLine(type, payload));
  // fire-and-forget flush
  flush();
}

function isVisible(el: Element | null) {
  if (!el) return false;
  const r = (el as HTMLElement).getBoundingClientRect?.();
  return !!r && r.width > 0 && r.height > 0;
}

function byRoleAndName(selector: string): HTMLElement | null {
  // supports patterns like: role[name="Text"]  e.g., button[name="Submit"]
  const m = selector.match(/^([a-z]+)\[name="(.+)"\]$/i);
  if (!m) return null;
  const role = m[1].toLowerCase();
  const name = m[2].toLowerCase();

  // coarse mapping tag candidates for roles
  const candidates = Array.from(document.querySelectorAll('*')) as HTMLElement[];
  for (const el of candidates) {
    if (!isVisible(el)) continue;
    const tag = el.tagName.toLowerCase();
    const aria = el.getAttribute('role') || '';
    const text = (el.textContent || el.getAttribute('aria-label') || el.getAttribute('placeholder') || '').trim().toLowerCase();

    const roleMatch =
      aria.toLowerCase() === role ||
      (role === 'button' && (tag === 'button' || el.getAttribute('type') === 'button' || aria === 'button')) ||
      (role === 'link' && tag === 'a') ||
      (role === 'textbox' && (tag === 'input' || tag === 'textarea')) ||
      (role === 'combobox' && tag === 'select');

    if (!roleMatch) continue;
    if (!text) continue;
    if (!text.includes(name)) continue;

    return el;
  }
  return null;
}

function findTarget(selector: string): HTMLElement | null {
  try {
    // direct id
    if (selector.startsWith('#')) {
      const el = document.getElementById(selector.slice(1));
      if (el) return el as HTMLElement;
    }
    // role[name="..."] pattern
    const roleName = byRoleAndName(selector);
    if (roleName) return roleName;

    // raw CSS selector
    const el = document.querySelector(selector);
    if (el) return el as HTMLElement;

    // generic tag fallback
    if (selector === 'button') return document.querySelector('button');
    if (selector === 'input') return document.querySelector('input');

    return null;
  } catch {
    return null;
  }
}

async function waitForSelector(selector: string, timeoutMs = 8000): Promise<HTMLElement | null> {
  const start = Date.now();
  let el = findTarget(selector);
  while (!el && Date.now() - start < timeoutMs) {
    await sleep(100);
    el = findTarget(selector);
  }
  return el;
}

/**
 * Runs the given steps in the current page context.
 * NOTE on navigation: A full-page navigation will tear down the JS context,
 * so put 'navigate' either as the first step (to open a new tab via openTab) or
 * expect the runner to stop after navigate.
 */
export async function runRule(steps: RunnerStep[], opts: RunnerOpts = {}) {
  const { maxOpenTabs = 20, emitEvents = true, onUpdate } = opts;
  log(onUpdate, `▶︎ Runner: ${steps.length} step(s)`);
  emit(emitEvents, 'runner_start', { steps: steps.length });

  let openedTabs = 0;

  for (let i = 0; i < steps.length; i++) {
    const s = steps[i];
    try {
      if (s.type === 'wait') {
        log(onUpdate, `${i + 1}. wait ${s.ms}ms`);
        emit(emitEvents, 'runner_step', { i, type: s.type, ms: s.ms });
        await sleep(s.ms);
        continue;
      }

      if (s.type === 'openTab') {
        if (openedTabs >= maxOpenTabs) {
          log(onUpdate, `${i + 1}. openTab skipped — cap ${maxOpenTabs}`);
          emit(emitEvents, 'runner_step', { i, type: s.type, url: s.url, skipped: 'cap' });
          continue;
        }
        log(onUpdate, `${i + 1}. openTab → ${s.url}`);
        emit(emitEvents, 'runner_step', { i, type: s.type, url: s.url });
        window.open(s.url, '_blank', 'noopener,noreferrer');
        openedTabs++;
        await sleep(150);
        continue;
      }

      if (s.type === 'navigate') {
        log(onUpdate, `${i + 1}. navigate → ${s.url}`);
        emit(emitEvents, 'runner_step', { i, type: s.type, url: s.url });
        // ⚠️ This will unload the page, so we emit 'runner_done' and bail.
        // Use 'openTab' if you need to keep this page alive.
        setTimeout(() => (window.location.href = s.url), 50);
        emit(emitEvents, 'runner_done', { ok: true, note: 'navigated' });
        return { ok: true, note: 'navigated' };
      }

      if (s.type === 'click') {
        log(onUpdate, `${i + 1}. click → ${s.selector}`);
        emit(emitEvents, 'runner_step', { i, type: s.type, selector: s.selector });
        const el = await waitForSelector(s.selector);
        if (!el) throw new Error(`selector not found: ${s.selector}`);
        (el as HTMLElement).click();
        await sleep(200);
        continue;
      }

      if (s.type === 'input') {
        log(onUpdate, `${i + 1}. input → ${s.selector} = ${truncate(s.value, 60)}`);
        emit(emitEvents, 'runner_step', { i, type: s.type, selector: s.selector });
        const el = await waitForSelector(s.selector);
        if (!el) throw new Error(`selector not found: ${s.selector}`);
        const field = el as HTMLInputElement | HTMLTextAreaElement;
        field.focus();
        field.value = s.value ?? '';
        field.dispatchEvent(new Event('input', { bubbles: true }));
        await sleep(100);
        continue;
      }

      if (s.type === 'submit') {
        log(onUpdate, `${i + 1}. submit → ${s.selector ?? '(auto)'}`);
        emit(emitEvents, 'runner_step', { i, type: s.type, selector: s.selector });
        let el: HTMLElement | null = null;
        if (s.selector) {
          el = await waitForSelector(s.selector);
          if (!el) throw new Error(`selector not found: ${s.selector}`);
          (el as HTMLElement).click();
        } else {
          // auto: find nearest form from active element
          const active = document.activeElement as HTMLElement | null;
          const form = active?.closest('form') || document.querySelector('form');
          if (form) (form as HTMLFormElement).requestSubmit?.();
          else throw new Error('no form to submit');
        }
        await sleep(250);
        continue;
      }

      log(onUpdate, `${i + 1}. (unknown) ${JSON.stringify(s)}`);
    } catch (e: any) {
      const msg = `✖ step ${i + 1} failed: ${e?.message || e}`;
      log(onUpdate, msg);
      emit(emitEvents, 'runner_error', { i, type: (s as any).type, message: String(e?.message || e) });
      return { ok: false, error: msg };
    }
  }

  emit(emitEvents, 'runner_done', { ok: true, openedTabs });
  log(onUpdate, `✔ done (openedTabs=${openedTabs})`);
  return { ok: true, openedTabs };
}

function truncate(s?: string, n = 60) {
  if (!s) return '';
  return s.length > n ? s.slice(0, n) + '…' : s;
}
