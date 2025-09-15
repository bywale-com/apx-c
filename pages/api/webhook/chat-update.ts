import { NextApiRequest, NextApiResponse } from 'next'
import { getSessionMapping, getAllMappings } from '../../../lib/session-mapping'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    // Supabase webhook payload contains the new row data
    const { record, old_record, type } = req.body

    console.log('New chat message:', record)

    // Extract session_id from the record
    const n8nSessionId = record?.session_id;
    const frontendSessionId = getSessionMapping(n8nSessionId);

    console.log(`Webhook received n8n session: ${n8nSessionId}`);
    console.log(`Available mappings:`, getAllMappings());

    if (n8nSessionId && frontendSessionId) {
      console.log(`Mapping n8n session ${n8nSessionId} to frontend session ${frontendSessionId}`);
      
      // Only store agent messages - user messages are already handled by frontend
      if (record.message?.type === 'ai') {
        const message = {
          id: crypto.randomUUID(), // Generate proper UUID instead of using record.id
          sessionId: frontendSessionId,
          sender: 'agent',
          text: record.message?.content || '',
          ts: new Date().toISOString(),
        };

        // Insert into chat_logs table
        const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/chat-logs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: frontendSessionId,
            append: [message],
          }),
        });

        if (response.ok) {
          console.log(`Successfully stored agent message for frontend session ${frontendSessionId}`);
        } else {
          console.error(`Failed to store agent message: ${response.status}`);
        }
      } else {
        console.log(`Skipping user message - already handled by frontend`);
      }
    } else {
      console.log(`No mapping found for n8n session ${n8nSessionId}`);
    }

    res.status(200).json({ success: true })
  } catch (error) {
    console.error('Webhook error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}
