// pages/app.tsx - Workflow Redesign Platform (Monochrome / Infographic Style)
import React, { useState, useEffect } from 'react';
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

declare global {
  interface Window {
    apxObserve?: { recording: boolean; start: (opts?: { label?: string }) => void; stop: () => void };
  }
}

/* -------------------- Monochrome Helpers -------------------- */
const mono = {
  // Light warm grayscale inspired by reference image
  bg0: '#e8e8e4',
  bgPanel: 'rgba(200,203,194,0.45)',
  border: 'rgba(154,156,148,0.45)',
  borderSoft: 'rgba(154,156,148,0.28)',
  divider: 'rgba(120,122,116,0.55)',
  inkHigh: '#353535',
  inkMid: '#5c5e58',
  inkLow: '#8d8f88',
  white: '#ffffff',
  whiteDim: 'rgba(255,255,255,0.75)',
  whiteFaint: 'rgba(255,255,255,0.35)',
};

/* -------------------- Glassy Tiles Backdrop (Infographic style) -------------------- */
function GlassyTilesBackdrop() {
  // Tile sizes tuned for infographic look
  const tileSize = 22;
  const gridColor = 'rgba(120, 122, 116, 0.22)'; // warm dark grid lines
  const tileHighlight = 'rgba(255, 255, 255, 0.16)';
  const tileShade = 'rgba(154, 156, 148, 0.12)';
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 0,
      pointerEvents: 'none',
      background: `
        /* Subtle glossy corner per tile */
        linear-gradient(135deg, ${tileHighlight} 0%, rgba(225,228,217,0.00) 55%) 0 0 / ${tileSize}px ${tileSize}px,
        /* Diagonal shade to give glass feel */
        linear-gradient(315deg, ${tileShade} 0%, rgba(154,156,148,0.00) 65%) 0 0 / ${tileSize}px ${tileSize}px,
        /* Grid lines */
        linear-gradient(${gridColor} 1px, transparent 1px) 0 0 / ${tileSize}px ${tileSize}px,
        linear-gradient(90deg, ${gridColor} 1px, transparent 1px) 0 0 / ${tileSize}px ${tileSize}px
      `,
      backgroundBlendMode: 'overlay, overlay, normal, normal'
    }} />
  );
}

