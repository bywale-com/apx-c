import type { NextApiRequest, NextApiResponse } from 'next';

// In-memory buffers for chunk reassembly (OK for dev; consider Redis/S3 in prod)
const buffers: Record<string, { chunks: string[]; total: number; mimeType: string; startedAt: number }> = {};
const events: any[] = [];
const recordings: Array<{ recordingId: string; data: string; mimeType: string; timestamp: number; duration?: number }> = [];

// Workflow session storage
const workflowSessions: Record<string, { events: any[]; startTime: number; lastEventTime: number; recordingId?: string }> = {};

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '2mb', // small per-request limit; chunks stay under this
    },
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const action = req.query.action;
    if (action === 'get_recent') {
      return res.status(200).json(events.slice(-200));
    }
    if (action === 'debug') {
      const recentEvents = events.slice(-10);
      const eventsWithSessionId = recentEvents.filter(e => e.event && e.event.sessionId);
      const eventsWithoutSessionId = recentEvents.filter(e => !e.event || !e.event.sessionId);
      
      return res.status(200).json({
        totalEvents: events.length,
        recentEvents: recentEvents,
        eventsWithSessionId: eventsWithSessionId.length,
        eventsWithoutSessionId: eventsWithoutSessionId.length,
        sampleEventWithSessionId: eventsWithSessionId[0],
        sampleEventWithoutSessionId: eventsWithoutSessionId[0],
        workflowSessions: Object.keys(workflowSessions).length,
        sessionIds: Object.keys(workflowSessions),
        recordings: recordings.length
      });
    }
    if (action === 'get_recordings') {
      return res.status(200).json(recordings.slice(-10));
    }
    if (action === 'get_workflow_sessions') {
      const sessions = Object.entries(workflowSessions).map(([sessionId, session]) => ({
        sessionId,
        startTime: session.startTime,
        lastEventTime: session.lastEventTime,
        eventCount: session.events.length,
        duration: session.lastEventTime - session.startTime,
        recordingId: session.recordingId
      }));
      console.log('🔍 Workflow sessions requested:', sessions.length, 'sessions found');
      console.log('📊 Available sessions:', Object.keys(workflowSessions));
      return res.status(200).json({ sessions });
    }
    if (action === 'get_workflow_session') {
      const sessionId = req.query.sessionId as string;
      if (!sessionId || !workflowSessions[sessionId]) {
        return res.status(404).json({ error: 'Session not found' });
      }
      return res.status(200).json({
        sessionId,
        ...workflowSessions[sessionId]
      });
    }
    if (action === 'clear') {
      events.length = 0;
      recordings.length = 0;
      Object.keys(workflowSessions).forEach(key => delete workflowSessions[key]);
      return res.status(200).json({ ok: true });
    }
    if (action === 'create_sessions_from_events') {
      // Group events by sessionId or create sessions from ungrouped events
      const browserEvents = events.filter(e => e.type === 'browser_event' && e.event);
      
      if (browserEvents.length === 0) {
        return res.status(200).json({ message: 'No browser events found to group' });
      }
      
      // Group by sessionId if available
      const groupedBySession = browserEvents.reduce((acc, event) => {
        const sessionId = event.event.sessionId || 'ungrouped';
        if (!acc[sessionId]) {
          acc[sessionId] = [];
        }
        acc[sessionId].push(event.event);
        return acc;
      }, {} as Record<string, any[]>);
      
      // Create workflow sessions
      let createdSessions = 0;
      for (const [sessionId, sessionEvents] of Object.entries(groupedBySession)) {
        if ((sessionEvents as any[]).length > 0) {
          const sortedEvents = (sessionEvents as any[]).sort((a: any, b: any) => a.timestamp - b.timestamp);
          const startTime = sortedEvents[0].timestamp;
          const lastEventTime = sortedEvents[sortedEvents.length - 1].timestamp;
          
          workflowSessions[sessionId] = {
            events: sortedEvents,
            startTime,
            lastEventTime
          };
          createdSessions++;
        }
      }
      
      return res.status(200).json({ 
        message: `Created ${createdSessions} workflow sessions from ${browserEvents.length} events`,
        sessions: Object.keys(workflowSessions)
      });
    }
    return res.status(200).json({ ok: true });
  }

  if (req.method === 'POST') {
    const body = req.body || {};
    const type = body.type;

    if (type === 'start_monitoring') {
      // Forward to browser extension via HTTP (if extension is running)
      console.log('🚀 Web app requesting browser extension to start monitoring');
      
      // Add a recording control event to indicate monitoring start
      events.push({
        type: 'recording_control',
        action: 'start_recording',
        timestamp: body.timestamp || Date.now(),
        source: 'web_app'
      });
      
      return res.status(200).json({ ok: true, message: 'Monitoring start requested' });
    }
    
    if (type === 'stop_monitoring') {
      // Forward to browser extension via HTTP (if extension is running)
      console.log('🛑 Web app requesting browser extension to stop monitoring');
      
      // Add a recording control event to indicate monitoring stop
      events.push({
        type: 'recording_control',
        action: 'stop_recording',
        timestamp: body.timestamp || Date.now(),
        source: 'web_app'
      });
      
      return res.status(200).json({ ok: true, message: 'Monitoring stop requested' });
    }

    if (type === 'browser_event' || type === 'recording_control' || type === 'tab_monitored' || type === 'tab_closed' || type === 'extension_connected') {
      events.push(body);
      
      // Store browser events in workflow sessions
      if (type === 'browser_event' && body.event && body.event.sessionId) {
        const sessionId = body.event.sessionId;
        const event = body.event;
        
        console.log('📝 Storing browser event:', event.type, 'for session:', sessionId);
        
        if (!workflowSessions[sessionId]) {
          workflowSessions[sessionId] = {
            events: [],
            startTime: event.timestamp,
            lastEventTime: event.timestamp
          };
          console.log('🆕 Created new workflow session:', sessionId);
        }
        
        workflowSessions[sessionId].events.push(event);
        workflowSessions[sessionId].lastEventTime = event.timestamp;
        console.log('📊 Session', sessionId, 'now has', workflowSessions[sessionId].events.length, 'events');
      }
      
      return res.status(200).json({ ok: true });
    }

    if (type === 'screen_recording_chunk') {
      const { recordingId, index, total, data, mimeType } = body as { recordingId: string; index: number; total: number; data: string; mimeType?: string };
      if (!recordingId || typeof index !== 'number' || typeof total !== 'number' || !data) {
        return res.status(400).json({ error: 'invalid chunk' });
      }
      const buf = buffers[recordingId] || { chunks: new Array(total).fill(null), total, mimeType: mimeType || 'video/webm', startedAt: Date.now() };
      buf.chunks[index] = data;
      if (mimeType) buf.mimeType = mimeType;
      buffers[recordingId] = buf;
      return res.status(200).json({ received: index });
    }

    if (type === 'screen_recording_complete') {
      const { recordingId, duration, mimeType, timestamp } = body as { recordingId: string; duration?: number; mimeType?: string; timestamp?: number };
      const buf = buffers[recordingId];
      if (!buf) return res.status(404).json({ error: 'unknown recordingId' });
      if (buf.chunks.some((c) => c === null)) return res.status(409).json({ error: 'chunks_incomplete' });
      const base64 = buf.chunks.join('');
      const completedAt = timestamp || Date.now();
      const rec: { recordingId: string; data: string; mimeType: string; timestamp: number; duration?: number } = {
        recordingId,
        data: base64,
        mimeType: mimeType || buf.mimeType,
        timestamp: completedAt,
        duration
      };
      recordings.push(rec);
      
      // Improved linking: choose the session whose time window overlaps most with the recording window
      // Compute recording time window using duration when available; otherwise assume a short window ending at completedAt
      const recEnd = completedAt;
      const assumedDuration = duration ?? 8000; // 8s fallback if missing
      const recStart = Math.max(0, recEnd - assumedDuration);
      const graceMs = 1500; // allow slight clock jitter

      let bestSessionId: string | null = null;
      let bestOverlap = -1;
      for (const [sid, sess] of Object.entries(workflowSessions)) {
        // session window
        const sStart = Math.max(0, (sess.startTime ?? 0) - graceMs);
        const sEnd = (sess.lastEventTime ?? sess.startTime) + graceMs;
        const overlap = Math.max(0, Math.min(recEnd, sEnd) - Math.max(recStart, sStart));
        if (overlap > bestOverlap) {
          bestOverlap = overlap;
          bestSessionId = sid;
        }
      }

      if (bestSessionId && bestOverlap > 500) { // require >=0.5s overlap to consider a match
        workflowSessions[bestSessionId].recordingId = recordingId;
      }
      
      delete buffers[recordingId];
      return res.status(200).json({ ok: true, sizeChars: base64.length });
    }

    return res.status(400).json({ error: 'unknown type' });
  }

  return res.status(405).json({ error: 'method_not_allowed' });
}

// Removed old legacy handler below (duplicated default export)
