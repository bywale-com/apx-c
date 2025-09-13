import { NextApiRequest, NextApiResponse } from 'next';
import { WebSocketServer } from 'ws';

// Initialize WebSocket server
let wss: WebSocketServer | null = null;

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!wss) {
    // Create WebSocket server
    wss = new WebSocketServer({ 
      port: 3001,
      path: '/ws'
    });
    
    // Store clients globally
    global.websocketClients = new Set();
    
    wss.on('connection', (ws) => {
      console.log('WebSocket client connected');
      global.websocketClients.add(ws);
      
      // Send welcome message
      ws.send(JSON.stringify({
        type: 'connected',
        message: 'Connected to Apex WebSocket server',
        timestamp: new Date().toISOString()
      }));
      
      // Handle messages from client
      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message.toString());
          console.log('WebSocket message received:', data);
          
          // Echo back for testing
          ws.send(JSON.stringify({
            type: 'echo',
            original: data,
            timestamp: new Date().toISOString()
          }));
        } catch (error) {
          console.error('WebSocket message error:', error);
        }
      });
      
      // Handle client disconnect
      ws.on('close', () => {
        console.log('WebSocket client disconnected');
        global.websocketClients.delete(ws);
      });
      
      // Handle errors
      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        global.websocketClients.delete(ws);
      });
    });
    
    console.log('WebSocket server started on port 3001');
  }

  res.status(200).json({ 
    message: 'WebSocket server is running',
    port: 3001,
    path: '/ws'
  });
}
