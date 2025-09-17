import React, { useEffect, useMemo, useRef, useState } from 'react';

type BrowserEvent = {
  type: string;
  timestamp: number;
  element?: { selector?: string; tag?: string; text?: string };
  url?: string;
};

interface EventReplayModalProps {
  open: boolean;
  onClose: () => void;
  videoUrl: string;
  events: BrowserEvent[];
  recordingStartTimestamp?: number | null;
  inline?: boolean; // New prop for inline mode
  sessionId?: string;
}

export default function EventReplayModal({ open, onClose, videoUrl, events, recordingStartTimestamp, inline = false, sessionId }: EventReplayModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentTime, setCurrentTime] = useState(0); // seconds
  const [duration, setDuration] = useState(0); // seconds
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [chat, setChat] = useState<Array<{ role: 'system'|'user'|'assistant'; content: string }>>([]);
  const [chatInput, setChatInput] = useState<string>('');
  const eventsListRef = useRef<HTMLDivElement>(null);
  const [rowHeight, setRowHeight] = useState<number>(56);

  useEffect(() => {
    if (!open) {
      setCurrentTime(0);
    }
  }, [open]);

  const sorted = useMemo(() => [...events].sort((a, b) => a.timestamp - b.timestamp), [events]);
  const startTs = useMemo(() => recordingStartTimestamp ?? (sorted[0]?.timestamp ?? 0), [recordingStartTimestamp, sorted]);
  const relative = useMemo(() => sorted.map(ev => ({ ...ev, t: Math.max(0, (ev.timestamp - startTs) / 1000) })), [sorted, startTs]);
  const visible = useMemo(() => relative.filter(ev => ev.t <= currentTime + 0.0001), [relative, currentTime]);

  // Template question generation (lightweight, rule-based)
  const questions = useMemo(() => {
    const q: Array<{ id: string; question: string; contextTs?: number }> = [];
    const urls = new Set(relative.map(e => e.url).filter(Boolean) as string[]);
    const hasIndeed = Array.from(urls).some(u => /indeed\./i.test(u));
    const hasEmail = Array.from(urls).some(u => /^mailto:|\bemail\b/i.test(u));
    const anyTextarea = relative.some(e => /textarea/i.test(String(e.element?.tag || '')));
    const anySubmit = relative.some(e => e.type === 'submit');

    if (hasIndeed) {
      q.push({ id: 'q_platform_choice', question: 'Why use Indeed instead of direct email outreach for this application?' });
    }
    if (hasEmail && hasIndeed) {
      q.push({ id: 'q_channel_tradeoff', question: 'When do you prefer platform messaging vs direct email, and why?' });
    }
    if (anyTextarea) {
      q.push({ id: 'q_cover_letter', question: 'What guides your decision to customize the cover letter here?' });
    }
    if (anySubmit) {
      const lastSubmit = relative.findLast?.((e) => e.type === 'submit') || relative.reverse().find(e => e.type === 'submit');
      q.push({ id: 'q_success_criteria', question: 'What is your success signal for this application (e.g., platform confirmation, email reply)?', contextTs: lastSubmit?.t });
    }
    // Fallback minimal question
    if (q.length === 0) {
      q.push({ id: 'q_overall_intent', question: 'What is the primary objective of this session and what constraints matter most?' });
    }
    return q;
  }, [relative]);

  async function saveAnswer(qaId: string) {
    if (!sessionId) return;
    const answer = answers[qaId];
    if (!answer || !answer.trim()) return;
    setSaving(s => ({ ...s, [qaId]: true }));
    try {
      await fetch('/api/extension-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'save_intent_answer', sessionId, qaId, answer, answeredAt: Date.now() })
      });
    } catch {}
    setSaving(s => ({ ...s, [qaId]: false }));
  }

  async function sendChat() {
    if (!chatInput.trim()) return;
    const next = [...chat, { role: 'user', content: chatInput }];
    setChat(next);
    setChatInput('');
    try {
      const recentUrls = Array.from(new Set(relative.slice(-10).map(e => e.url).filter(Boolean))) as string[];
      const resp = await fetch('/api/intent-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, messages: next, context: { recentUrls } })
      });
      const data = await resp.json();
      const reply = data?.reply || 'Okay.';
      setChat(c => [...c, { role: 'assistant', content: reply }]);
    } catch (e) {
      setChat(c => [...c, { role: 'assistant', content: 'Sorry—there was a problem reaching the assistant.' }]);
    }
  }

  // Measure row height (approx) once list renders
  useEffect(() => {
    const el = eventsListRef.current;
    if (!el) return;
    const firstItem = el.querySelector('[data-ev-item="1"]') as HTMLElement;
    if (firstItem && firstItem.offsetHeight) {
      setRowHeight(firstItem.offsetHeight + 8 /*gap*/);
    }
  }, [visible.length]);

  const onEventsScroll = () => {};

  const handleLoaded = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration || 0);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    const t = parseFloat(e.target.value);
    setCurrentTime(t);
    if (videoRef.current) {
      videoRef.current.currentTime = t;
    }
  };

  const seekToEvent = (tSeconds: number) => {
    const seek = Math.max(0, tSeconds - 2);
    if (videoRef.current) {
      videoRef.current.currentTime = seek;
    }
    setCurrentTime(seek);
  };

  if (!open) return null;

  // Inline mode - render without modal wrapper
  if (inline) {
    return (
      <div style={{ width: '100%', height: '100%', background: '#111', color: '#fff', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontWeight: 600 }}>Event Replay</div>
        </div>

        <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
          <div style={{ flex: 1, padding: 16, display: 'flex', flexDirection: 'column' }}>
            <video
              ref={videoRef}
              src={videoUrl}
              controls
              onLoadedMetadata={handleLoaded}
              onTimeUpdate={handleTimeUpdate}
              style={{ width: '100%', height: 'auto', background: '#000', borderRadius: 6 }}
            />
            <div style={{ marginTop: 14 }}>
              <input
                type="range"
                min={0}
                max={Math.max(0, duration)}
                step={0.1}
                value={Math.min(currentTime, duration)}
                onChange={handleSlider}
                style={{ width: '100%' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 4 }}>
                <span>{currentTime.toFixed(1)}s</span>
                <span>{duration.toFixed(1)}s</span>
              </div>
            </div>
          </div>
          <div style={{ width: 420, borderLeft: '1px solid rgba(255,255,255,0.12)', padding: 14, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Chat Panel */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>Assistant</div>
              <div style={{ border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, padding: 8, background: 'rgba(255,255,255,0.03)', maxHeight: 240, overflowY: 'auto' }}>
                {chat.length === 0 ? (
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>
                    Ask about intent or let the assistant prompt you as events appear.
                  </div>
                ) : (
                  chat.map((m, i) => (
                    <div key={i} style={{ marginBottom: 6, display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                      <div style={{
                        maxWidth: '85%',
                        padding: '6px 8px',
                        borderRadius: 6,
                        border: '1px solid rgba(255,255,255,0.12)',
                        background: m.role === 'user' ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.05)',
                        fontSize: 12,
                        color: 'rgba(255,255,255,0.9)'
                      }}>
                        {m.content}
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Type a message..."
                  style={{ flex: 1, padding: 8, borderRadius: 4, border: '1px solid rgba(255,255,255,0.18)', background: '#0f0f0f', color: '#fff', fontSize: 12 }}
                />
                <button onClick={sendChat} style={{ padding: '6px 10px', borderRadius: 4, border: '1px solid rgba(255,255,255,0.22)', background: 'rgba(255,255,255,0.12)', color: '#fff', fontSize: 12, cursor: 'pointer' }}>Send</button>
              </div>
            </div>

            {/* Events Panel */}
            <div ref={eventsListRef} onScroll={onEventsScroll} style={{ height: `${Math.max(4 * rowHeight, 220)}px`, overflowY: 'auto', position: 'relative' }}>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 6 }}>Events up to {currentTime.toFixed(1)}s</div>
              {visible.length === 0 ? (
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>No events yet at this time.</div>
              ) : (
                (() => {
                  const ordered = [...visible].sort((a,b)=> b.t - a.t);
                  return (
                    <>
                      {ordered.map((ev, idx) => (
                        <div
                          key={`${ev.t}-${idx}`}
                          style={{
                            padding: '8px 10px',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: 6,
                            marginBottom: 8,
                            background: 'rgba(255,255,255,0.03)',
                            cursor: 'pointer',
                            opacity: 1
                          }}
                          onClick={() => seekToEvent(ev.t)}
                        >
                          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>{ev.t.toFixed(1)}s • {ev.type}</div>
                          {ev.element?.selector && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{ev.element.selector}</div>}
                          {ev.url && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>{ev.url}</div>}
                        </div>
                      ))}
                      {/* Top gradient fade */}
                      <div style={{ position: 'sticky', top: 0, height: 16, background: 'linear-gradient(180deg, rgba(17,17,17,0.9) 0%, rgba(17,17,17,0) 100%)' }} />
                      {/* Bottom gradient fade */}
                      <div style={{ position: 'sticky', bottom: 0, height: 16, background: 'linear-gradient(0deg, rgba(17,17,17,0.9) 0%, rgba(17,17,17,0) 100%)' }} />
                    </>
                  );
                })()
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Modal mode - render with modal wrapper
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '1100px', maxWidth: '98vw', height: '750px', maxHeight: '95vh', background: '#111', color: '#fff', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 10, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontWeight: 600 }}>Event Replay</div>
          <button onClick={onClose} style={{ background: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.25)', padding: '6px 10px', borderRadius: 6, cursor: 'pointer' }}>Close</button>
        </div>

        <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
          <div style={{ flex: 1, padding: 16, display: 'flex', flexDirection: 'column' }}>
            <video
              ref={videoRef}
              src={videoUrl}
              controls
              onLoadedMetadata={handleLoaded}
              onTimeUpdate={handleTimeUpdate}
              style={{ width: '100%', height: 'auto', background: '#000', borderRadius: 6 }}
            />
            <div style={{ marginTop: 14 }}>
              <input
                type="range"
                min={0}
                max={Math.max(0, duration)}
                step={0.1}
                value={Math.min(currentTime, duration)}
                onChange={handleSlider}
                style={{ width: '100%' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 4 }}>
                <span>{currentTime.toFixed(1)}s</span>
                <span>{duration.toFixed(1)}s</span>
              </div>
            </div>
          </div>
          <div style={{ width: 380, borderLeft: '1px solid rgba(255,255,255,0.12)', padding: 14, overflowY: 'auto' }}>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 8 }}>Events up to {currentTime.toFixed(1)}s</div>
            {visible.length === 0 ? (
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>No events yet at this time.</div>
            ) : (
              visible.map((ev, idx) => (
                <div key={idx} style={{ padding: '8px 10px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, marginBottom: 8, background: 'rgba(255,255,255,0.03)', cursor: 'pointer' }} onClick={() => seekToEvent(ev.t)}>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>{ev.t.toFixed(1)}s • {ev.type}</div>
                  {ev.element?.selector && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{ev.element.selector}</div>}
                  {ev.url && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>{ev.url}</div>}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


