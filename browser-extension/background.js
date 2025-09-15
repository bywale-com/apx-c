// Background script for Apex Workflow Monitor
console.log('🚀 Background script loaded!');

let isMonitoring = false;
let apexAppUrl = null;
let monitoredTabs = new Set();
let injectedTabs = new Set(); // Track which tabs already have scripts injected
// Rolling de-dup cache per tab: store fingerprints with timestamps
const tabEventCache = new Map(); // tabId -> Array<{fp:string, ts:number}>
const DEDUPE_WINDOW_MS = 250;
// Track active session per tab to ignore stale injectors
const tabActiveSession = new Map(); // tabId -> { sessionId: string, url: string }

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('✅ Apex Workflow Monitor installed');
  chrome.storage.sync.set({ isMonitoring: false });
});

console.log('📡 Background script is running');

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
  chrome.storage.sync.get(['isMonitoring'], (result) => {
    const newState = !result.isMonitoring;
    chrome.storage.sync.set({ isMonitoring: newState });
    updateMonitoringState(newState);
  });
});

// Update monitoring state across all tabs
async function updateMonitoringState(monitoring) {
  isMonitoring = monitoring;
  
  if (monitoring) {
    // Start monitoring - inject scripts into all tabs
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      if (tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://')) {
        // Only inject if not already injected
        if (!injectedTabs.has(tab.id)) {
          try {
            await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              files: ['content.js']
            });
            
            await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              files: ['injected.js']
            });
            
            injectedTabs.add(tab.id);
            monitoredTabs.add(tab.id);
            console.log(`✅ Injected into tab ${tab.id}`);
            
            setTimeout(() => {
              console.log(`📤 Background: Sending START_CAPTURING to tab ${tab.id}`);
              chrome.tabs.sendMessage(tab.id, { type: 'START_CAPTURING' }).catch(error => {
                console.log(`Could not send message to tab ${tab.id}:`, error);
              });
            }, 200);
          } catch (error) {
            console.log(`Could not inject into tab ${tab.id}:`, error);
          }
        } else {
          console.log(`⏭️ Tab ${tab.id} already has script injected`);
          monitoredTabs.add(tab.id);
          
          // Still send START_CAPTURING message to existing scripts
          setTimeout(() => {
            console.log(`📤 Background: Sending START_CAPTURING to existing tab ${tab.id}`);
            chrome.tabs.sendMessage(tab.id, { type: 'START_CAPTURING' }).catch(error => {
              console.log(`Could not send message to tab ${tab.id}:`, error);
            });
          }, 100);
        }
      }
    }
    
    connectToApexApp();
  } else {
    // Stop monitoring
    for (const tabId of monitoredTabs) {
      try {
        console.log(`📤 Background: Sending STOP_CAPTURING to tab ${tabId}`);
        chrome.tabs.sendMessage(tabId, { type: 'STOP_CAPTURING' });
      } catch (error) {
        console.log(`Could not send stop message to tab ${tabId}:`, error);
      }
    }
    
    monitoredTabs.clear();
  }
  
  // Update popup
  chrome.runtime.sendMessage({ type: 'MONITORING_STATE_CHANGED', isMonitoring });
}

// Connect to Apex app via HTTP API
function connectToApexApp() {
  sendToApp({ type: 'extension_connected', timestamp: Date.now() });
  console.log('Extension connected to Apex app via HTTP API');
}

// Fixed: Send data to Apex app via HTTP API - try URLs sequentially
async function sendToApp(data) {
  console.log('sendToApp called with:', data);
  
  const possibleUrls = [
    'http://localhost:3000/api/extension-events',
    'https://chat.apexintro.com/api/extension-events'
  ];
  
  // Try URLs sequentially until one works
  for (const url of possibleUrls) {
    try {
      console.log(`Attempting to send to: ${url}`);
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      console.log(`Response from ${url}:`, response.status, response.statusText);
      
      if (response.ok) {
        console.log(`✅ Event sent to Apex app successfully at ${url}`);
        return await response.json();
      } else {
        console.log(`❌ Failed to send to ${url}:`, response.status);
        const errorText = await response.text();
        console.log('Error response:', errorText);
      }
    } catch (error) {
      console.log(`❌ Network error sending to ${url}:`, error);
      // Continue to next URL
    }
  }
  
  console.log('❌ Failed to send to all URLs');
}

