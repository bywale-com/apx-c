// components/ObserveCapture.tsx
import { useEffect } from 'react';

type ObserveAction =
  | { type:'click'; target: any }
  | { type:'input'; target: any; value?: string; redacted?: boolean }
  | { type:'navigate'; url: string };

function uuid() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random()*16)|0, v = c === 'x' ? r : (r&0x3)|0x8;
    return v.toString(16);
  });
}

function iso(ms = 0) { return new Date(Date.now()+ms).toISOString(); }
function hostEpSlice(url: string) {
  try { return `${new URL(url).hostname}:${iso().slice(0,15)}`; } catch { return `local:${iso().slice(0,15)}`; }
}

function roleOf(el: Element | null): string {
  if (!el) return 'unknown';
  const aria = (el as HTMLElement).getAttribute?.('role');
  if (aria) return aria;
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
  const text = htmlEl.textContent?.trim();
  if (text) return text.slice(0,120);
  if ((el as HTMLInputElement).placeholder) return (el as HTMLInputElement).placeholder;
  return undefined;
}

function cssSelector(el: Element | null): string | undefined {
  if (!el) return undefined;
  const id = (el as HTMLElement).id;
  if (id) return `#${id}`;
  const cls = (el as HTMLElement).className?.toString().trim().replace(/\s+/g,'.');
  const tag = el.tagName.toLowerCase();
  if (cls) return `${tag}.${cls}`;
  return tag;
}

export default function ObserveCapture() {
  useEffect(() => {
    // One session per page load
    const sessionId = uuid();
    const pageUrl = location.href;
    const episodeId = hostEpSlice(pageUrl);

    // NDJSON queue + flusher
    const queue: string[] = [];
    const endpoint = '/api/observe/events'; // same-origin

    function enqueue(action: ObserveAction) {
      const line = JSON.stringify({
        id: uuid(),
        ts: iso(),
        source: 'browser',
        app: { name: 'web', url: pageUrl },
        action,
        session_id: sessionId,
        episode_id: episodeId,
      });
      queue.push(line);
    }

    let timer: any = null;
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
        // swallow; best-effort
      }
    }
    timer = setInterval(flush, 1000);

    // Seed a navigate event when mounted
    enqueue({ type: 'navigate', url: pageUrl });

    // Document-level input handler (captures real typing)
    const onInput = (e: Event) => {
      const t = e.target as HTMLInputElement | HTMLTextAreaElement | null;
      if (!t) return;
      // Redact passwords or elements explicitly marked to redact
      const isSecret = (t as HTMLInputElement).type === 'password' || t.hasAttribute('data-observe-redact');
      enqueue({
        type: 'input',
        target: {
          role: roleOf(t),
          name: nameOf(t),
          selector: cssSelector(t),
        },
        value: isSecret ? undefined : String((t as any).value ?? '').slice(0, 200),
        redacted: isSecret,
      });
    };

    // Click handler (real clicks)
    const onClick = (e: MouseEvent) => {
      // Prefer the nearest actionable element
      const el = (e.target as Element | null)?.closest('button, a, input, [role="button"], [role="link"]') || (e.target as Element | null);
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

    document.addEventListener('input', onInput, true);
    document.addEventListener('click', onClick, true);

    // Cleanup
    return () => {
      document.removeEventListener('input', onInput, true);
      document.removeEventListener('click', onClick, true);
      clearInterval(timer);
      flush();
    };
  }, []);

  return null; // no UI
}
