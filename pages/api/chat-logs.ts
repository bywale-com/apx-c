import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

type Sender = 'user' | 'agent';

type Msg = { id: string; sessionId: string; sender: Sender; text: string; ts: string };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const client = await pool.connect();

  try {
    // Debug: log the method and the request
    console.log(`Method: ${req.method}`);
    console.log('Request Body:', req.body);
    console.log('Request Query:', req.query);

    if (req.method === 'GET') {
      const { sessionId, query } = req.query as { sessionId?: string; query?: string };

      if (sessionId) {
        // Fetch messages by sessionId
        console.log(`Fetching messages for sessionId: ${sessionId}`);
        const { rows } = await client.query(
          'SELECT id, session_id AS "sessionId", sender, text, ts FROM public.chat_logs WHERE session_id = $1 ORDER BY ts ASC',
          [sessionId]
        );
        return res.status(200).json({ messages: rows });
      }

      if (typeof query === 'string' && query.trim()) {
        // Full-text search in messages
        console.log(`Searching messages with query: ${query}`);
        const { rows } = await client.query(
          `
          SELECT id, session_id AS "sessionId", sender, text, ts
          FROM public.chat_logs
          WHERE to_tsvector('english', text) @@ plainto_tsquery('english', $1)
          ORDER BY ts DESC
          LIMIT 100
          `,
          [query]
        );
        return res.status(200).json({ results: rows });
      }

      // Default: recent messages across all sessions
      console.log("Fetching recent messages across all sessions");
      const { rows } = await client.query(
        `
        SELECT id, session_id AS "sessionId", sender, text, ts
        FROM public.chat_logs
        ORDER BY ts DESC
        LIMIT 100
        `
      );
      return res.status(200).json({ recent: rows.reverse() }); // oldest first
    }

    if (req.method === 'POST') {
      // Append messages
      const { sessionId, append } = req.body ?? {};
      console.log('Received POST request to append messages:', { sessionId, append });

      if (!sessionId || typeof sessionId !== 'string') {
        return res.status(400).json({ error: 'sessionId required' });
      }
      if (!Array.isArray(append)) {
        return res.status(400).json({ error: 'append must be an array' });
      }

      // Prepare insert statements
      const now = new Date().toISOString();
      // In the POST handler, change this line:
      const values = append.map((msg: any, i: number) => [
        msg.id || crypto.randomUUID(), // Generate UUID instead of null
        sessionId,
        msg.sender === 'user' ? 'user' : 'agent',
        String(msg.text ?? ''),
        msg.ts || now,
      ]);

      // Debug: log the values to be inserted
      console.log('Values to be inserted into chat_logs:', values);

      // Bulk insert using parameterized query
      const valuesPlaceholders = values
        .map(
          (_, i) =>
            `($${i * 5 + 1}::uuid, $${i * 5 + 2}, $${i * 5 + 3}, $${i * 5 + 4}, $${i * 5 + 5})`
        )
        .join(',');

      const flattenedValues = values.flat();

      // Use ON CONFLICT DO NOTHING to avoid duplicate ids if sent
      const insertQuery = `
        INSERT INTO public.chat_logs (id, session_id, sender, text, ts)
        VALUES ${valuesPlaceholders}
        ON CONFLICT (id) DO NOTHING
      `;

      await client.query(insertQuery, flattenedValues);

      // Debug: log that the data has been inserted
      console.log("Successfully inserted data into chat_logs");

      // Count messages in session after insert
      const countRes = await client.query(
        'SELECT COUNT(*) FROM chat_logs WHERE session_id = $1',
        [sessionId]
      );
      console.log("Total messages in session after insert:", countRes.rows[0].count);

      return res.status(200).json({ ok: true, count: parseInt(countRes.rows[0].count, 10) });
    }

    if (req.method === 'DELETE') {
      const { sessionId } = req.query as { sessionId?: string };

      if (sessionId) {
        console.log(`Deleting messages for sessionId: ${sessionId}`);
        await client.query('DELETE FROM chat_logs WHERE session_id = $1', [sessionId]);
        return res.status(200).json({ ok: true });
      }

      console.log("Deleting all messages from chat_logs");
      await client.query('DELETE FROM chat_logs');
      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  } catch (err) {
    console.error('DB error:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
}
