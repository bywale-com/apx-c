// pages/api/login.ts
import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== 'POST') return res.status(405).end('Method not allowed');

    const pass = process.env.SITE_PASSWORD || 'apx-demo';
    const { password } = (req.body ?? {}) as { password?: string };

    if (typeof password !== 'string') return res.status(400).end('Missing password');
    if (password !== pass) return res.status(401).end('Invalid password');

    const maxAge = 60 * 60 * 24 * 7;
    const cookie = [
      `apx_auth=1`,
      `Path=/`,
      `Max-Age=${maxAge}`,
      `SameSite=Lax`,
      process.env.NODE_ENV === 'production' ? 'Secure' : '',
      'HttpOnly',
    ].filter(Boolean).join('; ');

    res.setHeader('Set-Cookie', cookie);
    return res.status(200).json({ ok: true });
  } catch (e: any) {
    console.error('Login API error:', e);
    return res.status(500).end('Internal error');
  }
}