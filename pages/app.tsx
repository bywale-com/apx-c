// pages/app.tsx - Workflow Redesign Platform (Monochrome / Infographic Style)
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
import VideoEventSync from '../components/VideoEventSync';
import EventReplayModal from '../components/EventReplayModal';
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
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [recordings, setRecordings] = useState<any[]>([]);
  const [workflowSessions, setWorkflowSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const modules = [
    { id: 'watch', description: 'Watch - Observe user workflows' },
    { 
      id: 'recordings', 
      description: 'Recordings - View screen recordings', 
      hasDropdown: true
    },
    { 
      id: 'observe', 
      description: 'Observe - Review workflows & analysis', 
      hasDropdown: true
    },
    { id: 'chat', description: 'Chat - AI operator assistance' }
  ];

  // Fetch data for sidebar
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch recordings
        const recordingsResponse = await fetch('/api/extension-events?action=get_recordings');
        if (recordingsResponse.ok) {
          const recordingsData = await recordingsResponse.json();
          setRecordings(recordingsData);
        }

        // Fetch workflow sessions
        const sessionsResponse = await fetch('/api/extension-events?action=get_workflow_sessions');
        if (sessionsResponse.ok) {
          const sessionsData = await sessionsResponse.json();
          setWorkflowSessions(sessionsData.sessions || []);
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const formatDuration = (duration: number) => {
    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const toggleDropdown = (moduleId: string) => {
    setExpandedModules(prev => {
      const newSet = new Set(prev);
      if (newSet.has(moduleId)) {
        newSet.delete(moduleId);
      } else {
        newSet.add(moduleId);
      }
      return newSet;
    });
  };

  const handleModuleClick = (module: any) => {
    if (module.hasDropdown) {
      toggleDropdown(module.id);
    } else {
      setActivePhase(module.id);
    }
  };

  const handleSubItemClick = (parentId: string, subItemId: string) => {
    setActivePhase(subItemId);
  };

  return (
    <aside style={{
      position: 'fixed',
      top: 0,
      left: 0,
      bottom: 0,
      width: '200px',
      background: 'rgba(15, 15, 15, 0.95)',
      borderRight: `1px solid rgba(255, 255, 255, 0.1)`,
      backdropFilter: 'blur(20px)',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      padding: '16px 0',
      boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
    }}>
      {/* Logo */}
      <div style={{
        padding: '0 16px 16px 16px',
        borderBottom: `1px solid rgba(255, 255, 255, 0.1)`,
        marginBottom: '16px'
      }}>
        <div style={{
          fontSize: '16px',
          fontWeight: '600',
          color: '#ffffff',
          letterSpacing: '0.5px'
        }}>
          APX-C
        </div>
      </div>

      {/* Module List */}
      <div style={{ flex: 1, padding: '0 8px' }}>
        {modules.map((module) => {
          const isExpanded = expandedModules.has(module.id);
          const isActive = activePhase === module.id || (module.subItems && module.subItems.some(sub => activePhase === sub.id));
          
          return (
            <div key={module.id} style={{ marginBottom: '4px' }}>
              {/* Main Module Button */}
              <button
                onClick={() => handleModuleClick(module)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: `1px solid ${isActive ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.05)'}`,
                  background: isActive ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                  color: isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.7)',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '500',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transition: 'all 0.2s ease',
                  marginBottom: '2px'
                }}
                title={module.description}
              >
                <span style={{ textTransform: 'capitalize' }}>{module.id}</span>
                {module.hasDropdown && (
                  <span style={{
                    fontSize: '10px',
                    transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s ease'
                  }}>
                    ▶
                  </span>
                )}
              </button>

              {/* Sub Items - Recordings */}
              {module.hasDropdown && isExpanded && module.id === 'recordings' && (
                <div style={{ marginLeft: '12px', marginTop: '4px' }}>
                  {loading ? (
                    <div style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '11px', padding: '4px 12px' }}>
                      Loading...
                    </div>
                  ) : recordings.length === 0 ? (
                    <div style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '11px', padding: '4px 12px' }}>
                      No recordings
                    </div>
                  ) : (
                    recordings.map((recording, index) => {
                      const isActive = activePhase === `recording-${recording.timestamp}`;
                      return (
                        <button
                          key={recording.timestamp || index}
                          onClick={() => setActivePhase(`recording-${recording.timestamp}`)}
                          style={{
                            width: '100%',
                            padding: '6px 12px',
                            borderRadius: '4px',
                            border: `1px solid ${isActive ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.03)'}`,
                            background: isActive ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                            color: isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.6)',
                            cursor: 'pointer',
                            fontSize: '11px',
                            fontWeight: '400',
                            textAlign: 'left',
                            transition: 'all 0.2s ease',
                            marginBottom: '2px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'flex-start'
                          }}
                        >
                          <div style={{ fontWeight: '500' }}>Recording #{recordings.length - index}</div>
                          <div style={{ fontSize: '10px', opacity: 0.7 }}>
                            {formatDuration(recording.duration || 0)} • {formatTimestamp(recording.timestamp)}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              )}

              {/* Sub Items - Workflow Sessions */}
              {module.hasDropdown && isExpanded && module.id === 'observe' && (
                <div style={{ marginLeft: '12px', marginTop: '4px' }}>
                  {loading ? (
                    <div style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '11px', padding: '4px 12px' }}>
                      Loading...
                    </div>
                  ) : workflowSessions.length === 0 ? (
                    <div style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '11px', padding: '4px 12px' }}>
                      No sessions
                    </div>
                  ) : (
                    workflowSessions.map((session, index) => {
                      const isActive = activePhase === `session-${session.sessionId}`;
                      return (
                        <button
                          key={session.sessionId}
                          onClick={() => setActivePhase(`session-${session.sessionId}`)}
                          style={{
                            width: '100%',
                            padding: '6px 12px',
                            borderRadius: '4px',
                            border: `1px solid ${isActive ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.03)'}`,
                            background: isActive ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                            color: isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.6)',
                            cursor: 'pointer',
                            fontSize: '11px',
                            fontWeight: '400',
                            textAlign: 'left',
                            transition: 'all 0.2s ease',
                            marginBottom: '2px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'flex-start'
                          }}
                        >
                          <div style={{ fontWeight: '500' }}>Session {session.sessionId.slice(-8)}</div>
                          <div style={{ fontSize: '10px', opacity: 0.7 }}>
                            {formatDuration(session.duration)} • {session.eventCount} events
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Logout Button */}
      <div style={{ padding: '0 8px', borderTop: `1px solid rgba(255, 255, 255, 0.1)`, paddingTop: '16px' }}>
        <button
          onClick={async () => {
            try {
              await fetch('/api/logout', { method: 'POST' }).catch(() => fetch('/api/logout'));
            } finally {
              window.location.href = '/';
            }
          }}
          style={{
            width: '100%',
            padding: '8px 12px',
            borderRadius: '6px',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            background: 'transparent',
            color: 'rgba(255, 255, 255, 0.6)',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: '500',
            textAlign: 'left',
            transition: 'all 0.2s ease'
          }}
          title="Logout"
        >
          Logout
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

/* -------------------- Recordings Module -------------------- */
function RecordingsModule({ selectedRecordingId }: { selectedRecordingId?: string }) {
  const [recordings, setRecordings] = useState<any[]>([]);
  const [selectedRecording, setSelectedRecording] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecordings = async () => {
      try {
        const recordingsResponse = await fetch('/api/extension-events?action=get_recordings');
        if (recordingsResponse.ok) {
          const recordingsData = await recordingsResponse.json();
          setRecordings(recordingsData);
          
          // Set selected recording based on prop
          if (selectedRecordingId) {
            const found = recordingsData.find(r => r.timestamp.toString() === selectedRecordingId);
            if (found) {
              setSelectedRecording(found);
            }
          } else if (recordingsData.length > 0 && !selectedRecording) {
            setSelectedRecording(recordingsData[recordingsData.length - 1]);
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
  }, [selectedRecording, selectedRecordingId]);

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
      {/* Main Content Area - Video Player */}
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

/* -------------------- Chat Module -------------------- */
function ChatModule({ sid }: { sid: string }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function normalizeMarkdown(input: string): string {
    if (!input) return input;
    let out = input;
    
    // Fix broken code blocks that are split into multiple blocks
    // This handles the pattern where a single code block gets broken into multiple ones
    // Pattern: ```\ncontent\n```\n\n```\ncontent\n```\n\n```\ncontent\n```
    out = out.replace(/```\s*\n([^`]*?)\n```\s*\n\s*```\s*\n/g, '```\n$1\n');
    
    // Collapse 4+ backticks to 3 for fenced blocks
    out = out.replace(/`{4,}/g, '```');
    
    // Fix any remaining broken patterns where code blocks are split
    // This handles cases where there are multiple consecutive broken code blocks
    while (out.includes('```\n') && out.includes('\n```\n\n```\n')) {
      out = out.replace(/```\s*\n([^`]*?)\n```\s*\n\s*```\s*\n([^`]*?)\n```/g, '```\n$1$2\n```');
    }
    
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
                            color: '#ffffff',
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
                            color: '#ffffff',
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

/* -------------------- Events Dropdown Component -------------------- */
function EventsDropdown({ 
  events, 
  currentTime, 
  onEventSelect, 
  isMoveable = false,
  recordingStartTimestamp
}: { 
  events: any[]; 
  currentTime: number; 
  onEventSelect: (event: any) => void;
  isMoveable?: boolean;
  recordingStartTimestamp?: number;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const eventsListRef = useRef<HTMLDivElement>(null);
  
  // Calculate relative timestamps using recording start time (same as original)
  const startTime = recordingStartTimestamp || (events.length > 0 ? events[0].timestamp : 0);
  const relative = events.map(event => ({
    ...event,
    relativeTime: event.timestamp - startTime
  }));
  
  // Filter events that have occurred up to current time (same as original)
  const visible = relative.filter(ev => ev.relativeTime <= currentTime * 1000).map(ev => ({
    ...ev,
    t: ev.relativeTime / 1000 // Convert to seconds
  }));
  
  // Debug: Log to see what's happening
  console.log('EventsDropdown Debug:', {
    eventsLength: events.length,
    visibleLength: visible.length,
    currentTime,
    startTime,
    relative: relative.slice(0, 3) // First 3 events for debugging
  });
  
  const rowHeight = 60; // Same as original

  // Seek to event function (same as original)
  const seekToEvent = (tSeconds: number) => {
    const seek = Math.max(0, tSeconds - 2);
    onEventSelect({ type: 'seek', time: seek });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isMoveable) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    
    // Store the initial offset from mouse to element
    const rect = e.currentTarget.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    
    // Store offset separately from position
    setDragOffset({ x: offsetX, y: offsetY });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !isMoveable) return;
      e.preventDefault();
      
      // Calculate new position based on mouse position minus the initial offset
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;
      
      // Constrain to viewport bounds
      const constrainedX = Math.max(0, Math.min(newX, window.innerWidth - 200));
      const constrainedY = Math.max(0, Math.min(newY, window.innerHeight - 150));
      
      setPosition({ x: constrainedX, y: constrainedY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = 'none'; // Prevent text selection while dragging
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = ''; // Restore text selection
    };
  }, [isDragging, isMoveable, dragOffset.x, dragOffset.y]);

  return (
    <div 
      style={{
        position: isMoveable ? 'absolute' : 'relative',
        top: isMoveable ? `${position.y}px` : 'auto',
        left: isMoveable ? `${position.x}px` : 'auto',
        zIndex: isMoveable ? 1000 : 'auto',
        background: 'rgba(15, 15, 15, 0.95)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '4px',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
        minWidth: '180px',
        maxWidth: '200px'
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Header */}
      <div 
        style={{
          padding: '8px 12px',
          borderBottom: `1px solid rgba(255, 255, 255, 0.1)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: isDragging ? 'grabbing' : (isMoveable ? 'grab' : 'pointer'),
          userSelect: 'none'
        }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span style={{ 
          fontSize: '11px', 
          fontWeight: '500', 
          color: '#ffffff',
          textTransform: 'uppercase',
          letterSpacing: '0.3px'
        }}>
          Events ({visible.length})
        </span>
        <span style={{
          fontSize: '10px',
          color: 'rgba(255, 255, 255, 0.6)',
          transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s ease'
        }}>
          ▶
        </span>
      </div>

      {/* Events List - Same as original */}
      {isExpanded && (
        <div
          ref={eventsListRef}
          style={{
            height: `${Math.max(3 * 40, 120)}px`, // Much smaller height
            overflowY: 'auto',
            position: 'relative',
            borderRadius: 4,
            border: '1px solid rgba(255,255,255,0.12)',
            background: 'rgba(17,17,17,0.98)'
          }}
        >
          {/* Top gradient fade */}
          <div style={{ position: 'sticky', top: 0, height: 16, background: 'linear-gradient(180deg, rgba(17,17,17,0.9) 0%, rgba(17,17,17,0) 100%)', zIndex: 10 }} />
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', marginBottom: 4, padding: '0 8px' }}>
            Events up to {currentTime.toFixed(1)}s
          </div>
          {visible.length === 0 ? (
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, padding: '0 8px' }}>
              No events yet at this time.
            </div>
          ) : (
            [...visible]
              .sort((a,b)=> b.t - a.t) // Newest first, same as original
              .map((ev, idx) => (
                <div
                  key={`${ev.t}-${idx}`}
                  style={{
                    padding: '4px 6px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 3,
                    marginBottom: 4,
                    background: 'rgba(255,255,255,0.03)',
                    cursor: 'pointer',
                    opacity: 1,
                    marginLeft: 8,
                    marginRight: 8
                  }}
                  onClick={() => seekToEvent(ev.t)}
                >
                  <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.7)' }}>
                    {ev.t.toFixed(1)}s • {ev.event?.type || ev.type || 'Event'}
                  </div>
                  {ev.event?.element?.selector && (
                    <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.6)' }}>
                      {ev.event.element.selector}
                    </div>
                  )}
                  {ev.url && (
                    <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.45)' }}>
                      {ev.url}
                    </div>
                  )}
                </div>
              ))
          )}
          {/* Bottom gradient fade */}
          <div style={{ position: 'sticky', bottom: 0, height: 16, background: 'linear-gradient(0deg, rgba(17,17,17,0.9) 0%, rgba(17,17,17,0) 100%)', zIndex: 10 }} />
        </div>
      )}
    </div>
  );
}

/* -------------------- Workflow Session View -------------------- */
function WorkflowSessionView({ 
  selectedSessionId, 
  onEventsUpdate, 
  onVideoTimeUpdate 
}: { 
  selectedSessionId?: string;
  onEventsUpdate: (events: any[]) => void;
  onVideoTimeUpdate: (time: number) => void;
}) {
  const [recordings, setRecordings] = useState<any[]>([]);
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showCleaned, setShowCleaned] = useState(false);
  const [pruning, setPruning] = useState(false);
  const [workflowOpen, setWorkflowOpen] = useState(false);
  const [currentVideoTime, setCurrentVideoTime] = useState<number>(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch recordings
        const recordingsResponse = await fetch('/api/extension-events?action=get_recordings');
        if (recordingsResponse.ok) {
          const recordingsData = await recordingsResponse.json();
          setRecordings(recordingsData);
        }

        // Load selected session details
        if (selectedSessionId) {
          await loadSessionDetails(selectedSessionId);
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [selectedSessionId]);

  // Clear events when session ID changes to prevent mixing
  useEffect(() => {
    if (selectedSessionId) {
      // Clear previous session data when switching
      setSelectedSession(null);
      onEventsUpdate([]);
    }
  }, [selectedSessionId, onEventsUpdate]);

  // Auto-load details for the currently selected session if events are missing
  useEffect(() => {
    if (selectedSession?.sessionId) {
      const hasEvents = Array.isArray(selectedSession.events) || Array.isArray(selectedSession.cleanedEvents);
      if (!hasEvents) {
        loadSessionDetails(selectedSession.sessionId);
      }
    }
  }, [selectedSession?.sessionId]);

  // Pass events data to parent when session changes
  useEffect(() => {
    if (selectedSession) {
      const events = showCleaned ? selectedSession.cleanedEvents : selectedSession.events;
      if (Array.isArray(events)) {
        console.log(`[WorkflowSessionView] Passing ${events.length} events for session ${selectedSession.sessionId}`);
        onEventsUpdate(events);
      }
    } else {
      // Clear events when no session is selected
      console.log('[WorkflowSessionView] Clearing events - no session selected');
      onEventsUpdate([]);
    }
  }, [selectedSession, showCleaned, onEventsUpdate]);

  // Track video time for EventsDropdown - connect to actual video
  useEffect(() => {
    const interval = setInterval(() => {
      // Find the video element in the EventReplayModal
      const videoElement = document.querySelector('video');
      if (videoElement) {
        setCurrentVideoTime(videoElement.currentTime);
      }
    }, 100); // Check every 100ms for smooth updates

    return () => clearInterval(interval);
  }, []);

  const loadSessionDetails = async (sessionId: string) => {
    try {
      console.log(`[WorkflowSessionView] Loading session details for: ${sessionId}`);
      const response = await fetch(`/api/extension-events?action=get_workflow_session&sessionId=${sessionId}`);
      if (response.ok) {
        const data = await response.json();
        console.log(`[WorkflowSessionView] Loaded session ${sessionId} with ${data.events?.length || 0} raw events and ${data.cleanedEvents?.length || 0} cleaned events`);
        setSelectedSession(data);
        // default to cleaned view if present
        setShowCleaned(!!data.cleanedEvents && data.cleanedEvents.length > 0);
      }
    } catch (error) {
      console.error('Failed to load session details:', error);
    }
  };

  const pruneSelectedSession = async () => {
    if (!selectedSession?.sessionId) return;
    setPruning(true);
    try {
      const resp = await fetch(`/api/extension-events?action=prune_session&sessionId=${selectedSession.sessionId}`);
      const resJson = await resp.json();
      // reload details
      await loadSessionDetails(selectedSession.sessionId);
      setShowCleaned(true);
      console.log('Prune result:', resJson);
    } catch (e) {
      console.error('Prune failed', e);
    } finally {
      setPruning(false);
    }
  };

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      background: mono.bgPanel,
      border: `1px solid ${mono.border}`,
      borderRadius: '8px',
      padding: '0px', // Remove padding to let EventReplayModal fill entire space
      backdropFilter: 'blur(18px)',
      boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
    }}>
      {/* Main Content Area - EventReplayModal fills entire space */}
      {selectedSession ? (
        (() => {
          const recData = selectedSession.recordingId ? (recordings.find(r => r.recordingId === selectedSession.recordingId) || null) : null;
          const videoDataUrl = recData ? `data:video/webm;base64,${recData.data}` : '';
          const evs = (showCleaned ? selectedSession.cleanedEvents : selectedSession.events) || [];
          const startTs = recData?.recordingStartTimestamp ?? null;
          return (
            <div style={{ position: 'relative', height: '100%', width: '100%', flex: 1 }}>
              <EventReplayModal
                open={true}
                onClose={() => {}} // No close functionality for default view
                videoUrl={videoDataUrl}
                events={evs}
                recordingStartTimestamp={startTs}
                inline={true} // Use inline mode for default view
                sessionId={selectedSession.sessionId}
                onPruneWorkflow={pruneSelectedSession}
                onOpenWorkflow={() => setWorkflowOpen(true)}
                pruning={pruning}
              />
              
              {/* Events Dropdown Overlay */}
              <EventsDropdown 
                events={evs}
                currentTime={currentVideoTime}
                onEventSelect={(event) => {
                  if (event.type === 'seek') {
                    // Handle seeking to event time
                    console.log('Seeking to:', event.time);
                  } else {
                    console.log('Selected event:', event);
                  }
                }}
                isMoveable={true}
                recordingStartTimestamp={startTs}
              />
            </div>
          );
        })()
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
          Select a workflow session from the list to analyze it
        </div>
      )}

      {/* Workflow Modal (VideoEventSync) */}
      {workflowOpen && selectedSession && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.6)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            width: '95vw',
            height: '90vh',
            background: '#111',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 10,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            {/* Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px 20px',
              borderBottom: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(255,255,255,0.05)'
            }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
                Workflow Analysis
              </h2>
              <button
                onClick={() => setWorkflowOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#fff',
                  fontSize: '24px',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ×
              </button>
            </div>
            
            {/* VideoEventSync Content */}
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <VideoEventSync
                videoUrl={selectedSession.recordingId ? `data:video/webm;base64,${recordings.find(r => r.recordingId === selectedSession.recordingId)?.data || ''}` : ''}
                events={(showCleaned ? selectedSession.cleanedEvents : selectedSession.events) || []}
                recordingId={selectedSession.sessionId}
                recordingStartTimestamp={recordings.find(r => r.recordingId === selectedSession.recordingId)?.recordingStartTimestamp}
                onEventSelect={(event) => {
                  console.log('Selected event:', event);
                }}
                onTimelineUpdate={(time) => {
                  // Handle timeline updates if needed
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const [sid, setSid] = useState<string>('');
  const [activePhase, setActivePhase] = useState('watch');
  const [rightWidth, setRightWidth] = useState<number>(280);
  const [replayOpen, setReplayOpen] = useState<boolean>(false);
  const [currentSessionEvents, setCurrentSessionEvents] = useState<any[]>([]);
  const [currentVideoTime, setCurrentVideoTime] = useState<number>(0);

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
        left: '200px', // Reserve space for left sidebar
        right: `${rightWidth}px`, // Dynamic based on SearchPanel
        bottom: '0px',
        overflow: 'hidden',
        padding: '24px'
      }}>
        {activePhase === 'watch' && <WatchPhase sessionId={sid} />}
        {activePhase.startsWith('recording-') && <RecordingsModule selectedRecordingId={activePhase.replace('recording-', '')} />}
        {activePhase.startsWith('session-') && (
          <WorkflowSessionView 
            selectedSessionId={activePhase.replace('session-', '')} 
            onEventsUpdate={setCurrentSessionEvents}
            onVideoTimeUpdate={setCurrentVideoTime}
          />
        )}
        {activePhase === 'chat' && sid && <ChatModule sid={sid} />}
        {activePhase === 'chat' && !sid && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--ink-mid)' }}>
            Loading session...
          </div>
        )}
        {!activePhase.startsWith('recording-') && !activePhase.startsWith('session-') && activePhase !== 'watch' && activePhase !== 'chat' && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--ink-mid)' }}>
            Select a recording or session from the sidebar
          </div>
        )}
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
