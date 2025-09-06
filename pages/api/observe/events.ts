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
  res.status(204).end();
}

