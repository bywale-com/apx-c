import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';

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

interface VideoEventSyncProps {
  videoUrl: string;
  events: BrowserEvent[];
  recordingId: string;
  onEventSelect?: (event: BrowserEvent) => void;
  onTimelineUpdate?: (currentTime: number) => void;
}

const VideoEventSync: React.FC<VideoEventSyncProps> = ({
  videoUrl,
  events,
  recordingId,
  onEventSelect,
  onTimelineUpdate
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [selectedEvent, setSelectedEvent] = useState<BrowserEvent | null>(null);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showEventDetails, setShowEventDetails] = useState(false);

  // Sort events by timestamp
  const sortedEvents = [...events].sort((a, b) => a.timestamp - b.timestamp);
  
  // Calculate relative timestamps (assuming first event is at 0)
  const startTime = sortedEvents.length > 0 ? sortedEvents[0].timestamp : 0;
  const relativeEvents = sortedEvents.map(event => ({
    ...event,
    relativeTime: event.timestamp - startTime
  }));

  // Video event handlers
  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current) {
      const time = videoRef.current.currentTime;
      setCurrentTime(time);
      onTimelineUpdate?.(time);
    }
  }, [onTimelineUpdate]);

  const handleLoadedMetadata = useCallback(() => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  }, []);

  const handlePlay = useCallback(() => {
    setIsPlaying(true);
  }, []);

  const handlePause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  // Timeline interaction
  const handleTimelineClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current || !videoRef.current) return;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickTime = (clickX / rect.width) * duration;
    
    videoRef.current.currentTime = clickTime;
    setCurrentTime(clickTime);
  }, [duration]);

  // Event selection
  const handleEventClick = useCallback((event: BrowserEvent) => {
    setSelectedEvent(event);
    onEventSelect?.(event);
    
    // Jump to event time in video
    if (videoRef.current && event.relativeTime !== undefined) {
      videoRef.current.currentTime = event.relativeTime / 1000; // Convert ms to seconds
    }
  }, [onEventSelect]);

  // Event type styling
  const getEventColor = (type: string) => {
    const colors = {
      click: '#38E1FF',
      input: '#FF9E4A', 
      navigate: '#8B1538',
      scroll: '#FF6B6B',
      key: '#5BE1FF',
      submit: '#8B1538',
      page_load: '#FF9E4A'
    };
    return colors[type as keyof typeof colors] || '#666';
  };

  const getEventIcon = (type: string) => {
    const icons = {
      click: '🖱️',
      input: '⌨️',
      navigate: '🧭',
      scroll: '📜',
      key: '🔑',
      submit: '📤',
      page_load: '📄'
    };
    return icons[type as keyof typeof icons] || '❓';
  };

  // Calculate event position on timeline
  const getEventPosition = (event: BrowserEvent & { relativeTime: number }) => {
    if (duration === 0) return 0;
    return (event.relativeTime / 1000) / duration * 100; // Convert to percentage
  };

  return (
    <div className="video-event-sync-container" style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      backgroundColor: '#0b0b0b',
      color: '#ffffff',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      {/* Header */}
      <div style={{
        padding: '20px',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '300' }}>
            Workflow Analysis: {recordingId}
          </h2>
          <p style={{ margin: '8px 0 0 0', color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem' }}>
            {events.length} events captured • {duration > 0 ? `${Math.round(duration)}s` : 'Loading...'} duration
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button
            onClick={() => setShowEventDetails(!showEventDetails)}
            style={{
              padding: '8px 16px',
              backgroundColor: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '6px',
              color: '#ffffff',
              cursor: 'pointer',
              fontSize: '0.9rem'
            }}
          >
            {showEventDetails ? 'Hide' : 'Show'} Details
          </button>
          
          <select
            value={playbackSpeed}
            onChange={(e) => {
              const speed = parseFloat(e.target.value);
              setPlaybackSpeed(speed);
              if (videoRef.current) {
                videoRef.current.playbackRate = speed;
              }
            }}
            style={{
              padding: '8px 12px',
              backgroundColor: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '6px',
              color: '#ffffff',
              fontSize: '0.9rem'
            }}
          >
            <option value={0.5}>0.5x</option>
            <option value={1}>1x</option>
            <option value={1.5}>1.5x</option>
            <option value={2}>2x</option>
          </select>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Video Player */}
        <div style={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column',
          backgroundColor: '#000000'
        }}>
          <video
            ref={videoRef}
            src={videoUrl}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain'
            }}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onPlay={handlePlay}
            onPause={handlePause}
            controls
          />
          
          {/* Custom Timeline */}
          <div style={{
            padding: '20px',
            backgroundColor: 'rgba(0,0,0,0.8)',
            borderTop: '1px solid rgba(255,255,255,0.1)'
          }}>
            <div
              ref={timelineRef}
              style={{
                position: 'relative',
                height: '60px',
                backgroundColor: 'rgba(255,255,255,0.1)',
                borderRadius: '8px',
                cursor: 'pointer',
                overflow: 'hidden'
              }}
              onClick={handleTimelineClick}
            >
              {/* Timeline Background */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
                backgroundSize: '20px 100%'
              }} />
              
              {/* Current Time Indicator */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: `${(currentTime / duration) * 100}%`,
                  width: '2px',
                  height: '100%',
                  backgroundColor: '#38E1FF',
                  boxShadow: '0 0 8px rgba(56, 225, 255, 0.6)'
                }}
              />
              
              {/* Event Markers */}
              {relativeEvents.map((event, index) => (
                <motion.div
                  key={`${event.timestamp}-${index}`}
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: `${getEventPosition(event)}%`,
                    transform: 'translate(-50%, -50%)',
                    width: '12px',
                    height: '12px',
                    backgroundColor: getEventColor(event.type),
                    borderRadius: '50%',
                    cursor: 'pointer',
                    border: '2px solid rgba(255,255,255,0.8)',
                    boxShadow: '0 0 8px rgba(0,0,0,0.3)',
                    zIndex: 10
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEventClick(event);
                  }}
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.9 }}
                  animate={{
                    boxShadow: selectedEvent?.timestamp === event.timestamp 
                      ? '0 0 16px rgba(56, 225, 255, 0.8)' 
                      : '0 0 8px rgba(0,0,0,0.3)'
                  }}
                />
              ))}
              
              {/* Time Labels */}
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                display: 'flex',
                justifyContent: 'space-between',
                padding: '8px 0',
                fontSize: '0.8rem',
                color: 'rgba(255,255,255,0.6)'
              }}>
                <span>0s</span>
                <span>{Math.round(duration)}s</span>
              </div>
            </div>
          </div>
        </div>

        {/* Event Panel */}
        <div style={{
          width: '400px',
          backgroundColor: 'rgba(255,255,255,0.05)',
          borderLeft: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{
            padding: '20px',
            borderBottom: '1px solid rgba(255,255,255,0.1)'
          }}>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '400' }}>
              Event Timeline
            </h3>
            <p style={{ 
              margin: '8px 0 0 0', 
              color: 'rgba(255,255,255,0.7)', 
              fontSize: '0.9rem' 
            }}>
              Click events to jump to that moment
            </p>
          </div>
          
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px'
          }}>
            {relativeEvents.map((event, index) => (
              <motion.div
                key={`${event.timestamp}-${index}`}
                style={{
                  padding: '12px',
                  marginBottom: '8px',
                  backgroundColor: selectedEvent?.timestamp === event.timestamp 
                    ? 'rgba(56, 225, 255, 0.1)' 
                    : 'rgba(255,255,255,0.05)',
                  border: selectedEvent?.timestamp === event.timestamp 
                    ? '1px solid rgba(56, 225, 255, 0.3)' 
                    : '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onClick={() => handleEventClick(event)}
                whileHover={{ backgroundColor: 'rgba(255,255,255,0.08)' }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: '8px'
                }}>
                  <span style={{ fontSize: '1.2rem' }}>
                    {getEventIcon(event.type)}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontSize: '0.9rem',
                      fontWeight: '500',
                      textTransform: 'capitalize',
                      color: getEventColor(event.type)
                    }}>
                      {event.type.replace('_', ' ')}
                    </div>
                    <div style={{
                      fontSize: '0.8rem',
                      color: 'rgba(255,255,255,0.6)'
                    }}>
                      {Math.round(event.relativeTime / 1000)}s
                    </div>
                  </div>
                </div>
                
                {showEventDetails && (
                  <div style={{
                    fontSize: '0.8rem',
                    color: 'rgba(255,255,255,0.8)',
                    lineHeight: 1.4
                  }}>
                    {event.element && (
                      <div style={{ marginBottom: '4px' }}>
                        <strong>Element:</strong> {event.element.selector}
                      </div>
                    )}
                    {event.value && (
                      <div style={{ marginBottom: '4px' }}>
                        <strong>Value:</strong> {event.value.slice(0, 50)}
                        {event.value.length > 50 && '...'}
                      </div>
                    )}
                    {event.url && (
                      <div style={{ marginBottom: '4px' }}>
                        <strong>URL:</strong> {event.url.slice(0, 40)}...
                      </div>
                    )}
                    {event.coordinates && (
                      <div>
                        <strong>Position:</strong> ({event.coordinates.x}, {event.coordinates.y})
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoEventSync;

