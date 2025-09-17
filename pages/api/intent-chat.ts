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
    content: `You are Apex's Workflow Analyst. Ask concise, high-signal questions about the user's intent behind actions. 
Keep questions context-aware and avoid restating obvious UI steps. Prefer one question per turn. Use the provided event context when helpful.`
  };

  const payloadMessages: ChatMessage[] = [systemPrompt, ...(messages as ChatMessage[])];
  if (context) {
    payloadMessages.push({ role: 'system', content: `Context(JSON): ${JSON.stringify(context).slice(0, 4000)}` });
  }

  try {
    if (!openAIKey) {
      // Fallback stub: ask a contextual rule-based question
      const lastUser = [...messages].reverse().find(m => m.role === 'user');
      const hint = context?.recentUrls?.[0] ? `I noticed ${context.recentUrls[0]}. ` : '';
      const reply = `${hint}What matters most here—speed, response rate, or deliverability—and why?`;
      return res.status(200).json({ reply, model: 'stub' });
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
        temperature: 0.2,
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


