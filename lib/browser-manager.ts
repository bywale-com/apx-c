// lib/browser-manager.ts
import puppeteer, { Browser, Page } from 'puppeteer';

interface BrowserSession {
  id: string;
  browser: Browser;
  page: Page;
  currentUrl: string;
  createdAt: Date;
  lastActivity: Date;
}

class BrowserManager {
  private sessions: Map<string, BrowserSession> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up inactive sessions every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupInactiveSessions();
    }, 5 * 60 * 1000);
  }

  async createSession(sessionId: string): Promise<BrowserSession> {
    try {
      // Close existing session if it exists
      if (this.sessions.has(sessionId)) {
        await this.closeSession(sessionId);
      }

      console.log('Launching browser for session:', sessionId);
      
      const browser = await puppeteer.launch({
        headless: true, // Use headless mode for server
        // Use Puppeteer's bundled Chromium
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          '--single-process',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
          '--disable-extensions',
          '--disable-plugins',
          '--disable-default-apps',
          '--disable-sync',
          '--disable-translate',
          '--hide-scrollbars',
          '--mute-audio',
          '--no-first-run',
          '--safebrowsing-disable-auto-update',
          '--disable-ipc-flooding-protection'
        ],
        defaultViewport: { width: 1280, height: 720 },
        timeout: 60000 // Increased timeout
      });

      const page = await browser.newPage();
      
      // Set user agent to avoid detection
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

      const browserSession: BrowserSession = {
        id: sessionId,
        browser,
        page,
        currentUrl: 'about:blank',
        createdAt: new Date(),
        lastActivity: new Date()
      };

      this.sessions.set(sessionId, browserSession);
      console.log('Browser session created successfully:', sessionId);
      return browserSession;
    } catch (error) {
      console.error('Failed to create browser session:', error);
      throw new Error(`Failed to create browser session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getSession(sessionId: string): Promise<BrowserSession | null> {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActivity = new Date();
      return session;
    }
    return null;
  }

  async navigateTo(sessionId: string, url: string): Promise<{ success: boolean; error?: string; screenshot?: string }> {
    const session = await this.getSession(sessionId);
    if (!session) {
      return { success: false, error: 'Session not found' };
    }

    try {
      // Clean URL
      let cleanUrl = url.trim();
      if (!cleanUrl.includes('.')) {
        cleanUrl = `https://www.google.com/search?q=${encodeURIComponent(cleanUrl)}`;
      } else if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
        cleanUrl = 'https://' + cleanUrl;
      }

      await session.page.goto(cleanUrl, { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });
      
      session.currentUrl = cleanUrl;
      session.lastActivity = new Date();

      // Take screenshot for frontend display
      const screenshot = await session.page.screenshot({ 
        type: 'png',
        fullPage: false,
        clip: { x: 0, y: 0, width: 1280, height: 720 }
      });

      return { 
        success: true, 
        screenshot: screenshot.toString('base64') 
      };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Navigation failed' 
      };
    }
  }

  async clickElement(sessionId: string, selector: string): Promise<{ success: boolean; error?: string; screenshot?: string }> {
    const session = await this.getSession(sessionId);
    if (!session) {
      return { success: false, error: 'Session not found' };
    }

    try {
      await session.page.click(selector);
      session.lastActivity = new Date();

      const screenshot = await session.page.screenshot({ 
        type: 'png',
        fullPage: false,
        clip: { x: 0, y: 0, width: 1280, height: 720 }
      });

      return { 
        success: true, 
        screenshot: screenshot.toString('base64') 
      };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Click failed' 
      };
    }
  }

  async typeText(sessionId: string, selector: string, text: string): Promise<{ success: boolean; error?: string; screenshot?: string }> {
    const session = await this.getSession(sessionId);
    if (!session) {
      return { success: false, error: 'Session not found' };
    }

    try {
      await session.page.type(selector, text);
      session.lastActivity = new Date();

      const screenshot = await session.page.screenshot({ 
        type: 'png',
        fullPage: false,
        clip: { x: 0, y: 0, width: 1280, height: 720 }
      });

      return { 
        success: true, 
        screenshot: screenshot.toString('base64') 
      };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Type failed' 
      };
    }
  }

  async getPageInfo(sessionId: string): Promise<{ url: string; title: string; screenshot?: string } | null> {
    const session = await this.getSession(sessionId);
    if (!session) {
      return null;
    }

    try {
      const url = session.page.url();
      const title = await session.page.title();
      
      const screenshot = await session.page.screenshot({ 
        type: 'png',
        fullPage: false,
        clip: { x: 0, y: 0, width: 1280, height: 720 }
      });

      return {
        url,
        title,
        screenshot: screenshot.toString('base64')
      };
    } catch (error) {
      return null;
    }
  }

  async closeSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      try {
        await session.browser.close();
      } catch (error) {
        console.error('Error closing browser:', error);
      }
      this.sessions.delete(sessionId);
    }
  }

  private async cleanupInactiveSessions(): Promise<void> {
    const now = new Date();
    const inactiveThreshold = 30 * 60 * 1000; // 30 minutes

    for (const [sessionId, session] of this.sessions.entries()) {
      if (now.getTime() - session.lastActivity.getTime() > inactiveThreshold) {
        console.log(`Cleaning up inactive session: ${sessionId}`);
        await this.closeSession(sessionId);
      }
    }
  }

  async shutdown(): Promise<void> {
    clearInterval(this.cleanupInterval);
    
    for (const sessionId of this.sessions.keys()) {
      await this.closeSession(sessionId);
    }
  }
}

// Singleton instance
export const browserManager = new BrowserManager();
