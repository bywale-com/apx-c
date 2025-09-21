import React, { useState, useCallback } from 'react';

export type WorkflowStep = {
  id: string;
  action: string;
  details?: string;
  timestamp: number;
  duration?: number;
  metadata?: any; // Store original event data for metadata display
  element?: any; // Store element info for interaction
};

interface SimpleWorkflowGeneratorProps {
  events: any[];
  onWorkflowGenerated: (steps: WorkflowStep[]) => void;
  sessionId?: string;
}

// Polling function for async results
const pollForResults = async (jobId: string, onWorkflowGenerated: (steps: WorkflowStep[]) => void, setStatus: (status: string) => void, sessionId?: string) => {
  const maxAttempts = 60; // 5 minutes max (5s intervals)
  let attempts = 0;
  
  const poll = async () => {
    try {
      setStatus('Analyzing events...');
      console.log(`Polling attempt ${attempts + 1} for jobId: ${jobId}`);
      const response = await fetch(`https://n8n.apexintro.com/webhook-test/workflow/status/${jobId}`);
      const result = await response.json();
      console.log('Polling response:', result);
      
      if (result.status === 'completed' && result.steps) {
        setStatus('Generating workflow...');
        console.log('Analysis completed, processing steps:', result.steps.length);
        // Convert n8n response to WorkflowStep format
        const steps: WorkflowStep[] = result.steps.map((step: any, index: number) => ({
          id: step.id || `step_${index + 1}`,
          action: step.action || step.label || 'Step',
          details: step.details || '',
          timestamp: step.timestamp,
          duration: step.duration,
          metadata: step.metadata,
          element: step.element
        }));
        console.log('Generated workflow steps from polling:', steps);
        setStatus('Complete!');
        onWorkflowGenerated(steps);
        // Save to session if sessionId provided
        if (sessionId) {
          await saveWorkflowStepsToSession(sessionId, steps);
        }
        return;
      }
      
      if (result.status === 'failed') {
        console.error('Analysis failed:', result.error);
        throw new Error(result.error || 'Analysis failed');
      }
      
      // Continue polling if still processing
      attempts++;
      if (attempts < maxAttempts) {
        setStatus(`Processing... (${attempts}/${maxAttempts})`);
        setTimeout(poll, 5000); // Poll every 5 seconds
      } else {
        throw new Error('Analysis timeout - please try again');
      }
    } catch (error) {
      console.error('Polling failed:', error);
      setStatus('Failed');
      onWorkflowGenerated([]);
    }
  };
  
  poll();
};

// Function to save workflow steps to session
const saveWorkflowStepsToSession = async (sessionId: string, steps: WorkflowStep[]) => {
  try {
    await fetch('/api/extension-events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'save_workflow_steps',
        sessionId,
        workflowSteps: steps
      })
    });
    console.log(`💾 Saved ${steps.length} workflow steps to session ${sessionId}`);
  } catch (error) {
    console.error('Failed to save workflow steps to session:', error);
  }
};

