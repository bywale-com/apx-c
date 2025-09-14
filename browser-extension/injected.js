// Injected script that runs on every webpage to capture interactions
(function() {
  'use strict';
  
  // Prevent multiple injections
  if (window.apexMonitorInjected) return;
  window.apexMonitorInjected = true;
  
  let isCapturing = false; // Start with monitoring OFF (will be controlled by extension)
  let sessionId = null;
  let pageUrl = window.location.href;
  
  // Generate unique session ID for this page
  sessionId = 'page_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  
  // Listen for monitoring state changes from content script
  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    
    console.log('📨 Injected script received message:', event.data);
    
    if (event.data.type === 'APEX_MONITORING_STATE') {
      isCapturing = event.data.isMonitoring;
      console.log('📡 Injected script monitoring state:', isCapturing ? 'ON' : 'OFF');
    }
    
    // Also handle direct START/STOP messages
    if (event.data.type === 'APEX_EXTENSION_MESSAGE') {
      const message = event.data.data;
      if (message.type === 'START_CAPTURING') {
        isCapturing = true;
        console.log('📡 Injected script: START_CAPTURING received');
      } else if (message.type === 'STOP_CAPTURING') {
        isCapturing = false;
        console.log('📡 Injected script: STOP_CAPTURING received');
      }
    }
  });
  
  // Function to send events to content script (which forwards to background)
  function sendEvent(eventData) {
    // Only send if monitoring is enabled
    if (!isCapturing) {
      console.log('🚫 Event blocked - monitoring OFF');
      return;
    }
    
    // Send to content script via postMessage
    window.postMessage({
      type: 'APEX_EVENT',
      event: eventData
    }, '*');
  }
  
  // Function to get element selector
  function getElementSelector(element) {
    if (!element || element === document) return 'document';
    
    let selector = '';
    let el = element;
    
    while (el && el !== document) {
      if (el.id) {
        selector = '#' + el.id + (selector ? ' > ' + selector : '');
        break;
      } else if (el.className) {
        const classes = el.className.split(' ').filter(c => c).slice(0, 2);
        if (classes.length > 0) {
          selector = el.tagName.toLowerCase() + '.' + classes.join('.') + (selector ? ' > ' + selector : '');
        } else {
          selector = el.tagName.toLowerCase() + (selector ? ' > ' + selector : '');
        }
      } else {
        selector = el.tagName.toLowerCase() + (selector ? ' > ' + selector : '');
      }
      el = el.parentElement;
    }
    
    return selector;
  }
  
  // Function to get element info
  function getElementInfo(element) {
    return {
      tag: element.tagName.toLowerCase(),
      id: element.id || null,
      className: element.className || null,
      text: element.textContent?.slice(0, 100) || null,
      selector: getElementSelector(element),
      role: element.getAttribute('role') || null,
      type: element.type || null,
      name: element.name || null,
      placeholder: element.placeholder || null
    };
  }
  
  // Capture click events
  function captureClick(event) {
    
    const element = event.target;
    const elementInfo = getElementInfo(element);
    
    console.log('🖱️ Click captured:', elementInfo);
    
    sendEvent({
      type: 'click',
      element: elementInfo,
      coordinates: { x: event.clientX, y: event.clientY },
      timestamp: Date.now(),
      sessionId: sessionId,
      url: pageUrl
    });
  }
  
  // Capture input events
  function captureInput(event) {
    
    const element = event.target;
    const elementInfo = getElementInfo(element);
    
    // Don't capture password fields
    let value = null;
    if (element.type !== 'password' && !element.hasAttribute('data-apex-redact')) {
      value = element.value || element.textContent || null;
      if (value) value = value.slice(0, 200); // Limit length
    }
    
    console.log('⌨️ Input captured:', elementInfo, 'value:', value);
    
    sendEvent({
      type: 'input',
      element: elementInfo,
      value: value,
      redacted: element.type === 'password' || element.hasAttribute('data-apex-redact'),
      timestamp: Date.now(),
      sessionId: sessionId,
      url: pageUrl
    });
  }
  
  // Capture form submission
  function captureSubmit(event) {
    if (!isCapturing) return;
    
    const element = event.target;
    const elementInfo = getElementInfo(element);
    
    sendEvent({
      type: 'submit',
      element: elementInfo,
      timestamp: Date.now(),
      sessionId: sessionId,
      url: pageUrl
    });
  }
  
  // Capture navigation
  function captureNavigation() {
    if (!isCapturing) return;
    
    sendEvent({
      type: 'navigate',
      url: window.location.href,
      title: document.title,
      timestamp: Date.now(),
      sessionId: sessionId
    });
  }
  
  // Capture page load
  function capturePageLoad() {
    sendEvent({
      type: 'page_load',
      url: window.location.href,
      title: document.title,
      timestamp: Date.now(),
      sessionId: sessionId
    });
  }
  
  // Capture scroll events (throttled)
  let scrollTimeout;
  function captureScroll(event) {
    if (!isCapturing) return;
    
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      sendEvent({
        type: 'scroll',
        scrollY: window.scrollY,
        scrollX: window.scrollX,
        timestamp: Date.now(),
        sessionId: sessionId,
        url: pageUrl
      });
    }, 100);
  }
  
  // Capture key events (throttled)
  let keyTimeout;
  function captureKey(event) {
    if (!isCapturing) return;
    
    clearTimeout(keyTimeout);
    keyTimeout = setTimeout(() => {
      sendEvent({
        type: 'key',
        key: event.key,
        code: event.code,
        ctrlKey: event.ctrlKey,
        altKey: event.altKey,
        shiftKey: event.shiftKey,
        metaKey: event.metaKey,
        timestamp: Date.now(),
        sessionId: sessionId,
        url: pageUrl
      });
    }, 50);
  }
  
  // Listen for messages from content script (the correct way for injected scripts)
  
  // Add event listeners
  document.addEventListener('click', captureClick, true);
  document.addEventListener('input', captureInput, true);
  document.addEventListener('change', captureInput, true);
  document.addEventListener('submit', captureSubmit, true);
  document.addEventListener('scroll', captureScroll, true);
  document.addEventListener('keydown', captureKey, true);
  
  // Capture initial page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', capturePageLoad);
  } else {
    capturePageLoad();
  }
  
  // Capture navigation (for SPAs)
  let lastUrl = window.location.href;
  const observer = new MutationObserver(() => {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      pageUrl = lastUrl;
      captureNavigation();
    }
  });
  observer.observe(document, { subtree: true, childList: true });
  
  // Expose control functions globally
  window.apexMonitor = {
    startCapturing: () => { isCapturing = true; },
    stopCapturing: () => { isCapturing = false; },
    getStatus: () => ({ isCapturing, sessionId, url: pageUrl }),
    sendCustomEvent: (eventData) => sendEvent(eventData)
  };
  
  console.log('Apex Monitor injected into:', window.location.href);
  console.log('📡 Initial monitoring state:', isCapturing ? 'ON' : 'OFF');
})();
