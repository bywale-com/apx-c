import { NextApiRequest, NextApiResponse } from 'next'

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

    // Here you could:
    // - Broadcast to WebSocket clients
    // - Send push notifications
    // - Log analytics
    // - Trigger other processes

    res.status(200).json({ success: true })
  } catch (error) {
    console.error('Webhook error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}
