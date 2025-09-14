// Popup script with bulletproof screen recording
document.addEventListener('DOMContentLoaded', function() {
  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');
  const toggleBtn = document.getElementById('toggleBtn');
  const settingsBtn = document.getElementById('settingsBtn');
  const tabCount = document.getElementById('tabCount');
  
  // Add debug info div
  const debugDiv = document.createElement('div');
  debugDiv.id = 'debug-info';
  debugDiv.style.cssText = `
    margin-top: 10px;
    padding: 5px;
    background: #f0f0f0;
    border-radius: 3px;
    font-size: 11px;
    max-height: 100px;
    overflow-y: auto;
  `;
  document.body.appendChild(debugDiv);
  
  function debugLog(message) {
    console.log(message);
    debugDiv.innerHTML += `<div>${new Date().toLocaleTimeString()}: ${message}</div>`;
    debugDiv.scrollTop = debugDiv.scrollHeight;
  }
  
  let isMonitoring = false;
  let currentStream = null;
  let mediaRecorder = null;
  let recordedChunks = [];
  let recordingPreview = null;
  
  // Load current state
  chrome.storage.sync.get(['isMonitoring'], (result) => {
    isMonitoring = result.isMonitoring || false;
    updateUI();
  });
  
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
  toggleBtn.addEventListener('click', async () => {
    debugLog('Toggle button clicked');
    
    const newState = !isMonitoring;
    chrome.storage.sync.set({ isMonitoring: newState });
    
    // Send message to background script
    chrome.runtime.sendMessage({
      type: newState ? 'start_monitoring' : 'stop_monitoring'
    });
    
    if (newState) {
      debugLog('Starting screen recording...');
      const success = await startScreenRecording();
      debugLog(`Screen recording start result: ${success}`);
    } else {
      debugLog('Stopping screen recording...');
      stopScreenRecording();
    }
    
    isMonitoring = newState;
    updateUI();
  });
  
  // Settings button
  settingsBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: 'chrome://extensions/' });
  });

  async function startScreenRecording() {
    try {
      debugLog('Step 1: Requesting display media...');
      
      // Check if getDisplayMedia is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        debugLog('ERROR: getDisplayMedia not supported');
        return false;
      }
      
      debugLog('Step 2: Calling getDisplayMedia...');
      
      currentStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          mediaSource: 'screen',
          width: { ideal: 1920, max: 1920 },
          height: { ideal: 1080, max: 1080 },
          frameRate: { ideal: 15, max: 30 } // Lower framerate for better performance
        },
        audio: false
      });
      
      debugLog(`Step 3: Got stream with ${currentStream.getVideoTracks().length} video tracks`);
      
      // Check MediaRecorder support
      if (!window.MediaRecorder) {
        debugLog('ERROR: MediaRecorder not supported');
        currentStream.getTracks().forEach(track => track.stop());
        return false;
      }
      
      // Check codec support
      const mimeTypes = [
        'video/webm;codecs=vp9',
        'video/webm;codecs=vp8', 
        'video/webm',
        'video/mp4'
      ];
      
      let selectedMimeType = null;
      for (const mimeType of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mimeType)) {
          selectedMimeType = mimeType;
          break;
        }
      }
      
      if (!selectedMimeType) {
        debugLog('ERROR: No supported mime types found');
        currentStream.getTracks().forEach(track => track.stop());
        return false;
      }
      
      debugLog(`Step 4: Using mime type: ${selectedMimeType}`);
      
      // Create MediaRecorder
      mediaRecorder = new MediaRecorder(currentStream, {
        mimeType: selectedMimeType,
        videoBitsPerSecond: 1000000 // 1Mbps for reasonable file size
      });
      
      recordedChunks = [];
      
      debugLog('Step 5: Setting up MediaRecorder event handlers...');
      
      mediaRecorder.ondataavailable = (event) => {
        debugLog(`Data available: ${event.data.size} bytes`);
        if (event.data.size > 0) {
          recordedChunks.push(event.data);
        }
      };
      
      mediaRecorder.onstart = () => {
        debugLog('MediaRecorder started');
      };
      
      mediaRecorder.onstop = async () => {
        debugLog(`MediaRecorder stopped. Total chunks: ${recordedChunks.length}`);
        await processRecording();
        removeRecordingPreview();
      };
      
      mediaRecorder.onerror = (event) => {
        debugLog(`MediaRecorder error: ${event.error}`);
      };
      
      // Handle stream ending
      currentStream.getVideoTracks()[0].addEventListener('ended', () => {
        debugLog('Video track ended (user stopped sharing)');
        if (mediaRecorder && mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
        }
      });
      
      debugLog('Step 6: Starting MediaRecorder...');
      mediaRecorder.start(2000); // 2-second chunks for better processing
      
      debugLog('Step 7: Creating preview...');
      createRecordingPreview();
      
      debugLog('SUCCESS: Screen recording started');
      return true;
      
    } catch (error) {
      debugLog(`ERROR in startScreenRecording: ${error.name} - ${error.message}`);
      
      if (error.name === 'NotAllowedError') {
        debugLog('User denied permission or cancelled');
      } else if (error.name === 'NotFoundError') {
        debugLog('No screen available to capture');
      } else if (error.name === 'NotSupportedError') {
        debugLog('Screen capture not supported');
      } else if (error.name === 'AbortError') {
        debugLog('User aborted screen selection');
      }
      
      return false;
    }
  }

  function stopScreenRecording() {
    debugLog('Stopping screen recording...');
    
    if (mediaRecorder) {
      if (mediaRecorder.state === 'recording') {
        debugLog('Stopping MediaRecorder...');
        mediaRecorder.stop();
      } else {
        debugLog(`MediaRecorder state: ${mediaRecorder.state}`);
      }
    }
    
    if (currentStream) {
      debugLog('Stopping stream tracks...');
      currentStream.getTracks().forEach(track => {
        debugLog(`Stopping track: ${track.kind}`);
        track.stop();
      });
      currentStream = null;
    }
    
    removeRecordingPreview();
    debugLog('Screen recording stopped');
  }

  function createRecordingPreview() {
    removeRecordingPreview();
    
    recordingPreview = document.createElement('div');
    recordingPreview.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      width: 150px;
      height: 100px;
      background: #000;
      border: 2px solid #ff0000;
      border-radius: 5px;
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
    
    const indicator = document.createElement('div');
    indicator.style.cssText = `
      position: absolute;
      top: 2px;
      left: 2px;
      background: rgba(255,0,0,0.8);
      color: white;
      padding: 1px 4px;
      border-radius: 2px;
      font-size: 10px;
      font-weight: bold;
    `;
    indicator.textContent = '● REC';
    
    recordingPreview.appendChild(video);
    recordingPreview.appendChild(indicator);
    document.body.appendChild(recordingPreview);
    
    debugLog('Preview created');
  }

  function removeRecordingPreview() {
    if (recordingPreview && recordingPreview.parentNode) {
      recordingPreview.parentNode.removeChild(recordingPreview);
      recordingPreview = null;
      debugLog('Preview removed');
    }
  }

  async function processRecording() {
    debugLog(`Processing recording... Chunks: ${recordedChunks.length}`);
    
    if (recordedChunks.length === 0) {
      debugLog('No chunks to process');
      return;
    }

    try {
      const blob = new Blob(recordedChunks, { 
        type: mediaRecorder.mimeType || 'video/webm' 
      });
      
      const blobSizeMB = blob.size / (1024 * 1024);
      debugLog(`Blob created: ${blobSizeMB.toFixed(2)}MB`);
      
      // Size limit check
      if (blobSizeMB > 50) {
        debugLog(`WARNING: Recording too large (${blobSizeMB.toFixed(1)}MB), skipping upload`);
        return;
      }
      
      debugLog('Converting to base64...');
      const arrayBuffer = await blob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      // Convert in chunks to avoid memory issues
      let base64 = '';
      const chunkSize = 8192;
      for (let i = 0; i < uint8Array.length; i += chunkSize) {
        const chunk = uint8Array.slice(i, i + chunkSize);
        base64 += String.fromCharCode.apply(null, chunk);
      }
      base64 = btoa(base64);
      
      debugLog(`Base64 conversion complete: ${base64.length} characters`);
      
      const recordingData = {
        type: 'SCREEN_RECORDING_DATA',
        data: base64,
        timestamp: Date.now(),
        duration: recordedChunks.length * 2000, // 2-second chunks
        size: blob.size,
        mimeType: mediaRecorder.mimeType || 'video/webm'
      };
      
      debugLog('Sending to background script...');
      chrome.runtime.sendMessage(recordingData);
      debugLog('Recording data sent to background');
      
    } catch (error) {
      debugLog(`ERROR processing recording: ${error.message}`);
      console.error('Full error:', error);
    }
  }
  
  // Tab count functionality
  function updateTabCount() {
    chrome.tabs.query({}, (tabs) => {
      const validTabs = tabs.filter(tab => 
        tab.url && 
        !tab.url.startsWith('chrome://') && 
        !tab.url.startsWith('chrome-extension://')
      );
      tabCount.textContent = validTabs.length;
    });
  }
  
  updateTabCount();
  setInterval(updateTabCount, 2000);
  
  // Listen for messages
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'MONITORING_STATE_CHANGED') {
      isMonitoring = message.isMonitoring;
      updateUI();
      if (!isMonitoring) {
        stopScreenRecording();
      }
    }
  });
});