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

function newRunnerEpisodeId() {
  const host = location.hostname || 'local';
  return `runner:${host}:${nowIso().slice(0,19)}:${uuid().slice(0,8)}`;
}

function log(onUpdate?: RunnerOpts['onUpdate'], msg?: string) {
  if (onUpdate && msg) onUpdate(msg);
}

function makeEventLine(getEpisodeId: () => string) {
  return function eventLine(type: string, payload: any) {
    return JSON.stringify({
      id: uuid(),
      ts: nowIso(),
      source: 'runner',
      app: { name: 'web', url: location.href },
      action: { type, ...payload },
      session_id: (() => {
        const existing = sessionStorage.getItem('apx_runner_session');
        if (existing) return existing;
        const id = uuid();
        sessionStorage.setItem('apx_runner_session', id);
        return id;
      })(),
      episode_id: getEpisodeId(),
    });
  };
}

// Treat navigate to the same URL (ignoring hash) as a no-op
function sameUrl(a: string, b: string) {
  try {
    const A = new URL(a, location.href);
    const B = new URL(b, location.href);
    return A.origin + A.pathname + A.search === B.origin + B.pathname + B.search;
  } catch {
    return a === b;
  }
}

function isVisible(el: Element | null) {
  if (!el) return false;
  const r = (el as HTMLElement).getBoundingClientRect?.();
  return !!r && r.width > 0 && r.height > 0;
}

