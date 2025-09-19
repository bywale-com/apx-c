// pages/api/agent-chat.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { setSessionMapping } from '../../lib/session-mapping'

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

  const { message, sessionId } = req.body ?? {}
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Invalid message' })
  }
  if (!sessionId || typeof sessionId !== 'string') {
    return res.status(400).json({ error: 'sessionId required' })
  }

  const url = process.env.N8N_AGENT_URL
  if (!url) return res.status(500).json({ error: 'N8N_AGENT_URL not configured' })

  const auth = process.env.N8N_AGENT_AUTH
  const timeoutMs = Number(process.env.N8N_TIMEOUT_MS ?? 20000)

  // You can extend payload to include user/session metadata
  const payload = {
    message, // keep markdown intact
    sessionId, // pass through the frontend session ID
    meta: {
      ip: req.headers['x-forwarded-for'] ?? req.socket.remoteAddress ?? null,
      ua: req.headers['user-agent'] ?? null,
      ts: new Date().toISOString(),
    },
  }

  // Create session mapping BEFORE sending to n8n
  // n8n uses the client IP as session ID, so we can predict it
  const n8nSessionId = req.headers['x-forwarded-for'] ?? req.socket.remoteAddress ?? 'unknown'
  console.log(`Creating mapping: n8n session ${n8nSessionId} -> frontend session ${sessionId}`)
  console.log(`Request headers:`, { 
    'x-forwarded-for': req.headers['x-forwarded-for'], 
    'x-real-ip': req.headers['x-real-ip'],
    remoteAddress: req.socket.remoteAddress 
  })
  
  // Create multiple mappings to handle different IP formats
  setSessionMapping(n8nSessionId, sessionId)
  // Also map the external IP that n8n might use (from previous logs)
  setSessionMapping('13.58.129.81', sessionId)

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
