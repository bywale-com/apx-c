// pages/api/browser/navigate.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { browserManager } from '../../../lib/browser-manager';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { sessionId, url } = req.body;

  if (!sessionId || !url) {
    return res.status(400).json({ error: 'sessionId and url are required' });
  }

  try {
    console.log('Navigation request:', { sessionId, url });
    
    // Ensure session exists
    let session = await browserManager.getSession(sessionId);
    if (!session) {
      console.log('Creating new browser session for:', sessionId);
      session = await browserManager.createSession(sessionId);
    }

    console.log('Navigating to:', url);
    const result = await browserManager.navigateTo(sessionId, url);
    
    if (result.success) {
      console.log('Navigation successful');
      res.status(200).json({
        success: true,
        url: result.screenshot ? `data:image/png;base64,${result.screenshot}` : null,
        currentUrl: session.currentUrl
      });
    } else {
      console.log('Navigation failed:', result.error);
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Navigation error:', error);
    res.status(500).json({
      success: false,
      error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
  }
}
