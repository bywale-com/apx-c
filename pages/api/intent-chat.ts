import type { NextApiRequest, NextApiResponse } from 'next';

type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const { sessionId, messages, context } = req.body || {} as { sessionId?: string; messages?: ChatMessage[]; context?: any };
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'invalid_request' });
  }

  const openAIKey = process.env.OPENAI_API_KEY;

  // Enhanced prompt scaffolding with workflow canvas capabilities
  const systemPrompt: ChatMessage = {
    role: 'system',
    content: `You are Apex's Advanced Workflow Analyst and Canvas Controller.

CAPABILITIES:
- Analyze session data with full context (recording status, session integrity, metadata)
- Modify workflow canvas in real-time
- Generate BPMN-style workflow steps
- Identify technical issues (session sharding, recording problems)
- Provide deep insights into user behavior and intent

STYLE:
- Conversational, warm, and natural. Use contractions. No corporate tone.
- Provide comprehensive analysis when requested
- Be specific to the user's session context (events/URLs), not generic.
- Focus on intent, decisions, and workflow patterns.
- When helpful, suggest workflow improvements or automation opportunities.

WORKFLOW CANVAS CONTROL:
- You can modify workflow steps by responding with special commands:
  - "ADD_STEP: {action: 'Navigate to Website', details: 'domain.com', timestamp: 1234, type: 'start'|'process'|'decision'|'end'}"
  - "UPDATE_STEP: {id: 'step_1', action: 'Fill Form Field', details: 'Email input'}"
  - "REMOVE_STEP: {id: 'step_1'}"
  - "GENERATE_BPMN: Create complete BPMN flowchart with proper shapes and sharp action titles"

BPMN SHAPE TYPES:
- "start": Start event (circle)
- "process": Process/activity (rectangle) 
- "decision": Decision gateway (diamond)
- "end": End event (circle)
- "parallel": Parallel gateway (diamond with +)
- "exclusive": Exclusive gateway (diamond with X)

ENHANCED CONTEXT:
- Context(JSON): raw compact events + session metadata
- Interpretation(JSON): derived signals + session metadata including:
  - hasRecording: boolean (whether session has video)
  - eventCount: number of total events
  - duration: session duration in seconds
  - urls: array of visited domains
  - eventTypes: breakdown of event types
  - sessionId: unique session identifier
  - workflowSteps: array of n8n-generated workflow steps (preferred over raw events)

ANALYSIS GUIDELINES:
- PRIORITIZE workflowSteps over raw events for analysis (workflowSteps contain n8n's intelligent synthesis)
- Identify workflow patterns and user intent from structured workflow steps
- Detect technical issues (missing recordings, session fragmentation)
- Suggest workflow optimizations and automation opportunities
- Generate human-readable BPMN-style workflow descriptions
- Provide actionable insights for workflow improvement
- When workflowSteps are available, use them as the primary source of truth for workflow analysis

BPMN GENERATION TRIGGERS:
- When user asks "walk me through what happened" → Generate BPMN flowchart
- When user asks "analyze this session" → Generate BPMN flowchart  
- When user asks "what was the workflow" → Generate BPMN flowchart
- When user asks "create a flowchart" → Generate BPMN flowchart
- Always include GENERATE_BPMN command when providing detailed session analysis

EXAMPLES:
- "I notice this session has 141 events over 2.3 minutes but no recording linked. This suggests a session ID fragmentation issue."
- "Based on the workflow steps, I can see this was a job application process: Google search → Indeed navigation → job selection → Accenture application → account creation. Let me generate a BPMN flow for this."
- "GENERATE_BPMN: Create BPMN flowchart for job application workflow based on the 19 workflow steps"
- "ADD_STEP: {action: 'Search Job Platform', details: 'Google search for Indeed', timestamp: 1758457045004, type: 'start'}"
- "ADD_STEP: {action: 'Browse Job Listings', details: 'Scroll through Indeed results', timestamp: 1758457050055, type: 'process'}"
- "ADD_STEP: {action: 'Select Target Position', details: 'Click Senior Agency Inside Sales Account Representative', timestamp: 1758457065381, type: 'process'}"
- "ADD_STEP: {action: 'Navigate to Company Site', details: 'Redirect to Accenture Workday portal', timestamp: 1758457075005, type: 'process'}"
- "ADD_STEP: {action: 'Accept Site Policies', details: 'Click Accept All cookies', timestamp: 1758457091073, type: 'process'}"
- "ADD_STEP: {action: 'Initiate Application', details: 'Click Apply Now button', timestamp: 1758457096567, type: 'process'}"
- "ADD_STEP: {action: 'Choose Resume Option', details: 'Select Autofill with Resume', timestamp: 1758457115126, type: 'decision'}"
- "ADD_STEP: {action: 'Create Account Credentials', details: 'Enter email and secure password with CapsLock usage', timestamp: 1758457134055, type: 'process'}"
- "ADD_STEP: {action: 'Accept Terms', details: 'Check terms acceptance checkbox', timestamp: 1758457157016, type: 'process'}"
- "ADD_STEP: {action: 'Submit Account Creation', details: 'Submit registration form', timestamp: 1758457158592, type: 'process'}"
- "ADD_STEP: {action: 'Attempt Login', details: 'Login with newly created credentials', timestamp: 1758457181069, type: 'end'}"

Always provide deep, contextual analysis and be ready to modify the workflow canvas when requested.

IMPORTANT: 
- When workflowSteps are available in the session metadata, use them as the primary source for analysis instead of raw events
- When analyzing a session with workflow steps, ALWAYS generate a BPMN flowchart using GENERATE_BPMN command followed by individual ADD_STEP commands for each major workflow step
- This is your primary function as a Workflow Analyst.`
  };

  const payloadMessages: ChatMessage[] = [systemPrompt, ...(messages as ChatMessage[])];
  // Enhanced server-side interpreters with rich session context
  let interpreted: any = null;
  let sessionMetadata: any = null;
  
  if (context) {
    try {
      // Get full session metadata from extension-events API
      const contextSessionId = (context as any).sessionId || sessionId;
      if (contextSessionId) {
        try {
          const metadataResp = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/extension-events?action=get_workflow_session&sessionId=${encodeURIComponent(contextSessionId)}`);
          const metadataJson = await metadataResp.json();
          sessionMetadata = {
            sessionId: metadataJson.sessionId,
            eventCount: metadataJson.events?.length || 0,
            hasRecording: !!metadataJson.recordingId,
            recordingId: metadataJson.recordingId,
            startTime: metadataJson.startTime,
            lastEventTime: metadataJson.lastEventTime,
            duration: metadataJson.lastEventTime ? (metadataJson.lastEventTime - metadataJson.startTime) / 1000 : 0,
            urls: [...new Set(metadataJson.events?.map((e: any) => e.url).filter(Boolean))],
            eventTypes: metadataJson.events?.reduce((acc: any, event: any) => {
              acc[event.type] = (acc[event.type] || 0) + 1;
              return acc;
            }, {}) || {},
            workflowSteps: metadataJson.workflowSteps || []
          };
        } catch (e) {
          console.log('Failed to fetch session metadata:', e);
        }
      }

      const evs: Array<any> = Array.isArray((context as any).events) ? (context as any).events : [];
      const bySelector: Record<string, { lastValue?: string; lastT?: number }> = {};
      const results: Array<any> = [];
      
      for (let i = 0; i < evs.length; i++) {
        const e = evs[i];
        const selector = e.selector || '';
        const tag = (e.tag || '').toLowerCase();
        const prev = bySelector[selector] || {};
        const record: any = { t: e.t, type: e.type, url: e.url };
        
        if (e.type === 'input') {
          const curVal = typeof e.value === 'string' ? e.value : '';
          const prevVal = typeof prev.lastValue === 'string' ? prev.lastValue : undefined;
          const delta = prevVal != null ? curVal.length - prevVal.length : undefined;
          let action: 'typing'|'deleting'|'editing'|'unknown' = 'unknown';
          if (typeof delta === 'number') {
            if (delta > 0) action = 'typing';
            if (delta < 0) action = 'deleting';
            if (delta === 0) action = 'editing';
          }
          record.input = { selector, tag, value: curVal.slice(0, 80), delta, action };
          bySelector[selector] = { lastValue: curVal, lastT: e.t };
        } else if (e.type === 'key') {
          const key = String(e.key || '').toLowerCase();
          let intent: 'confirm'|'navigate'|'edit'|'modifier'|'unknown' = 'unknown';
          if (key === 'enter') intent = 'confirm';
          else if (['tab','escape','esc','arrowup','arrowdown','arrowleft','arrowright','pageup','pagedown'].includes(key)) intent = 'navigate';
          else if (key === 'backspace' || key === 'delete') intent = 'edit';
          else if (['meta','control','shift','alt','cmd'].includes(key)) intent = 'modifier';
          record.key = { key: e.key, intent };
        } else if (e.type === 'click') {
          const text = (e.text || '').toLowerCase();
          const actionable = /\b(\+|\-|add|remove|save|submit|next|continue|apply|login|sign in|search)\b/.test(text) || ['button','a','input'].includes(tag) || /button|submit|link/.test(String(e.selector||''));
          record.click = { selector: selector ? String(selector).slice(0, 120) : undefined, tag, text: text ? text.slice(0,40) : undefined, actionable };
        }
        results.push(record);
      }
      
      interpreted = { 
        derived: results.slice(-400), // keep recent to save tokens
        sessionMetadata: sessionMetadata
      };
    } catch (e) {
      console.log('Context processing error:', e);
    }

    // Enhanced context with session metadata
    const enhancedContext = {
      ...context,
      sessionMetadata: sessionMetadata
    };
    
    payloadMessages.push({ role: 'system', content: `Context(JSON): ${JSON.stringify(enhancedContext).slice(0, 6000)}` });
    if (interpreted) {
      payloadMessages.push({ role: 'system', content: `Interpretation(JSON): ${JSON.stringify(interpreted).slice(0, 6000)}` });
    }
  }

  try {
    // Verbatim mode: if the user explicitly asks for raw events
    const lastUser = [...(messages as ChatMessage[])].reverse().find(m => m.role === 'user');
    const wantsVerbatim = lastUser && /\b(verbatim|raw\s+events|print\s+events|show\s+events)\b/i.test(lastUser.content || '');
    if (wantsVerbatim && Array.isArray(context?.events)) {
      // Return the exact compact events payload (already compacted client-side)
      const raw = JSON.stringify(context.events, null, 2);
      const chunk = raw.length > 12000 ? raw.slice(0, 12000) + "\n... (truncated)" : raw;
      return res.status(200).json({ reply: chunk, model: 'verbatim' });
    }

    if (!openAIKey) {
      // Fallback stub: friendly, single-question prompt using context
      const urls: string[] = Array.isArray(context?.recentUrls) ? context.recentUrls : [];
      const firstUrl = urls[0];
      const domain = firstUrl ? (() => { try { return new URL(firstUrl).host; } catch { return firstUrl; } })() : '';
      const q = domain
        ? `Looks like you were on ${domain}. What were you trying to get done there?`
        : `What were you aiming to accomplish in this session?`;
      return res.status(200).json({ reply: q, model: 'stub' });
    }

    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openAIKey}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: payloadMessages,
        temperature: 0.5,
        max_tokens: 250,
      })
    });
    if (!resp.ok) {
      const text = await resp.text();
      return res.status(resp.status).json({ error: 'openai_error', detail: text });
    }
    const data = await resp.json();
    const reply = data?.choices?.[0]?.message?.content || 'Okay.';
    return res.status(200).json({ reply, model: data?.model || 'openai' });
  } catch (e: any) {
    return res.status(500).json({ error: 'server_error', detail: e?.message || String(e) });
  }
}


