// components/ObserveCapture.tsx
import { useEffect } from 'react';

type ObserveAction =
  | { type: 'click'; target: any }
  | { type: 'input'; target: any; value?: string; redacted?: boolean }
  | { type: 'navigate'; url: string };

declare global {
  interface Window {
    apxObserve?: {
      readonly recording: boolean;
      start: (opts?: { label?: string }) => void;
      stop: () => void;
    };
  }
}

function uuid() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0,
      v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function iso() {
  return new Date().toISOString(); // full ISO
}

function hostFrom(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return 'local';
  }
}

function newEpisodeId(url: string) {
  // Unique per start(): host + seconds + short uuid
  return `watch:${hostFrom(url)}:${iso().slice(0, 19)}:${uuid().slice(0, 8)}`;
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
  if (text) return text.slice(0, 120);
  if ((el as HTMLInputElement).placeholder) return (el as HTMLInputElement).placeholder;
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
    // stable per page load
    const sessionId =
      sessionStorage.getItem('apx_observe_session') ||
      (() => {
        const id = uuid();
        sessionStorage.setItem('apx_observe_session', id);
        return id;
      })();

    // mutable per recording
    let episodeId = '';
    let recording = false;

    // NDJSON queue + flusher
    const queue: string[] = [];
    const endpoint = '/api/observe/events';
    let flushTimer: any = null;

    const enqueue = (action: ObserveAction) => {
      if (!recording) return;
      const line = JSON.stringify({
        id: uuid(),
        ts: iso(),
        source: 'browser',
        app: { name: 'web', url: location.href },
        action,
        session_id: sessionId,
        episode_id: episodeId,
      });
      queue.push(line);
    };

    const flush = async () => {
      if (!recording || queue.length === 0) return;
      const body = queue.splice(0).join('\n') + '\n';
      try {
        await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-ndjson' },
          body,
        });
      } catch {
        // best effort
      }
    };

    const startFlusher = () => {
      if (flushTimer) return;
      flushTimer = setInterval(flush, 800);
    };
    const stopFlusher = async () => {
      if (flushTimer) {
        clearInterval(flushTimer);
        flushTimer = null;
      }
      await flush();
    };

    // listeners (installed only while recording)
    const offs: Array<() => void> = [];
    const onInput = (e: Event) => {
      const t = e.target as HTMLInputElement | HTMLTextAreaElement | null;
      if (!t) return;
      const isSecret = (t as HTMLInputElement).type === 'password' || t.hasAttribute('data-observe-redact');
      enqueue({
        type: 'input',
        target: { role: roleOf(t), name: nameOf(t), selector: cssSelector(t) },
        value: isSecret ? undefined : String((t as any).value ?? '').slice(0, 200),
        redacted: isSecret,
      });
    };
    const onClick = (e: MouseEvent) => {
      const el =
        (e.target as Element | null)?.closest('button, a, input, [role="button"], [role="link"]') ||
        (e.target as Element | null);
      if (!el) return;
      enqueue({
        type: 'click',
        target: { role: roleOf(el), name: nameOf(el), selector: cssSelector(el) },
      });
    };

    const attach = () => {
      if (recording) return;

      // unique episode id per start()
      episodeId = newEpisodeId(location.href);

      // mark recording ON before seeding navigate so it gets enqueued
      recording = true;
      window.dispatchEvent(new CustomEvent('apx:recording-changed', { detail: { on: true } }));
      startFlusher();

      // seed current page URL (first line in episode)
      enqueue({ type: 'navigate', url: location.href });

      document.addEventListener('input', onInput, true);
      document.addEventListener('click', onClick, true);
      offs.push(() => document.removeEventListener('input', onInput, true));
      offs.push(() => document.removeEventListener('click', onClick, true));
    };

    const detach = async () => {
      if (!recording) return;
      while (offs.length) offs.pop()!();
      recording = false;
      window.dispatchEvent(new CustomEvent('apx:recording-changed', { detail: { on: false } }));
      await stopFlusher();
    };

    // expose global controls for the Record button
    window.apxObserve = {
      get recording() {
        return recording;
      },
      start: () => attach(),
      stop: () => detach(),
    };

    // cleanup on unmount
    return () => {
      detach();
      delete window.apxObserve;
    };
  }, []);

  return null; // headless
}

