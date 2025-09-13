# Apex Workflow Monitor Browser Extension

A Chrome extension that monitors browser interactions and sends real-time data to the Apex workflow automation app.

## Features

- **Real-time Monitoring**: Captures clicks, inputs, navigation, and page interactions
- **Cross-site Tracking**: Works on any website (with proper permissions)
- **WebSocket Communication**: Sends data to Apex app in real-time
- **Privacy Focused**: Only captures interaction patterns, not sensitive data
- **Lightweight**: Minimal performance impact

## Installation

### 1. Load Extension in Chrome

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `browser-extension` folder from this project
5. The extension should now appear in your extensions list

### 2. Start WebSocket Server

The extension needs a WebSocket server to communicate with your Apex app:

```bash
# Install WebSocket dependency
npm install ws

# Start the WebSocket server (runs on port 3001)
node -e "
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 3001, path: '/ws' });
console.log('WebSocket server running on ws://localhost:3001/ws');
wss.on('connection', (ws) => {
  console.log('Client connected');
  ws.on('message', (data) => {
    console.log('Received:', data.toString());
    ws.send(JSON.stringify({ type: 'echo', data: data.toString() }));
  });
});
"
```

### 3. Start Apex App

Make sure your Apex app is running:

```bash
npm run dev
```

## Usage

### 1. Enable Monitoring

1. Click the Apex Monitor extension icon in Chrome toolbar
2. Click "Start Monitoring" to begin capturing interactions
3. The extension will inject monitoring scripts into all open tabs

### 2. View Real-time Data

1. Open your Apex app in another tab
2. Go to the "Watch" phase
3. You should see "Extension: Connected" status
4. Interact with any website - events will appear in real-time

### 3. Record Workflow

1. In Apex app, click "Start Recording" in the Watch phase
2. Perform your workflow in external tabs
3. All interactions will be captured and logged

## What Gets Captured

### Events Captured:
- **Clicks**: Button clicks, link clicks, form submissions
- **Inputs**: Text input, form field changes
- **Navigation**: Page loads, URL changes, back/forward
- **Scroll**: Page scrolling (throttled)
- **Keys**: Keyboard events (throttled)

### Data Captured:
- Element selectors (CSS selectors)
- Element properties (tag, id, class, text)
- Coordinates (for clicks)
- Values (for inputs, redacted for passwords)
- Timestamps
- Page URLs and titles

### Privacy:
- Password fields are automatically redacted
- Sensitive data can be marked with `data-apex-redact` attribute
- Only interaction patterns are captured, not personal data

## Configuration

### Extension Settings

The extension stores settings in Chrome's sync storage:
- `isMonitoring`: Whether monitoring is currently active

### WebSocket Connection

The extension tries to connect to:
1. `ws://localhost:3001/ws` (development)
2. `ws://127.0.0.1:3001/ws` (fallback)
3. `wss://your-domain.com/ws` (production)

## Troubleshooting

### Extension Not Connecting

1. Check WebSocket server is running on port 3001
2. Verify Apex app is running and accessible
3. Check browser console for connection errors
4. Try refreshing the extension

### No Events Captured

1. Ensure monitoring is enabled in extension popup
2. Check that websites allow script injection
3. Verify WebSocket connection is established
4. Look for errors in browser console

### Performance Issues

1. The extension throttles scroll and key events
2. Only captures essential interaction data
3. Automatically cleans up old event data
4. Minimal memory footprint

## Development

### File Structure

```
browser-extension/
├── manifest.json          # Extension configuration
├── background.js          # Service worker
├── content.js            # Content script bridge
├── injected.js           # Monitoring script (injected into pages)
├── popup.html            # Extension popup UI
├── popup.js              # Popup functionality
└── README.md             # This file
```

### Key Components

- **Background Script**: Manages extension state and WebSocket connection
- **Content Script**: Bridges between extension and page context
- **Injected Script**: Captures interactions on web pages
- **Popup**: User interface for extension controls

### Adding New Event Types

1. Add event listener in `injected.js`
2. Create capture function with `sendEvent()`
3. Update background script to handle new event type
4. Update Apex app to display new events

## Security

- Extension only runs on HTTP/HTTPS pages
- No access to chrome:// or extension pages
- WebSocket communication is localhost only
- Sensitive data is automatically redacted
- User controls all monitoring via popup

## License

This extension is part of the Apex workflow automation platform.
