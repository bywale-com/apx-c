// pages/index.tsx
import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import dynamic from 'next/dynamic';

import ChatInput from '@components/ChatInput';
import SearchPanel from '@components/SearchPanel';
import { getOrCreateSessionId } from '../utils/session';
import { v4 as uuidv4 } from 'uuid';

// Mounts the Observe UI (lists episodes + Ask buttons)
const ObserveModule = dynamic(() => import('../modules/ObserveModule'), { ssr: false });
// In-app watcher that captures real clicks/inputs within Apex
import ObserveCapture from '../components/ObserveCapture';

const SIDEBAR_W = 360; // keep in sync with SearchPanel width when expanded

/**
 * ChatModule — self-contained chat UI + logic.
 * (Unchanged from your version)
 */
function ChatModule({ sid }: { sid: string }) {
  const [messages, setMessages] = useState<{ sender: 'user' | 'agent'; text: string; id: string }[]>([]);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`/api/chat-logs?sessionId=${encodeURIComponent(sid)}`);
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
    pre: ({ node, ...props }: any) => (
      <pre
        style={{
          backgroundColor: '#282c34',
          color: '#f8f8f2',
          padding: '12px',
          borderRadius: '6px',
          overflowX: 'auto',
          fontFamily: "Monaco, Menlo, 'Ubuntu Mono', monospace",
          fontSize: 14,
        }}
        {...props}
      />
    ),
    code: (props: any) => {
      const { inline, children, ...rest } = props;
      if (inline) {
        return (
          <code
            style={{
              backgroundColor: '#3a3f4b',
              color: '#0ea732ff',
              padding: '2px 6px',
              borderRadius: '4px',
              fontFamily: "Monaco, Menlo, 'Ubuntu Mono', monospace",
              fontSize: 14,
            }}
            {...rest}
          >
            {children}
          </code>
        );
      }
      return (
        <code
          style={{
            display: 'block',
            backgroundColor: '#2c313c',
            color: '#f8f8f2',
            padding: '12px',
            borderRadius: '6px',
            overflowX: 'auto',
            fontFamily: "Monaco, Menlo, 'Ubuntu Mono', monospace",
            fontSize: 14,
          }}
          {...rest}
        >
          {children}
        </code>
      );
    },
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
    <main
      style={{
        flexGrow: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '768px',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          padding: '24px 16px',
        }}
      >
        <div
          style={{
            flexGrow: 1,
            overflowY: 'auto',
            backgroundColor: '#000000ff',
            padding: 16,
            borderRadius: 8,
            marginBottom: 12,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          {messages.map(({ sender, text, id }) => (
            <div
              key={id}
              style={{
                maxWidth: '100%',
                alignSelf: sender === 'user' ? 'flex-end' : 'flex-start',
                backgroundColor: sender === 'user' ? '#0a74da' : '#2f2f2f',
                color: sender === 'user' ? '#ffffff' : '#ffffffff',
                padding: 12,
                borderRadius: 12,
                whiteSpace: 'pre-wrap',
                wordWrap: 'break-word',
                fontSize: 15,
                lineHeight: 1.5,
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

/**
 * Home — orchestrates modules (Core | Chat | Observe) with a right sidebar SearchPanel.
 * This version reserves horizontal space for the sidebar and offsets fixed UI accordingly.
 */
export default function Home() {
  const sid = getOrCreateSessionId();
  const [activeModule, setActiveModule] = useState<'core' | 'chat' | 'observe'>('core');

  return (
    <div
      style={{
        height: '100vh',
        width: '100vw',
        backgroundColor: '#000',
        color: '#fff',
        overflow: 'hidden',
      }}
    >
      {/* Main content area — reserve space so nothing sits under the sidebar */}
      <div
        style={{
          height: '100%',
          paddingRight: SIDEBAR_W,
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* In-app watcher */}
        <ObserveCapture />

        {/* Top-right module switcher — offset by the sidebar width */}
        <div
          style={{
            position: 'fixed',
            top: 12,
            right: SIDEBAR_W + 30,
            zIndex: 1500, // above sidebar
            display: 'flex',
            gap: 8,
          }}
        >
          {(['core', 'chat', 'observe'] as const).map((k) => (
            <button
              key={k}
              onClick={() => setActiveModule(k)}
              aria-pressed={activeModule === k}
              style={{
                background: activeModule === k ? '#fff' : '#0a74da',
                color: activeModule === k ? '#000' : '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '8px 12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {k === 'core' ? 'Core' : k === 'chat' ? 'Chat' : 'Observe'}
            </button>
          ))}
        </div>

        {/* Active module */}
        <div style={{ flexGrow: 1, display: 'flex', position: 'relative' }}>
          {activeModule === 'chat' ? (
            <ChatModule sid={sid} />
          ) : activeModule === 'observe' ? (
            <ObserveModule />
          ) : (
            <main
              style={{
                flexGrow: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
                padding: 24,
              }}
            >
              <div style={{ maxWidth: 720, textAlign: 'center', opacity: 0.9 }}>
                <h1 style={{ marginTop: 0, marginBottom: 8 }}>Apex Core</h1>
                <p style={{ margin: 0 }}>
                  This is your non-chat module area. Use the buttons above to open <strong>Chat</strong> or{' '}
                  <strong>Observe</strong>.
                </p>
              </div>
            </main>
          )}
        </div>

        {/* Top-left UI symbol */}
        <div
          style={{
            position: 'fixed',
            top: 12,
            left: 30,
            zIndex: 1200,
            fontSize: 34,
            color: '#0a74da',
            fontWeight: 'bold',
            userSelect: 'none',
            fontFamily: `'Segoe UI Symbol', sans-serif`,
          }}
        >
          ▲
        </div>
      </div>

      {/* Right sidebar (fixed). Lower z-index than modals/switcher */}
      <aside
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: SIDEBAR_W,
          zIndex: 1000,
          borderLeft: '1px solid #222',
          background: '#0b0b0b',
          overflow: 'auto',
        }}
      >
        <SearchPanel sessionId={sid} />
      </aside>
    </div>
  );
}

