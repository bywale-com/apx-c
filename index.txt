import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import ChatInput from '@components/ChatInput';
import SearchPanel from '@components/SearchPanel';
import { Components } from 'react-markdown';
import { getOrCreateSessionId } from '../utils/session';
import { v4 as uuidv4 } from 'uuid';  // Import uuidv4 to generate UUIDs
import remarkBreaks from 'remark-breaks';

export default function Home() {
  const [messages, setMessages] = useState<{ sender: 'user' | 'agent'; text: string; id: string }[]>([]);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const sid = getOrCreateSessionId(); // Generate once per component render

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    (async () => {
      const r = await fetch(`/api/chat-logs?sessionId=${encodeURIComponent(sid)}`);
      const j = await r.json();
      const loaded = (j.messages || []).map((m: any) => ({
        sender: m.sender,
        text: m.text,
        id: m.id,
      }));
      setMessages(loaded);
    })();
  }, []);

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
    // Generate UUID for each message
    const userMessageId = uuidv4();
    const agentMessageId = uuidv4();

    // Append user message locally
    setMessages((prev) => [...prev, { sender: 'user', text: message, id: userMessageId }]);

    try {
      // Send user message to agent
      const res = await fetch('/api/agent-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, sessionId: sid }),
      });

      const data = await res.json();
      const agentReply = data.reply ?? '';

      // Append agent message locally
      setMessages((prev) => [...prev, { sender: 'agent', text: agentReply, id: agentMessageId }]);

      // ✅ Save both user and agent messages to /api/chat-logs
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
      {/* Main Chat Column */}
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
          {/* Message Scrollable Area */}
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
                key={id} // Use UUID as key
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
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkBreaks]}
                    components={markdownComponents}
                  >
                    {text}
                  </ReactMarkdown>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Box */}
          <ChatInput onSend={handleSend} />
        </div>
      </main>

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

      {/* Sidebar Search Panel */}
      <aside>
        <SearchPanel sessionId={sid} />
      </aside>
    </div>
  );
}
