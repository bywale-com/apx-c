// Injected script that runs on every webpage to capture interactions
(function() {
  'use strict';
  
  // Prevent multiple injections
  if (window.apexMonitorInjected) return;
  // Only run in top frame to avoid iframe duplicate events
  try { if (window.top !== window.self) { window.apexMonitorInjected = true; return; } } catch (_) {}
  window.apexMonitorInjected = true;
  
  let isCapturing = false; // Start with monitoring OFF (will be controlled by extension)
  let sessionId = null;
  let pageUrl = window.location.href;
  
  // Session ID will be provided by background script when monitoring starts
  // Don't generate one here to avoid using local session IDs
  sessionId = null;
  
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
        console.log('📡 Injected script: START_CAPTURING received, isCapturing set to:', isCapturing);
      } else if (message.type === 'STOP_CAPTURING') {
        isCapturing = false;
        console.log('📡 Injected script: STOP_CAPTURING received, isCapturing set to:', isCapturing);
      } else if (message.type === 'NEW_MONITORING_SESSION') {
        console.log('🆕 New monitoring session - using global session ID');
        // Use the global session ID provided by background script
        if (message.sessionId) {
          sessionId = message.sessionId;
          console.log('🆔 Using global session ID:', sessionId);
        } else {
          // Fallback if no session ID provided
          const timestamp = Date.now();
          const random = Math.random().toString(36).substr(2, 9);
          sessionId = `session_${timestamp}_${random}`;
          console.log('🆔 Generated fallback session ID:', sessionId);
        }
      } else if (message.type === 'SESSION_RESET') {
        // Hard reset of local state after a recording completes
        console.log('🔄 SESSION_RESET received - clearing local state');
        isCapturing = false;
        sessionId = null; // will be set on next NEW_MONITORING_SESSION
        // no-op for pageUrl
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
    // If no session ID yet, generate a temporary one (will be replaced by global ID)
    if (!sessionId) {
      const timestamp = Date.now();
      const random = Math.random().toString(36).substr(2, 9);
      sessionId = `temp_${timestamp}_${random}`;
      console.log('🆔 Generated temporary session ID:', sessionId);
    }
    // Attach a coarse fingerprint to help background de-dup
    const fp = `${eventData.type}|${Math.floor((eventData.timestamp||Date.now())/200)}|${eventData.url||pageUrl}`;
    eventData.__apxFp = fp;
    
    // Send to content script via postMessage
    window.postMessage({
      type: 'APEX_EVENT',
      event: eventData
    }, '*');
    console.log('✅ Event sent to content script');
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
    
    console.log('🖱️ Click captured:', elementInfo, 'isCapturing:', isCapturing);
    
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
  const lastScrollPosByEl = new WeakMap(); // Element -> { x, y }
  const lastScrollSentAtByEl = new WeakMap(); // Element -> ts
  function captureScroll(event) {
    if (!isCapturing) return;
    
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      const now = Date.now();
      // Determine the scrolled element
      let el = event.target;
      if (el === document || el === window || !el) {
        el = document.scrollingElement || document.documentElement || document.body;
      }
      let x = 0, y = 0;
      if (el === document.scrollingElement || el === document.documentElement || el === document.body) {
        x = window.scrollX || document.documentElement.scrollLeft || 0;
        y = window.scrollY || document.documentElement.scrollTop || 0;
      } else if (el && el.scrollTop != null) {
        // @ts-ignore
        x = el.scrollLeft || 0;
        // @ts-ignore
        y = el.scrollTop || 0;
      }
      const lastPos = lastScrollPosByEl.get(el) || { x: NaN, y: NaN };
      const dx = Math.abs((x || 0) - (lastPos.x || 0));
      const dy = Math.abs((y || 0) - (lastPos.y || 0));
      const lastAt = lastScrollSentAtByEl.get(el) || 0;
      if ((dx >= 4 || dy >= 4) && (now - lastAt >= 200)) {
        lastScrollPosByEl.set(el, { x, y });
        lastScrollSentAtByEl.set(el, now);
        const elInfo = el instanceof Element ? getElementInfo(el) : { tag: 'document' };
        sendEvent({
          type: 'scroll',
          scrollY: y,
          scrollX: x,
          element: elInfo,
          timestamp: now,
          sessionId: sessionId,
          url: pageUrl
        });
      }
    }, 220);
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