// Listen for tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (isMonitoring && changeInfo.status === 'complete' && tab.url) {
    if (!tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://')) {
      chrome.scripting.executeScript({
        target: { tabId },
        files: ['content.js']
      }).then(() => {
        return chrome.scripting.executeScript({
          target: { tabId },
          files: ['injected.js']
        });
      }).then(() => {
        monitoredTabs.add(tabId);
        
        setTimeout(() => {
          console.log(`📤 Background: Sending START_CAPTURING to new tab ${tabId}`);
          chrome.tabs.sendMessage(tabId, { type: 'START_CAPTURING' }).catch(error => {
            console.log(`Could not send message to new tab ${tabId}:`, error);
          });
        }, 100);
        
        if (isMonitoring) {
          sendToApp({ 
            type: 'tab_monitored', 
            tabId, 
            url: tab.url, 
            title: tab.title 
          });
        }
      }).catch(error => {
        console.log(`Could not inject into tab ${tabId}:`, error);
      });
    }
  }
});

// Listen for tab removal
chrome.tabs.onRemoved.addListener((tabId) => {
  injectedTabs.delete(tabId); // Clean up injection tracking
  monitoredTabs.delete(tabId);
  if (isMonitoring) {
    sendToApp({ type: 'tab_closed', tabId });
  }
});

// FIXED: Single message listener to handle all message types
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('📨 Received message:', message.type, sender?.tab?.id || 'popup');

  // Handle messages from content scripts
  if (message.type === 'CAPTURE_EVENT') {
    const tabId = sender.tab.id;
    const fp = message.event && message.event.__apxFp;
    const now = Date.now();
    // Session filter: prefer the first sessionId seen for current URL
    const incomingSession = message.event && message.event.sessionId;
    const incomingUrl = sender.tab.url;
    const active = tabActiveSession.get(tabId);
    if (incomingSession) {
      if (!active) {
        tabActiveSession.set(tabId, { sessionId: incomingSession, url: incomingUrl });
      } else {
        const sameUrl = active.url === incomingUrl;
        if (sameUrl && active.sessionId !== incomingSession) {
          console.log('🛑 Ignored stale session for tab', tabId, incomingSession, 'active:', active.sessionId);
          return;
        }
        if (!sameUrl) {
          tabActiveSession.set(tabId, { sessionId: incomingSession, url: incomingUrl });
        }
      }
    }
    if (fp) {
      const list = tabEventCache.get(tabId) || [];
      // Drop entries older than window
      const fresh = list.filter(e => now - e.ts < DEDUPE_WINDOW_MS);
      const dup = fresh.some(e => e.fp === fp);
      if (dup) {
        console.log('🛑 Deduped browser_event for tab', tabId, fp);
        tabEventCache.set(tabId, fresh);
        return;
      }
      fresh.push({ fp, ts: now });
      tabEventCache.set(tabId, fresh);
    }
    sendToApp({
      type: 'browser_event',
      tabId,
      url: sender.tab.url,
      title: sender.tab.title,
      event: message.event,
      timestamp: now
    });
  }
  
  // Handle screen recording data from popup
  if (message.type === 'SCREEN_RECORDING_CHUNK') {
    sendToApp({
      type: 'screen_recording_chunk',
      recordingId: message.recordingId,
      index: message.index,
      total: message.total,
      data: message.data,
      mimeType: message.mimeType,
      timestamp: message.timestamp
    });
  }
  if (message.type === 'SCREEN_RECORDING_COMPLETE') {
    sendToApp({
      type: 'screen_recording_complete',
      recordingId: message.recordingId,
      duration: message.duration,
      size: message.size,
      mimeType: message.mimeType,
      timestamp: message.timestamp
    });
  }
  
  // Handle monitoring state requests
  if (message.type === 'GET_MONITORING_STATE') {
    sendResponse({ isMonitoring, monitoredTabs: Array.from(monitoredTabs) });
  }

  // Handle popup control messages
  if (message.type === 'start_monitoring') {
    console.log('🚀 Starting monitoring from popup');
    chrome.storage.sync.set({ isMonitoring: true });
    updateMonitoringState(true);
    
    console.log('✅ Event capture started');
    
    sendToApp({
      type: 'recording_control',
      action: 'start_recording',
      timestamp: Date.now()
    });
    
    sendResponse({ success: true });
  }
  
  if (message.type === 'stop_monitoring') {
    console.log('🛑 Stopping monitoring from popup');
    chrome.storage.sync.set({ isMonitoring: false });
    updateMonitoringState(false);
    
    sendToApp({
      type: 'recording_control',
      action: 'stop_recording',
      timestamp: Date.now()
    });
    
    sendResponse({ success: true });
  }

  return true; // Keep message channel open for async response
});

// Handle extension startup
chrome.runtime.onStartup.addListener(() => {
  chrome.storage.sync.get(['isMonitoring'], (result) => {
    if (result.isMonitoring) {
      updateMonitoringState(true);
    }
  });
});