// pages/api/observe/events.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuid } from 'uuid';

export const config = { api: { bodyParser: false } };

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // service role for server inserts
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  const body = Buffer.concat(chunks).toString('utf8');
  const lines = body.split('\n').filter(Boolean);

  const events = lines.map((l) => JSON.parse(l));
  for (const e of events) {
    e.session_id ||= uuid();
    const host = (() => { try { return new URL(e.app?.url || '').hostname } catch { return 'local' }})();
    e.episode_id ||= `${host}:${e.ts?.slice(0,15)}`; // crude bucketing: host + 10-min slice
  }

  const { error } = await supabase.from('observe_events').insert(
    events.map((e:any)=>({
      id: e.id, ts: e.ts, source: e.source, app: e.app, window: e.window,
      action: e.action, context: e.context, severity: e.severity,
      session_id: e.session_id, episode_id: e.episode_id
    }))
  );

  if (error) return res.status(500).json({ error: error.message });
  
  // Also create workflow sessions from web app events
  try {
    const workflowEvents = events.map((e: any) => ({
      type: e.action?.type || 'unknown',
      element: e.action?.target || null,
      value: e.action?.value || null,
      coordinates: e.action?.coordinates || null,
      timestamp: new Date(e.ts).getTime(),
      sessionId: e.session_id,
      url: e.app?.url || '',
      episodeId: e.episode_id
    }));

    // Send to extension-events API to create workflow sessions
    await fetch('http://localhost:3000/api/extension-events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'browser_event',
        event: workflowEvents[0], // Send first event to create session
        timestamp: Date.now()
      })
    });

    // Send remaining events
    for (const event of workflowEvents.slice(1)) {
      await fetch('http://localhost:3000/api/extension-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'browser_event',
          event: event,
          timestamp: Date.now()
        })
      });
    }
  } catch (workflowError) {
    console.log('Could not create workflow sessions:', workflowError);
  }

  res.status(204).end();
}

