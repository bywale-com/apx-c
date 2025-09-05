// pages/api/chat-reply.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { session_id, since_ts } = req.query

  if (!session_id || typeof session_id !== 'string') {
    return res.status(400).json({ error: 'Missing session_id' })
  }

  const since = since_ts && typeof since_ts === 'string' ? new Date(since_ts) : new Date(Date.now() - 30_000)

  try {
    const result = await pool.query(
      `
      SELECT message
      FROM public.n8n_chat_histories
      WHERE session_id = $1
        AND message->>'type' = 'ai'
        AND created_at > $2
      ORDER BY created_at ASC
      LIMIT 1;
    `,
      [session_id, since.toISOString()]
    )

    if (result.rows.length === 0) {
      return res.status(204).end() // no content yet
    }

    const content = result.rows[0].message?.content ?? ''
    return res.status(200).json({ reply: content })
  } catch (err) {
    console.error('Poll error:', err)
    return res.status(500).json({ error: 'DB error' })
  }
}
