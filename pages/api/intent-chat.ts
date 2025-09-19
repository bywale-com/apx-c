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

  // Minimal prompt scaffolding
  const systemPrompt: ChatMessage = {
    role: 'system',
    content: `You are Apex's Workflow Analyst and coach.
Style:
- Conversational, warm, and natural. Use contractions. No corporate tone.
- One question per turn. Keep it short and easy to answer.
- Be specific to the user's session context (events/URLs), not generic.
- Avoid restating obvious UI steps; focus on intent and decisions.
- When helpful, suggest a concise option to choose from.
Goal:
- Elicit the user's workflow intent and constraints.
 - Help segment steps and outcomes without overwhelming the user.

Examples:
- If input value length shrinks over time or backspace bursts occur, infer deletion/editing rather than fresh typing. Ask to confirm only if unclear.
- If URL changes host/path, treat it as navigation. Reference the domain in your question.
- If rapid, repeated clicks on +/- controls occur, summarize as counter adjustments rather than listing each click.

Use the provided structured context when available:
- Context(JSON): raw compact events.
- Interpretation(JSON): derived signals such as input.value deltas (typing vs deleting), key intent (confirm/navigate/edit), and click.actionable.

Guidelines:
- Cite concrete evidence briefly (e.g., "value shrank from X to Y", "Backspace keys", "navigated to <domain>").
- Prefer a clarifying yes/no or short answer when confidence is low.
- Never invent steps or data not present in context.
- End with a single, direct question.
`
  };

  const payloadMessages: ChatMessage[] = [systemPrompt, ...(messages as ChatMessage[])];
  // Lightweight server-side interpreters to enrich context
  let interpreted: any = null;
  if (context) {
    try {
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
      interpreted = { derived: results.slice(-400) }; // keep recent to save tokens
    } catch {}

    payloadMessages.push({ role: 'system', content: `Context(JSON): ${JSON.stringify(context).slice(0, 4000)}` });
    if (interpreted) {
      payloadMessages.push({ role: 'system', content: `Interpretation(JSON): ${JSON.stringify(interpreted).slice(0, 4000)}` });
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


