// pages/api/push.ts
import type { NextApiRequest, NextApiResponse } from 'next';

type Body = { sessionId?: string; text?: string };

function getBaseUrl(req: NextApiRequest): string {
  // Prefer a hard-coded env for reliability in prod if you have it
  // e.g. SELF_URL=https://chat.apexintro.com
  const fromEnv = process.env.SELF_URL;
  if (fromEnv) return fromEnv.replace(/\/+$/, '');

  // Otherwise, derive from headers
  const protoHdr = req.headers['x-forwarded-proto'];
  const proto = Array.isArray(protoHdr) ? protoHdr[0] : (protoHdr || 'https');

  // On some proxies, x-forwarded-host is set; otherwise use host
  const xfh = req.headers['x-forwarded-host'];
  const host = Array.isArray(xfh) ? xfh[0] : (xfh || req.headers.host || 'localhost:3000');

  return `${proto}://${host}`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Simple auth so only your services can push
  const secret = process.env.PUSH_SECRET || '';
  if (secret && req.headers['x-internal'] !== secret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { sessionId, text } = (req.body ?? {}) as Body;
  if (!sessionId || !text || typeof sessionId !== 'string' || typeof text !== 'string') {
    return res.status(400).json({ error: 'sessionId and text required' });
  }

  const base = getBaseUrl(req);
  const msg = { id: (globalThis as any).crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`, sender: 'agent' as const, text };

  try {
    const r = await fetch(`${base}/api/chat-logs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // optional: allow /api/chat-logs to verify it's internal
        'x-internal': secret,
      },
      body: JSON.stringify({
        sessionId,
        append: [msg],
      }),
    });

    if (!r.ok) {
      const t = await r.text().catch(() => '');
      return res.status(502).json({ error: `chat-logs append failed (${r.status})`, details: t });
    }

    return res.status(200).json({ ok: true, appended: msg });
  } catch (e: any) {
    return res.status(500).json({ error: 'push failed', details: e?.message || String(e) });
  }
}
