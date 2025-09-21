import React, { useState, useRef, useEffect, useCallback } from 'react';
import SimpleWorkflowGenerator, { WorkflowStep as GeneratedStep } from './SimpleWorkflowGenerator';

export type WorkflowStep = {
  id: string;
  label: string;
  start?: number; // seconds
  end?: number;   // seconds
  x?: number; // canvas position
  y?: number; // canvas position
  action?: string; // BPMN-style action
  details?: string; // Additional details
  timestamp?: number; // Original event timestamp
  duration?: number; // Duration to next step
  metadata?: any; // Original event data
  element?: any; // Element info for interaction
  type?: 'start' | 'process' | 'decision' | 'end' | 'parallel' | 'exclusive'; // BPMN shape type
};

interface WorkflowBuilderProps {
  steps: WorkflowStep[];
  currentTime: number;
  onAdd?: () => void;
  onRename?: (id: string, next: string) => void;
  onUpdateSteps?: (steps: WorkflowStep[]) => void;
  events?: any[];
  onSeekToTime?: (timeInSeconds: number) => void;
  sessionId?: string;
  isDemoMode?: boolean;
  onToggleDemo?: () => void;
  recordingStartTimestamp?: number; // When the video recording actually started
}

// N8N-Style Node Helper Functions
const getN8NNodeStyle = (step: WorkflowStep, isActive: boolean, isHovered: boolean) => {
  const isScrollAction = step.action?.toLowerCase().includes('scroll');
  const isClickAction = step.action?.toLowerCase().includes('click');
  const isInputAction = step.action?.toLowerCase().includes('enter') || step.action?.toLowerCase().includes('fill');
  
  return {
    // N8N-style rectangular nodes with rounded corners
    borderRadius: '8px',
    // Different colors for different action types
    borderColor: isScrollAction ? 'rgba(255,193,7,0.8)' : 
                 isClickAction ? 'rgba(40,167,69,0.8)' : 
                 isInputAction ? 'rgba(0,123,255,0.8)' : 
                 'rgba(108,117,125,0.8)',
    backgroundColor: isActive ? 'rgba(255,255,255,0.15)' : 
                    isHovered ? 'rgba(255,255,255,0.08)' : 
                    'rgba(255,255,255,0.05)',
    // Add icon indicator for action type
    position: 'relative' as const
  };
};

const getActionIcon = (step: WorkflowStep) => {
  const action = step.action?.toLowerCase() || '';
  if (action.includes('scroll')) return '🔄';
  if (action.includes('click')) return '👆';
  if (action.includes('enter') || action.includes('fill')) return '✏️';
  if (action.includes('navigate')) return '🌐';
  return '⚡';
};

