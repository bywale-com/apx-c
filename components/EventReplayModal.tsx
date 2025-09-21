import React, { useEffect, useMemo, useRef, useState } from 'react';
import WorkflowBuilder, { WorkflowStep } from './WorkflowBuilder';

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
  onPruneWorkflow?: () => void;
  onOpenWorkflow?: () => void;
  pruning?: boolean;
}

export default function EventReplayModal({ open, onClose, videoUrl, events, recordingStartTimestamp, inline = false, sessionId, onPruneWorkflow, onOpenWorkflow, pruning }: EventReplayModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentTime, setCurrentTime] = useState(0); // seconds
  const [duration, setDuration] = useState(0); // seconds
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [chat, setChat] = useState<Array<{ role: 'system'|'user'|'assistant'; content: string }>>([]);
  const [chatInput, setChatInput] = useState<string>('');
  const [steps, setSteps] = useState<WorkflowStep[]>([]);
  const [assistantOpen, setAssistantOpen] = useState<boolean>(false);
  const [assistantWidth, setAssistantWidth] = useState<number>(420);
  const [mode, setMode] = useState<'focus'|'builder'>('builder');
  const [split, setSplit] = useState<number>(0.7); // proportion for replay pane in builder mode
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);
  const draggingRef = useRef<boolean>(false);
  const assistantDraggingRef = useRef<boolean>(false);
  const primedRef = useRef<boolean>(false);

  useEffect(() => {
    if (!open) {
      setCurrentTime(0);
    }
  }, [open]);

  // Reset priming and chat when session changes
  useEffect(() => {
    primedRef.current = false;
    setChat([]);
  }, [sessionId]);

  // Persist layout preferences (mode, split, assistant)
  useEffect(() => {
    try {
      const savedMode = localStorage.getItem('apx.canvas.mode');
      const savedSplit = localStorage.getItem('apx.canvas.split');
      const savedAssistant = localStorage.getItem('apx.canvas.assistant');
      const savedAssistantWidth = localStorage.getItem('apx.canvas.assistantWidth');
      if (savedMode === 'focus' || savedMode === 'builder') {
        setMode(savedMode as 'focus'|'builder');
      }
      if (savedSplit) {
        const v = parseFloat(savedSplit);
        if (!Number.isNaN(v) && v >= 0.1 && v <= 0.9) setSplit(v);
      }
      if (savedAssistant === '1' || savedAssistant === '0') {
        setAssistantOpen(savedAssistant === '1');
      }
      if (savedAssistantWidth) {
        const w = parseInt(savedAssistantWidth, 10);
        if (!Number.isNaN(w) && w >= 280 && w <= 720) setAssistantWidth(w);
      }
    } catch {}
  }, []);

  useEffect(() => {
    try { localStorage.setItem('apx.canvas.mode', mode); } catch {}
  }, [mode]);

  useEffect(() => {
    try { localStorage.setItem('apx.canvas.split', String(split)); } catch {}
  }, [split]);

  useEffect(() => {
    try { localStorage.setItem('apx.canvas.assistant', assistantOpen ? '1' : '0'); } catch {}
  }, [assistantOpen]);

  useEffect(() => {
    try { localStorage.setItem('apx.canvas.assistantWidth', String(assistantWidth)); } catch {}
  }, [assistantWidth]);

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

  // Infer initial workflow steps from events
  const inferredSteps = useMemo<WorkflowStep[]>(() => {
    if (relative.length === 0) return [];
    const steps: WorkflowStep[] = [];
    let currentStart = relative[0].t;
    let lastUrl: string | undefined = relative[0].url;
    let labelParts: string[] = [];
    let lastEventT = currentStart;

    function flush(labelFallback?: string) {
      const start = currentStart;
      const end = lastEventT;
      const label = (labelParts.join(' · ') || labelFallback || 'Step').slice(0, 80);
      if (steps.length === 0 || end - start >= 0) {
        steps.push({ id: `inf_${steps.length}_${Math.round(start*1000)}`, label, start, end });
      }
      labelParts = [];
    }

    const isActionableClick = (ev: BrowserEvent) => {
      const sel = ev.element?.selector || '';
      const tag = (ev.element?.tag || '').toLowerCase();
      const text = (ev.element?.text || '').toLowerCase();
      return ev.type === 'click' && (/button|submit|link/i.test(sel) || ['button','a','input'].includes(tag) || /submit|save|next|continue|apply|login|sign in|search/.test(text));
    };

    for (let i = 0; i < relative.length; i++) {
      const ev = relative[i];
      const prev = i > 0 ? relative[i-1] : undefined;
      const gap = prev ? ev.t - prev.t : 0;
      lastEventT = ev.t;

      // Large idle gap starts a new step
      if (gap > 6) {
        flush();
        currentStart = ev.t;
      }

      // URL change indicates navigation step
      if (ev.url && ev.url !== lastUrl) {
        if (labelParts.length) flush();
        const url = new URL(ev.url, 'http://x').href; // base to parse relative
        const host = url.replace(/^https?:\/\//,'').split('/')[0];
        const path = url.split(host)[1] || '/';
        steps.push({ id: `nav_${steps.length}_${Math.round(ev.t*1000)}`, label: `Navigate: ${host}${path}`, start: ev.t, end: ev.t });
        currentStart = ev.t;
        lastUrl = ev.url;
        continue;
      }

      // Aggregate inputs into a form-fill label
      if (ev.type === 'input') {
        if (!labelParts.some(p => p.startsWith('Fill'))) labelParts.push('Fill fields');
        continue;
      }

      // Key events near inputs considered part of fill
      if (ev.type === 'key') {
        if (!labelParts.some(p => p.startsWith('Fill'))) labelParts.push('Fill fields');
        continue;
      }

      // Clicks form discrete actions
      if (isActionableClick(ev)) {
        const text = (ev.element?.text || '').trim();
        const tag = (ev.element?.tag || '').toLowerCase();
        const what = text ? text.slice(0,40) : (tag || 'click');
        labelParts.push(`Click: ${what}`);
        // If this looks like a submit/confirm click, flush a step
        if (/submit|save|next|continue|apply|login|sign in|search/i.test(text)) {
          flush('Submit');
          currentStart = ev.t;
        }
        continue;
      }
    }

    // Final flush
    if (labelParts.length) flush();

    // Merge very short adjacent steps (<0.8s)
    const merged: WorkflowStep[] = [];
    for (const s of steps) {
      const last = merged[merged.length - 1];
      const sStart = s.start ?? 0;
      const sEnd = (s.end ?? s.start ?? sStart);
      const lastStart = last ? (last.start ?? 0) : 0;
      const lastEnd = last ? (last.end ?? last.start ?? lastStart) : 0;
      if (last && (sStart - lastEnd) < 0.8) {
        last.end = Math.max(lastEnd, sEnd);
        last.label = `${last.label} · ${s.label}`.slice(0, 80);
      } else {
        merged.push({ ...s, start: sStart, end: sEnd });
      }
    }
    return merged;
  }, [relative]);

  // Seed steps once per event set if none exist
  useEffect(() => {
    if (steps.length === 0 && inferredSteps.length > 0) {
      setSteps(inferredSteps);
    }
  }, [inferredSteps, steps.length]);

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
    const next: Array<{ role: 'system'|'user'|'assistant'; content: string }> = [...chat, { role: 'user', content: chatInput }];
    setChat(next);
    setChatInput('');
    try {
      const recentUrls = Array.from(new Set(relative.slice(-20).map(e => e.url).filter(Boolean))) as string[];
      const compactResp = await fetch(`/api/extension-events?action=get_session_compact&sessionId=${encodeURIComponent(sessionId||'')}`);
      const compactJson = await compactResp.json();
      const compact = Array.isArray(compactJson?.compact) ? compactJson.compact.slice(-800) : [];
      const resp = await fetch('/api/intent-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          sessionId, 
          messages: next, 
          context: { 
            events: compact, 
            recentUrls,
            sessionId: sessionId
          } 
        })
      });
      const data = await resp.json();
      const reply = data?.reply || 'Okay.';
      
      // Check for workflow canvas modification commands
      if (reply.includes('ADD_STEP:') || reply.includes('UPDATE_STEP:') || reply.includes('REMOVE_STEP:') || reply.includes('GENERATE_WORKFLOW:') || reply.includes('GENERATE_BPMN:')) {
        // Parse and execute workflow canvas commands
        try {
          if (reply.includes('ADD_STEP:')) {
            const stepMatch = reply.match(/ADD_STEP:\s*({[^}]+})/);
            if (stepMatch) {
              const stepData = JSON.parse(stepMatch[1]);
              const newStep = {
                id: `step_${Date.now()}`,
                label: stepData.action || 'New Step',
                action: stepData.action,
                details: stepData.details,
                timestamp: stepData.timestamp,
                start: stepData.timestamp ? stepData.timestamp / 1000 : undefined,
                x: Math.random() * 400 + 100,
                y: Math.random() * 300 + 100,
                type: stepData.type || 'process'
              };
              setSteps(s => [...s, newStep]);
            }
          } else if (reply.includes('UPDATE_STEP:')) {
            const stepMatch = reply.match(/UPDATE_STEP:\s*({[^}]+})/);
            if (stepMatch) {
              const stepData = JSON.parse(stepMatch[1]);
              setSteps(s => s.map(step => 
                step.id === stepData.id 
                  ? { ...step, action: stepData.action, details: stepData.details }
                  : step
              ));
            }
          } else if (reply.includes('REMOVE_STEP:')) {
            const stepMatch = reply.match(/REMOVE_STEP:\s*({[^}]+})/);
            if (stepMatch) {
              const stepData = JSON.parse(stepMatch[1]);
              setSteps(s => s.filter(step => step.id !== stepData.id));
            }
              } else if (reply.includes('GENERATE_WORKFLOW:') || reply.includes('GENERATE_BPMN:')) {
                // Trigger workflow generation
                const generateButton = document.querySelector('button[onclick*="generateWorkflow"]') as HTMLButtonElement;
                if (generateButton) {
                  generateButton.click();
                }
              }
        } catch (e) {
          console.log('Failed to parse workflow command:', e);
        }
      }
      
      setChat(c => [...c, { role: 'assistant', content: reply }]);
    } catch (e) {
      setChat(c => [...c, { role: 'assistant', content: 'Sorry—there was a problem reaching the assistant.' }]);
    }
  }



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

  const handlePlay = () => {
    // Video started playing
  };

  const handlePause = () => {
    // Stop demo mode if video is paused manually
    if (isDemoMode) {
      setIsDemoMode(false);
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

  const handleToggleDemo = () => {
    setIsDemoMode(prev => {
      const newDemoMode = !prev;
      
      if (newDemoMode) {
        // Start demo mode - begin video playback
        if (videoRef.current) {
          videoRef.current.play();
        }
      } else {
        // Stop demo mode - pause video
        if (videoRef.current) {
          videoRef.current.pause();
        }
      }
      
      return newDemoMode;
    });
  };

  // Prime assistant with compact session context once per session open
  useEffect(() => {
    if (!open || primedRef.current) return;
    if (!sessionId) return;
    // Avoid firing before events load
    if (!events || events.length === 0) return;
    primedRef.current = true;
    (async () => {
      try {
        // Fetch compact events from server instead of sending full list
        const compactResp = await fetch(`/api/extension-events?action=get_session_compact&sessionId=${encodeURIComponent(sessionId)}`);
        const compactJson = await compactResp.json();
        const compact = Array.isArray(compactJson?.compact) ? compactJson.compact.slice(-800) : [];
        const recentUrls = Array.from(new Set(relative.slice(-20).map(e => e.url).filter(Boolean))) as string[];
        const seed = [{ role: 'user' as const, content: 'Please analyze the following session context and start by asking: What task was this session about?' }];
        const resp = await fetch('/api/intent-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, messages: seed, context: { events: compact, recentUrls } })
        });
        const data = await resp.json();
        const reply = data?.reply || 'What task was this session about?';
        setChat(c => [...c, { role: 'assistant', content: reply }]);
      } catch {}
    })();
  }, [open, sessionId, events, relative]);

  if (!open) return null;

  // Inline mode - render without modal wrapper
  if (inline) {
    return (
      <div style={{ position:'relative', width: '100%', height: '100%', background: '#111', color: '#fff', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
            Event Replay
            {isDemoMode && (
              <div style={{ 
                fontSize: 10, 
                padding: '2px 6px', 
                borderRadius: 4, 
                background: 'rgba(56,225,255,0.2)', 
                color: 'rgba(56,225,255,0.9)',
                border: '1px solid rgba(56,225,255,0.4)'
              }}>
                DEMO MODE
              </div>
            )}
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={() => setMode('focus')} style={{ padding:'6px 10px', borderRadius:6, border:'1px solid rgba(255,255,255,0.22)', background: mode==='focus'?'rgba(56,225,255,0.16)':'rgba(255,255,255,0.06)', color:'#fff', cursor:'pointer', fontSize:12 }}>Focus</button>
            <button onClick={() => setMode('builder')} style={{ padding:'6px 10px', borderRadius:6, border:'1px solid rgba(255,255,255,0.22)', background: mode==='builder'?'rgba(56,225,255,0.16)':'rgba(255,255,255,0.06)', color:'#fff', cursor:'pointer', fontSize:12 }}>Builder</button>
            <button onClick={() => setAssistantOpen(v=>!v)} style={{ padding:'6px 10px', borderRadius:6, border:'1px solid rgba(255,255,255,0.22)', background:'rgba(255,255,255,0.06)', color:'#fff', cursor:'pointer', fontSize:12 }}>{assistantOpen?'Hide Assistant':'Assistant'}</button>
            {onPruneWorkflow && (
              <button onClick={onPruneWorkflow} disabled={pruning} style={{ padding:'6px 10px', borderRadius:6, border:'1px solid rgba(255,255,255,0.22)', background:'rgba(255,255,255,0.06)', color:'#fff', cursor: pruning ? 'not-allowed' : 'pointer', fontSize:12, opacity: pruning ? 0.6 : 1 }}>
                {pruning ? 'Pruning…' : 'Prune Workflow'}
              </button>
            )}
            {onOpenWorkflow && (
              <button onClick={onOpenWorkflow} style={{ padding:'6px 10px', borderRadius:6, border:'1px solid rgba(255,255,255,0.22)', background:'rgba(255,255,255,0.06)', color:'#fff', cursor:'pointer', fontSize:12 }}>
                Workflow
              </button>
            )}
          </div>
        </div>

        <div style={{ position:'relative', display: 'flex', flex: 1, minHeight: 0 }}
          onMouseMove={(e)=>{
            const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
            if (draggingRef.current) {
              const x = e.clientX - rect.left;
              const next = Math.min(0.9, Math.max(0.1, x / rect.width));
              setSplit(next);
            } else if (assistantDraggingRef.current) {
              const fromRight = rect.right - e.clientX;
              const w = Math.min(720, Math.max(280, Math.round(fromRight)));
              setAssistantWidth(w);
            }
          }}
          onMouseUp={()=>{ draggingRef.current=false; assistantDraggingRef.current=false; }}
        >
          {/* Left: Replay (resizable in builder mode, full in focus) */}
          <div style={{ flex: mode==='focus'?1: split, padding: 16, display: 'flex', flexDirection: 'column', transition:'flex 180ms ease' }}>
            <video
              ref={videoRef}
              src={videoUrl}
              controls
              onLoadedMetadata={handleLoaded}
              onTimeUpdate={handleTimeUpdate}
              onPlay={handlePlay}
              onPause={handlePause}
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
          {/* Divider for resizing (only in builder mode) */}
          {mode==='builder' && (
            <div onMouseDown={()=>{ draggingRef.current=true; }} style={{ width:6, cursor:'col-resize', background:'rgba(255,255,255,0.06)' }} />
          )}
          {/* Right: Workflow Builder (only in builder mode) */}
          {mode==='builder' && (
            <div style={{ flex: 1 - split, minWidth: 260, borderLeft: '1px solid rgba(255,255,255,0.12)' }}>
              <WorkflowBuilder
                steps={steps}
                currentTime={currentTime}
                onAdd={() => setSteps(s => [...s, { id: `step_${Date.now()}`, label: 'New Step', start: currentTime }])}
                onUpdateSteps={setSteps}
                events={events}
                onSeekToTime={(time) => {
                  if (videoRef.current) {
                    videoRef.current.currentTime = time;
                    setCurrentTime(time);
                  }
                }}
                sessionId={sessionId}
                isDemoMode={isDemoMode}
                onToggleDemo={handleToggleDemo}
                recordingStartTimestamp={recordingStartTimestamp}
              />
            </div>
          )}
        </div>

        {/* Assistant Drawer Resizer (visible when open) */}
        {assistantOpen && (
          <div
            onMouseDown={()=>{ assistantDraggingRef.current = true; }}
            style={{ position:'absolute', top:48, bottom:0, right: assistantOpen ? assistantWidth : 0, width: 6, cursor:'col-resize', background:'rgba(255,255,255,0.06)' }}
          />
        )}
        {/* Assistant Drawer Overlay */}
        <div style={{ position:'absolute', top:48, right:0, bottom:0, width: assistantOpen? assistantWidth : 0, transition:'width 200ms ease', overflow:'hidden', borderLeft: assistantOpen? '1px solid rgba(255,255,255,0.12)':'none', background:'rgba(17,17,17,0.98)' }}>
          <div style={{ height:'100%', padding: assistantOpen? 14: 0, display:'flex', flexDirection:'column', gap:12 }}>
            {/* Assistant Header */}
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>Assistant</div>
            
            {/* Chat Messages - Takes up remaining space */}
            <div style={{ border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, padding: 8, background: 'rgba(255,255,255,0.03)', flex: 1, overflowY: 'auto' }}>
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
            
            {/* Chat Input - Fixed at bottom */}
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
              onPlay={handlePlay}
              onPause={handlePause}
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