function byRoleAndName(selector: string): HTMLElement | null {
  // role[name="Text"] e.g., button[name="Send"], textbox[name="Type your message"]
  const m = selector.match(/^([a-z]+)\[name="(.+)"\]$/i);
  if (!m) return null;
  const role = m[1].toLowerCase();
  const name = m[2].toLowerCase();

  const candidates = Array.from(document.querySelectorAll('*')) as HTMLElement[];
  for (const el of candidates) {
    if (!isVisible(el)) continue;

    const tag = el.tagName.toLowerCase();
    const aria = (el.getAttribute('role') || '').toLowerCase();
    const text = (
      el.textContent ||
      el.getAttribute('aria-label') ||
      el.getAttribute('placeholder') ||
      ''
    ).trim().toLowerCase();

    const roleMatch =
      aria === role ||
      (role === 'button' && (tag === 'button' || (el as any).type === 'button' || aria === 'button')) ||
      (role === 'link' && tag === 'a') ||
      (role === 'textbox' && (tag === 'input' || tag === 'textarea' || aria === 'textbox' || (el as any).isContentEditable)) ||
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

    // role[name="..."]
    const roleName = byRoleAndName(selector);
    if (roleName) return roleName;

    // Generic 'textbox' fallback (no [name] provided)
    if (selector === 'textbox') {
      const candidates = Array.from(
        document.querySelectorAll('[role="textbox"], [contenteditable="true"], input:not([type="hidden"]), textarea')
      ) as HTMLElement[];
      for (const el of candidates) if (isVisible(el)) return el;
    }

    // raw CSS
    const el = document.querySelector(selector);
    if (el) return el as HTMLElement;

    // generic tag fallbacks
    if (selector === 'button') return document.querySelector('button');
    if (selector === 'input') return document.querySelector('input');
    if (selector === 'textarea') return document.querySelector('textarea');

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

// Use native value setter so React/controlled fields see it
function setNativeValue(el: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const proto = el.tagName.toLowerCase() === 'textarea'
    ? HTMLTextAreaElement.prototype
    : HTMLInputElement.prototype;
  const desc = Object.getOwnPropertyDescriptor(proto, 'value');
  if (desc?.set) desc.set.call(el, value);
  else (el as any).value = value;
}

function fireInput(el: HTMLElement) {
  try {
    el.dispatchEvent(new (window as any).InputEvent('input', { bubbles: true }));
  } catch {
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }
}
function fireChange(el: HTMLElement) {
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

export async function runRule(steps: RunnerStep[], opts: RunnerOpts = {}) {
  const { maxOpenTabs = 20, emitEvents = true, onUpdate } = opts;
  log(onUpdate, `▶︎ Runner: ${steps.length} step(s)`);

  const runnerEpisodeId = newRunnerEpisodeId();
  const eventLine = makeEventLine(() => runnerEpisodeId);

  // local queue for NDJSON
  const queue: string[] = [];
  let flushing = false;
  async function flush() {
    if (flushing || queue.length === 0) return;
    flushing = true;
    try {
      const body = queue.splice(0).join('\n') + '\n';
      await fetch(NDJSON_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-ndjson' },
        body
      });
    } catch {
      // best-effort
    } finally {
      flushing = false;
    }
  }
  function emit(type: string, payload: any) {
    if (!emitEvents) return;
    queue.push(eventLine(type, payload));
    flush();
  }

  emit('runner_start', { steps: steps.length, episode_id: runnerEpisodeId });

  let openedTabs = 0;

  for (let i = 0; i < steps.length; i++) {
    const s = steps[i];
    try {
      if (s.type === 'wait') {
        log(onUpdate, `${i + 1}. wait ${s.ms}ms`);
        emit('runner_step', { i, type: s.type, ms: s.ms });
        await sleep(s.ms);
        continue;
      }

      if (s.type === 'openTab') {
        if (openedTabs >= maxOpenTabs) {
          log(onUpdate, `${i + 1}. openTab skipped — cap ${maxOpenTabs}`);
          emit('runner_step', { i, type: s.type, url: s.url, skipped: 'cap' });
          continue;
        }
        log(onUpdate, `${i + 1}. openTab → ${s.url}`);
        emit('runner_step', { i, type: s.type, url: s.url });
        window.open(s.url, '_blank', 'noopener,noreferrer');
        openedTabs++;
        await sleep(150);
        continue;
      }

      if (s.type === 'navigate') {
        if (sameUrl(s.url, location.href)) {
          log(onUpdate, `${i + 1}. navigate (noop; already here) → ${s.url}`);
          emit('runner_step', { i, type: s.type, url: s.url, noop: true });
          continue;
        }
        log(onUpdate, `${i + 1}. navigate → ${s.url}`);
        emit('runner_step', { i, type: s.type, url: s.url });
        // Full navigation ends the run in this simple model
        setTimeout(() => (window.location.href = s.url), 50);
        emit('runner_done', { ok: true, note: 'navigated' });
        await flush();
        return { ok: true, note: 'navigated' };
      }

      if (s.type === 'click') {
        log(onUpdate, `${i + 1}. click → ${s.selector}`);
        emit('runner_step', { i, type: s.type, selector: s.selector });
        const el = await waitForSelector(s.selector);
        if (!el) throw new Error(`selector not found: ${s.selector}`);
        (el as HTMLElement).click();
        await sleep(200);
        continue;
      }

      if (s.type === 'input') {
        log(onUpdate, `${i + 1}. input → ${s.selector} = ${truncate(s.value, 60)}`);
        emit('runner_step', { i, type: s.type, selector: s.selector });

        const el = await waitForSelector(s.selector);
        if (!el) throw new Error(`selector not found: ${s.selector}`);

        (el as HTMLElement).scrollIntoView?.({ block: 'center', inline: 'nearest' });
        await sleep(50);

        if ((el as any).isContentEditable || el.getAttribute?.('contenteditable') === 'true') {
          const ce = el as HTMLElement;
          ce.focus();
          ce.textContent = s.value ?? '';
          fireInput(ce);
          fireChange(ce);
        } else if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
          const field = el as HTMLInputElement | HTMLTextAreaElement;
          field.focus();
          setNativeValue(field, s.value ?? '');
          fireInput(field);
          fireChange(field);
        } else {
          // last resort
          (el as any).value = s.value ?? '';
          fireInput(el as HTMLElement);
          fireChange(el as HTMLElement);
        }

        await sleep(100);
        continue;
      }

      if (s.type === 'submit') {
        log(onUpdate, `${i + 1}. submit → ${s.selector ?? '(auto)'}`);
        emit('runner_step', { i, type: s.type, selector: s.selector });
        if (s.selector) {
          const el = await waitForSelector(s.selector);
          if (!el) throw new Error(`selector not found: ${s.selector}`);
          (el as HTMLElement).click();
        } else {
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
      emit('runner_error', { i, type: (s as any).type, message: String(e?.message || e) });
      await sleep(50);
      await flush();
      return { ok: false, error: msg };
    }
  }

  emit('runner_done', { ok: true, openedTabs, episode_id: runnerEpisodeId });
  await sleep(200); // grace period to flush trailing events
  return { ok: true, openedTabs };
}

function truncate(s?: string, n = 60) {
  if (!s) return '';
  return s.length > n ? s.slice(0, n) + '…' : s;
}

