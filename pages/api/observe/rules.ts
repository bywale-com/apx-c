// pages/api/observe/rules.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // server-only for inserts
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { name, episode_id, steps } = req.body || {};
    if (!name || !Array.isArray(steps)) return res.status(400).json({ error: 'Invalid payload' });

    const { error } = await supabase.from('observe_rules').insert([{
      id: randomUUID(), name, episode_id: episode_id ?? null, steps
    }]);

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('observe_rules')
      .select('id,name,episode_id,steps,created_at')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ rows: data });
  }

  return res.status(405).end();
}
