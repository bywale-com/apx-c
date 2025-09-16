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
}

export default function EventReplayModal({ open, onClose, videoUrl, events, recordingStartTimestamp, inline = false }: EventReplayModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentTime, setCurrentTime] = useState(0); // seconds
  const [duration, setDuration] = useState(0); // seconds

  useEffect(() => {
    if (!open) {
      setCurrentTime(0);
    }
  }, [open]);

  const sorted = useMemo(() => [...events].sort((a, b) => a.timestamp - b.timestamp), [events]);
  const startTs = useMemo(() => recordingStartTimestamp ?? (sorted[0]?.timestamp ?? 0), [recordingStartTimestamp, sorted]);
  const relative = useMemo(() => sorted.map(ev => ({ ...ev, t: Math.max(0, (ev.timestamp - startTs) / 1000) })), [sorted, startTs]);
  const visible = useMemo(() => relative.filter(ev => ev.t <= currentTime + 0.0001), [relative, currentTime]);

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


