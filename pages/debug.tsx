import React, { useState, useEffect } from 'react';

export default function Debug() {
  const [debugData, setDebugData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [creatingSessions, setCreatingSessions] = useState(false);

  const fetchDebugData = async () => {
    try {
      const response = await fetch('/api/extension-events?action=debug');
      const data = await response.json();
      setDebugData(data);
    } catch (error) {
      console.error('Failed to fetch debug data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDebugData();
    const interval = setInterval(fetchDebugData, 2000);
    return () => clearInterval(interval);
  }, []);

  const createWorkflowSessions = async () => {
    setCreatingSessions(true);
    try {
      const response = await fetch('/api/extension-events?action=create_sessions_from_events');
      const data = await response.json();
      console.log('Created sessions:', data);
      await fetchDebugData(); // Refresh data
    } catch (error) {
      console.error('Failed to create sessions:', error);
    } finally {
      setCreatingSessions(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '20px' }}>Loading debug data...</div>;
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace', fontSize: '14px' }}>
      <h1>🔍 Apex Debug Information</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <h2>📊 Summary</h2>
        <div>Total Events: {debugData?.totalEvents || 0}</div>
        <div>Events with SessionId: {debugData?.eventsWithSessionId || 0}</div>
        <div>Events without SessionId: {debugData?.eventsWithoutSessionId || 0}</div>
        <div>Workflow Sessions: {debugData?.workflowSessions || 0}</div>
        <div>Recordings: {debugData?.recordings || 0}</div>
        
        {debugData?.totalEvents > 0 && debugData?.workflowSessions === 0 && (
          <div style={{ marginTop: '10px' }}>
            <button
              onClick={createWorkflowSessions}
              disabled={creatingSessions}
              style={{
                padding: '8px 16px',
                backgroundColor: '#38E1FF',
                color: '#000',
                border: 'none',
                borderRadius: '4px',
                cursor: creatingSessions ? 'not-allowed' : 'pointer',
                opacity: creatingSessions ? 0.6 : 1
              }}
            >
              {creatingSessions ? 'Creating...' : 'Create Workflow Sessions from Events'}
            </button>
          </div>
        )}
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h2>🆔 Session IDs</h2>
        {debugData?.sessionIds?.length > 0 ? (
          <ul>
            {debugData.sessionIds.map((id: string) => (
              <li key={id}>{id}</li>
            ))}
          </ul>
        ) : (
          <div style={{ color: '#666' }}>No workflow sessions found</div>
        )}
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h2>📝 Sample Events</h2>
        
        {debugData?.sampleEventWithSessionId && (
          <div style={{ marginBottom: '20px' }}>
            <h3>✅ Event WITH SessionId:</h3>
            <div style={{ backgroundColor: '#e8f5e8', padding: '10px', borderRadius: '4px', fontSize: '12px' }}>
              <pre>{JSON.stringify(debugData.sampleEventWithSessionId, null, 2)}</pre>
            </div>
          </div>
        )}
        
        {debugData?.sampleEventWithoutSessionId && (
          <div style={{ marginBottom: '20px' }}>
            <h3>❌ Event WITHOUT SessionId:</h3>
            <div style={{ backgroundColor: '#ffe8e8', padding: '10px', borderRadius: '4px', fontSize: '12px' }}>
              <pre>{JSON.stringify(debugData.sampleEventWithoutSessionId, null, 2)}</pre>
            </div>
          </div>
        )}
        
        {debugData?.recentEvents?.length > 0 ? (
          <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #ccc', padding: '10px' }}>
            <h3>Recent Events ({debugData.recentEvents.length}):</h3>
            {debugData.recentEvents.map((event: any, index: number) => (
              <div key={index} style={{ marginBottom: '10px', borderBottom: '1px solid #eee', paddingBottom: '5px' }}>
                <div><strong>Type:</strong> {event.type}</div>
                <div><strong>Timestamp:</strong> {new Date(event.timestamp).toLocaleString()}</div>
                {event.event && (
                  <>
                    <div><strong>Event Type:</strong> {event.event.type}</div>
                    <div><strong>Session ID:</strong> {event.event.sessionId || 'MISSING'}</div>
                    <div><strong>URL:</strong> {event.event.url}</div>
                  </>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ color: '#666' }}>No recent events found</div>
        )}
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h2>🔧 Troubleshooting</h2>
        <div style={{ backgroundColor: '#f5f5f5', padding: '10px', borderRadius: '5px' }}>
          <p><strong>If you see 0 workflow sessions:</strong></p>
          <ul>
            <li>Make sure the browser extension is installed and enabled</li>
            <li>Check that monitoring is turned ON in the extension popup</li>
            <li>Navigate to a webpage and perform some actions (click, type, etc.)</li>
            <li>Check the browser console for any error messages</li>
          </ul>
          
          <p><strong>If you see events but no sessions:</strong></p>
          <ul>
            <li>The events might not have sessionId fields</li>
            <li>Check that the browser extension is sending proper event data</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