/* -------------------- 3D Grid Background Component -------------------- */
function Grid3DBackdrop() {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: -1,
      perspective: '1200px',
      overflow: 'hidden',
    }}>
      {/* 3D Grid Container */}
      <div style={{
        position: 'absolute',
        inset: '0% 0% 0% 0%',
        transformStyle: 'preserve-3d',
        transform: 'rotateX(65deg) rotateY(0deg)',
        opacity: 0.18,
      }}>
        {/* Base Grid (white lines) */}
        <div style={{
          position: 'absolute',
          inset: '0% 0% 0% 0%',
          background: `
            linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px) 0 0/ 120px 120px,
            linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px) 0 0/ 120px 120px
          `,
          transform: 'translateZ(0px)',
        }} />

        {/* Mid Layer Grid */}
        <div style={{
          position: 'absolute',
          inset: '10% 10% 10% 10%',
          background: `
            linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px) 0 0/ 80px 80px,
            linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px) 0 0/ 80px 80px
          `,
          transform: 'translateZ(50px)',
        }} />

        {/* Top Layer Grid */}
        <div style={{
          position: 'absolute',
          inset: '20% 20% 20% 20%',
          background: `
            linear-gradient(rgba(255,255,255,0.10) 1px, transparent 1px) 0 0/ 60px 60px,
            linear-gradient(90deg, rgba(255,255,255,0.10) 1px, transparent 1px) 0 0/ 60px 60px
          `,
          transform: 'translateZ(100px)',
        }} />

        {/* Dot overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'radial-gradient(rgba(255,255,255,.15) 1px, transparent 1px)',
            backgroundSize: '8px 8px',
            transform: 'translateZ(120px)',
            opacity: 0.7,
          }}
        />

        {/* Floating Light Orbs (white) */}
        <div style={{
          position: 'absolute',
          inset: '0% 0% 0% 0%',
          transform: 'translateZ(150px)',
        }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                width: '4px',
                height: '4px',
                borderRadius: '50%',
                background: `radial-gradient(circle, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.45) 50%, transparent 100%)`,
                left: `${20 + (i * 12)}%`,
                top: `${15 + (i * 8)}%`,
                animation: `float${i} 8s ease-in-out infinite`,
                animationDelay: `${i * 0.5}s`,
              }}
            />
          ))}
        </div>
      </div>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes float0 { 0%, 100% { transform: translateY(0px) translateX(0px); opacity: 0.6; } 50% { transform: translateY(-20px) translateX(10px); opacity: 1; } }
        @keyframes float1 { 0%, 100% { transform: translateY(0px) translateX(0px); opacity: 0.4; } 50% { transform: translateY(-15px) translateX(-8px); opacity: 0.8; } }
        @keyframes float2 { 0%, 100% { transform: translateY(0px) translateX(0px); opacity: 0.7; } 50% { transform: translateY(-25px) translateX(5px); opacity: 1; } }
        @keyframes float3 { 0%, 100% { transform: translateY(0px) translateX(0px); opacity: 0.5; } 50% { transform: translateY(-18px) translateX(-12px); opacity: 0.9; } }
        @keyframes float4 { 0%, 100% { transform: translateY(0px) translateX(0px); opacity: 0.6; } 50% { transform: translateY(-22px) translateX(8px); opacity: 1; } }
        @keyframes float5 { 0%, 100% { transform: translateY(0px) translateX(0px); opacity: 0.4; } 50% { transform: translateY(-16px) translateX(-6px); opacity: 0.8; } }
        @keyframes float6 { 0%, 100% { transform: translateY(0px) translateX(0px); opacity: 0.7; } 50% { transform: translateY(-24px) translateX(3px); opacity: 1; } }
        @keyframes float7 { 0%, 100% { transform: translateY(0px) translateX(0px); opacity: 0.5; } 50% { transform: translateY(-19px) translateX(-9px); opacity: 0.9; } }
      `}</style>
    </div>
  );
}

/* -------------------- Left Sidebar Navigation -------------------- */
function LeftSidebar({ activePhase, setActivePhase }: { activePhase: string; setActivePhase: (phase: string) => void }) {
  const modules = [
    { id: 'watch', icon: 'watch', description: 'Watch - Observe user workflows' },
    { id: 'ask', icon: 'ask', description: 'Ask - Identify optimization opportunities' },
    { id: 'redesign', icon: 'redesign', description: 'Redesign - Create optimized workflows' },
    { id: 'automate', icon: 'automate', description: 'Automate - Execute automated processes' },
    { id: 'chat', icon: 'chat', description: 'Chat - AI operator assistance' },
    { id: 'observe', icon: 'observe', description: 'Observe - Review recordings & rules' }
  ];

  return (
    <aside style={{
      position: 'fixed',
      top: 0,
      left: 0,
      bottom: 0,
      width: '60px',
      background: 'rgba(255, 255, 255, 0.06)',
      borderRight: `1px solid ${mono.border}`,
      backdropFilter: 'blur(18px)',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '12px 0',
      gap: '8px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
    }}>
      {/* Logo (mono cube) */}
      <div style={{
        width: '36px',
        height: '36px',
        borderRadius: '8px',
        background: 'rgba(255,255,255,0.10)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '8px',
        fontSize: '20px',
        fontWeight: 'bold',
        color: mono.inkHigh,
        border: `1px solid ${mono.border}`,
      }}>
        ▲
      </div>

      {/* Module Icons */}
      {modules.map((module) => (
        <button
          key={module.id}
          onClick={() => setActivePhase(module.id)}
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            border: `1px solid ${mono.borderSoft}`,
            background: activePhase === module.id ? 'rgba(255,255,255,0.14)' : 'transparent',
            color: activePhase === module.id ? mono.inkHigh : mono.inkMid,
            cursor: 'pointer',
            fontSize: '18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
          }}
          title={module.description}
        >
          {/* Minimal inline SVG icons to match angular theme */}
          <span aria-hidden>
            {module.icon === 'watch' && (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 5c4 0 7 3 7 7s-3 7-7 7-7-3-7-7 3-7 7-7Z" stroke={mono.inkMid} strokeWidth="1.5"/><circle cx="12" cy="12" r="3" fill={mono.inkHigh} /></svg>
            )}
            {module.icon === 'ask' && (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 17h.01" stroke={mono.inkHigh} strokeWidth="1.5"/><path d="M9.1 9.5a3.1 3.1 0 1 1 5.8 1.4c-.5 1.1-1.8 1.6-2.4 2.6" stroke={mono.inkMid} strokeWidth="1.5"/></svg>
            )}
            {module.icon === 'redesign' && (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M4 15l7-7 6 6" stroke={mono.inkMid} strokeWidth="1.5"/><path d="M14 6h6v6" stroke={mono.inkHigh} strokeWidth="1.5"/></svg>
            )}
            {module.icon === 'automate' && (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M4 12h6l2-3 2 6 2-3h4" stroke={mono.inkHigh} strokeWidth="1.5"/></svg>
            )}
            {module.icon === 'chat' && (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M4 6h16v9H8l-4 3V6Z" stroke={mono.inkMid} strokeWidth="1.5"/></svg>
            )}
            {module.icon === 'observe' && (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M3 12s3.5-5 9-5 9 5 9 5-3.5 5-9 5-9-5-9-5Z" stroke={mono.inkMid} strokeWidth="1.5"/><circle cx="12" cy="12" r="2" fill={mono.inkHigh}/></svg>
            )}
          </span>
        </button>
      ))}

      {/* Logout Button */}
      <div style={{ marginTop: 'auto', paddingTop: '12px' }}>
        <button
          onClick={async () => {
            try {
              await fetch('/api/logout', { method: 'POST' }).catch(() => fetch('/api/logout'));
            } finally {
              window.location.href = '/';
            }
          }}
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            border: `1px solid ${mono.borderSoft}`,
            background: 'transparent',
            color: mono.inkLow,
            cursor: 'pointer',
            fontSize: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease'
          }}
          title="Logout"
        >
          🚪
        </button>
      </div>
    </aside>
  );
}

/* -------------------- External Browser Monitor Component -------------------- */
function ExternalBrowserMonitor({
  sessionId, isRecording, onActionCapture, onExtensionStatusChange, onRecordingControl
}: {
  sessionId: string;
  isRecording: boolean;
  onActionCapture: (action: any) => void;
  onExtensionStatusChange: (connected: boolean) => void;
  onRecordingControl?: (action: 'start' | 'stop') => void;
}) {
  const [monitoredTabs, setMonitoredTabs] = useState<Array<{id: string, url: string, title: string, status: 'active' | 'inactive'}>>([]);
  const [currentTab, setCurrentTab] = useState<string | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [extensionConnected, setExtensionConnected] = useState(false);
  const [realTimeEvents, setRealTimeEvents] = useState<any[]>([]);

  const openInBrowser = (url: string) => {
    // Clean URL
    let cleanUrl = url.trim();
    if (!cleanUrl.includes('.')) {
      cleanUrl = `https://www.google.com/search?q=${encodeURIComponent(cleanUrl)}`;
    } else if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = 'https://' + cleanUrl;
    }

    // Open in new tab
    const newTab = window.open(cleanUrl, '_blank');

    if (newTab) {
      const tabId = `tab_${Date.now()}`;
      const newTabInfo = { id: tabId, url: cleanUrl, title: 'Loading...', status: 'active' as const };
      setMonitoredTabs(prev => [...prev, newTabInfo]);
      setCurrentTab(tabId);

      if (isRecording) {
        onActionCapture({
          type: 'open_tab',
          url: cleanUrl,
          tabId,
          timestamp: new Date().toISOString()
        });
      }
    }
  };

  // Poll for extension events via HTTP API
  useEffect(() => {
    let pollInterval: NodeJS.Timeout;

    const pollForEvents = async () => {
      try {
        const response = await fetch('/api/extension-events?action=get_recent');
        if (response.ok) {
          const events = await response.json();
          if (events && events.length > 0) {
            setRealTimeEvents(prev => [...prev.slice(-99), ...events]);

            events.forEach((eventData: any) => {
              if (eventData.type === 'recording_control' && onRecordingControl) {
                onRecordingControl(eventData.action === 'start_recording' ? 'start' : 'stop');
              }
            });

            const recentEvents = events.filter((event: any) => {
              const eventTime = new Date(event.timestamp).getTime();
              const now = Date.now();
              return (now - eventTime) < 30000;
            });

            if (recentEvents.length > 0 && !extensionConnected) {
              setExtensionConnected(true);
              onExtensionStatusChange(true);
            } else if (recentEvents.length === 0 && extensionConnected) {
              setExtensionConnected(false);
              onExtensionStatusChange(false);
            }
          } else {
            if (extensionConnected) {
              setExtensionConnected(false);
              onExtensionStatusChange(false);
            }
          }
        }
      } catch {
        if (extensionConnected) {
          setExtensionConnected(false);
          onExtensionStatusChange(false);
        }
      }
    };

    pollInterval = setInterval(pollForEvents, 2000);
    pollForEvents();

    return () => clearInterval(pollInterval);
  }, [isRecording, onActionCapture, extensionConnected, onExtensionStatusChange, onRecordingControl]);

  const startMonitoring = () => setIsMonitoring(true);
  const stopMonitoring = () => setIsMonitoring(false);

  return (
    <div style={{
      width: '100%',
      height: '100%',
      background: mono.bgPanel,
      border: `1px solid ${mono.border}`,
      borderRadius: '6px',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Monitoring Controls */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '16px',
        background: 'rgba(255,255,255,0.03)',
        borderBottom: `1px solid ${mono.border}`
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            background: isMonitoring ? mono.white : 'rgba(255,255,255,0.28)',
            boxShadow: isMonitoring ? `0 0 8px ${mono.whiteFaint}` : 'none'
          }} />
          <span style={{ color: mono.inkHigh, fontSize: '14px', fontWeight: 500 }}>
            {isMonitoring ? 'Monitoring Active' : 'Monitoring Inactive'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: extensionConnected ? mono.white : 'rgba(255,255,255,0.28)',
            boxShadow: extensionConnected ? `0 0 6px ${mono.whiteFaint}` : 'none'
          }} />
          <span style={{ color: mono.inkHigh, fontSize: '12px' }}>
            Extension: {extensionConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div style={{ fontSize: '12px', color: mono.inkLow }}>
            Use extension popup to control monitoring
          </div>
          <button
            onClick={async () => {
              try {
                await fetch('/api/extension-events?action=clear', { method: 'GET' });
                setRealTimeEvents([]);
              } catch {}
            }}
            style={{
              padding: '4px 8px',
              borderRadius: '3px',
              border: `1px solid ${mono.border}`,
              background: 'rgba(255,255,255,0.06)',
              color: mono.inkHigh,
              cursor: 'pointer',
              fontSize: '10px'
            }}
          >
            Clear
          </button>
        </div>
      </div>

      {/* Quick Launch Buttons */}
      <div style={{ padding: '16px', borderBottom: `1px solid ${mono.border}` }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: mono.inkHigh }}>
          Quick Launch
        </h3>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {[
            { name: 'Google', url: 'https://google.com', icon: '🔍' },
            { name: 'GitHub', url: 'https://github.com', icon: '🐙' },
            { name: 'Indeed', url: 'https://indeed.com', icon: '💼' },
            { name: 'LinkedIn', url: 'https://linkedin.com', icon: '💼' },
            { name: 'Stack Overflow', url: 'https://stackoverflow.com', icon: '📚' },
            { name: 'YouTube', url: 'https://youtube.com', icon: '📺' }
          ].map((site) => (
            <button
              key={site.name}
              onClick={() => openInBrowser(site.url)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 12px',
                borderRadius: '4px',
                border: `1px solid ${mono.border}`,
                background: mono.bgPanel,
                color: mono.inkHigh,
                cursor: 'pointer',
                fontSize: '12px',
                transition: 'all 0.2s ease'
              }}
            >
              <span>{site.icon}</span>
              {site.name}
            </button>
          ))}
        </div>
      </div>

      {/* Custom URL Input */}
      <div style={{ padding: '16px', borderBottom: `1px solid ${mono.border}` }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: mono.inkHigh }}>
          Custom URL
        </h3>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            placeholder="Enter URL or search term..."
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: '4px',
              border: `1px solid ${mono.border}`,
              background: 'rgba(255,255,255,0.04)',
              color: mono.inkHigh,
              fontSize: '14px'
            }}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                const v = (e.target as HTMLInputElement).value;
                if (v) openInBrowser(v);
              }
            }}
          />
          <button
            onClick={() => {
              const input = document.querySelector('input[placeholder="Enter URL or search term..."]') as HTMLInputElement;
              if (input?.value) {
                openInBrowser(input.value);
                input.value = '';
              }
            }}
            style={{
              padding: '8px 16px',
              borderRadius: '4px',
              border: `1px solid ${mono.border}`,
              background: mono.white,
              color: '#0d1117',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500
            }}
          >
            Open
          </button>
        </div>
      </div>

      {/* Real-time Events */}
      <div style={{ flex: 1, padding: '16px', overflowY: 'auto' }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: mono.inkHigh }}>
          Real-time Events ({realTimeEvents.length})
        </h3>

        {realTimeEvents.length === 0 ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '200px',
            color: mono.inkLow,
            fontSize: '14px',
            textAlign: 'center'
          }}>
            <div>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📡</div>
              <div>No events captured yet</div>
              <div style={{ fontSize: '12px', opacity: 0.7, marginTop: '8px' }}>
                {extensionConnected ? 'Extension is connected - interact with web pages' : 'Extension not connected - install browser extension'}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {realTimeEvents.slice(-20).reverse().map((event, index) => (
              <div
                key={index}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: `1px solid ${mono.border}`,
                  background: 'rgba(255, 255, 255, 0.04)',
                  fontSize: '12px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  <div style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.85)'
                  }} />
                  <span style={{ fontWeight: 500, color: mono.inkHigh }}>
                    {event.type}
                  </span>
                  <span style={{ color: mono.inkLow, fontSize: '10px' }}>
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                {event.url && (
                  <div style={{ color: mono.inkMid, wordBreak: 'break-all', fontSize: '11px' }}>
                    {event.url}
                  </div>
                )}
                {event.element && (
                  <div style={{ color: mono.inkLow, fontSize: '10px', marginTop: '2px' }}>
                    {event.element.selector || event.element.tag}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* -------------------- Watch Phase - Live Mirror -------------------- */
function LiveMirror() {
  const [extensionEvents, setExtensionEvents] = useState<any[]>([]);
  const [extensionConnected, setExtensionConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [screenRecordings, setScreenRecordings] = useState<any[]>([]);
  const [currentRecording, setCurrentRecording] = useState<string | null>(null);

  // Poll for extension events and recordings
  useEffect(() => {
    const pollForData = async () => {
      try {
        const eventsResponse = await fetch('/api/extension-events?action=get_recent');
        if (eventsResponse.ok) {
          const events = await eventsResponse.json();
          setExtensionEvents(events);

          const now = Date.now();
          const recentEvents = events.filter((event: any) => {
            const eventTime = new Date(event.timestamp).getTime();
            return (now - eventTime) < 30000;
          });

          setExtensionConnected(recentEvents.length > 0);
        }

        const recordingsResponse = await fetch('/api/extension-events?action=get_recordings');
        if (recordingsResponse.ok) {
          const recordings = await recordingsResponse.json();
          setScreenRecordings(recordings);

          if (recordings.length > 0 && !currentRecording) {
            const latestRecording = recordings[recordings.length - 1];
            setCurrentRecording(latestRecording.data);
          }
        }
      } catch {
        setExtensionConnected(false);
      }
    };

    const interval = setInterval(pollForData, 2000);
    pollForData();
    return () => clearInterval(interval);
  }, [currentRecording]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'recording_control') {
        const action = event.data.action;
        if (action === 'start_recording') {
          setIsRecording(true);
        } else if (action === 'stop_recording') {
          setIsRecording(false);
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: mono.bgPanel,
      border: `1px solid ${mono.border}`,
      borderRadius: '8px',
      padding: '24px',
      backdropFilter: 'blur(18px)',
      boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '24px',
        paddingBottom: '16px',
        borderBottom: `1px solid ${mono.border}`
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            background: extensionConnected ? mono.white : 'rgba(255,255,255,0.28)',
            boxShadow: extensionConnected ? `0 0 10px ${mono.whiteFaint}` : 'none',
          }} />
          <h2 style={{ margin: 0, fontSize: '20px', color: mono.inkHigh, fontWeight: 600 }}>
            Live Mirror
          </h2>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: isRecording ? mono.white : 'rgba(255,255,255,0.28)',
          }} />
          <span style={{ fontSize: '14px', color: mono.inkLow }}>
            {isRecording ? 'Recording' : 'Standby'}
          </span>
        </div>
      </div>

      {/* Screen Recording Player */}
      {currentRecording && (
        <div style={{
          marginBottom: '20px',
          background: 'rgba(255,255,255,0.04)',
          borderRadius: '6px',
          padding: '16px',
          border: `1px solid ${mono.border}`,
        }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: mono.inkHigh, fontWeight: 500 }}>
            📹 Live Screen Recording
          </h3>
          <video
            controls
            style={{
              width: '100%',
              maxHeight: '300px',
              borderRadius: '4px',
              background: 'rgba(0,0,0,0.85)',
            }}
            src={`data:video/webm;base64,${currentRecording}`}
          />
          <div style={{ marginTop: '8px', fontSize: '12px', color: mono.inkLow, textAlign: 'center' }}>
            {screenRecordings.length} recording(s) available
          </div>
        </div>
      )}

      {/* Live Activity Feed */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        background: 'rgba(255,255,255,0.04)',
        borderRadius: '6px',
        padding: '16px',
        border: `1px solid ${mono.border}`,
      }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: mono.inkHigh, fontWeight: 500 }}>
          Real-time Activity ({extensionEvents.length})
        </h3>

        {extensionEvents.length === 0 ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '200px',
            color: mono.inkLow,
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>👁️</div>
            <div style={{ fontSize: '16px', marginBottom: '8px' }}>No activity detected</div>
            <div style={{ fontSize: '14px', opacity: 0.7 }}>
              Install browser extension and start browsing to see live mirror
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {extensionEvents.slice(-10).reverse().map((event, index) => (
              <div key={event.id || index} style={{
                padding: '12px',
                background: 'rgba(255,255,255,0.03)',
                borderRadius: '4px',
                border: `1px solid ${mono.border}`,
                borderLeft: `3px solid ${mono.whiteFaint}`,
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '8px'
                }}>
                  <div style={{ fontSize: '14px', fontWeight: 500, color: mono.inkHigh }}>
                    {event.event?.type === 'click' ? '🖱️ Click' :
                     event.event?.type === 'input' ? '⌨️ Input' :
                     event.event?.type === 'navigation' ? '🧭 Navigation' :
                     event.type === 'browser_event' ? '🎯 Interaction' : '📡 Event'}
                  </div>
                  <div style={{ fontSize: '12px', color: mono.inkLow, opacity: 0.9 }}>
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </div>
                </div>

                <div style={{ fontSize: '13px', color: mono.inkMid, lineHeight: 1.4 }}>
                  <div style={{ marginBottom: '4px' }}>
                    <strong>URL:</strong> {event.url?.substring(0, 60)}...
                  </div>
                  {event.event?.element && (
                    <div style={{ marginBottom: '4px' }}>
                      <strong>Element:</strong> {event.event.element.tag}
                      {event.event.element.id && ` #${event.event.element.id}`}
                      {event.event.element.className && ` .${event.event.element.className.split(' ')[0]}`}
                    </div>
                  )}
                  {event.event?.value && (
                    <div>
                      <strong>Value:</strong> {event.event.value.length > 40 ?
                        event.event.value.substring(0, 40) + '...' :
                        event.event.value}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Status Footer */}
      <div style={{
        marginTop: '16px',
        padding: '12px',
        background: 'rgba(255,255,255,0.04)',
        borderRadius: '4px',
        border: `1px solid ${mono.border}`,
        fontSize: '12px',
        color: mono.inkLow,
        textAlign: 'center'
      }}>
        {extensionConnected ? (
          <>✅ Extension connected • Live monitoring active • {screenRecordings.length} recording(s)</>
        ) : (
          <>⚠️ Install browser extension to enable live mirror</>
        )}
      </div>
    </div>
  );
}

function WatchPhase({ sessionId }: { sessionId: string }) {
  return <LiveMirror />;
}

/* -------------------- Ask / Redesign / Automate (mono containers) -------------------- */
function MonoPhase({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div style={{
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: mono.bgPanel,
      border: `1px solid ${mono.border}`,
      borderRadius: '8px',
      padding: '24px',
      backdropFilter: 'blur(18px)',
      boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
    }}>
      <div style={{ textAlign: 'center', color: mono.inkLow }}>
        <h2 style={{ fontSize: '24px', marginBottom: '16px', color: mono.inkHigh }}>{title}</h2>
        <p>{subtitle}</p>
      </div>
    </div>
  );
}
const AskPhase = () => <MonoPhase title="Ask Phase" subtitle="Identify optimization opportunities from captured workflows" />;
const RedesignPhase = () => <MonoPhase title="Redesign Phase" subtitle="Create optimized workflows from captured data" />;
const AutomatePhase = () => <MonoPhase title="Automate Phase" subtitle="Execute automated processes based on optimized workflows" />;

/* -------------------- Chat Module -------------------- */
function ChatModule({ sid }: { sid: string }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function normalizeMarkdown(input: string): string {
    if (!input) return input;
    let out = input;
    // Collapse 4+ backticks to 3 for fenced blocks
    out = out.replace(/`{4,}/g, '```');
    return out;
  }

  // Load chat history on mount
  useEffect(() => {
    const loadChatHistory = async () => {
      try {
        const response = await fetch(`/api/chat-logs?sessionId=${sid}`);
        if (response.ok) {
          const data = await response.json();
          const msgs = (data.messages || []).map((m: any) => ({ ...m, text: normalizeMarkdown(m.text || m.content || '') }));
          setMessages(msgs);
        }
      } catch (err) {
        console.error('Failed to load chat history:', err);
      }
    };

    if (sid) loadChatHistory();
  }, [sid]);

  // Poll for async agent messages (webhook updates)
  useEffect(() => {
    if (!sid) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/chat-logs?sessionId=${sid}`);
        if (!res.ok) return;
        const data = await res.json();
        const incoming = (data.messages || []).map((m: any) => ({ ...m, text: normalizeMarkdown(m.text || m.content || '') }));
        // Merge without duplicates by id+ts, sort by timestamp
        setMessages((prev) => {
          const seen = new Set(prev.map((p: any) => p.id || `${p.ts}-${p.text}`));
          const merged = [...prev];
          for (const m of incoming) {
            const key = m.id || `${m.ts}-${m.text}`;
            if (!seen.has(key)) {
              merged.push(m);
              seen.add(key);
            }
          }
          // Sort by timestamp to maintain chronological order
          return merged.sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime());
        });
      } catch {}
    }, 2000);
    return () => clearInterval(interval);
  }, [sid]);

  const handleSend = async (message: string) => {
    if (!message.trim()) return;

    const userMessage = {
      id: uuidv4(),
      sessionId: sid,
      sender: 'user' as const,
      text: message,
      ts: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/agent-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: sid, message }),
      });

      if (response.ok) {
        // Agent response may arrive asynchronously via webhook; polling will pick it up
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to get response');
      }
    } catch (err) {
      setError('Network error occurred');
      console.error('Chat error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: mono.bgPanel,
      border: `1px solid ${mono.border}`,
      borderRadius: '8px',
      padding: '24px',
      backdropFilter: 'blur(18px)',
      boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
    }}>
      {/* Header */}
      <div style={{ marginBottom: '20px', paddingBottom: '16px', borderBottom: `1px solid ${mono.border}` }}>
        <h2 style={{ fontSize: '20px', margin: 0, color: mono.inkHigh, fontWeight: 600 }}>
          AI Assistant
        </h2>
        <p style={{ fontSize: '14px', color: mono.inkLow, margin: '4px 0 0 0', opacity: 0.9 }}>
          Workflow optimization and automation guidance
        </p>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', marginBottom: '20px', paddingRight: '8px' }}>
        {messages.length === 0 ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: mono.inkLow,
            textAlign: 'center',
            opacity: 0.8
          }}>
            <div>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>💬</div>
              <div>Start a conversation with the AI assistant</div>
              <div style={{ fontSize: '12px', marginTop: '8px' }}>
                Ask about workflow optimization, automation strategies, or get help with your processes
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {messages.map((msg) => (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  flexDirection: msg.sender === 'user' ? 'row-reverse' : 'row',
                  alignItems: 'flex-start',
                  gap: '12px',
                }}
              >
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: mono.inkHigh,
                  flexShrink: 0,
                  border: `1px solid ${mono.border}`,
                }}>
                  {msg.sender === 'user' ? 'U' : 'AI'}
                </div>
                <div style={{
                  maxWidth: '70%',
                  padding: '12px 16px',
                  borderRadius: '6px',
                  background: msg.sender === 'user'
                    ? 'rgba(255,255,255,0.08)'
                    : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${msg.sender === 'user' ? mono.border : mono.borderSoft}`,
                  color: mono.inkHigh,
                  fontSize: '14px',
                  lineHeight: 1.5,
                }}>
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkBreaks]}
                    components={{
                      code: ({ children, ...props }: any) => (
                        <code
                          style={{
                            background: 'rgba(0,0,0,0.85)',
                            color: mono.inkHigh,
                            padding: '2px 6px',
                            borderRadius: '3px',
                            fontSize: '13px',
                            fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
                            border: `1px solid ${mono.border}`,
                          }}
                          {...props}
                        >
                          {children}
                        </code>
                      ),
                      pre: ({ children, ...props }: any) => (
                        <pre
                          style={{
                            background: 'rgba(0,0,0,0.9)',
                            color: mono.inkHigh,
                            padding: '12px',
                            borderRadius: '4px',
                            overflowX: 'auto',
                            fontSize: '13px',
                            fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
                            border: `1px solid ${mono.border}`,
                          }}
                          {...props}
                        >
                          {children}
                        </pre>
                      ),
                    }}
                  >
                    {msg.text}
                  </ReactMarkdown>
                  <div style={{ fontSize: '11px', color: mono.inkLow, marginTop: '8px', opacity: 0.8 }}>
                    {new Date(msg.ts).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
            {loading && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                color: mono.inkLow,
                fontSize: '14px',
                fontStyle: 'italic'
              }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: mono.inkHigh,
                  border: `1px solid ${mono.border}`,
                }}>
                  AI
                </div>
                <div>AI is thinking...</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div style={{
          padding: '12px',
          background: 'rgba(255,255,255,0.06)',
          border: `1px solid ${mono.border}`,
          borderRadius: '4px',
          color: mono.inkHigh,
          fontSize: '14px',
          marginBottom: '16px',
        }}>
          {error}
        </div>
      )}

      {/* Chat Input */}
      <div style={{
        background: 'rgba(255,255,255,0.04)',
        border: `1px solid ${mono.border}`,
        borderRadius: '6px',
        padding: '16px',
      }}>
        <ChatInput onSend={handleSend} loading={loading} error={error} />
      </div>
    </div>
  );
}

