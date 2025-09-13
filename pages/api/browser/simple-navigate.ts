// pages/api/browser/simple-navigate.ts
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { sessionId, url } = req.body;

  if (!sessionId || !url) {
    return res.status(400).json({ error: 'sessionId and url are required' });
  }

  try {
    console.log('Simple navigation request:', { sessionId, url });
    
    // Clean URL
    let cleanUrl = url.trim();
    if (!cleanUrl.includes('.')) {
      cleanUrl = `https://www.google.com/search?q=${encodeURIComponent(cleanUrl)}`;
    } else if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = 'https://' + cleanUrl;
    }

    // Fetch the page content
    const response = await fetch(cleanUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
      redirect: 'follow',
      timeout: 10000,
    });

    if (!response.ok) {
      return res.status(400).json({
        success: false,
        error: `Failed to fetch: ${response.status} ${response.statusText}`
      });
    }

    const html = await response.text();
    const title = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] || 'Untitled';
    
    // Create a simple HTML page that shows the content
    const simpleHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title}</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              margin: 0; padding: 20px; background: #f5f5f5; color: #333;
              line-height: 1.6;
            }
            .container { 
              max-width: 1200px; margin: 0 auto; background: white; 
              padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .header {
              border-bottom: 1px solid #eee; padding-bottom: 20px; margin-bottom: 20px;
            }
            .url { color: #666; font-size: 14px; margin-bottom: 10px; }
            .title { color: #333; font-size: 24px; margin: 0; }
            .content { margin-top: 20px; }
            .content img { max-width: 100%; height: auto; }
            .content a { color: #0066cc; text-decoration: none; }
            .content a:hover { text-decoration: underline; }
            .warning {
              background: #fff3cd; border: 1px solid #ffeaa7; color: #856404;
              padding: 15px; border-radius: 4px; margin-bottom: 20px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="url">${cleanUrl}</div>
              <h1 class="title">${title}</h1>
            </div>
            <div class="warning">
              <strong>Note:</strong> This is a simplified view of the webpage. Some interactive elements may not work as expected.
            </div>
            <div class="content">
              ${html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')}
            </div>
          </div>
        </body>
      </html>
    `;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(simpleHtml);

  } catch (error) {
    console.error('Simple navigation error:', error);
    res.status(500).json({
      success: false,
      error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
  }
}
