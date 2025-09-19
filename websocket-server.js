#!/usr/bin/env node

// Simple WebSocket server for Apex extension communication
const WebSocket = require('ws');

const PORT = 3001;
const PATH = '/ws';

// Create WebSocket server
const wss = new WebSocket.Server({ 
  port: PORT,
  path: PATH
});

console.log(`🚀 Apex WebSocket server running on ws://localhost:${PORT}${PATH}`);

// Store connected clients
const clients = new Set();

wss.on('connection', (ws, req) => {
  console.log(`📡 Client connected from ${req.socket.remoteAddress}`);
  clients.add(ws);
  
  // Send welcome message
  ws.send(JSON.stringify({
    type: 'connected',
    message: 'Connected to Apex WebSocket server',
    timestamp: new Date().toISOString(),
    clientCount: clients.size
  }));
  
  // Handle messages from client
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      console.log(`📨 Received: ${data.type} from client`);
      
      // Broadcast to all other clients
      clients.forEach(client => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'broadcast',
            from: 'server',
            data: data,
            timestamp: new Date().toISOString()
          }));
        }
      });
      
      // Echo back for testing
      ws.send(JSON.stringify({
        type: 'echo',
        original: data,
        timestamp: new Date().toISOString()
      }));
      
    } catch (error) {
      console.error('❌ Error parsing message:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Invalid JSON message',
        timestamp: new Date().toISOString()
      }));
    }
  });
  
  // Handle client disconnect
  ws.on('close', () => {
    console.log('📡 Client disconnected');
    clients.delete(ws);
  });
  
  // Handle errors
  ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error);
    clients.delete(ws);
  });
});

// Handle server errors
wss.on('error', (error) => {
  console.error('❌ WebSocket server error:', error);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down WebSocket server...');
  wss.close(() => {
    console.log('✅ WebSocket server closed');
    process.exit(0);
  });
});

// Keep server running
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled rejection at:', promise, 'reason:', reason);
});