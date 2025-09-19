import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import VideoEventSync from '../components/VideoEventSync';

interface BrowserEvent {
  type: 'click' | 'input' | 'navigate' | 'scroll' | 'key' | 'submit' | 'page_load';
  timestamp: number;
  element?: {
    tag: string;
    id?: string;
    className?: string;
    text?: string;
    selector: string;
    role?: string;
    type?: string;
    name?: string;
    placeholder?: string;
  };
  coordinates?: { x: number; y: number };
  value?: string;
  url?: string;
  sessionId: string;
  __apxFp?: string;
}

interface WorkflowSession {
  sessionId: string;
  startTime: number;
  endTime: number;
  events: BrowserEvent[];
  videoUrl?: string;
  recordingId?: string;
  recordingStartTimestamp?: number;
  metadata: {
    totalEvents: number;
    duration: number;
    urls: string[];
    eventTypes: Record<string, number>;
  };
}

export default function WorkflowAnalysis() {
  const [sessions, setSessions] = useState<WorkflowSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<WorkflowSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/extension-events?action=get_workflow_sessions');
      const data = await response.json();
      
      if (response.ok) {
        // Transform the data to match our interface
        const transformedSessions = data.sessions.map((session: any) => ({
          sessionId: session.sessionId,
          startTime: session.startTime,
          endTime: session.lastEventTime,
          events: [], // Will be loaded separately
          videoUrl: undefined, // TODO: Link with recordings
          recordingId: session.sessionId,
          metadata: {
            totalEvents: session.eventCount,
            duration: session.duration,
            urls: [], // Will be extracted from events
            eventTypes: {} // Will be calculated from events
          }
        }));
        setSessions(transformedSessions);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  const loadSessionDetails = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/extension-events?action=get_workflow_session&sessionId=${sessionId}`);
      const data = await response.json();
      
      if (response.ok) {
        // Transform the data to match our interface
        const events = data.events || [];
        const urls = [...new Set(events.map((e: any) => e.url).filter(Boolean))];
        const eventTypes = events.reduce((acc: any, event: any) => {
          acc[event.type] = (acc[event.type] || 0) + 1;
          return acc;
        }, {});
        
        const transformedSession: WorkflowSession = {
          sessionId: data.sessionId,
          startTime: data.startTime,
          endTime: data.lastEventTime,
          events: events,
          videoUrl: undefined, // TODO: Link with recordings
          recordingId: data.sessionId,
          metadata: {
            totalEvents: events.length,
            duration: data.lastEventTime - data.startTime,
            urls: urls,
            eventTypes: eventTypes
          }
        };
        
        setSelectedSession(transformedSession);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to load session details');
    }
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.round(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#0b0b0b',
        color: '#ffffff'
      }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          style={{
            width: '40px',
            height: '40px',
            border: '3px solid rgba(255,255,255,0.3)',
            borderTop: '3px solid #38E1FF',
            borderRadius: '50%'
          }}
        />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#0b0b0b',
        color: '#ffffff',
        flexDirection: 'column',
        gap: '20px'
      }}>
        <div style={{ fontSize: '1.2rem', color: '#FF6B6B' }}>
          Error: {error}
        </div>
        <button
          onClick={loadSessions}
          style={{
            padding: '12px 24px',
            backgroundColor: '#38E1FF',
            border: 'none',
            borderRadius: '6px',
            color: '#000000',
            cursor: 'pointer',
            fontSize: '1rem',
            fontWeight: '500'
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (selectedSession) {
    return (
      <div style={{ height: '100vh' }}>
        <div style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          zIndex: 1000
        }}>
          <button
            onClick={() => setSelectedSession(null)}
            style={{
              padding: '8px 16px',
              backgroundColor: 'rgba(0,0,0,0.8)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '6px',
              color: '#ffffff',
              cursor: 'pointer',
              fontSize: '0.9rem'
            }}
          >
            ← Back to Sessions
          </button>
        </div>
        
        <VideoEventSync
          videoUrl={selectedSession.videoUrl || ''}
          events={selectedSession.events}
          recordingId={selectedSession.recordingId || selectedSession.sessionId}
          recordingStartTimestamp={selectedSession.recordingStartTimestamp}
          onEventSelect={(event) => {
            console.log('Selected event:', event);
          }}
          onTimelineUpdate={(time) => {
            // Handle timeline updates if needed
          }}
        />
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0b0b0b',
      color: '#ffffff',
      padding: '40px 20px'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 style={{
            fontSize: '2.5rem',
            fontWeight: '300',
            marginBottom: '20px',
            letterSpacing: '-1px'
          }}>
            Workflow Analysis
          </h1>
          
          <p style={{
            fontSize: '1.1rem',
            color: 'rgba(255,255,255,0.8)',
            marginBottom: '40px',
            lineHeight: 1.6
          }}>
            Analyze captured workflows with synchronized video and event data. 
            Click on any session to view the detailed timeline and identify automation opportunities.
          </p>
        </motion.div>

        {sessions.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            style={{
              textAlign: 'center',
              padding: '80px 20px',
              backgroundColor: 'rgba(255,255,255,0.05)',
              borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.1)'
            }}
          >
            <div style={{ fontSize: '3rem', marginBottom: '20px' }}>📊</div>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '12px' }}>
              No Workflow Sessions Yet
            </h3>
            <p style={{ color: 'rgba(255,255,255,0.7)', marginBottom: '30px' }}>
              Start recording workflows with the Apex browser extension to see them here.
            </p>
            <button
              onClick={() => window.location.href = '/'}
              style={{
                padding: '12px 24px',
                backgroundColor: '#38E1FF',
                border: 'none',
                borderRadius: '6px',
                color: '#000000',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: '500'
              }}
            >
              Go to Homepage
            </button>
          </motion.div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
            gap: '24px'
          }}>
            {sessions.map((session, index) => (
              <motion.div
                key={session.sessionId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                style={{
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  padding: '24px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onClick={() => loadSessionDetails(session.sessionId)}
                whileHover={{
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  borderColor: 'rgba(56, 225, 255, 0.3)',
                  transform: 'translateY(-2px)'
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '16px'
                }}>
                  <div>
                    <h3 style={{
                      fontSize: '1.2rem',
                      fontWeight: '500',
                      margin: '0 0 8px 0',
                      color: '#38E1FF'
                    }}>
                      Session {session.sessionId.slice(-8)}
                    </h3>
                    <p style={{
                      fontSize: '0.9rem',
                      color: 'rgba(255,255,255,0.6)',
                      margin: 0
                    }}>
                      {formatDate(session.startTime)}
                    </p>
                  </div>
                  
                  <div style={{
                    fontSize: '0.8rem',
                    color: 'rgba(255,255,255,0.5)',
                    textAlign: 'right'
                  }}>
                    {formatDuration(session.duration)}
                  </div>
                </div>

                <div style={{
                  display: 'flex',
                  gap: '16px',
                  marginBottom: '16px'
                }}>
                  <div style={{
                    fontSize: '0.9rem',
                    color: 'rgba(255,255,255,0.8)'
                  }}>
                    <strong>{session.totalEvents}</strong> events
                  </div>
                  <div style={{
                    fontSize: '0.9rem',
                    color: 'rgba(255,255,255,0.8)'
                  }}>
                    <strong>{session.urls.length}</strong> pages
                  </div>
                </div>

                <div style={{
                  fontSize: '0.8rem',
                  color: 'rgba(255,255,255,0.6)',
                  marginBottom: '16px'
                }}>
                  {session.urls.slice(0, 2).map(url => (
                    <div key={url} style={{ marginBottom: '4px' }}>
                      {url.length > 50 ? `${url.slice(0, 50)}...` : url}
                    </div>
                  ))}
                  {session.urls.length > 2 && (
                    <div>+{session.urls.length - 2} more pages</div>
                  )}
                </div>

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div style={{
                    fontSize: '0.8rem',
                    color: 'rgba(255,255,255,0.5)'
                  }}>
                    Click to analyze →
                  </div>
                  
                  <div style={{
                    width: '8px',
                    height: '8px',
                    backgroundColor: '#38E1FF',
                    borderRadius: '50%',
                    opacity: 0.8
                  }} />
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
