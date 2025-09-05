import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import ChatInput from '@components/ChatInput';
import SearchPanel from '@components/SearchPanel';
import { Components } from 'react-markdown';
import { getOrCreateSessionId } from '../utils/session';
import { v4 as uuidv4 } from 'uuid';
import remarkBreaks from 'remark-breaks';

/**
 * ChatModule — self-contained chat UI + logic.
 * Modularized from the previous inline implementation.
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

  const markdownComponents: Components = {
    pre: ({ node, ...props }) => (
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
  };

  const handleSend = async (message: string) => {
    const userMessageId = uuidv4();
    const agentMessageId = uuidv4();

    // Optimistic append of user message
    setMessages((prev) => [...prev, { sender: 'user', text: message, id: userMessageId }]);

    try {
      const res = await fetch('/api/agent-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, sessionId: sid }),
      });

      const data = await res.json();
      const agentReply = data.reply ?? '';

      // Append agent reply
      setMessages((prev) => [...prev, { sender: 'agent', text: agentReply, id: agentMessageId }]);

      // Persist both messages
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
        {/* Messages */}
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

        {/* Input */}
        <ChatInput onSend={handleSend} />
      </div>
    </main>
  );
}

/**
 * Home — orchestrates modules.
 * activeModule drives whether Chat is visible. You can expand this to more modules later.
 */
export default function Home() {
  const sid = getOrCreateSessionId();
  const [activeModule, setActiveModule] = useState<'core' | 'chat'>('core');

  const isChatActive = activeModule === 'chat';

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        width: '100vw',
        backgroundColor: '#000',
        color: '#fff',
        overflow: 'hidden',
      }}
    >
      {/* Left: either Core (placeholder) or Chat */}
      <div style={{ flexGrow: 1, display: 'flex', position: 'relative' }}>
        {/* Toggle button (top-right of main pane) */}
        <button
          onClick={() => setActiveModule((m) => (m === 'chat' ? 'core' : 'chat'))}
          aria-pressed={isChatActive}
          style={{
            position: 'fixed',
            top: 12,
            right: 30,
            zIndex: 1000,
            background: '#0a74da',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            padding: '8px 12px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {isChatActive ? 'Close Chat' : 'Open Chat'}
        </button>

        {/* Render the active module */}
        {isChatActive ? (
          <ChatModule sid={sid} />
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
            {/* Core Module placeholder (replace with your core UI) */}
            <div
              style={{
                maxWidth: 720,
                textAlign: 'center',
                opacity: 0.9,
              }}
            >
              <h1 style={{ marginTop: 0, marginBottom: 8 }}>Apex Core</h1>
              <p style={{ margin: 0 }}>
                This is your non-chat module area. Click <strong>Open Chat</strong> to toggle the chat module.
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
          zIndex: 999,
          fontSize: 34,
          color: '#0a74da',
          fontWeight: 'bold',
          userSelect: 'none',
          fontFamily: `'Segoe UI Symbol', sans-serif`,
        }}
      >
        ▲
      </div>

      {/* Sidebar: Search Panel remains constant */}
      <aside>
        <SearchPanel sessionId={sid} />
      </aside>
    </div>
  );
}

