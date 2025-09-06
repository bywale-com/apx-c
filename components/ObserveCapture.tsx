// components/ObserveCapture.tsx
import { useEffect } from 'react';

type ObserveAction =
  | { type: 'click'; target: any }
  | { type: 'input'; target: any; value?: string; redacted?: boolean }
  | { type: 'navigate'; url: string };

function uuid() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0,
      v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function iso(ms = 0) {
  return new Date(Date.now() + ms).toISOString();
}

function newEpisodeId(url: string) {
  try {
    const host = new URL(url).hostname || 'local';
    return `${host}:${iso().slice(0, 19)}:${uuid().slice(0, 8)}`;
  } catch {
    return `local:${iso().slice(0, 19)}:${uuid().slice(0, 8)}`;
  }
}

function roleOf(el: Element | null): string {
  if (!el) return 'unknown';
  const html = el as HTMLElement;
  const aria = html.getAttribute?.('role');
  if (aria) return aria;
  // detect contenteditable as textbox
  if ((html as any).isContentEditable || html.getAttribute('contenteditable') === 'true') return 'textbox';
  const tag = el.tagName.toLowerCase();
  if (tag === 'button') return 'button';
  if (tag === 'a') return 'link';
  if (tag === 'input' || tag === 'textarea') return 'textbox';
  if (tag === 'select') return 'combobox';
  return 'unknown';
}

function nameOf(el: Element | null): string | undefined {
  if (!el) return undefined;
  const htmlEl = el as HTMLElement;
  const aria = htmlEl.getAttribute('aria-label');
  if (aria) return aria;
  const placeholder = (el as HTMLInputElement).placeholder;
  if (placeholder) return placeholder;
  const text = htmlEl.textContent?.trim();
  if (text) return text.slice(0, 120);
  return undefined;
}

function cssSelector(el: Element | null): string | undefined {
  if (!el) return undefined;
  const id = (el as HTMLElement).id;
  if (id) return `#${id}`;
  const cls = (el as HTMLElement).className?.toString().trim().replace(/\s+/g, '.');
  const tag = el.tagName.toLowerCase();
  if (cls) return `${tag}.${cls}`;
  return tag;
}

export default function ObserveCapture() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Stable per page-load
    let sessionId = sessionStorage.getItem('apx_observe_session');
    if (!sessionId) {
      sessionId = uuid();
      sessionStorage.setItem('apx_observe_session', sessionId);
    }

    const endpoint = '/api/observe/events';
    let recording = false;
    let episodeId: string | null = null;
    let flushTimer: any = null;

    const queue: string[] = [];

    function toLine(action: ObserveAction) {
      return JSON.stringify({
        id: uuid(),
        ts: iso(),
        source: 'browser',
        app: { name: 'web', url: location.href },
        action,
        session_id: sessionId,
        episode_id: episodeId,
      });
    }

    function enqueue(action: ObserveAction) {
      if (!recording || !episodeId) return;
      queue.push(toLine(action));
    }

    async function flush() {
      if (!queue.length) return;
      const body = queue.splice(0).join('\n') + '\n';
      try {
        await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-ndjson' },
          body,
        });
      } catch {
        // best-effort
      }
    }

    function dispatchRecordingChanged(on: boolean) {
      try {
        const ev = new CustomEvent('apx:recording-changed', { detail: { on } });
        window.dispatchEvent(ev);
      } catch {
        // ignore
      }
    }

    // ==== Event handlers (only enqueue if recording) ====
    const onInput = (e: Event) => {
      if (!recording) return;
      const t = e.target as HTMLElement | null;
      if (!t) return;
      // Redact password fields or marked elements
      const isSecret =
        (t as HTMLInputElement).type === 'password' ||
        t.hasAttribute('data-observe-redact');

      let value: string | undefined = undefined;
      if (!isSecret) {
        // prefer .value, fallback to textContent (for contenteditable)
        const val = (t as any).value ?? (t as any).textContent ?? '';
        value = String(val).slice(0, 200);
      }

      enqueue({
        type: 'input',
        target: {
          role: roleOf(t),
          name: nameOf(t),
          selector: cssSelector(t),
        },
        value,
        redacted: isSecret,
      });
    };

    const onClick = (e: MouseEvent) => {
      if (!recording) return;
      const el =
        (e.target as Element | null)?.closest(
          'button, a, input, textarea, [role="button"], [role="link"], [role="textbox"], [contenteditable="true"]'
        ) || (e.target as Element | null);
      if (!el) return;
      enqueue({
        type: 'click',
        target: {
          role: roleOf(el),
          name: nameOf(el),
          selector: cssSelector(el),
        },
      });
    };

    // Attach listeners (passive while not recording)
    document.addEventListener('input', onInput, true);
    document.addEventListener('click', onClick, true);

    // ==== Expose global control ====
    (window as any).apxObserve = {
      get recording() {
        return recording;
      },
      start: (opts?: { label?: string }) => {
        if (recording) return;
        // New episode for each start() to ensure separate grouping
        episodeId = `client:${newEpisodeId(location.href)}`;
        recording = true;
        dispatchRecordingChanged(true);

        // Seed a navigate event
        enqueue({ type: 'navigate', url: location.href });

        // periodic flush
        flushTimer = setInterval(flush, 1000);
      },
      stop: () => {
        if (!recording) return;
        recording = false;
        dispatchRecordingChanged(false);
        clearInterval(flushTimer);
        flushTimer = null;
        // final flush
        flush();
        // freeze episode id (no further events)
        episodeId = null;
      },
    };

    // cleanup
    return () => {
      try {
        (window as any).apxObserve && ((window as any).apxObserve.recording = false);
      } catch {}
      document.removeEventListener('input', onInput, true);
      document.removeEventListener('click', onClick, true);
      clearInterval(flushTimer);
      flush();
    };
  }, []);

  return null; // no UI
}

