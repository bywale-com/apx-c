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
let previewWindowId = null; // persistent recording preview window
let previewTabId = null; // tab id for preview.html
let pendingPreviewCloseTimer = null; // timeout handle while waiting for preview to finalize
let recordingStarted = false; // becomes true after PREVIEW_STARTED
let recordingStartTimestamp = null; // timestamp when recording actually started (for video sync)
let previewWindowCreating = false; // flag to prevent duplicate window creation
let globalSessionId = null; // single session ID shared across all tabs for this monitoring session

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
  console.log(`🔄 updateMonitoringState(${monitoring}) called, current state: ${isMonitoring}`);
  if (isMonitoring === monitoring) {
    console.log('⏭️ Already in requested state, skipping');
    return;
  }
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
            
            if (recordingStarted) {
              setTimeout(() => {
                console.log(`📤 Background: Sending START_CAPTURING to tab ${tab.id}`);
                chrome.tabs.sendMessage(tab.id, { type: 'START_CAPTURING' }).catch(error => {
                  console.log(`Could not send message to tab ${tab.id}:`, error);
                });
              }, 200);
            }
          } catch (error) {
            console.log(`Could not inject into tab ${tab.id}:`, error);
          }
        } else {
          console.log(`⏭️ Tab ${tab.id} already has script injected`);
          monitoredTabs.add(tab.id);
          
          // Send START_CAPTURING only if recording already started
          if (recordingStarted) {
            setTimeout(() => {
              console.log(`📤 Background: Sending START_CAPTURING to existing tab ${tab.id}`);
              chrome.tabs.sendMessage(tab.id, { type: 'START_CAPTURING' }).catch(error => {
                console.log(`Could not send message to tab ${tab.id}:`, error);
              });
            }, 100);
          }
        }
      }
    }
    
    connectToApexApp();

    // Open persistent preview window to host the recorder/preview
    if (previewWindowId == null && !previewWindowCreating) {
      console.log('🎬 Creating preview window...');
      previewWindowCreating = true;
      try {
        chrome.windows.create({
          url: chrome.runtime.getURL('preview.html'),
          type: 'popup',
          width: 170,
          height: 140,
          focused: true
        }).then(async (win) => {
          previewWindowId = win?.id ?? null;
          previewWindowCreating = false;
          console.log('✅ Preview window created with ID:', previewWindowId);
          // Attempt to discover the preview tab id within this window
          try {
            if (previewWindowId != null) {
              const tabs = await chrome.tabs.query({ windowId: previewWindowId });
              const targetUrl = chrome.runtime.getURL('preview.html');
              const found = tabs.find(t => t.url === targetUrl) || tabs[0];
              if (found && found.id != null) {
                previewTabId = found.id;
              }
            }
          } catch {}
        }).catch((e) => {
          console.log('Could not open preview window:', e);
          previewWindowCreating = false;
        });
      } catch (e) {
        console.log('Could not open preview window:', e);
        previewWindowCreating = false;
      }
    }
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

    // Ask preview to stop and self-finalize; close when ready or after fallback
    if (previewTabId != null) {
      try {
        chrome.tabs.sendMessage(previewTabId, { type: 'REQUEST_STOP_PREVIEW' }).catch(() => {});
      } catch {}
    }
    // Fallback close if no ready signal within timeout
    if (pendingPreviewCloseTimer) clearTimeout(pendingPreviewCloseTimer);
    pendingPreviewCloseTimer = setTimeout(async () => {
      if (previewWindowId != null) {
        try { await chrome.windows.remove(previewWindowId); } catch {}
      }
      previewWindowId = null;
      previewTabId = null;
      previewWindowCreating = false;
      globalSessionId = null;
      pendingPreviewCloseTimer = null;
    }, 4000);
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
        // Return a simple ACK object so callers can rely on ok/status without
        // depending on specific JSON shapes from the server
        return { ok: true, status: response.status };
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
        
        if (recordingStarted) {
          setTimeout(() => {
            console.log(`📤 Background: Sending START_CAPTURING to new tab ${tabId}`);
            chrome.tabs.sendMessage(tabId, { type: 'START_CAPTURING' }).catch(error => {
              console.log(`Could not send message to new tab ${tabId}:`, error);
            });
          }, 100);
        }
        
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

  // --- Recording chunk ACK tracking state ---
  // recordingId -> { total: number, acked: Set<number>, meta?: { duration,size,mimeType,timestamp }, retries?: number }
  const ensureRecState = (id) => {
    // Use global map on window (service worker scope) to persist while background is alive
    // eslint-disable-next-line no-undef
    self.__apxRecordingState = self.__apxRecordingState || new Map();
    const map = self.__apxRecordingState;
    if (!map.has(id)) {
      map.set(id, { total: 0, acked: new Set(), meta: undefined, retries: 0 });
    }
    return map.get(id);
  };

  const tryComplete = async (id) => {
    // eslint-disable-next-line no-undef
    const map = self.__apxRecordingState;
    if (!map || !map.has(id)) return;
    const rec = map.get(id);
    if (!rec || !rec.meta) return; // need completion metadata first
    if (rec.acked.size !== rec.total || rec.total === 0) return; // wait for all chunks

    console.log(`📦 All chunks acked for ${id}. Sending completion...`);
    const result = await sendToApp({
      type: 'screen_recording_complete',
      recordingId: id,
      duration: rec.meta.duration,
      size: rec.meta.size,
      mimeType: rec.meta.mimeType,
      timestamp: rec.meta.timestamp
    });

    if (result && result.ok) {
      console.log(`✅ Completion accepted for ${id}`);
      map.delete(id);
    } else {
      // Backoff and retry a few times in case server still assembling
      rec.retries = (rec.retries || 0) + 1;
      const backoffMs = Math.min(2000, 300 + rec.retries * 300);
      if (rec.retries <= 3) { // Reduce retries to avoid spam
        console.log(`⏳ Completion not accepted for ${id}. Retrying in ${backoffMs}ms (attempt ${rec.retries})`);
        setTimeout(() => tryComplete(id), backoffMs);
      } else {
        console.log(`🛑 Gave up retrying completion for ${id} after ${rec.retries} attempts`);
        map.delete(id); // Clean up after max retries
      }
    }
  };

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
      timestamp: now,
      recordingStartTimestamp: recordingStartTimestamp // Include for video sync
    });
  }
  
  // Handle screen recording data from popup
  if (message.type === 'SCREEN_RECORDING_CHUNK') {
    const rec = ensureRecState(message.recordingId);
    rec.total = message.total || rec.total;
    // Send and record ACK on success
    sendToApp({
      type: 'screen_recording_chunk',
      recordingId: message.recordingId,
      index: message.index,
      total: message.total,
      data: message.data,
      mimeType: message.mimeType,
      timestamp: message.timestamp,
      recordingStartTimestamp: recordingStartTimestamp
    }).then((result) => {
      if (result && result.ok) {
        rec.acked.add(message.index);
        // If completion info already known, attempt completion when all acked
        tryComplete(message.recordingId);
      }
    }).catch(() => {
      // Network error already logged by sendToApp
    });
  }
  if (message.type === 'SCREEN_RECORDING_COMPLETE') {
    const rec = ensureRecState(message.recordingId);
    rec.meta = {
      duration: message.duration,
      size: message.size,
      mimeType: message.mimeType,
      timestamp: message.timestamp
    };
    // Try completion now; will only fire when all chunks acked
    tryComplete(message.recordingId);
  }
  
  // --- Preview lifecycle wiring ---
  if (message.type === 'PREVIEW_OPENED') {
    // Track the preview tab id for targeted messaging
    if (sender && sender.tab && sender.tab.id) {
      previewTabId = sender.tab.id;
      console.log('🎬 Preview opened in tab', previewTabId);
      // Now that preview is alive, request it to start capture
      try { chrome.tabs.sendMessage(previewTabId, { type: 'START_PREVIEW' }); } catch {}
    }
  }

  if (message.type === 'PREVIEW_STARTED') {
    console.log('🎥 Preview started recording at', message.timestamp);
    recordingStarted = true;
    recordingStartTimestamp = message.timestamp; // Store for video sync
    
    // Generate a single global session ID for this monitoring session
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    globalSessionId = `session_${timestamp}_${random}`;
    console.log('🆔 Generated global session ID:', globalSessionId);
    
    // Signal new monitoring session to all tabs with the global session ID
    for (const tabId of monitoredTabs) {
      try {
        chrome.tabs.sendMessage(tabId, { 
          type: 'NEW_MONITORING_SESSION', 
          sessionId: globalSessionId 
        }).catch(() => {});
        chrome.tabs.sendMessage(tabId, { type: 'START_CAPTURING' }).catch(() => {});
      } catch {}
    }
  }

  if (message.type === 'PREVIEW_READY_TO_CLOSE') {
    console.log('✅ Preview signaled ready to close');
    if (pendingPreviewCloseTimer) {
      clearTimeout(pendingPreviewCloseTimer);
      pendingPreviewCloseTimer = null;
    }
    (async () => {
      if (previewWindowId != null) {
        try { await chrome.windows.remove(previewWindowId); } catch {}
      }
      previewWindowId = null;
      previewTabId = null;
      recordingStarted = false;
      recordingStartTimestamp = null;
      previewWindowCreating = false;
      globalSessionId = null;
    })();
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