// pages/api/browser/type.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { browserManager } from '../../../lib/browser-manager';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { sessionId, selector, text } = req.body;

  if (!sessionId || !selector || !text) {
    return res.status(400).json({ error: 'sessionId, selector, and text are required' });
  }

  try {
    const session = await browserManager.getSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const result = await browserManager.typeText(sessionId, selector, text);
    
    if (result.success) {
      res.status(200).json({
        success: true,
        screenshot: result.screenshot ? `data:image/png;base64,${result.screenshot}` : null
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Type error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}
