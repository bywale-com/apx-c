// pages/app.tsx - Workflow Redesign Platform
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

declare global {
  interface Window {
    apxObserve?: { recording: boolean; start: (opts?: { label?: string }) => void; stop: () => void };
  }
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
        opacity: 0.15,
      }}>
        {/* Base Grid */}
        <div style={{
          position: 'absolute',
          inset: '0% 0% 0% 0%',
          background: `
            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px) 0 0/ 120px 120px,
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px) 0 0/ 120px 120px
          `,
          transform: 'translateZ(0px)',
        }} />
        
        {/* Mid Layer Grid */}
        <div style={{
          position: 'absolute',
          inset: '10% 10% 10% 10%',
          background: `
            linear-gradient(rgba(91,225,255,0.05) 1px, transparent 1px) 0 0/ 80px 80px,
            linear-gradient(90deg, rgba(91,225,255,0.05) 1px, transparent 1px) 0 0/ 80px 80px
          `,
          transform: 'translateZ(50px)',
        }} />
        
        {/* Top Layer Grid */}
        <div style={{
          position: 'absolute',
          inset: '20% 20% 20% 20%',
          background: `
            linear-gradient(rgba(255,158,74,0.06) 1px, transparent 1px) 0 0/ 60px 60px,
            linear-gradient(90deg, rgba(255,158,74,0.06) 1px, transparent 1px) 0 0/ 60px 60px
          `,
          transform: 'translateZ(100px)',
        }} />
        
        {/* Floating Light Orbs */}
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
                background: `radial-gradient(circle, rgba(255,255,255,0.8) 0%, rgba(91,225,255,0.4) 50%, transparent 100%)`,
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
    { id: 'watch', icon: '👁️', description: 'Watch - Observe user workflows' },
    { id: 'ask', icon: '❓', description: 'Ask - Identify optimization opportunities' },
    { id: 'redesign', icon: '🔧', description: 'Redesign - Create optimized workflows' },
    { id: 'automate', icon: '⚡', description: 'Automate - Execute automated processes' },
    { id: 'chat', icon: '💬', description: 'Chat - AI operator assistance' },
    { id: 'observe', icon: '📊', description: 'Observe - Review recordings & rules' }
  ];

  return (
    <aside style={{
      position: 'fixed',
      top: 0,
      left: 0,
      bottom: 0,
      width: '60px',
      background: 'rgba(255,255,255,0.05)',
      borderRight: '1px solid rgba(91,225,255,0.2)',
      backdropFilter: 'blur(20px)',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '12px 0',
      gap: '8px',
      boxShadow: '0 0 30px rgba(91,225,255,0.1)',
    }}>
      {/* Logo */}
      <div style={{
        width: '36px',
        height: '36px',
        borderRadius: '8px',
        background: 'var(--accent-cyan)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '8px',
        fontSize: '20px',
        fontWeight: 'bold',
        color: '#001126'
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
            border: 'none',
            background: activePhase === module.id ? 'var(--accent-cyan)' : 'transparent',
            color: activePhase === module.id ? '#001126' : 'var(--ink-high)',
            cursor: 'pointer',
            fontSize: '18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
            position: 'relative'
          }}
          title={module.description}
        >
          {module.icon}
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
            border: 'none',
            background: 'transparent',
            color: 'var(--ink-mid)',
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
function ExternalBrowserMonitor({ sessionId, isRecording, onActionCapture, onExtensionStatusChange, onRecordingControl }: { 
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
  const [websocket, setWebsocket] = useState<WebSocket | null>(null);

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
      // Add to monitored tabs
      const tabId = `tab_${Date.now()}`;
      const newTabInfo = {
        id: tabId,
        url: cleanUrl,
        title: 'Loading...',
        status: 'active' as const
      };
      
      setMonitoredTabs(prev => [...prev, newTabInfo]);
      setCurrentTab(tabId);
      
      // Record the action
      if (isRecording) {
        onActionCapture({
          type: 'open_tab',
          url: cleanUrl,
          tabId: tabId,
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
            setRealTimeEvents(prev => [...prev.slice(-99), ...events]); // Keep last 100 events
            
            // Check for recording control messages from extension
            events.forEach((eventData: any) => {
              if (eventData.type === 'recording_control') {
                console.log('🎮 Recording control from extension:', eventData.action);
                if (onRecordingControl) {
                  onRecordingControl(eventData.action === 'start_recording' ? 'start' : 'stop');
                }
              }
            });
            
            // Also capture for workflow recording
            if (isRecording) {
              events.forEach((eventData: any) => {
                onActionCapture({
                  type: 'extension_event',
                  event: eventData,
                  timestamp: new Date().toISOString()
                });
              });
            }
            
            // Check if we're getting recent events (within last 30 seconds)
            const recentEvents = events.filter((event: any) => {
              const eventTime = new Date(event.timestamp).getTime();
              const now = Date.now();
              return (now - eventTime) < 30000; // 30 seconds
            });
            
            // Only mark as connected if we have recent events
            if (recentEvents.length > 0 && !extensionConnected) {
              setExtensionConnected(true);
              onExtensionStatusChange(true);
            } else if (recentEvents.length === 0 && extensionConnected) {
              // No recent events - mark as disconnected
              setExtensionConnected(false);
              onExtensionStatusChange(false);
            }
          } else {
            // No events at all - mark as disconnected
            if (extensionConnected) {
              setExtensionConnected(false);
              onExtensionStatusChange(false);
            }
          }
        }
      } catch (error) {
        console.log('Polling for events failed:', error);
        if (extensionConnected) {
          setExtensionConnected(false);
          onExtensionStatusChange(false);
        }
      }
    };
    
    // Poll every 2 seconds
    pollInterval = setInterval(pollForEvents, 2000);
    
    // Initial poll
    pollForEvents();
    
    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [isRecording, onActionCapture, extensionConnected, onExtensionStatusChange, onRecordingControl]);

  const startMonitoring = () => {
    setIsMonitoring(true);
    console.log('Started monitoring browser tabs...');
  };

  const stopMonitoring = () => {
    setIsMonitoring(false);
    console.log('Stopped monitoring browser tabs...');
  };

  return (
    <div style={{
      width: '100%',
      height: '100%',
      background: 'var(--panel)',
      border: '1px solid var(--border)',
      borderRadius: '12px',
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
        background: 'rgba(0, 0, 0, 0.2)',
        borderBottom: '1px solid var(--border)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            background: isMonitoring ? '#00ff88' : '#666',
            boxShadow: isMonitoring ? '0 0 8px #00ff88' : 'none'
          }} />
          <span style={{ color: 'var(--ink-high)', fontSize: '14px', fontWeight: '500' }}>
            {isMonitoring ? 'Monitoring Active' : 'Monitoring Inactive'}
          </span>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: extensionConnected ? '#00ff88' : '#ff4444',
            boxShadow: extensionConnected ? '0 0 6px #00ff88' : 'none'
          }} />
          <span style={{ color: 'var(--ink-high)', fontSize: '12px' }}>
            Extension: {extensionConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
        
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div style={{ fontSize: '12px', color: 'var(--ink-mid)' }}>
            Use extension popup to control monitoring
          </div>
          <button
            onClick={async () => {
              try {
                await fetch('/api/extension-events?action=clear', { method: 'GET' });
                setRealTimeEvents([]);
                console.log('Events cleared');
              } catch (error) {
                console.error('Failed to clear events:', error);
              }
            }}
            style={{
              padding: '4px 8px',
              borderRadius: '4px',
              border: '1px solid var(--border)',
              background: 'rgba(255, 68, 68, 0.1)',
              color: '#ff4444',
              cursor: 'pointer',
              fontSize: '10px'
            }}
          >
            Clear
          </button>
        </div>
      </div>

      {/* Quick Launch Buttons */}
      <div style={{
        padding: '16px',
        borderBottom: '1px solid var(--border)'
      }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: 'var(--ink-high)' }}>
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
                borderRadius: '6px',
                border: '1px solid var(--border)',
                background: 'var(--panel)',
                color: 'var(--ink-high)',
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
      <div style={{
        padding: '16px',
        borderBottom: '1px solid var(--border)'
      }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: 'var(--ink-high)' }}>
          Custom URL
        </h3>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            placeholder="Enter URL or search term..."
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid var(--border)',
              background: 'rgba(0, 0, 0, 0.3)',
              color: 'var(--ink-high)',
              fontSize: '14px'
            }}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                openInBrowser((e.target as HTMLInputElement).value);
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
              borderRadius: '6px',
              border: 'none',
              background: 'var(--accent-cyan)',
              color: '#001126',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            Open
          </button>
        </div>
      </div>

      {/* Real-time Events */}
      <div style={{ flex: 1, padding: '16px', overflowY: 'auto' }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: 'var(--ink-high)' }}>
          Real-time Events ({realTimeEvents.length})
        </h3>
        
        {realTimeEvents.length === 0 ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '200px',
            color: 'var(--ink-mid)',
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
                  border: '1px solid var(--border)',
                  background: 'rgba(0, 0, 0, 0.2)',
                  fontSize: '12px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  <div style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: event.type === 'click' ? '#00ff88' : 
                               event.type === 'input' ? '#38e1ff' : 
                               event.type === 'navigate' ? '#ffaa00' : '#666'
                  }} />
                  <span style={{ fontWeight: '500', color: 'var(--ink-high)' }}>
                    {event.type}
                  </span>
                  <span style={{ color: 'var(--ink-low)', fontSize: '10px' }}>
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                {event.url && (
                  <div style={{ color: 'var(--ink-mid)', wordBreak: 'break-all', fontSize: '11px' }}>
                    {event.url}
                  </div>
                )}
                {event.element && (
                  <div style={{ color: 'var(--ink-low)', fontSize: '10px', marginTop: '2px' }}>
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

/* -------------------- Watch Phase - Browser Integration -------------------- */
/* -------------------- Live Mirror Component -------------------- */
function LiveMirror() {
  const [extensionEvents, setExtensionEvents] = useState<any[]>([]);
  const [extensionConnected, setExtensionConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  // Poll for extension events
  useEffect(() => {
    const pollForEvents = async () => {
      try {
        const response = await fetch('/api/extension-events?action=get_recent');
        if (response.ok) {
          const events = await response.json();
          setExtensionEvents(events);
          
          // Check if extension is connected (has recent events within 30 seconds)
          const now = Date.now();
          const recentEvents = events.filter((event: any) => {
            const eventTime = new Date(event.timestamp).getTime();
            return (now - eventTime) < 30000; // 30 seconds
          });
          
          setExtensionConnected(recentEvents.length > 0);
        }
      } catch (error) {
        console.error('Failed to fetch extension events:', error);
        setExtensionConnected(false);
      }
    };

    // Poll every 2 seconds
    const interval = setInterval(pollForEvents, 2000);
    pollForEvents(); // Initial poll

    return () => clearInterval(interval);
  }, []);

  // Listen for recording control messages
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'recording_control') {
        const action = event.data.action;
        if (action === 'start_recording') {
          setIsRecording(true);
          setCurrentSessionId(`session_${Date.now()}`);
        } else if (action === 'stop_recording') {
          setIsRecording(false);
          setCurrentSessionId(null);
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
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(91,225,255,0.15)',
      borderRadius: '16px',
      padding: '24px',
      backdropFilter: 'blur(20px)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
    }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        marginBottom: '24px',
        paddingBottom: '16px',
        borderBottom: '1px solid rgba(91,225,255,0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            background: extensionConnected ? '#00ff88' : '#ff4444',
            boxShadow: extensionConnected ? '0 0 10px rgba(0,255,136,0.5)' : '0 0 10px rgba(255,68,68,0.5)',
          }} />
          <h2 style={{ 
            margin: 0, 
            fontSize: '20px', 
            color: 'var(--ink-high)', 
            fontWeight: '600' 
          }}>
            Live Mirror
          </h2>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: isRecording ? '#00ff88' : '#ff4444',
          }} />
          <span style={{ fontSize: '14px', color: 'var(--ink-mid)' }}>
            {isRecording ? 'Recording' : 'Standby'}
          </span>
        </div>
      </div>

      {/* Live Activity Feed */}
      <div style={{ 
        flex: 1,
        overflowY: 'auto',
        background: 'rgba(0,0,0,0.2)',
        borderRadius: '12px',
        padding: '16px',
        border: '1px solid rgba(91,225,255,0.1)',
      }}>
        <h3 style={{ 
          margin: '0 0 16px 0', 
          fontSize: '16px', 
          color: 'var(--ink-high)',
          fontWeight: '500'
        }}>
          Real-time Activity ({extensionEvents.length})
        </h3>
        
        {extensionEvents.length === 0 ? (
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center', 
            justifyContent: 'center',
            height: '200px',
            color: 'var(--ink-mid)',
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
                background: 'rgba(255,255,255,0.02)',
                borderRadius: '8px',
                border: '1px solid rgba(91,225,255,0.1)',
                borderLeft: '3px solid rgba(91,225,255,0.3)',
              }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  marginBottom: '8px'
                }}>
                  <div style={{ 
                    fontSize: '14px', 
                    fontWeight: '500',
                    color: 'var(--ink-high)'
                  }}>
                    {event.event?.type === 'click' ? '🖱️ Click' :
                     event.event?.type === 'input' ? '⌨️ Input' :
                     event.event?.type === 'navigation' ? '🧭 Navigation' :
                     event.type === 'browser_event' ? '🎯 Interaction' : '📡 Event'}
                  </div>
                  <div style={{ 
                    fontSize: '12px', 
                    color: 'var(--ink-mid)',
                    opacity: 0.8
                  }}>
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </div>
                </div>
                
                <div style={{ fontSize: '13px', color: 'var(--ink-mid)', lineHeight: '1.4' }}>
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
        background: 'rgba(0,0,0,0.3)',
        borderRadius: '8px',
        border: '1px solid rgba(91,225,255,0.1)',
        fontSize: '12px',
        color: 'var(--ink-mid)',
        textAlign: 'center'
      }}>
        {extensionConnected ? (
          <>✅ Extension connected • Live monitoring active</>
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

/* -------------------- Ask Phase -------------------- */
function AskPhase() {
  return (
    <div style={{ 
      height: '100%', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(91,225,255,0.15)',
      borderRadius: '16px',
      padding: '24px',
      backdropFilter: 'blur(20px)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
    }}>
      <div style={{ textAlign: 'center', color: 'var(--ink-mid)' }}>
        <h2 style={{ fontSize: '24px', marginBottom: '16px', color: 'var(--ink-high)' }}>Ask Phase</h2>
        <p>Identify optimization opportunities from captured workflows</p>
      </div>
    </div>
  );
}

/* -------------------- Redesign Phase -------------------- */
function RedesignPhase() {
  return (
    <div style={{ 
      height: '100%', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(91,225,255,0.15)',
      borderRadius: '16px',
      padding: '24px',
      backdropFilter: 'blur(20px)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
    }}>
      <div style={{ textAlign: 'center', color: 'var(--ink-mid)' }}>
        <h2 style={{ fontSize: '24px', marginBottom: '16px', color: 'var(--ink-high)' }}>Redesign Phase</h2>
        <p>Create optimized workflows from captured data</p>
      </div>
    </div>
  );
}

/* -------------------- Automate Phase -------------------- */
function AutomatePhase() {
  return (
    <div style={{ 
      height: '100%', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(91,225,255,0.15)',
      borderRadius: '16px',
      padding: '24px',
      backdropFilter: 'blur(20px)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
    }}>
      <div style={{ textAlign: 'center', color: 'var(--ink-mid)' }}>
        <h2 style={{ fontSize: '24px', marginBottom: '16px', color: 'var(--ink-high)' }}>Automate Phase</h2>
        <p>Execute automated processes based on optimized workflows</p>
      </div>
    </div>
  );
}

/* -------------------- Chat Module -------------------- */
function ChatModule({ sid }: { sid: string }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load chat history on mount
  useEffect(() => {
    const loadChatHistory = async () => {
      try {
        const response = await fetch(`/api/chat-logs?sessionId=${sid}`);
        if (response.ok) {
          const data = await response.json();
          setMessages(data.messages || []);
        }
      } catch (err) {
        console.error('Failed to load chat history:', err);
      }
    };

    if (sid) {
      loadChatHistory();
    }
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
        body: JSON.stringify({
          sessionId: sid,
          message: message,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const agentMessage = {
          id: uuidv4(),
          sessionId: sid,
          sender: 'agent' as const,
          text: data.response,
          ts: new Date().toISOString(),
        };
        setMessages(prev => [...prev, agentMessage]);
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
      background: 'rgba(0,0,0,0.4)',
      border: '1px solid rgba(91,225,255,0.15)',
      borderRadius: '16px',
      padding: '24px',
      backdropFilter: 'blur(20px)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)',
    }}>
      {/* Header */}
      <div style={{ 
        marginBottom: '20px',
        paddingBottom: '16px',
        borderBottom: '1px solid rgba(91,225,255,0.1)'
      }}>
        <h2 style={{ 
          fontSize: '20px', 
          margin: 0, 
          color: 'var(--ink-high)', 
          fontWeight: '600' 
        }}>
          AI Assistant
        </h2>
        <p style={{ 
          fontSize: '14px', 
          color: 'var(--ink-mid)', 
          margin: '4px 0 0 0',
          opacity: 0.8
        }}>
          Workflow optimization and automation guidance
        </p>
      </div>

      {/* Messages */}
      <div style={{ 
        flex: 1,
        overflowY: 'auto',
        marginBottom: '20px',
        paddingRight: '8px',
      }}>
        {messages.length === 0 ? (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            height: '100%',
            color: 'var(--ink-mid)',
            textAlign: 'center',
            opacity: 0.7
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
                  background: msg.sender === 'user' 
                    ? 'rgba(91,225,255,0.2)' 
                    : 'rgba(255,158,74,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: msg.sender === 'user' ? '#5BE1FF' : '#FF9E4A',
                  flexShrink: 0,
                }}>
                  {msg.sender === 'user' ? 'U' : 'AI'}
                </div>
                <div style={{
                  maxWidth: '70%',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  background: msg.sender === 'user' 
                    ? 'rgba(91,225,255,0.1)' 
                    : 'rgba(255,255,255,0.05)',
                  border: msg.sender === 'user' 
                    ? '1px solid rgba(91,225,255,0.2)' 
                    : '1px solid rgba(255,255,255,0.1)',
                  color: 'var(--ink-high)',
                  fontSize: '14px',
                  lineHeight: '1.5',
                }}>
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm, remarkBreaks]}
                    components={{
                      code: ({ children, ...props }: any) => (
                        <code 
                          style={{
                            background: 'rgba(0,0,0,0.3)',
                            color: '#5BE1FF',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '13px',
                            fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
                          }}
                          {...props}
                        >
                          {children}
                        </code>
                      ),
                      pre: ({ children, ...props }: any) => (
                        <pre 
                          style={{
                            background: 'rgba(0,0,0,0.4)',
                            color: '#5BE1FF',
                            padding: '12px',
                            borderRadius: '8px',
                            overflowX: 'auto',
                            fontSize: '13px',
                            fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
                            border: '1px solid rgba(91,225,255,0.2)',
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
                  <div style={{ 
                    fontSize: '11px', 
                    color: 'var(--ink-mid)', 
                    marginTop: '8px',
                    opacity: 0.7
                  }}>
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
                color: 'var(--ink-mid)',
                fontSize: '14px',
                fontStyle: 'italic'
              }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'rgba(255,158,74,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#FF9E4A',
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
          background: 'rgba(255,68,68,0.1)',
          border: '1px solid rgba(255,68,68,0.3)',
          borderRadius: '8px',
          color: '#ff4444',
          fontSize: '14px',
          marginBottom: '16px',
        }}>
          {error}
        </div>
      )}

      {/* Chat Input */}
      <div style={{
        background: 'rgba(0,0,0,0.3)',
        border: '1px solid rgba(91,225,255,0.2)',
        borderRadius: '12px',
        padding: '16px',
      }}>
        <ChatInput onSend={handleSend} loading={loading} error={error} />
      </div>
    </div>
  );
}

/* -------------------- Observe Module Wrapper -------------------- */
function ObserveModuleWrapper() {
  return (
    <div style={{ 
      height: '100%', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(91,225,255,0.15)',
      borderRadius: '16px',
      padding: '24px',
      backdropFilter: 'blur(20px)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
    }}>
      <div style={{ textAlign: 'center', color: 'var(--ink-mid)' }}>
        <h2 style={{ fontSize: '24px', marginBottom: '16px', color: 'var(--ink-high)' }}>Observe Module</h2>
        <p>Review recordings and automation rules</p>
      </div>
    </div>
  );
}

export default function Home() {
  const [sid, setSid] = useState<string>('');
  const [activePhase, setActivePhase] = useState('watch');

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
      background: 'linear-gradient(135deg, #070a12 0%, #0a0a0a 50%, #0d0d0d 100%)',
    }}>
      <Grid3DBackdrop />

      {/* Left Sidebar */}
      <LeftSidebar activePhase={activePhase} setActivePhase={setActivePhase} />

      {/* Main Content - Reserve space for sidebars */}
      <div style={{
        position: 'absolute',
        top: '0px',
        left: '60px', // Reserve space for left sidebar
        right: '280px', // Reserve space for right sidebar (reduced from 360px)
        bottom: '0px',
        overflow: 'hidden',
        padding: '24px'
      }}>
        {activePhase === 'watch' && <WatchPhase sessionId={sid} />}
        {activePhase === 'ask' && <AskPhase />}
        {activePhase === 'redesign' && <RedesignPhase />}
        {activePhase === 'automate' && <AutomatePhase />}
        {activePhase === 'chat' && sid ? <ChatModule sid={sid} /> : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--ink-mid)' }}>Loading session...</div>}
        {activePhase === 'observe' && <ObserveModuleWrapper />}
      </div>

      {/* Right Sidebar - Fixed Position */}
      <aside
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: 280,
          zIndex: 1000,
          borderLeft: '1px solid rgba(255,158,74,0.2)',
          background: 'rgba(255,255,255,0.03)',
          backdropFilter: 'blur(20px)',
          overflow: 'auto',
          boxShadow: '0 0 30px rgba(255,158,74,0.1)',
        }}
      >
        {sid ? <SearchPanel sessionId={sid} /> : <div style={{ padding: 16, color: 'var(--ink-mid)' }}>Loading…</div>}
      </aside>
    </div>
  );
}
