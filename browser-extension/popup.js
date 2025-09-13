// Popup script for Apex Workflow Monitor extension
document.addEventListener('DOMContentLoaded', function() {
  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');
  const toggleBtn = document.getElementById('toggleBtn');
  const settingsBtn = document.getElementById('settingsBtn');
  const tabCount = document.getElementById('tabCount');
  
  let isMonitoring = false;
  let monitoredTabs = 0;
  
  // Load current state
  chrome.storage.sync.get(['isMonitoring'], (result) => {
    isMonitoring = result.isMonitoring || false;
    updateUI();
  });
  
  // Update UI based on current state
  function updateUI() {
    if (isMonitoring) {
      statusDot.classList.add('active');
      statusText.textContent = 'Monitoring Active';
      toggleBtn.textContent = 'Stop Monitoring';
      toggleBtn.className = 'btn btn-danger';
    } else {
      statusDot.classList.remove('active');
      statusText.textContent = 'Monitoring Inactive';
      toggleBtn.textContent = 'Start Monitoring';
      toggleBtn.className = 'btn btn-primary';
    }
  }
  
  // Toggle monitoring
  toggleBtn.addEventListener('click', () => {
    const newState = !isMonitoring;
    chrome.storage.sync.set({ isMonitoring: newState });
    
    // Send message to background script
    chrome.runtime.sendMessage({
      type: newState ? 'start_monitoring' : 'stop_monitoring'
    });
    
    isMonitoring = newState;
    updateUI();
  });
  
  // Settings button
  settingsBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: 'chrome://extensions/' });
  });
  
  // Listen for messages from background script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'MONITORING_STATE_CHANGED') {
      isMonitoring = message.isMonitoring;
      updateUI();
    }
  });
  
  // Get current tab count
  chrome.tabs.query({}, (tabs) => {
    const validTabs = tabs.filter(tab => 
      tab.url && 
      !tab.url.startsWith('chrome://') && 
      !tab.url.startsWith('chrome-extension://')
    );
    tabCount.textContent = validTabs.length;
  });
  
  // Update tab count periodically
  setInterval(() => {
    chrome.tabs.query({}, (tabs) => {
      const validTabs = tabs.filter(tab => 
        tab.url && 
        !tab.url.startsWith('chrome://') && 
        !tab.url.startsWith('chrome-extension://')
      );
      tabCount.textContent = validTabs.length;
    });
  }, 2000);
});
