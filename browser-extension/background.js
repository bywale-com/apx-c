// Background script for Apex Workflow Monitor
console.log('🚀 Background script loaded!');

let isMonitoring = false;
let apexAppUrl = null;
let websocket = null;
let monitoredTabs = new Set();

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('✅ Apex Workflow Monitor installed');
  chrome.storage.sync.set({ isMonitoring: false });
});

// Add immediate logging
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
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['injected.js']
          });
          monitoredTabs.add(tab.id);
          
          // Send start capturing message to content script
          console.log(`📤 Background: Sending START_CAPTURING to tab ${tab.id}`);
          chrome.tabs.sendMessage(tab.id, { type: 'START_CAPTURING' });
        } catch (error) {
          console.log(`Could not inject into tab ${tab.id}:`, error);
        }
      }
    }
    
    // Connect to Apex app
    connectToApexApp();
  } else {
    // Stop monitoring - send stop message to all monitored tabs
    for (const tabId of monitoredTabs) {
      try {
        console.log(`📤 Background: Sending STOP_CAPTURING to tab ${tabId}`);
        chrome.tabs.sendMessage(tabId, { type: 'STOP_CAPTURING' });
      } catch (error) {
        console.log(`Could not send stop message to tab ${tabId}:`, error);
      }
    }
    
    monitoredTabs.clear();
    if (websocket) {
      websocket.close();
      websocket = null;
    }
  }
  
  // Update popup
  chrome.runtime.sendMessage({ type: 'MONITORING_STATE_CHANGED', isMonitoring });
}

// Connect to Apex app via HTTP API (no WebSocket needed)
function connectToApexApp() {
  // Just send a test message to verify connection
  sendToApp({ type: 'extension_connected', timestamp: Date.now() });
  console.log('Extension connected to Apex app via HTTP API');
}

// Send data to Apex app via HTTP API
function sendToApp(data) {
  console.log('sendToApp called with:', data);
  
  // Try multiple URLs for different environments
  const possibleUrls = [
    'http://localhost:3001/api/extension-events',  // Local development
    'https://chat.apexintro.com/api/extension-events' // Production
  ];
  
  // Try each URL until one works
  for (const url of possibleUrls) {
    console.log(`Attempting to send to: ${url}`);
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(response => {
      console.log(`Response from ${url}:`, response.status, response.statusText);
      if (response.ok) {
        console.log(`✅ Event sent to Apex app successfully at ${url}`);
        return response.json();
      } else {
        console.log(`❌ Failed to send to ${url}:`, response.status);
        return response.text().then(text => console.log('Error response:', text));
      }
    }).catch(error => {
      console.log(`❌ Network error sending to ${url}:`, error);
    });
  }
}

// Handle messages from Apex app
function handleAppMessage(data) {
  switch (data.type) {
    case 'start_monitoring':
      updateMonitoringState(true);
      break;
    case 'stop_monitoring':
      updateMonitoringState(false);
      break;
    case 'get_status':
      sendToApp({ 
        type: 'status_response', 
        isMonitoring, 
        monitoredTabs: Array.from(monitoredTabs) 
      });
      break;
  }
}

// Listen for tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (isMonitoring && changeInfo.status === 'complete' && tab.url) {
    // Inject monitoring script into new/updated tabs
    if (!tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://')) {
      chrome.scripting.executeScript({
        target: { tabId },
        files: ['injected.js']
      }).then(() => {
        monitoredTabs.add(tabId);
        sendToApp({ 
          type: 'tab_monitored', 
          tabId, 
          url: tab.url, 
          title: tab.title 
        });
      }).catch(error => {
        console.log(`Could not inject into tab ${tabId}:`, error);
      });
    }
  }
});

// Listen for tab removal
chrome.tabs.onRemoved.addListener((tabId) => {
  monitoredTabs.delete(tabId);
  sendToApp({ type: 'tab_closed', tabId });
});

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'CAPTURE_EVENT') {
    // Forward captured events to Apex app
    sendToApp({
      type: 'browser_event',
      tabId: sender.tab.id,
      url: sender.tab.url,
      title: sender.tab.title,
      event: message.event,
      timestamp: Date.now()
    });
  }
  
  if (message.type === 'GET_MONITORING_STATE') {
    sendResponse({ isMonitoring, monitoredTabs: Array.from(monitoredTabs) });
  }
});

// Handle extension startup
chrome.runtime.onStartup.addListener(() => {
  chrome.storage.sync.get(['isMonitoring'], (result) => {
    if (result.isMonitoring) {
      updateMonitoringState(true);
    }
  });
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('📨 Received message from popup:', message);

  if (message.type === 'start_monitoring') {
    console.log('🚀 Starting monitoring from popup');
    chrome.storage.sync.set({ isMonitoring: true });
    updateMonitoringState(true);
    
    // Notify app that recording should start
    sendToApp({
      type: 'recording_control',
      action: 'start_recording',
      timestamp: Date.now()
    });
    
    sendResponse({ success: true });
  } else if (message.type === 'stop_monitoring') {
    console.log('🛑 Stopping monitoring from popup');
    chrome.storage.sync.set({ isMonitoring: false });
    updateMonitoringState(false);
    
    // Notify app that recording should stop
    sendToApp({
      type: 'recording_control',
      action: 'stop_recording',
      timestamp: Date.now()
    });
    
    sendResponse({ success: true });
  }

  return true; // Keep message channel open for async response
});
