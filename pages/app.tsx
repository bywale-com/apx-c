// pages/app.tsx
import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { v4 as uuidv4 } from 'uuid';

import ChatInput from '../components/ChatInput';
import SearchPanel from '../components/SearchPanel';
import ObserveCapture from '../components/ObserveCapture';
import GlobeBackdrop from '../components/GlobeBackdrop';
import Tile from '../components/Tile';
import { getOrCreateSessionId } from '../utils/session';

const ObserveModule = dynamic(() => import('../modules/ObserveModule'), { ssr: false });

const SIDEBAR_W = 360;

declare global {
  interface Window {
    apxObserve?: { recording: boolean; start: (opts?: { label?: string }) => void; stop: () => void };
  }
}

/* -------------------- Chat module (same API endpoints) -------------------- */
function ChatModule({ sid }: { sid: string }) {
  const [messages, setMessages] = useState<{ sender: 'user' | 'agent'; text: string; id: string }[]>(
    []
  );
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`/api/chat-logs?sessionId=${encodeURIComponent(sid)}`);
        if (!r.ok) throw new Error(`chat-logs ${r.status}`);
        const j = await r.json();
        const loaded = (j.messages || []).map((m: any) => ({
          sender: m.sender,
          text: m.text,
          id: m.id,
        }));
        setMessages(loaded);
      } catch (e) {
        console.error('Failed to load chat logs', e);
      }
    })();
  }, [sid]);

  const markdownComponents = {
    pre: (props: any) => (
      <pre
        style={{
          backgroundColor: '#0F2742',
          color: '#EAF2FF',
          padding: 12,
          borderRadius: 8,
          overflowX: 'auto',
        }}
        {...props}
      />
    ),
    code: ({ inline, children, ...rest }: any) =>
      inline ? (
        <code
          style={{
            background: '#153659',
            color: '#38E1FF',
            padding: '2px 6px',
            borderRadius: 4,
          }}
          {...rest}
        >
          {children}
        </code>
      ) : (
        <code
          style={{
            display: 'block',
            background: '#0F2742',
            color: '#EAF2FF',
            padding: 12,
            borderRadius: 8,
          }}
          {...rest}
        >
          {children}
        </code>
      ),
  } as any;

  const handleSend = async (message: string) => {
    const userMessageId = uuidv4();
    const agentMessageId = uuidv4();
    setMessages((prev) => [...prev, { sender: 'user', text: message, id: userMessageId }]);

    try {
      const res = await fetch('/api/agent-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, sessionId: sid }),
      });
      if (!res.ok) throw new Error(`agent-chat ${res.status}`);
      const data = await res.json();
      const agentReply = data.reply ?? '';
      setMessages((prev) => [...prev, { sender: 'agent', text: agentReply, id: agentMessageId }]);

      await fetch('/api/chat-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sid,
          append: [
            { id: userMessageId, sender: 'user', text: message },
            { id: agentMessageId, sender: 'agent', text: agentReply },
          ],
        }),
      });
    } catch (err) {
      console.error('Error sending message to agent:', err);
    }
  };

  return (
    <main style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', overflow: 'hidden' }}>
      <div style={{ width: '100%', maxWidth: 768, display: 'flex', flexDirection: 'column', height: '100%', padding: '24px 16px' }}>
        <div
          style={{
            flexGrow: 1,
            overflowY: 'auto',
            background: 'var(--panel)',
            backdropFilter: 'blur(10px)',
            padding: 16,
            borderRadius: 12,
            marginBottom: 12,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            border: '1px solid var(--border)',
          }}
        >
          {messages.map(({ sender, text, id }) => (
            <div
              key={id}
              style={{
                maxWidth: '100%',
                alignSelf: sender === 'user' ? 'flex-end' : 'flex-start',
                background:
                  sender === 'user'
                    ? 'linear-gradient(180deg,#5AA9FF,#38E1FF)'
                    : 'rgba(255,255,255,.06)',
                color: sender === 'user' ? '#001126' : '#EAF2FF',
                padding: 12,
                borderRadius: 12,
                whiteSpace: 'pre-wrap',
                wordWrap: 'break-word',
                fontSize: 15,
                lineHeight: 1.5,
                border: sender === 'user' ? 'none' : '1px solid var(--border)',
              }}
            >
              <div className="react-markdown">
                <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} components={markdownComponents}>
                  {text}
                </ReactMarkdown>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <ChatInput onSend={handleSend} />
      </div>
    </main>
  );
}

/* --------------------------- Main App Shell --------------------------- */
export default function Home() {
  // Create session **on client** to avoid SSR/window issues
  const [sid, setSid] = useState<string>('');
  useEffect(() => {
    try {
      const s = getOrCreateSessionId();
      setSid(s);
    } catch (e) {
      console.error('Session ID error', e);
    }
  }, []);

  const [activeModule, setActiveModule] = useState<'core' | 'chat' | 'observe'>('core');
  const [recording, setRecording] = useState(false);

  useEffect(() => {
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent).detail as { on: boolean };
      if (detail && typeof detail.on === 'boolean') setRecording(detail.on);
    };
    window.addEventListener('apx:recording-changed' as any, onChange);
    return () => window.removeEventListener('apx:recording-changed' as any, onChange);
  }, []);

  const toggleRecording = () => {
    if (window.apxObserve?.recording || recording) {
      window.apxObserve?.stop?.();
      setRecording(false);
    } else {
      window.apxObserve?.start?.();
      setRecording(true);
    }
  };

  return (
    <div style={{ height: '100vh', width: '100vw', position: 'relative', overflow: 'hidden' }}>
      <GlobeBackdrop />

      {/* reserve space so content doesn't hide under sidebar */}
      <div style={{ height: '100%', paddingRight: SIDEBAR_W, position: 'relative', display: 'flex', flexDirection: 'column' }}>
        {/* In-app watcher (only records when REC is on) */}
        <ObserveCapture />

        {/* Top-left logo + Logout */}
        <div style={{ position: 'fixed', top: 12, left: 30, zIndex: 1200, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              fontSize: 34,
              color: 'var(--accent-cyan)',
              fontWeight: 'bold',
              userSelect: 'none',
              fontFamily: `'Segoe UI Symbol', system-ui, sans-serif`,
            }}
          >
            ▲
          </div>
          <button
            onClick={async () => {
              try {
                await fetch('/api/logout', { method: 'POST' }).catch(() => fetch('/api/logout'));
              } finally {
                window.location.href = '/';
              }
            }}
            style={{
              background: 'var(--panel)',
              color: 'var(--ink-high)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: '6px 10px',
              cursor: 'pointer',
              backdropFilter: 'blur(10px)',
            }}
          >
            Log out
          </button>
        </div>

        {/* Top-right controls: module tabs + Record toggle */}
        <div
          style={{
            position: 'fixed',
            top: 12,
            right: SIDEBAR_W + 30,
            zIndex: 1500,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          {(['core', 'chat', 'observe'] as const).map((k) => (
            <button
              key={k}
              onClick={() => setActiveModule(k)}
              aria-pressed={activeModule === k}
              style={{
                background: activeModule === k ? '#fff' : 'var(--panel)',
                color: activeModule === k ? '#000' : 'var(--ink-high)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                padding: '8px 12px',
                fontWeight: 700,
                cursor: 'pointer',
                backdropFilter: 'blur(10px)',
              }}
            >
              {k === 'core' ? 'Core' : k === 'chat' ? 'Chat' : 'Observe'}
            </button>
          ))}

          {/* Record toggle */}
          <button
            onClick={toggleRecording}
            aria-pressed={recording}
            title={recording ? 'Stop recording' : 'Start recording'}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 10px',
              borderRadius: 999,
              border: '1px solid ' + (recording ? '#ff4b4b' : 'var(--border)'),
              background: recording ? '#2a0000' : 'var(--panel)',
              color: '#fff',
              cursor: 'pointer',
              boxShadow: recording ? '0 0 12px rgba(255,75,75,.5)' : 'none',
              backdropFilter: 'blur(10px)',
            }}
          >
            <span
              aria-hidden
              style={{
                width: 14,
                height: 14,
                borderRadius: '50%',
                background: recording ? '#ff3b3b' : '#c33',
                display: 'inline-block',
                position: 'relative',
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  inset: 3,
                  borderRadius: '50%',
                  background: recording ? '#6a0000' : '#300',
                }}
              />
            </span>
            <span style={{ fontWeight: 700, fontSize: 12 }}>{recording ? 'REC' : 'Record'}</span>
          </button>
        </div>

        {/* Active module */}
        <div style={{ flexGrow: 1, display: 'flex', position: 'relative', minHeight: 0 }}>
          {activeModule === 'chat' ? (
            sid ? (
              <ChatModule sid={sid} />
            ) : (
              <div style={{ margin: 'auto', opacity: 0.8 }}>Loading session…</div>
            )
          ) : activeModule === 'observe' ? (
            <ObserveModule />
          ) : (
            <main style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
              <section style={{ width: '100%', maxWidth: 1040 }}>
                <div style={{ textAlign: 'center', marginBottom: 18 }}>
                  <h1 style={{ margin: '0 0 8px' }}>Apex</h1>
                  <p style={{ margin: 0, color: 'var(--ink-mid)' }}>
                    Use <b>Record</b> to start a watch session, then open <b>Observe</b> to review episodes and create rules.
                  </p>
                </div>
                <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(4, minmax(0,1fr))' }}>
                  <Tile title="Observe" subtitle="Map work" onClick={() => setActiveModule('observe')} />
                  <Tile title="Chat" subtitle="Ask the Operator" onClick={() => setActiveModule('chat')} />
                  <Tile title="Rules" subtitle="Create flows" href="/rules" />
                  <Tile title="Runs" subtitle="History & logs" href="/runs" />
                  <Tile title="Security" subtitle="Least-privilege" href="/security" />
                  <Tile title="Docs" subtitle="Guides & API" href="/docs" />
                  <Tile title="Settings" subtitle="Org & access" href="/settings" />
                  <Tile title="Support" subtitle="We’ll help" href="/support" />
                </div>
              </section>
            </main>
          )}
        </div>
      </div>

      {/* Right sidebar */}
      <aside
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: SIDEBAR_W,
          zIndex: 1000,
          borderLeft: '1px solid var(--border)',
          background: 'var(--panel)',
          backdropFilter: 'blur(10px)',
          overflow: 'auto',
        }}
      >
        {sid ? <SearchPanel sessionId={sid} /> : <div style={{ padding: 16, color: 'var(--ink-mid)' }}>Loading…</div>}
      </aside>
    </div>
  );
}

