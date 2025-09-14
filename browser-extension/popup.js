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
  
  // Screen recording variables
  let currentStream = null;
  let mediaRecorder = null;
  let recordedChunks = [];

  // Listen for messages from background script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'MONITORING_STATE_CHANGED') {
      isMonitoring = message.isMonitoring;
      updateUI();
    } else if (message.type === 'START_SCREEN_RECORDING') {
      startScreenRecording();
    }
  });

  // Screen recording function with proper screen selection prompt
  async function startScreenRecording() {
    try {
      console.log('🎬 Starting screen recording with selection prompt...');
      
      // This will show the screen selection dialog like Zoom/Google Meet
      currentStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          mediaSource: 'screen',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 }
        },
        audio: false
      });

      // Show preview of what's being recorded
      const preview = document.createElement('div');
      preview.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        width: 200px;
        height: 150px;
        background: #000;
        border: 2px solid #00ff00;
        border-radius: 8px;
        z-index: 10000;
        overflow: hidden;
      `;
      
      const video = document.createElement('video');
      video.srcObject = currentStream;
      video.autoplay = true;
      video.muted = true;
      video.style.cssText = `
        width: 100%;
        height: 100%;
        object-fit: cover;
      `;
      
      preview.appendChild(video);
      document.body.appendChild(preview);

      // Create MediaRecorder
      mediaRecorder = new MediaRecorder(currentStream, {
        mimeType: 'video/webm;codecs=vp9'
      });

      recordedChunks = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunks.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        console.log('🎬 Screen recording stopped');
        await processRecording();
        // Remove preview
        if (preview.parentNode) {
          preview.parentNode.removeChild(preview);
        }
      };

      mediaRecorder.start(1000); // Record in 1-second chunks
      console.log('✅ Screen recording started with preview');
      
      // Auto-hide preview after 3 seconds
      setTimeout(() => {
        if (preview.parentNode) {
          preview.style.opacity = '0.7';
        }
      }, 3000);
      
    } catch (error) {
      console.error('❌ Failed to start screen recording:', error);
      // User likely cancelled the screen selection
      console.log('User cancelled screen recording or denied permission');
    }
  }

  async function processRecording() {
    if (recordedChunks.length === 0) return;

    try {
      const blob = new Blob(recordedChunks, { type: 'video/webm' });
      const arrayBuffer = await blob.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
      
      // Send recording to background script
      const recordingData = {
        type: 'SCREEN_RECORDING_DATA',
        data: base64,
        timestamp: Date.now(),
        duration: recordedChunks.length * 1000
      };
      
      console.log('📹 Screen recording data prepared:', {
        dataSize: base64.length,
        duration: recordingData.duration,
        timestamp: recordingData.timestamp
      });
      
      chrome.runtime.sendMessage(recordingData);
      
      console.log('📹 Screen recording sent to background');
    } catch (error) {
      console.error('❌ Failed to process recording:', error);
    }
  }
  
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
