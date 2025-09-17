import type { NextApiRequest, NextApiResponse } from 'next';

// In-memory buffers for chunk reassembly (OK for dev; consider Redis/S3 in prod)
const buffers: Record<string, { chunks: string[]; total: number; mimeType: string; startedAt: number; recordingStartTimestamp?: number }> = {};
const events: any[] = [];
const recordings: Array<{ recordingId: string; data: string; mimeType: string; timestamp: number; duration?: number; recordingStartTimestamp?: number }> = [];

// Workflow session storage
type WorkflowSession = {
  events: any[];
  startTime: number;
  lastEventTime: number;
  recordingId?: string;
  cleanedEvents?: any[];
  cleanedAt?: number;
  tasks?: Array<{
    type: string;
    label: string;
    startTime: number;
    endTime: number;
    eventStartIndex: number;
    eventEndIndex: number;
    urlStart?: string;
    urlEnd?: string;
  }>;
  intent?: {
    qas: Array<{
      id: string;
      question: string;
      answer?: string;
      askedAt: number;
      answeredAt?: number;
      contextTs?: number;
    }>;
  };
};
const workflowSessions: Record<string, WorkflowSession> = {};

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
      const sessions = Object.entries(workflowSessions).map(([sessionId, session]) => {
        const recording = session.recordingId ? recordings.find(r => r.recordingId === session.recordingId) : null;
        return {
          sessionId,
          startTime: session.startTime,
          lastEventTime: session.lastEventTime,
          eventCount: session.events.length,
          duration: session.lastEventTime - session.startTime,
          recordingId: session.recordingId,
          recordingStartTimestamp: recording?.recordingStartTimestamp
        };
      });
      console.log('🔍 Workflow sessions requested:', sessions.length, 'sessions found');
      console.log('📊 Available sessions:', Object.keys(workflowSessions));
      return res.status(200).json({ sessions });
    }
    if (action === 'get_workflow_session') {
      const sessionId = req.query.sessionId as string;
      if (!sessionId || !workflowSessions[sessionId]) {
        return res.status(404).json({ error: 'Session not found' });
      }
      const session = workflowSessions[sessionId];
      const recording = session.recordingId ? recordings.find(r => r.recordingId === session.recordingId) : null;
      return res.status(200).json({
        sessionId,
        ...session,
        recordingStartTimestamp: recording?.recordingStartTimestamp
      });
    }
    if (action === 'prune_session') {
      const sessionId = req.query.sessionId as string;
      if (!sessionId || !workflowSessions[sessionId]) {
        return res.status(404).json({ error: 'Session not found' });
      }

      const session = workflowSessions[sessionId];
      const events = session.events || [];

      // Heuristic pruning
      const kept: any[] = [];
      const bySelectorLastInput: Record<string, any> = {};
      const actionableTags = new Set(['a','button','input','select','textarea']);

      // Find last submit event index
      const lastSubmitIdx = [...events].reverse().findIndex((e)=>e?.type==='submit');
      const submitIdx = lastSubmitIdx>=0 ? events.length-1-lastSubmitIdx : -1;

      // Build a window around submit to mark essential inputs (60s prior)
      const submitTs = submitIdx>=0 ? events[submitIdx].timestamp : Infinity;
      const essentialWindowStart = isFinite(submitTs) ? submitTs - 60_000 : -Infinity;

      // First pass: filter noise and keep core actions
      let lastScrollAt = 0;
      let lastKeyAt = 0;
      let lastInputAt = 0;
      let lastClickBySelector: Record<string, number> = {};
      let clickCountBySelector: Record<string, number> = {};
      for (let i=0;i<events.length;i++){
        const ev = events[i];
        if (!ev || !ev.type) continue;

        // Always keep structural events
        if (ev.type==='page_load' || ev.type==='navigate' || ev.type==='submit') {
          kept.push(ev); continue;
        }

        if (ev.type==='scroll') {
          // throttle scroll: keep if >600ms since last kept scroll
          if (ev.timestamp - lastScrollAt >= 600) { kept.push(ev); lastScrollAt = ev.timestamp; }
          continue;
        }

        if (ev.type==='key') {
          // Keep if Enter/modifier OR first key after a recent input ("confirm-type" pattern)
          const isSpecial = ev.key==='Enter' || ev.ctrlKey || ev.metaKey;
          const isFollowupToInput = lastInputAt>0 && (ev.timestamp - lastInputAt <= 1500);
          if ((isSpecial || isFollowupToInput) && (ev.timestamp - lastKeyAt >= 200)) {
            kept.push(ev); lastKeyAt = ev.timestamp;
          }
          continue;
        }

        if (ev.type==='click') {
          const sel = ev.element?.selector || '';
          const tag = (ev.element?.tag||'').toLowerCase();
          const text = (ev.element?.text||'');
          // Broaden click importance: allow common button-like patterns and +/- actions
          const looksButtonLike = /\b(btn|button|submit|link|nav|menu|toggle|plus|minus|add|remove)\b/i.test(sel) || /\+|−|-/u.test(String(text||''));
          const important = actionableTags.has(tag) || looksButtonLike;
          const lastAt = lastClickBySelector[sel] || 0;
          const count = clickCountBySelector[sel] || 0;
          // Keep first click immediately; throttle repeats but allow up to 2 clicks per second for counters
          const allowBurst = (count < 2) && (ev.timestamp - lastAt <= 1000);
          if (important && ((ev.timestamp - lastAt >= 250) || allowBurst)) {
            kept.push(ev);
            lastClickBySelector[sel] = ev.timestamp;
            clickCountBySelector[sel] = count + 1;
          }
          continue;
        }

        if (ev.type==='input') {
          // Keep inputs that are likely part of the submitted form (within window) and changed to non-empty
          const changed = ev.value != null && String(ev.value).trim() !== '';
          const withinWindow = ev.timestamp >= essentialWindowStart && ev.timestamp <= submitTs;
          if (changed && (withinWindow || submitIdx<0)) {
            const sel = ev.element?.selector || `#unknown_${i}`;
            bySelectorLastInput[sel] = ev; // last value wins
          }
          // Track last input time to keep the next key press (even if not Enter)
          lastInputAt = ev.timestamp;
          continue;
        }
      }

      // Merge last inputs by selector
      const mergedInputs = Object.values(bySelectorLastInput);
      const cleaned = [...kept.filter(e=>e.type!=='input'), ...mergedInputs]
        .sort((a:any,b:any)=>a.timestamp-b.timestamp);

      session.cleanedEvents = cleaned;
      session.cleanedAt = Date.now();

      return res.status(200).json({ ok: true, kept: cleaned.length, original: events.length });
    }
    if (action === 'clear') {
      events.length = 0;
      recordings.length = 0;
      Object.keys(workflowSessions).forEach(key => delete workflowSessions[key]);
      return res.status(200).json({ ok: true });
    }
    if (action === 'cleanup_old_sessions') {
      const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago
      let cleanedCount = 0;
      
      for (const [sessionId, session] of Object.entries(workflowSessions)) {
        if (session.lastEventTime < cutoffTime) {
          delete workflowSessions[sessionId];
          cleanedCount++;
        }
      }
      
      console.log(`🧹 Cleaned up ${cleanedCount} old sessions`);
      return res.status(200).json({ ok: true, cleanedCount });
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
    if (type === 'save_intent_answer') {
      const { sessionId, qaId, answer, answeredAt } = body as { sessionId: string; qaId: string; answer: string; answeredAt?: number };
      if (!sessionId || !workflowSessions[sessionId] || !qaId || !answer) {
        return res.status(400).json({ error: 'invalid_intent_payload' });
      }
      const session = workflowSessions[sessionId];
      session.intent = session.intent || { qas: [] };
      const existing = session.intent.qas.find(q => q.id === qaId);
      if (existing) {
        existing.answer = answer;
        existing.answeredAt = answeredAt || Date.now();
      } else {
        session.intent.qas.push({ id: qaId, question: '', answer, askedAt: Date.now(), answeredAt: answeredAt || Date.now() });
      }
      return res.status(200).json({ ok: true });
    }

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
        
        // Check if this is a temporary session that should be merged with a global session
        if (sessionId.startsWith('temp_')) {
          // Look for a global session that started around the same time
          const eventTime = event.timestamp;
          const timeWindow = 30000; // 30 seconds
          
          for (const [globalSessionId, globalSession] of Object.entries(workflowSessions)) {
            if (globalSessionId.startsWith('session_') && 
                Math.abs(globalSession.startTime - eventTime) < timeWindow) {
              console.log(`🔄 Merging temp session ${sessionId} into global session ${globalSessionId}`);
              // Move events from temp session to global session
              if (workflowSessions[sessionId]) {
                globalSession.events.push(...workflowSessions[sessionId].events);
                globalSession.lastEventTime = Math.max(globalSession.lastEventTime, workflowSessions[sessionId].lastEventTime);
                delete workflowSessions[sessionId];
              }
              // Add current event to global session
              globalSession.events.push(event);
              globalSession.lastEventTime = Math.max(globalSession.lastEventTime, event.timestamp);
              console.log('📊 Global session', globalSessionId, 'now has', globalSession.events.length, 'events');
              return res.status(200).json({ ok: true });
            }
          }
        }
        
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
      const { recordingId, index, total, data, mimeType, recordingStartTimestamp } = body as { recordingId: string; index: number; total: number; data: string; mimeType?: string; recordingStartTimestamp?: number };
      if (!recordingId || typeof index !== 'number' || typeof total !== 'number' || !data) {
        return res.status(400).json({ error: 'invalid chunk' });
      }
      const buf = buffers[recordingId] || { chunks: new Array(total).fill(null), total, mimeType: mimeType || 'video/webm', startedAt: Date.now() };
      buf.chunks[index] = data;
      if (mimeType) buf.mimeType = mimeType;
      // Store recording start timestamp from first chunk
      if (recordingStartTimestamp && !buf.recordingStartTimestamp) {
        buf.recordingStartTimestamp = recordingStartTimestamp;
      }
      buffers[recordingId] = buf;
      return res.status(200).json({ received: index });
    }

    if (type === 'screen_recording_complete') {
      const { recordingId, duration, mimeType, timestamp } = body as { recordingId: string; duration?: number; mimeType?: string; timestamp?: number };
      console.log(`🎬 Processing completion for ${recordingId}, buffer exists:`, !!buffers[recordingId]);
      const buf = buffers[recordingId];
      if (!buf) {
        console.log(`❌ No buffer found for ${recordingId}, available buffers:`, Object.keys(buffers));
        return res.status(404).json({ error: 'unknown recordingId' });
      }
      if (buf.chunks.some((c) => c === null)) {
        console.log(`❌ Incomplete chunks for ${recordingId}, missing:`, buf.chunks.map((c, i) => c === null ? i : null).filter(i => i !== null));
        return res.status(409).json({ error: 'chunks_incomplete' });
      }
      const base64 = buf.chunks.join('');
      const completedAt = timestamp || Date.now();
      const rec: { recordingId: string; data: string; mimeType: string; timestamp: number; duration?: number; recordingStartTimestamp?: number } = {
        recordingId,
        data: base64,
        mimeType: mimeType || buf.mimeType,
        timestamp: completedAt,
        duration,
        recordingStartTimestamp: buf.recordingStartTimestamp
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
        // Skip sessions that already have a recording linked
        if (sess.recordingId) {
          console.log(`⏭️ Session ${sid} already has recording ${sess.recordingId}, skipping`);
          continue;
        }
        
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
        console.log(`🔗 Linked recording ${recordingId} to session ${bestSessionId} (overlap: ${bestOverlap}ms)`);
      } else {
        console.log(`❌ No suitable session found for recording ${recordingId} (best overlap: ${bestOverlap}ms)`);
      }
      
      delete buffers[recordingId];
      return res.status(200).json({ ok: true, sizeChars: base64.length });
    }

    return res.status(400).json({ error: 'unknown type' });
  }

  return res.status(405).json({ error: 'method_not_allowed' });
}

// Removed old legacy handler below (duplicated default export)
