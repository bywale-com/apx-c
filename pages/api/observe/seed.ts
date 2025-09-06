// pages/api/observe/seed.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // server-only insert
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const url = (req.body?.url as string) || 'https://example.com/form';
  const now = Date.now();

  const episodeId = (() => {
    try { return `${new URL(url).hostname}:${new Date(now).toISOString().slice(0,15)}`; }
    catch { return `local:${new Date(now).toISOString().slice(0,15)}`; }
  })();

  const base = {
    source: 'browser',
    app: { name: 'web', url },
    session_id: randomUUID(),
    episode_id: episodeId,
  };

  const rows = [
    { id: randomUUID(), ts: new Date(now+0).toISOString(),   ...base, action: { type: 'navigate', url } },
    { id: randomUUID(), ts: new Date(now+5000).toISOString(),...base, action: { type: 'input',
        target: { role:'textbox', name:'Email', selector:'input#email', bounds:{x:120,y:300,w:320,h:40}},
        value: 'user@example.com', redacted: false } },
    { id: randomUUID(), ts: new Date(now+8000).toISOString(),...base, action: { type: 'click',
        target: { role:'button', name:'Submit', selector:'button#submit', bounds:{x:120,y:360,w:120,h:40}} } },
    { id: randomUUID(), ts: new Date(now+8200).toISOString(),...base, action: { type: 'submit',
        target: { role:'button', name:'Submit', selector:'button#submit' } } },
  ];

  const { error } = await supabase.from('observe_events').insert(rows as any[]);
  if (error) return res.status(500).json({ error: error.message });
  res.status(200).json({ ok: true, episode_id: episodeId, count: rows.length });
}
