import type { NextApiRequest, NextApiResponse } from 'next';

// In-memory buffers for chunk reassembly (OK for dev; consider Redis/S3 in prod)
const buffers: Record<string, { chunks: string[]; total: number; mimeType: string; startedAt: number }> = {};
const events: any[] = [];
const recordings: Array<{ recordingId: string; data: string; mimeType: string; timestamp: number; duration?: number }> = [];

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '2mb', // small per-request limit; chunks stay under this
    },
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const action = req.query.action;
    if (action === 'get_recent') {
      return res.status(200).json(events.slice(-200));
    }
    if (action === 'get_recordings') {
      return res.status(200).json(recordings.slice(-10));
    }
    if (action === 'clear') {
      events.length = 0;
      recordings.length = 0;
      return res.status(200).json({ ok: true });
    }
    return res.status(200).json({ ok: true });
  }

  if (req.method === 'POST') {
    const body = req.body || {};
    const type = body.type;

    if (type === 'browser_event' || type === 'recording_control' || type === 'tab_monitored' || type === 'tab_closed' || type === 'extension_connected') {
      events.push(body);
      return res.status(200).json({ ok: true });
    }

    if (type === 'screen_recording_chunk') {
      const { recordingId, index, total, data, mimeType } = body as { recordingId: string; index: number; total: number; data: string; mimeType?: string };
      if (!recordingId || typeof index !== 'number' || typeof total !== 'number' || !data) {
        return res.status(400).json({ error: 'invalid chunk' });
      }
      const buf = buffers[recordingId] || { chunks: new Array(total).fill(null), total, mimeType: mimeType || 'video/webm', startedAt: Date.now() };
      buf.chunks[index] = data;
      if (mimeType) buf.mimeType = mimeType;
      buffers[recordingId] = buf;
      return res.status(200).json({ received: index });
    }

    if (type === 'screen_recording_complete') {
      const { recordingId, duration, mimeType, timestamp } = body as { recordingId: string; duration?: number; mimeType?: string; timestamp?: number };
      const buf = buffers[recordingId];
      if (!buf) return res.status(404).json({ error: 'unknown recordingId' });
      if (buf.chunks.some((c) => c === null)) return res.status(409).json({ error: 'chunks_incomplete' });
      const base64 = buf.chunks.join('');
      recordings.push({ recordingId, data: base64, mimeType: mimeType || buf.mimeType, timestamp: timestamp || Date.now(), duration });
      delete buffers[recordingId];
      return res.status(200).json({ ok: true, sizeChars: base64.length });
    }

    return res.status(400).json({ error: 'unknown type' });
  }

  return res.status(405).json({ error: 'method_not_allowed' });
}

// Removed old legacy handler below (duplicated default export)