export default function WorkflowBuilder({ steps, currentTime, onAdd, onRename, onUpdateSteps, events, onSeekToTime, sessionId, isDemoMode = false, onToggleDemo, recordingStartTimestamp }: WorkflowBuilderProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [draggedNode, setDraggedNode] = useState<string | null>(null);
  const [nodeDragStart, setNodeDragStart] = useState({ x: 0, y: 0 });
  const [hoveredStep, setHoveredStep] = useState<string | null>(null);
  const [showMetadata, setShowMetadata] = useState<string | null>(null);

  // Smart auto-layout algorithm for workflow nodes with VERY generous spacing
  const calculateOptimalLayout = (steps: WorkflowStep[]) => {
    const NODE_WIDTH = 280;
    const NODE_HEIGHT = 80;
    const HORIZONTAL_SPACING = 400; // HUGE space between nodes horizontally
    const VERTICAL_SPACING = 250;   // HUGE space between nodes vertically
    const START_X = 100;
    const START_Y = 100;
    
    // Force maximum 2 nodes per row for very spacious layout
    const stepsPerRow = 2; // Always 2 columns max
    const maxRows = Math.ceil(steps.length / stepsPerRow);
    
    return steps.map((step, index) => {
      const row = Math.floor(index / stepsPerRow);
      const col = index % stepsPerRow;
      
      // Center the last row if it has fewer items
      const itemsInLastRow = steps.length - (maxRows - 1) * stepsPerRow;
      const isLastRow = row === maxRows - 1;
      const offsetX = isLastRow && itemsInLastRow < stepsPerRow 
        ? (stepsPerRow - itemsInLastRow) * (NODE_WIDTH + HORIZONTAL_SPACING) / 2 
        : 0;
      
      return {
        ...step,
        x: START_X + col * (NODE_WIDTH + HORIZONTAL_SPACING) + offsetX,
        y: START_Y + row * (NODE_HEIGHT + VERTICAL_SPACING)
      };
    });
  };

  // Initialize node positions with smart auto-layout
  useEffect(() => {
    if (onUpdateSteps && steps.some(step => step.x === undefined || step.y === undefined)) {
      const updatedSteps = calculateOptimalLayout(steps);
      onUpdateSteps(updatedSteps);
    }
  }, [steps, onUpdateSteps]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(prev => Math.max(0.1, Math.min(3, prev * delta)));
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.target === canvasRef.current) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging && !draggedNode) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  }, [isDragging, dragStart, draggedNode]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDraggedNode(null);
  }, []);

  const handleNodeMouseDown = useCallback((e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    setDraggedNode(nodeId);
    setNodeDragStart({ x: e.clientX, y: e.clientY });
  }, []);

  const handleNodeMouseMove = useCallback((e: React.MouseEvent, nodeId: string) => {
    if (draggedNode === nodeId && onUpdateSteps) {
      const deltaX = (e.clientX - nodeDragStart.x) / zoom;
      const deltaY = (e.clientY - nodeDragStart.y) / zoom;
      
      const updatedSteps = steps.map(step => 
        step.id === nodeId 
          ? { ...step, x: (step.x || 0) + deltaX, y: (step.y || 0) + deltaY }
          : step
      );
      onUpdateSteps(updatedSteps);
      setNodeDragStart({ x: e.clientX, y: e.clientY });
    }
  }, [draggedNode, nodeDragStart, zoom, steps, onUpdateSteps]);

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const zoomIn = () => setZoom(prev => Math.min(3, prev * 1.2));
  const zoomOut = () => setZoom(prev => Math.max(0.1, prev / 1.2));

  const handleWorkflowGenerated = useCallback((generatedSteps: GeneratedStep[]) => {
    if (onUpdateSteps) {
      const workflowSteps: WorkflowStep[] = generatedSteps.map((step, index) => ({
        id: step.id,
        label: step.action,
        action: step.action,
        details: step.details,
        timestamp: step.timestamp,
        duration: step.duration,
        metadata: step.metadata,
        element: step.element,
        // Don't set x,y here - let the auto-layout algorithm handle positioning
        start: step.timestamp ? step.timestamp / 1000 : undefined,
        end: step.duration ? (step.timestamp ? (step.timestamp + step.duration * 1000) / 1000 : undefined) : undefined
      }));
      onUpdateSteps(workflowSteps);
    }
  }, [onUpdateSteps]);

  const handleStepClick = useCallback((step: WorkflowStep) => {
    if (step.timestamp && onSeekToTime) {
      const timeInSeconds = step.timestamp / 1000;
      onSeekToTime(timeInSeconds);
    }
  }, [onSeekToTime]);

  const handleStepDoubleClick = useCallback((step: WorkflowStep) => {
    setShowMetadata(showMetadata === step.id ? null : step.id);
  }, [showMetadata]);

  // Function to render arrows between nodes with smart routing
  const renderArrows = () => {
    const arrows = [];
    
    // Add marker definition once
    arrows.push(
      <defs key="arrow-defs">
        <marker
          id="arrowhead"
          markerWidth="12"
          markerHeight="8"
          refX="10"
          refY="4"
          orient="auto"
        >
          <polygon
            points="0 0, 12 4, 0 8"
            fill="rgba(56,225,255,1)"
            stroke="rgba(56,225,255,0.8)"
            strokeWidth="1"
          />
        </marker>
      </defs>
    );
    
    // Add arrow paths with intelligent routing
    for (let i = 0; i < steps.length - 1; i++) {
      const currentStep = steps[i];
      const nextStep = steps[i + 1];
      
      if (!currentStep.x || !currentStep.y || !nextStep.x || !nextStep.y) continue;
      
      // Calculate arrow positions
      const startX = currentStep.x + 280; // Right edge of current node
      const startY = currentStep.y + 40; // Middle of current node
      const endX = nextStep.x; // Left edge of next node
      const endY = nextStep.y + 40; // Middle of next node
      
      // Smart routing based on relative positions
      let path;
      const deltaX = endX - startX;
      const deltaY = endY - startY;
      
      if (Math.abs(deltaY) < 20) {
        // Horizontal connection - straight line
        path = `M ${startX} ${startY} L ${endX} ${endY}`;
      } else if (deltaX > 0) {
        // Rightward flow - L-shaped path
        const midX = startX + deltaX * 0.5;
        path = `M ${startX} ${startY} L ${midX} ${startY} L ${midX} ${endY} L ${endX} ${endY}`;
      } else {
        // Upward/downward flow - U-shaped path
        const midY = (startY + endY) / 2;
        const offsetX = 60; // Offset for U-shape
        path = `M ${startX} ${startY} L ${startX + offsetX} ${startY} L ${startX + offsetX} ${midY} L ${endX - offsetX} ${midY} L ${endX - offsetX} ${endY} L ${endX} ${endY}`;
      }
      
      arrows.push(
        <path
          key={`arrow-${i}`}
          d={path}
          stroke="rgba(56,225,255,0.9)"
          strokeWidth="3"
          fill="none"
          markerEnd="url(#arrowhead)"
          style={{ filter: 'drop-shadow(0 0 4px rgba(56,225,255,0.3))' }}
        />
      );
    }
    return arrows;
  };

  return (
    <>
      <style>{`
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes loadingPulse {
          0% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.05); }
          100% { opacity: 0.6; transform: scale(1); }
        }
      `}</style>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.12)' }}>
        <div style={{ fontWeight: 600, color: 'rgba(255,255,255,0.9)' }}>Workflow Canvas</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={zoomOut} style={{ padding: '4px 8px', borderRadius: 4, border: '1px solid rgba(255,255,255,0.22)', background: 'rgba(255,255,255,0.08)', color: '#fff', cursor: 'pointer', fontSize: 12 }}>
            −
          </button>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', minWidth: 40, textAlign: 'center' }}>
            {Math.round(zoom * 100)}%
          </span>
          <button onClick={zoomIn} style={{ padding: '4px 8px', borderRadius: 4, border: '1px solid rgba(255,255,255,0.22)', background: 'rgba(255,255,255,0.08)', color: '#fff', cursor: 'pointer', fontSize: 12 }}>
            +
          </button>
          <button onClick={resetView} style={{ padding: '4px 8px', borderRadius: 4, border: '1px solid rgba(255,255,255,0.22)', background: 'rgba(255,255,255,0.08)', color: '#fff', cursor: 'pointer', fontSize: 12 }}>
            Reset
          </button>
          <button 
            onClick={() => {
              if (onUpdateSteps) {
                const reorganizedSteps = calculateOptimalLayout(steps);
                onUpdateSteps(reorganizedSteps);
              }
            }}
            style={{ padding: '4px 8px', borderRadius: 4, border: '1px solid rgba(255,255,255,0.22)', background: 'rgba(255,255,255,0.08)', color: '#fff', cursor: 'pointer', fontSize: 12 }}
          >
            ↻ Reorganize
          </button>
          <button 
            onClick={() => {
              if (onToggleDemo) {
                onToggleDemo();
              }
            }}
            style={{ 
              padding: '6px 10px', 
              borderRadius: 6, 
              border: `1px solid ${isDemoMode ? 'rgba(56,225,255,0.8)' : 'rgba(56,225,255,0.4)'}`, 
              background: isDemoMode ? 'rgba(56,225,255,0.25)' : 'rgba(56,225,255,0.15)', 
              color: '#fff', 
              cursor: 'pointer', 
              fontSize: 12 
            }}
          >
            {isDemoMode ? '⏸ Stop Demo' : '▶ Demo'}
          </button>
          <button 
            onClick={() => {
              // TODO: Implement run mode
              console.log('Run mode toggled');
            }}
            style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid rgba(40,167,69,0.4)', background: 'rgba(40,167,69,0.15)', color: '#fff', cursor: 'pointer', fontSize: 12 }}
          >
            🚀 Run
          </button>
          <button onClick={onAdd} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.22)', background: 'rgba(255,255,255,0.08)', color: '#fff', cursor: 'pointer', fontSize: 12 }}>
            + Add Step
          </button>
        </div>
      </div>

      {/* Simple Workflow Generator */}
      {events && events.length > 0 && (
        <div style={{ padding: '12px', borderBottom: '1px solid rgba(255,255,255,0.12)' }}>
          <SimpleWorkflowGenerator
            events={events}
            onWorkflowGenerated={handleWorkflowGenerated}
            sessionId={sessionId}
          />
        </div>
      )}

      {/* Canvas */}
      <div 
        ref={canvasRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        style={{ 
          flex: 1, 
          overflow: 'hidden', 
          position: 'relative',
          background: 'linear-gradient(45deg, rgba(255,255,255,0.02) 25%, transparent 25%), linear-gradient(-45deg, rgba(255,255,255,0.02) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, rgba(255,255,255,0.02) 75%), linear-gradient(-45deg, transparent 75%, rgba(255,255,255,0.02) 75%)',
          backgroundSize: '20px 20px',
          backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
          cursor: isDragging ? 'grabbing' : 'grab',
          zIndex: 1 // Ensure canvas is above SVG
        }}
      >
        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
            width: '100%',
            height: '100%',
            position: 'relative'
          }}
        >
          {/* SVG overlay for arrows */}
          {steps.length > 1 && (
            <svg
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                zIndex: 0 // Lower z-index so it doesn't interfere
              }}
            >
              {renderArrows()}
            </svg>
          )}
          {steps.length === 0 ? (
            <div style={{ 
              position: 'absolute', 
              top: '50%', 
              left: '50%', 
              transform: 'translate(-50%, -50%)',
              color: 'rgba(255,255,255,0.6)', 
              fontSize: 14,
              textAlign: 'center'
            }}>
              <div>Start building your workflow</div>
              <div style={{ fontSize: 12, marginTop: 8 }}>Add steps and drag them around the canvas</div>
            </div>
          ) : (
            steps.map((step) => {
              // Calculate if step is currently active based on timestamp
              // Convert absolute timestamps to relative video time
              const videoStartTime = recordingStartTimestamp ? recordingStartTimestamp / 1000 : 0;
              const stepStartTime = step.timestamp ? (step.timestamp / 1000) - videoStartTime : 0;
              const stepEndTime = stepStartTime + (step.duration ? step.duration / 1000 : 1);
              const active = currentTime >= stepStartTime && currentTime <= stepEndTime;
              const isDemoActive = isDemoMode && active;
              
              // Debug logging for demo mode
              if (isDemoMode && step.timestamp) {
                console.log(`Step ${step.id}:`, {
                  absoluteTimestamp: step.timestamp,
                  videoStartTime,
                  stepStartTime,
                  currentTime,
                  active,
                  duration: step.duration
                });
              }
              const isHovered = hoveredStep === step.id;
              const showMeta = showMetadata === step.id;
              const hasMetadata = step.metadata || step.element;
              const isScrollAction = step.action?.toLowerCase().includes('scroll');
              
              const nodeStyle = getN8NNodeStyle(step, active, isHovered);
              
              return (
                <div key={step.id} style={{ position: 'relative', zIndex: 10 }}>
                  <div
                    onMouseDown={(e) => handleNodeMouseDown(e, step.id)}
                    onMouseMove={(e) => handleNodeMouseMove(e, step.id)}
                    onMouseEnter={() => setHoveredStep(step.id)}
                    onMouseLeave={() => setHoveredStep(null)}
                    onClick={() => handleStepClick(step)}
                    onDoubleClick={() => handleStepDoubleClick(step)}
                    style={{
                      position: 'absolute',
                      left: step.x || 50,
                      top: step.y || 50,
                      width: 280,
                      padding: '16px 20px',
                      border: `2px solid ${nodeStyle.borderColor}`,
                      background: nodeStyle.backgroundColor,
                      color: 'rgba(255,255,255,0.92)',
                      borderRadius: nodeStyle.borderRadius,
                      cursor: step.timestamp ? 'pointer' : 'grab',
                      boxShadow: active ? '0 8px 25px rgba(0,0,0,0.5)' : 
                                 isHovered ? '0 6px 20px rgba(0,0,0,0.4)' : 
                                 '0 4px 12px rgba(0,0,0,0.3)',
                      backdropFilter: 'blur(10px)',
                      transition: 'all 0.3s ease',
                      userSelect: 'none',
                      transform: isDemoActive ? 'scale(1.08)' : active ? 'scale(1.05)' : isHovered ? 'scale(1.02)' : 'scale(1)',
                      // Add pulsing animation for active scroll nodes or demo mode
                      animation: isDemoActive ? 'loadingPulse 1.5s infinite' : 
                                 active && isScrollAction ? 'pulse 1s infinite' : 'none',
                      // Enhanced glow for demo mode
                      boxShadow: isDemoActive ? '0 0 20px rgba(56,225,255,0.8), 0 8px 25px rgba(0,0,0,0.5)' :
                                 active ? '0 8px 25px rgba(0,0,0,0.5)' : 
                                 isHovered ? '0 6px 20px rgba(0,0,0,0.4)' : 
                                 '0 4px 12px rgba(0,0,0,0.3)'
                    }}
                  >
                    {/* Action Icon */}
                    <div style={{ 
                      position: 'absolute', 
                      top: 12, 
                      right: 12, 
                      fontSize: 16,
                      opacity: active ? 1 : 0.7
                    }}>
                      {isDemoActive ? (
                        <div style={{ 
                          animation: 'spin 1s linear infinite',
                          fontSize: 14,
                          color: 'rgba(56,225,255,0.9)'
                        }}>
                          ⟳
                        </div>
                      ) : (
                        getActionIcon(step)
                      )}
                    </div>

                    {/* Main Action */}
                    <div style={{ 
                      fontSize: 14, 
                      fontWeight: 600, 
                      marginBottom: 6, 
                      lineHeight: 1.3,
                      paddingRight: 30 // Make room for icon
                    }}>
                      {step.action || step.label}
                    </div>
                    
                    {/* Details */}
                    {step.details && (
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 8, lineHeight: 1.2 }}>
                        {step.details}
                      </div>
                    )}
                    
                    {/* Timestamp Info */}
                    {step.timestamp && (
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginBottom: 4 }}>
                        {new Date(step.timestamp).toLocaleTimeString()} 
                        {step.duration && ` (${step.duration.toFixed(1)}s)`}
                      </div>
                    )}
                    
                    {/* Step Number */}
                    <div style={{ 
                      position: 'absolute', 
                      top: -8, 
                      right: -8, 
                      width: 20, 
                      height: 20, 
                      background: active ? 'rgba(56,225,255,0.9)' : 'rgba(56,225,255,0.7)', 
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 11,
                      color: '#000',
                      fontWeight: 'bold',
                      border: '2px solid rgba(255,255,255,0.2)'
                    }}>
                      {steps.indexOf(step) + 1}
                    </div>
                    
                    {/* Metadata Indicator */}
                    {hasMetadata && (
                      <div style={{
                        position: 'absolute',
                        top: -8,
                        left: -8,
                        width: 16,
                        height: 16,
                        background: 'rgba(255,255,255,0.2)',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 10,
                        color: 'rgba(255,255,255,0.8)',
                        cursor: 'pointer'
                      }}>
                        ℹ
                      </div>
                    )}
                  </div>
                  
                  {/* Metadata Tooltip */}
                  {showMeta && hasMetadata && (
                    <div style={{
                      position: 'absolute',
                      left: (step.x || 50) + 240,
                      top: step.y || 50,
                      width: 300,
                      padding: '12px 16px',
                      background: 'rgba(0,0,0,0.9)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: 8,
                      color: 'rgba(255,255,255,0.9)',
                      fontSize: 12,
                      zIndex: 1000,
                      backdropFilter: 'blur(10px)',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
                    }}>
                      <div style={{ fontWeight: 600, marginBottom: 8, color: 'rgba(56,225,255,0.9)' }}>
                        Event Metadata
                      </div>
                      
                      {step.metadata && (
                        <div style={{ marginBottom: 8 }}>
                          <div style={{ color: 'rgba(255,255,255,0.7)', marginBottom: 4 }}>Type: {step.metadata.type}</div>
                          {step.metadata.url && <div style={{ color: 'rgba(255,255,255,0.7)', marginBottom: 4 }}>URL: {step.metadata.url}</div>}
                          {step.metadata.timestamp && <div style={{ color: 'rgba(255,255,255,0.7)', marginBottom: 4 }}>Time: {new Date(step.metadata.timestamp).toLocaleString()}</div>}
                        </div>
                      )}
                      
                      {step.element && (
                        <div>
                          <div style={{ color: 'rgba(255,255,255,0.7)', marginBottom: 4 }}>Element Details:</div>
                          {step.element.tagName && <div style={{ color: 'rgba(255,255,255,0.6)', marginLeft: 8 }}>Tag: {step.element.tagName}</div>}
                          {step.element.text && <div style={{ color: 'rgba(255,255,255,0.6)', marginLeft: 8 }}>Text: "{step.element.text}"</div>}
                          {step.element.className && <div style={{ color: 'rgba(255,255,255,0.6)', marginLeft: 8 }}>Class: {step.element.className}</div>}
                          {step.element.selector && <div style={{ color: 'rgba(255,255,255,0.6)', marginLeft: 8 }}>Selector: {step.element.selector}</div>}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
    </>
  );
}



