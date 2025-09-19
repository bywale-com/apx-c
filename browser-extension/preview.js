// Preview/Recorder page script
(function() {
	'use strict';

	const videoEl = document.getElementById('v');

	let currentStream = null;
	let mediaRecorder = null;
	let recordedChunks = [];
	let recordingId = null;
	let selectedMimeType = 'video/webm';

	function log(...args) {
		console.log('[preview]', ...args);
	}

	function chooseMimeType() {
		const mimeTypes = [
			'video/webm;codecs=vp9',
			'video/webm;codecs=vp8',
			'video/webm'
		];
		for (const mt of mimeTypes) {
			try {
				if (MediaRecorder.isTypeSupported(mt)) return mt;
			} catch (_) {}
		}
		return 'video/webm';
	}

	async function startCaptureAndRecord() {
		try {
			if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
				log('getDisplayMedia not supported');
				return false;
			}

			currentStream = await navigator.mediaDevices.getDisplayMedia({
				video: {
					mediaSource: 'screen',
					width: { ideal: 1920, max: 1920 },
					height: { ideal: 1080, max: 1080 },
					frameRate: { ideal: 15, max: 30 }
				},
				audio: false
			});

			videoEl.srcObject = currentStream;
			await videoEl.play().catch(() => {});

			selectedMimeType = chooseMimeType();
			recordedChunks = [];
			recordingId = `rec_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;

			mediaRecorder = new MediaRecorder(currentStream, {
				mimeType: selectedMimeType,
				videoBitsPerSecond: 1000000
			});

			mediaRecorder.onstart = () => {
				chrome.runtime.sendMessage({ type: 'PREVIEW_STARTED', timestamp: Date.now() });
			};

			mediaRecorder.ondataavailable = (event) => {
				if (event.data && event.data.size > 0) {
					recordedChunks.push(event.data);
				}
			};

			mediaRecorder.onstop = async () => {
				log('Recorder stopped; processing');
				await processAndSendRecording();
				chrome.runtime.sendMessage({ type: 'PREVIEW_READY_TO_CLOSE' });
			};

			currentStream.getVideoTracks()[0].addEventListener('ended', () => {
				if (mediaRecorder && mediaRecorder.state === 'recording') {
					mediaRecorder.stop();
				}
			});

			mediaRecorder.start(2000);
			log('Recording started', selectedMimeType);
			return true;
		} catch (e) {
			log('Failed to start capture', e);
			return false;
		}
	}

	function stopCaptureAndRecord() {
		try {
			if (mediaRecorder && mediaRecorder.state === 'recording') {
				mediaRecorder.stop();
			}
		} finally {
			if (currentStream) {
				currentStream.getTracks().forEach(t => t.stop());
				currentStream = null;
			}
		}
	}

	async function processAndSendRecording() {
		if (!recordedChunks.length) {
			log('No chunks recorded');
			return;
		}
		try {
			const blob = new Blob(recordedChunks, { type: selectedMimeType || 'video/webm' });
			const arrayBuffer = await blob.arrayBuffer();
			const uint8Array = new Uint8Array(arrayBuffer);
			let base64 = '';
			const chunkSize = 8192;
			for (let i = 0; i < uint8Array.length; i += chunkSize) {
				const chunk = uint8Array.slice(i, i + chunkSize);
				base64 += String.fromCharCode.apply(null, chunk);
			}
			base64 = btoa(base64);

			const targetChunkBytes = 256 * 1024;
			const total = Math.ceil((base64.length * 3 / 4) / targetChunkBytes);
			const charsPerChunk = Math.floor(targetChunkBytes * 4 / 3);

			for (let i = 0, index = 0; i < base64.length; i += charsPerChunk, index++) {
				const part = base64.slice(i, i + charsPerChunk);
				chrome.runtime.sendMessage({
					type: 'SCREEN_RECORDING_CHUNK',
					recordingId,
					index,
					total,
					data: part,
					timestamp: Date.now(),
					mimeType: selectedMimeType || 'video/webm'
				});
			}

			chrome.runtime.sendMessage({
				type: 'SCREEN_RECORDING_COMPLETE',
				recordingId,
				duration: recordedChunks.length * 2000,
				size: (new Blob(recordedChunks)).size,
				timestamp: Date.now(),
				mimeType: selectedMimeType || 'video/webm'
			});
			log('Recording sent');
		} catch (e) {
			log('Failed to process/send recording', e);
		}
	}

	chrome.runtime.onMessage.addListener((message) => {
		if (!message || !message.type) return;
		if (message.type === 'REQUEST_STOP_PREVIEW') {
			log('Received stop request');
			stopCaptureAndRecord();
		}
	});

	// Inform background this preview is alive
	chrome.runtime.sendMessage({ type: 'PREVIEW_OPENED' });

	// Wait for explicit START_PREVIEW from background before starting capture
	chrome.runtime.onMessage.addListener((msg) => {
		if (msg && msg.type === 'START_PREVIEW') {
			startCaptureAndRecord();
		}
	});
})();


