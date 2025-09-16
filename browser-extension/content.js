// Content script that runs in the extension context
// This script acts as a bridge between the injected script and the extension

(function() {
  'use strict';
  
  // Note: injected.js is now injected directly by background script
  // No need to inject it here to avoid conflicts
  
  // Listen for messages from the injected script
  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    
    if (event.data.type === 'APEX_EVENT') {
      // Forward to background script
      chrome.runtime.sendMessage({
        type: 'CAPTURE_EVENT',
        event: event.data.event
      });
    }
  });
  
  // Send messages to injected script
  function sendToInjected(message) {
    window.postMessage({
      type: 'APEX_EXTENSION_MESSAGE',
      data: message
    }, '*');
  }
  
  // Listen for messages from background script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('📨 Content script received message from background:', message);
    
    if (message.type === 'START_CAPTURING') {
      console.log('🚀 Content script: START_CAPTURING');
      sendToInjected({ type: 'START_CAPTURING' });
      // Also send monitoring state to injected script
      window.postMessage({
        type: 'APEX_MONITORING_STATE',
        isMonitoring: true
      }, '*');
      sendResponse({ success: true });
    } else if (message.type === 'STOP_CAPTURING') {
      console.log('🛑 Content script: STOP_CAPTURING');
      sendToInjected({ type: 'STOP_CAPTURING' });
      // Also send monitoring state to injected script
      window.postMessage({
        type: 'APEX_MONITORING_STATE',
        isMonitoring: false
      }, '*');
      sendResponse({ success: true });
    } else if (message.type === 'NEW_MONITORING_SESSION') {
      console.log('🆕 Content script: NEW_MONITORING_SESSION with sessionId:', message.sessionId);
      sendToInjected({ type: 'NEW_MONITORING_SESSION', sessionId: message.sessionId });
      sendResponse({ success: true });
    } else if (message.type === 'GET_STATUS') {
      sendToInjected({ type: 'GET_STATUS' });
      // Response will come back via message event
    }
  });
  
  // Listen for responses from injected script
  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    
    if (event.data.type === 'APEX_RESPONSE') {
      // Forward response to background script
      chrome.runtime.sendMessage({
        type: 'INJECTED_RESPONSE',
        data: event.data.data
      });
    }
  });
  
  console.log('🚀 Apex Monitor content script loaded on:', window.location.href);
})();