export default function SimpleWorkflowGenerator({ events, onWorkflowGenerated, sessionId }: SimpleWorkflowGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState<string>('');

  const generateWorkflow = useCallback(async () => {
    setIsGenerating(true);
    setGenerationStatus('Sending to n8n...');
    
    try {
      // Sort events by timestamp for better analysis
      const sortedEvents = [...events].sort((a, b) => a.timestamp - b.timestamp);
      
      if (sortedEvents.length === 0) {
        onWorkflowGenerated([]);
        return;
      }

      // Prepare events in the best format for analysis
      const analysisEvents = sortedEvents.map(event => ({
        type: event.type,
        timestamp: event.timestamp,
        url: event.url,
        element: event.element,
        value: event.value,
        key: event.key,
        scrollY: event.scrollY,
        selector: event.selector,
        text: event.text,
        tagName: event.element?.tagName,
        className: event.element?.className,
        id: event.element?.id,
        name: event.element?.name,
        placeholder: event.element?.placeholder,
        textContent: event.element?.textContent
      }));

      // Ensure we have a valid events array
      if (!Array.isArray(analysisEvents) || analysisEvents.length === 0) {
        throw new Error('No valid events to analyze');
      }

      console.log('Sending events to n8n:', {
        eventsCount: analysisEvents.length,
        sampleEvent: analysisEvents[0],
        sessionMetadata: {
          totalEvents: sortedEvents.length,
          startTime: sortedEvents[0].timestamp,
          endTime: sortedEvents[sortedEvents.length - 1].timestamp,
          duration: sortedEvents[sortedEvents.length - 1].timestamp - sortedEvents[0].timestamp,
          urls: [...new Set(sortedEvents.map(e => e.url).filter(Boolean))],
          eventTypes: sortedEvents.reduce((acc, event) => {
            acc[event.type] = (acc[event.type] || 0) + 1;
            return acc;
          }, {} as Record<string, number>)
        }
      });

      // Send to n8n webhook for analysis (async pattern)
      let response;
      try {
        response = await fetch('https://n8n.apexintro.com/webhook-test/workflow', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            events: analysisEvents,
            sessionMetadata: {
              totalEvents: sortedEvents.length,
              startTime: sortedEvents[0].timestamp,
              endTime: sortedEvents[sortedEvents.length - 1].timestamp,
              duration: sortedEvents[sortedEvents.length - 1].timestamp - sortedEvents[0].timestamp,
              urls: [...new Set(sortedEvents.map(e => e.url).filter(Boolean))],
              eventTypes: sortedEvents.reduce((acc, event) => {
                acc[event.type] = (acc[event.type] || 0) + 1;
                return acc;
              }, {} as Record<string, number>)
            }
          })
        });
      } catch (fetchError) {
        console.error('Fetch error:', fetchError);
        // For testing, let's create a mock response
        console.log('Creating mock response for testing...');
        const mockSteps: WorkflowStep[] = [
          {
            id: 'step-1',
            action: 'Enter Search Term in Google',
            details: 'Consolidated text input "indeed" entered in Google search box',
            timestamp: sortedEvents[0].timestamp,
            duration: 7811,
            metadata: { test: true },
            element: { tag: 'textarea', id: 'APjFqb' }
          },
          {
            id: 'step-2', 
            action: 'Click Search Result Link',
            details: 'Clicked "Indeed: Job Search Canada"',
            timestamp: sortedEvents[0].timestamp + 10000,
            duration: 5000,
            metadata: { test: true },
            element: { tag: 'a', text: 'Indeed: Job Search Canada' }
          }
        ];
        onWorkflowGenerated(mockSteps);
        return;
      }

      if (!response.ok) {
        throw new Error(`n8n webhook failed: ${response.status}`);
      }

      // Check if response has content
      const responseText = await response.text();
      console.log('Raw n8n response:', responseText);
      
      if (!responseText || responseText.trim() === '') {
        throw new Error('Empty response from n8n webhook');
      }

      let result;
      try {
        result = JSON.parse(responseText);
        console.log('Parsed n8n response:', result);
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        console.error('Response text:', responseText);
        throw new Error(`Invalid JSON response from n8n: ${responseText}`);
      }
      
      // Check if we got a jobId for async processing
      if (result.jobId) {
        console.log('Starting async polling for jobId:', result.jobId);
        // Poll for results
        await pollForResults(result.jobId, onWorkflowGenerated, setGenerationStatus, sessionId);
      } else if (result.steps) {
        console.log('Received immediate response with steps:', result.steps.length);
        // Immediate response (fallback)
        const steps: WorkflowStep[] = result.steps.map((step: any, index: number) => ({
          id: step.id || `step_${index + 1}`,
          action: step.action || step.label || 'Step',
          details: step.details || '',
          timestamp: step.timestamp,
          duration: step.duration,
          metadata: step.metadata,
          element: step.element
        }));
        console.log('Generated workflow steps:', steps);
        onWorkflowGenerated(steps);
        // Save to session if sessionId provided
        if (sessionId) {
          await saveWorkflowStepsToSession(sessionId, steps);
        }
      } else if (result.output) {
        console.log('Received response with output field, parsing nested JSON...');
        // Handle n8n response format where steps are in result.output as JSON string
        try {
          const outputData = JSON.parse(result.output);
          if (outputData.steps && Array.isArray(outputData.steps)) {
            const steps: WorkflowStep[] = outputData.steps.map((step: any, index: number) => ({
              id: step.id || `step_${index + 1}`,
              action: step.action || step.label || 'Step',
              details: step.details || '',
              timestamp: step.timestamp,
              duration: step.duration,
              metadata: step.metadata,
              element: step.element
            }));
            console.log('Generated workflow steps from output:', steps);
            onWorkflowGenerated(steps);
            // Save to session if sessionId provided
            if (sessionId) {
              await saveWorkflowStepsToSession(sessionId, steps);
            }
          } else {
            throw new Error('No steps found in output data');
          }
        } catch (parseError) {
          console.error('Failed to parse output JSON:', parseError);
          throw new Error(`Invalid output format from n8n: ${result.output}`);
        }
      } else {
        console.log('Unexpected response format:', result);
        throw new Error('Unexpected response format from n8n');
      }
    } catch (error) {
      console.error('n8n workflow generation failed:', error);
      // Fallback to empty steps on error
      onWorkflowGenerated([]);
    } finally {
      setIsGenerating(false);
      setGenerationStatus('');
    }
  }, [events, onWorkflowGenerated]);

  return (
    <div style={{ padding: '12px', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', background: 'rgba(255,255,255,0.03)' }}>
      <div style={{ marginBottom: '8px' }}>
        <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'rgba(255,255,255,0.9)', margin: 0 }}>
          Generate Workflow
        </h4>
        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', margin: '2px 0 0 0' }}>
          Send events to n8n agent for BPMN analysis
        </p>
      </div>

      <button
        onClick={generateWorkflow}
        disabled={isGenerating || !events || events.length === 0}
        style={{
          width: '100%',
          padding: '8px 12px',
          borderRadius: '4px',
          border: '1px solid rgba(255,255,255,0.22)',
          background: isGenerating ? 'rgba(255,255,255,0.05)' : 'rgba(56,225,255,0.15)',
          color: 'rgba(255,255,255,0.9)',
          cursor: isGenerating || !events || events.length === 0 ? 'not-allowed' : 'pointer',
          fontSize: '12px',
          fontWeight: 500,
          transition: 'all 0.2s ease'
        }}
      >
        {isGenerating 
          ? (generationStatus || 'Sending to n8n...')
          : events && events.length > 0 
            ? `Send to n8n Agent (${events.length} events)` 
            : 'No events to analyze'
        }
      </button>
    </div>
  );
}

