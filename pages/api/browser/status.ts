// pages/api/browser/status.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { browserManager } from '../../../lib/browser-manager';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { sessionId } = req.query;

  if (!sessionId || typeof sessionId !== 'string') {
    return res.status(400).json({ error: 'sessionId is required' });
  }

  try {
    const session = await browserManager.getSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const pageInfo = await browserManager.getPageInfo(sessionId);
    
    if (pageInfo) {
      res.status(200).json({
        success: true,
        url: pageInfo.url,
        title: pageInfo.title,
        screenshot: pageInfo.screenshot ? `data:image/png;base64,${pageInfo.screenshot}` : null
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to get page info'
      });
    }
  } catch (error) {
    console.error('Status error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}
