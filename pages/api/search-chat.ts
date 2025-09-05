import type { NextApiRequest, NextApiResponse } from 'next'
import { Pool } from 'pg'
const pool = new Pool({
  connectionString: process.env.N8N_DATABASE_URL,
})

type Msg = { id: string; sessionId: string; sender: 'user' | 'agent'; text: string; ts: string }

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
  }
  const client = await pool.connect()
  try {
    const { sessionId, query } = req.query as { sessionId?: string; query?: string }
    
    let sql: string
    let queryParams: any[]
    if (query && query.trim()) {
      // Full-text search with optional session filtering
      if (sessionId) {
        sql = `
          SELECT id, session_id AS "sessionId", 
                 sender,
                 text, 
                 ts
          FROM chat_logs
          WHERE session_id = $1 
            AND to_tsvector('english', text) @@ plainto_tsquery('english', $2)
          ORDER BY ts DESC 
          LIMIT 100
        `
        queryParams = [sessionId, query]
      } else {
        sql = `
          SELECT id, session_id AS "sessionId", 
                 sender,
                 text, 
                 ts
          FROM chat_logs
          WHERE to_tsvector('english', text) @@ plainto_tsquery('english', $1)
          ORDER BY ts DESC 
          LIMIT 100
        `
        queryParams = [query]
      }
    } else if (sessionId) {
      // Get all messages for specific session (no search query)
      sql = `
        SELECT id, session_id AS "sessionId", 
               sender,
               text, 
               ts
        FROM chat_logs
        WHERE session_id = $1
        ORDER BY ts DESC 
        LIMIT 100
      `
      queryParams = [sessionId]
    } else {
      // Get recent messages across all sessions (no search, no session filter)
      sql = `
        SELECT id, session_id AS "sessionId", 
               sender,
               text, 
               ts
        FROM chat_logs
        ORDER BY ts DESC 
        LIMIT 100
      `
      queryParams = []
    }
    const { rows } = await client.query(sql, queryParams)
    return res.status(200).json({ results: rows })
  } catch (err) {
    console.error('Error querying chat_logs:', err)
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
    res.status(500).json({ error: 'Internal server error', details: errorMessage })
  } finally {
    client.release()
  }
}
