import type { NextApiRequest, NextApiResponse } from 'next';

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
  metadata: {
    totalEvents: number;
    duration: number;
    urls: string[];
    eventTypes: Record<string, number>;
  };
}

// In-memory storage for workflow sessions (consider database in production)
const workflowSessions: Record<string, WorkflowSession> = {};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const { action, sessionId, recordingId } = req.query;

    if (action === 'get_session') {
      if (!sessionId) {
        return res.status(400).json({ error: 'sessionId required' });
      }

      const session = workflowSessions[sessionId as string];
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      return res.status(200).json(session);
    }

    if (action === 'get_recording') {
      if (!recordingId) {
        return res.status(400).json({ error: 'recordingId required' });
      }

      // Find session by recordingId
      const session = Object.values(workflowSessions).find(s => s.recordingId === recordingId);
      if (!session) {
        return res.status(404).json({ error: 'Recording not found' });
      }

      return res.status(200).json(session);
    }

    if (action === 'list_sessions') {
      const sessions = Object.values(workflowSessions).map(session => ({
        sessionId: session.sessionId,
        recordingId: session.recordingId,
        startTime: session.startTime,
        duration: session.metadata.duration,
        totalEvents: session.metadata.totalEvents,
        urls: session.metadata.urls
      }));

      return res.status(200).json({ sessions });
    }

    return res.status(400).json({ error: 'Invalid action' });
  }

  if (req.method === 'POST') {
    const { action } = req.body;

    if (action === 'create_session') {
      const { sessionId, events, videoUrl, recordingId } = req.body;

      if (!sessionId || !events || !Array.isArray(events)) {
        return res.status(400).json({ error: 'sessionId and events array required' });
      }

      // Sort events by timestamp
      const sortedEvents = [...events].sort((a, b) => a.timestamp - b.timestamp);
      
      if (sortedEvents.length === 0) {
        return res.status(400).json({ error: 'No events provided' });
      }

      const startTime = sortedEvents[0].timestamp;
      const endTime = sortedEvents[sortedEvents.length - 1].timestamp;
      const duration = endTime - startTime;

      // Extract metadata
      const urls = [...new Set(sortedEvents.map(e => e.url).filter(Boolean))];
      const eventTypes = sortedEvents.reduce((acc, event) => {
        acc[event.type] = (acc[event.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const session: WorkflowSession = {
        sessionId,
        startTime,
        endTime,
        events: sortedEvents,
        videoUrl,
        recordingId,
        metadata: {
          totalEvents: sortedEvents.length,
          duration,
          urls,
          eventTypes
        }
      };

      workflowSessions[sessionId] = session;

      return res.status(200).json({
        success: true,
        sessionId,
        metadata: session.metadata
      });
    }

    if (action === 'analyze_workflow') {
      const { sessionId, analysisType } = req.body;

      if (!sessionId) {
        return res.status(400).json({ error: 'sessionId required' });
      }

      const session = workflowSessions[sessionId];
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      let analysis;

      switch (analysisType) {
        case 'task_boundaries':
          analysis = analyzeTaskBoundaries(session);
          break;
        case 'event_patterns':
          analysis = analyzeEventPatterns(session);
          break;
        case 'automation_opportunities':
          analysis = analyzeAutomationOpportunities(session);
          break;
        default:
          return res.status(400).json({ error: 'Invalid analysis type' });
      }

      return res.status(200).json({
        sessionId,
        analysisType,
        analysis
      });
    }

    return res.status(400).json({ error: 'Invalid action' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

// Analysis functions
function analyzeTaskBoundaries(session: WorkflowSession) {
  const events = session.events;
  const boundaries = [];
  
  // Identify major navigation changes as task boundaries
  let currentUrl = '';
  let taskStart = 0;
  
  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    
    if (event.type === 'navigate' || event.type === 'page_load') {
      if (currentUrl && event.url !== currentUrl) {
        // New task boundary
        boundaries.push({
          type: 'navigation_boundary',
          startTime: taskStart,
          endTime: event.timestamp,
          startUrl: currentUrl,
          endUrl: event.url,
          eventCount: i - taskStart
        });
        taskStart = event.timestamp;
      }
      currentUrl = event.url || '';
    }
  }
  
  // Add final boundary
  if (taskStart < events[events.length - 1].timestamp) {
    boundaries.push({
      type: 'final_boundary',
      startTime: taskStart,
      endTime: events[events.length - 1].timestamp,
      startUrl: currentUrl,
      endUrl: currentUrl,
      eventCount: events.length - taskStart
    });
  }
  
  return {
    totalBoundaries: boundaries.length,
    boundaries,
    averageTaskDuration: boundaries.reduce((sum, b) => sum + (b.endTime - b.startTime), 0) / boundaries.length
  };
}

function analyzeEventPatterns(session: WorkflowSession) {
  const events = session.events;
  const patterns = [];
  
  // Look for repeated sequences
  const sequences = new Map<string, number>();
  
  for (let i = 0; i < events.length - 2; i++) {
    const sequence = events.slice(i, i + 3).map(e => e.type).join('->');
    sequences.set(sequence, (sequences.get(sequence) || 0) + 1);
  }
  
  // Find patterns that occur more than once
  for (const [sequence, count] of sequences) {
    if (count > 1) {
      patterns.push({
        sequence,
        count,
        confidence: count / events.length
      });
    }
  }
  
  return {
    totalPatterns: patterns.length,
    patterns: patterns.sort((a, b) => b.count - a.count),
    mostCommonPattern: patterns[0] || null
  };
}

function analyzeAutomationOpportunities(session: WorkflowSession) {
  const events = session.events;
  const opportunities = [];
  
  // Look for form filling patterns
  const formEvents = events.filter(e => e.type === 'input' && e.element?.type);
  if (formEvents.length > 0) {
    opportunities.push({
      type: 'form_filling',
      confidence: 0.8,
      description: 'Multiple form inputs detected',
      eventCount: formEvents.length,
      elements: formEvents.map(e => e.element?.selector).filter(Boolean)
    });
  }
  
  // Look for repetitive clicking
  const clickEvents = events.filter(e => e.type === 'click');
  const clickPatterns = new Map<string, number>();
  
  clickEvents.forEach(event => {
    const selector = event.element?.selector || 'unknown';
    clickPatterns.set(selector, (clickPatterns.get(selector) || 0) + 1);
  });
  
  for (const [selector, count] of clickPatterns) {
    if (count > 2) {
      opportunities.push({
        type: 'repetitive_clicking',
        confidence: Math.min(0.9, count / 10),
        description: `Repeated clicking on ${selector}`,
        eventCount: count,
        element: selector
      });
    }
  }
  
  // Look for navigation patterns
  const navEvents = events.filter(e => e.type === 'navigate');
  if (navEvents.length > 1) {
    opportunities.push({
      type: 'navigation_flow',
      confidence: 0.7,
      description: 'Multi-page navigation detected',
      eventCount: navEvents.length,
      urls: navEvents.map(e => e.url).filter(Boolean)
    });
  }
  
  return {
    totalOpportunities: opportunities.length,
    opportunities: opportunities.sort((a, b) => b.confidence - a.confidence),
    highConfidenceCount: opportunities.filter(o => o.confidence > 0.7).length
  };
}

