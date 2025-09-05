// pages/api/agent-chat.ts
import type { NextApiRequest, NextApiResponse } from 'next'

/**
 * ENV you should set (in .env.local or server env):
 * N8N_AGENT_URL=https://<your-n8n-host>/webhook/agent-chat (example)
 * N8N_AGENT_AUTH=Bearer xyz (optional)
 * N8N_TIMEOUT_MS=20000 (optional)
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
  }

  const { message } = req.body ?? {}
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Invalid message' })
  }

  const url = process.env.N8N_AGENT_URL
  if (!url) return res.status(500).json({ error: 'N8N_AGENT_URL not configured' })

  const auth = process.env.N8N_AGENT_AUTH
  const timeoutMs = Number(process.env.N8N_TIMEOUT_MS ?? 20000)

  // You can extend payload to include user/session metadata
  const payload = {
    message, // keep markdown intact
    meta: {
      ip: req.headers['x-forwarded-for'] ?? req.socket.remoteAddress ?? null,
      ua: req.headers['user-agent'] ?? null,
      ts: new Date().toISOString(),
    },
  }

  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(auth ? { Authorization: auth } : {}),
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })
    clearTimeout(id)

    // Accept either JSON { reply: string } or plain text from n8n
    const contentType = r.headers.get('content-type') || ''
    if (!r.ok) {
      const errText = await r.text().catch(() => '')
      return res
        .status(502)
        .json({ error: `n8n error ${r.status}`, details: errText.slice(0, 2000) })
    }

    if (contentType.includes('application/json')) {
      const data = await r.json()
      // Prefer data.reply, else coerce the whole JSON to string
      const reply =
        typeof data?.reply === 'string' ? data.reply : JSON.stringify(data, null, 2)
      return res.status(200).json({ reply }) // pass through markdown verbatim
    } else {
      const text = await r.text()
      return res.status(200).json({ reply: text }) // pass through markdown verbatim
    }
  } catch (e: any) {
    clearTimeout(id)
    const msg =
      e?.name === 'AbortError' ? 'Timeout talking to n8n' : e?.message ?? 'Upstream error'
    return res.status(504).json({ error: msg })
  }
}
