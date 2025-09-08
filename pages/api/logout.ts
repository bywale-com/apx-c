// pages/api/logout.ts
import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  const cookie = [`apx_auth=`, `Path=/`, `Max-Age=0`, `SameSite=Lax`, process.env.NODE_ENV === 'production' ? 'Secure' : '', 'HttpOnly']
    .filter(Boolean)
    .join('; ');
  res.setHeader('Set-Cookie', cookie);
  res.status(200).json({ ok: true });
}
