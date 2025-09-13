// pages/api/browser-proxy.ts
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url } = req.query;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'URL parameter is required' });
  }

  try {
    // Validate URL
    const targetUrl = new URL(url);
    
    // Security: Only allow http/https protocols
    if (!['http:', 'https:'].includes(targetUrl.protocol)) {
      return res.status(400).json({ error: 'Only HTTP and HTTPS URLs are allowed' });
    }

    // Fetch the content from the target URL
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Cache-Control': 'no-cache',
      },
      redirect: 'follow',
      timeout: 10000, // 10 second timeout
    });

    if (!response.ok) {
      return res.status(response.status).json({ 
        error: `Failed to fetch: ${response.status} ${response.statusText}` 
      });
    }

    const contentType = response.headers.get('content-type') || '';
    
    // Handle different content types
    if (contentType.includes('text/html')) {
      let html = await response.text();
      
      // Modify the HTML to work within our iframe
      html = html.replace(
        /<head>/i,
        `<head>
          <base href="${targetUrl.origin}">
          <meta name="referrer" content="no-referrer">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            /* Ensure content fits within iframe */
            body { margin: 0; padding: 0; }
            /* Hide any potential X-Frame-Options warnings */
            .x-frame-options-warning { display: none !important; }
            /* Fix common iframe issues */
            iframe { max-width: 100% !important; }
            /* Ensure responsive design works */
            * { box-sizing: border-box; }
          </style>`
      );

      // Remove problematic scripts and meta tags
      html = html.replace(/<script[^>]*>[\s\S]*?x-frame-options[\s\S]*?<\/script>/gi, '');
      html = html.replace(/<meta[^>]*x-frame-options[^>]*>/gi, '');
      html = html.replace(/<meta[^>]*content-security-policy[^>]*>/gi, '');
      
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('X-Frame-Options', 'SAMEORIGIN');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      return res.send(html);
      
    } else if (contentType.includes('application/json')) {
      const json = await response.json();
      res.setHeader('Content-Type', 'application/json');
      return res.json(json);
      
    } else {
      // For other content types, stream the response
      res.setHeader('Content-Type', contentType);
      response.body?.pipe(res);
    }

  } catch (error) {
    console.error('Browser proxy error:', error);
    
    // Return a simple error page
    const errorHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Browser Proxy Error</title>
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              margin: 0; padding: 20px; background: #f5f5f5; color: #333;
            }
            .error-container { 
              max-width: 600px; margin: 50px auto; background: white; 
              padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .error-title { color: #d32f2f; margin-bottom: 16px; }
            .error-message { margin-bottom: 20px; line-height: 1.5; }
            .suggestions { background: #f8f9fa; padding: 16px; border-radius: 4px; }
            .suggestions h3 { margin-top: 0; color: #495057; }
            .suggestions ul { margin: 0; padding-left: 20px; }
            .suggestions li { margin-bottom: 8px; }
          </style>
        </head>
        <body>
          <div class="error-container">
            <h1 class="error-title">Unable to Load Page</h1>
            <div class="error-message">
              The requested URL could not be loaded due to security restrictions or network issues.
            </div>
            <div class="suggestions">
              <h3>Suggestions:</h3>
              <ul>
                <li>Check if the URL is correct and accessible</li>
                <li>Try a different website</li>
                <li>Some websites block iframe embedding for security reasons</li>
                <li>Ensure the website supports HTTPS</li>
              </ul>
            </div>
            <div style="margin-top: 20px; font-size: 14px; color: #666;">
              <strong>Requested URL:</strong> ${url}<br>
              <strong>Error:</strong> ${error instanceof Error ? error.message : 'Unknown error'}
            </div>
          </div>
        </body>
      </html>
    `;
    
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(errorHtml);
  }
}
