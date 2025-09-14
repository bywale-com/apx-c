import { NextApiRequest, NextApiResponse } from 'next';
import { v4 as uuid } from 'uuid';
import fs from 'fs';
import path from 'path';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    // Handle incoming events from extension
    try {
      const eventData = req.body;
      
      // Skip test events to prevent clogging
      if (eventData.type === 'test_connection' || eventData.source === 'manual_test') {
        res.status(200).json({ success: true, skipped: true });
        return;
      }
      
      // Add unique ID and timestamp if not present
      if (!eventData.id) {
        eventData.id = uuid();
      }
      if (!eventData.timestamp) {
        eventData.timestamp = new Date().toISOString();
      }
      
      // Log the event with full details
      console.log('Extension event received:', {
        type: eventData.type,
        url: eventData.url,
        tabId: eventData.tabId,
        timestamp: eventData.timestamp,
        event: eventData.event // Include the detailed interaction data
      });
      
      // Store in memory for now (in production, use Redis or database)
      if (!global.extensionEvents) {
        global.extensionEvents = [];
      }
      
      // Handle screen recordings separately
      if (eventData.type === 'screen_recording') {
        console.log('📹 Screen recording received:', {
          duration: eventData.duration,
          dataSize: eventData.data?.length || 0,
          timestamp: eventData.timestamp,
          hasData: !!eventData.data
        });
        
        // Store screen recording with special handling
        if (!global.screenRecordings) {
          global.screenRecordings = [];
          console.log('📹 Created new screenRecordings array');
        }
        
        // Only store if we have actual data
        if (eventData.data && eventData.data.length > 0) {
          global.screenRecordings.push(eventData);
          console.log('📹 Screen recording stored, total recordings:', global.screenRecordings.length);
          
          // Keep only last 10 recordings
          if (global.screenRecordings.length > 10) {
            global.screenRecordings = global.screenRecordings.slice(-10);
            console.log('📹 Trimmed recordings to last 10');
          }
        } else {
          console.log('📹 Screen recording has no data, not storing');
        }
      } else {
        global.extensionEvents.push(eventData);
        
        // Keep only last 100 events (reduced from 1000)
        if (global.extensionEvents.length > 100) {
          global.extensionEvents = global.extensionEvents.slice(-100);
        }
      }
      
      res.status(200).json({ success: true, eventId: eventData.id });
    } catch (error) {
      console.error('Extension event error:', error);
      res.status(500).json({ error: 'Failed to process extension event' });
    }
  } else if (req.method === 'GET') {
    // Handle requests for recent events
    try {
      const action = req.query.action;
      
      if (action === 'get_recent') {
        // Filter out test events and only return real extension events
        const allEvents = global.extensionEvents || [];
        const realEvents = allEvents.filter(event => 
          event.type !== 'test_connection' && event.source !== 'manual_test'
        );
        const recentEvents = realEvents.slice(-20);
        res.status(200).json(recentEvents);
      } else if (action === 'analyze_session') {
        // Analyze session events using smart analysis
        const sessionId = req.query.sessionId as string;
        const allEvents = global.extensionEvents || [];
        const sessionEvents = allEvents.filter(event => 
          event.sessionId === sessionId || 
          (event.timestamp && new Date(event.timestamp).getTime() >= parseInt(sessionId.split('_')[1]))
        );
        
        // Import and use smart analysis
        const { analyzeEvent } = await import('../../lib/event-analyzer');
        const criticalEvents = sessionEvents
          .map(event => analyzeEvent(event))
          .filter(event => event !== null);
        
        const analysis = {
          sessionId,
          totalEvents: sessionEvents.length,
          criticalEvents: criticalEvents.length,
          events: criticalEvents,
          summary: {
            formInteractions: criticalEvents.filter(e => e.type === 'form_interaction').length,
            buttonActions: criticalEvents.filter(e => e.type === 'button_action').length,
            navigation: criticalEvents.filter(e => e.type === 'navigation').length,
            highImportance: criticalEvents.filter(e => e.importance === 'high').length
          }
        };
        
        res.status(200).json(analysis);
      } else if (action === 'get_recordings') {
        // Get screen recordings
        const recordings = global.screenRecordings || [];
        res.status(200).json(recordings);
      } else if (action === 'clear') {
        // Clear all events
        global.extensionEvents = [];
        global.screenRecordings = [];
        res.status(200).json({ success: true, message: 'Events and recordings cleared' });
      } else {
        res.status(400).json({ error: 'Invalid action' });
      }
    } catch (error) {
      console.error('Get events error:', error);
      res.status(500).json({ error: 'Failed to get events' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