/* -------------------- Observe Module Wrapper -------------------- */
function ObserveModuleWrapper() {
  const [recordings, setRecordings] = useState<any[]>([]);
  const [selectedRecording, setSelectedRecording] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecordings = async () => {
      try {
        const response = await fetch('/api/extension-events?action=get_recordings');
        if (response.ok) {
          const data = await response.json();
          setRecordings(data);
          if (data.length > 0 && !selectedRecording) {
            setSelectedRecording(data[data.length - 1]);
          }
        }
      } catch (error) {
        console.error('Failed to fetch recordings:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecordings();
    const interval = setInterval(fetchRecordings, 5000);
    return () => clearInterval(interval);
  }, [selectedRecording]);

  const formatDuration = (duration: number) => {
    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatTimestamp = (timestamp: number) => new Date(timestamp).toLocaleString();

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      background: mono.bgPanel,
      border: `1px solid ${mono.border}`,
      borderRadius: '8px',
      padding: '24px',
      backdropFilter: 'blur(18px)',
      boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
    }}>
      {/* Left Panel - Recording List */}
      <div style={{ width: '300px', marginRight: '24px', display: 'flex', flexDirection: 'column' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '20px', color: mono.inkHigh, fontWeight: 600 }}>
          📹 Recordings ({recordings.length})
        </h2>

        {loading ? (
          <div style={{ textAlign: 'center', color: mono.inkLow, padding: '40px 0' }}>
            Loading recordings...
          </div>
        ) : recordings.length === 0 ? (
          <div style={{ textAlign: 'center', color: mono.inkLow, padding: '40px 0' }}>
            No recordings yet
            <br />
            <small>Start monitoring to create recordings</small>
          </div>
        ) : (
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {recordings.map((recording, index) => {
              const selected = selectedRecording?.timestamp === recording.timestamp;
              return (
                <div
                  key={recording.timestamp || index}
                  onClick={() => setSelectedRecording(recording)}
                  style={{
                    padding: '16px',
                    background: selected ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${selected ? mono.divider : mono.border}`,
                    borderRadius: '6px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: mono.inkHigh }}>
                      Recording #{recordings.length - index}
                    </div>
                    <div style={{
                      fontSize: '12px',
                      color: mono.inkHigh,
                      background: 'rgba(255,255,255,0.10)',
                      padding: '2px 8px',
                      borderRadius: '3px',
                      border: `1px solid ${mono.border}`
                    }}>
                      {formatDuration(recording.duration || 0)}
                    </div>
                  </div>

                  <div style={{ fontSize: '12px', color: mono.inkLow, marginBottom: '8px' }}>
                    {formatTimestamp(recording.timestamp)}
                  </div>

                  <div style={{
                    fontSize: '11px',
                    color: mono.inkLow,
                    background: 'rgba(255,255,255,0.04)',
                    padding: '4px 8px',
                    borderRadius: '3px',
                    textAlign: 'center',
                    border: `1px solid ${mono.border}`
                  }}>
                    {Math.round((recording.data?.length || 0) / 1024)} KB
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Right Panel - Video Player */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <h3 style={{ fontSize: '18px', marginBottom: '20px', color: mono.inkHigh, fontWeight: 500 }}>
          {selectedRecording
            ? `Recording #${recordings.length - recordings.findIndex(r => r.timestamp === selectedRecording.timestamp)}`
            : 'Select a Recording'}
        </h3>

        {selectedRecording ? (
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            background: 'rgba(255,255,255,0.04)',
            borderRadius: '6px',
            padding: '20px',
            border: `1px solid ${mono.border}`,
          }}>
            {/* Video Player */}
            <video
              controls
              style={{
                width: '100%',
                maxHeight: '400px',
                borderRadius: '4px',
                background: 'rgba(0,0,0,0.85)',
                marginBottom: '20px',
              }}
              src={`data:video/webm;base64,${selectedRecording.data}`}
            />

            {/* Recording Details */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '14px' }}>
              <div>
                <div style={{ color: mono.inkLow, marginBottom: '4px' }}>Duration</div>
                <div style={{ color: mono.inkHigh, fontWeight: 500 }}>
                  {formatDuration(selectedRecording.duration || 0)}
                </div>
              </div>

              <div>
                <div style={{ color: mono.inkLow, marginBottom: '4px' }}>File Size</div>
                <div style={{ color: mono.inkHigh, fontWeight: 500 }}>
                  {Math.round((selectedRecording.data?.length || 0) / 1024)} KB
                </div>
              </div>

              <div>
                <div style={{ color: mono.inkLow, marginBottom: '4px' }}>Created</div>
                <div style={{ color: mono.inkHigh, fontWeight: 500 }}>
                  {formatTimestamp(selectedRecording.timestamp)}
                </div>
              </div>

              <div>
                <div style={{ color: mono.inkLow, marginBottom: '4px' }}>Format</div>
                <div style={{ color: mono.inkHigh, fontWeight: 500 }}>
                  WebM (VP9)
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(255,255,255,0.04)',
            borderRadius: '6px',
            border: `1px solid ${mono.border}`,
            color: mono.inkLow,
            fontSize: '16px',
          }}>
            Select a recording from the list to play it back
          </div>
        )}
      </div>
    </div>
  );
}

export default function Home() {
  const [sid, setSid] = useState<string>('');
  const [activePhase, setActivePhase] = useState('watch');
  const [rightWidth, setRightWidth] = useState<number>(280);

  useEffect(() => {
    try {
      const s = getOrCreateSessionId();
      setSid(s);
    } catch (e) {
      console.error('Session ID error', e);
    }
  }, []);

  return (
    <div style={{ 
      height: '100vh', 
      width: '100vw', 
      position: 'relative', 
      overflow: 'hidden',
      background: mono.bg0,
    }}>
      <GlassyTilesBackdrop />

      {/* Left Sidebar */}
      <LeftSidebar activePhase={activePhase} setActivePhase={setActivePhase} />

      {/* Main Content - Reserve space for sidebars */}
      <div style={{
        position: 'absolute',
        top: '0px',
        left: '60px', // Reserve space for left sidebar
        right: `${rightWidth}px`, // Dynamic based on SearchPanel
        bottom: '0px',
        overflow: 'hidden',
        padding: '24px'
      }}>
        {activePhase === 'watch' && <WatchPhase sessionId={sid} />}
        {activePhase === 'ask' && <AskPhase />}
        {activePhase === 'redesign' && <RedesignPhase />}
        {activePhase === 'automate' && <AutomatePhase />}
        {activePhase === 'chat' && sid ? <ChatModule sid={sid} /> : activePhase === 'chat' ? <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--ink-mid)' }}>Loading session...</div> : null}
        {activePhase === 'observe' && <ObserveModuleWrapper />}
      </div>

      {/* Right Sidebar - Fixed Position */}
      <aside
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: rightWidth,
          zIndex: 1000,
          // borderLeft: '1px solid rgb(255, 255, 255)',
          background: 'rgba(200,203,194,0.55)',
          backdropFilter: 'blur(20px)',
          overflow: 'auto',
          // boxShadow: '0 0 30px rgb(255, 255, 255)',
        }}
      >
        {sid ? <SearchPanel sessionId={sid} onWidthChange={setRightWidth} /> : <div style={{ padding: 16, color: 'var(--ink-mid)' }}>Loading…</div>}
      </aside>
    </div>
  );
}
