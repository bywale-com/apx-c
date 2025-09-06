// modules/ObserveModule.tsx
import React, { useMemo, useState } from 'react';
import useSWR from 'swr';
import { runRule, type RunnerStep } from '../utils/ruleRunner';

type Row = { id: string; ts: string; episode_id: string; action: any; app: any };
type Step = {
  type: 'navigate' | 'input' | 'click' | 'submit';
  url?: string;
  selector?: string;
  value?: string;
  name?: string;
};

const fetcher = (u: string) => fetch(u).then((r) => r.json());

export default function ObserveModule() {
  const { data: epData, mutate: mutateEpisodes } = useSWR<{ rows: Row[] }>(
    '/api/observe/episodes?limit=400',
    fetcher
  );
  const { data: ruleData, mutate: mutateRules } = useSWR<{ rows: any[] }>(
    '/api/observe/rules',
    fetcher
  );

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [modal, setModal] = useState<null | { episodeId: string; url: string; steps: Step[] }>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState('https://example.com/form'); // demo seeder URL

  const groups = useMemo(() => {
    const m: Record<string, Row[]> = {};
    for (const r of epData?.rows ?? []) (m[r.episode_id] ||= []).push(r);
    for (const k of Object.keys(m)) m[k].sort((a, b) => a.ts.localeCompare(b.ts));
    return m;
  }, [epData]);

  function toast(msg: string) {
    setBanner(msg);
    setTimeout(() => setBanner(null), 2500);
  }

  async function seed() {
    setBusy(true);
    try {
      const res = await fetch('/api/observe/seed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || `HTTP ${res.status}`);
      }
      await mutateEpisodes();
      toast('Seeded a demo episode.');
    } catch (e: any) {
      toast(`Seed failed: ${e.message ?? e}`);
    } finally {
      setBusy(false);
    }
  }

  function onAsk(episodeId: string, rows: Row[]) {
    const steps = deriveSteps(rows);
    const url = rows[0]?.app?.url ?? '';
    setModal({ episodeId, url, steps });
  }

  return (
    <main
      style={{
        flexGrow: 1,
        display: 'flex',
        flexDirection: 'column',
        padding: 24,
        position: 'relative',
        height: '100%',
        minHeight: 0,
        overflow: 'hidden',
      }}
    >
      <h2 style={{ marginTop: 0, marginBottom: 12 }}>Observe • Watch + Ask</h2>

      {/* Banner */}
      {banner && (
        <div
          style={{
            position: 'absolute',
            top: 8,
            left: 24,
            right: 24,
            background: '#123c16',
            color: '#bfffcf',
            border: '1px solid #1e6c2a',
            borderRadius: 8,
            padding: '8px 12px',
            fontSize: 13,
          }}
        >
          {banner}
        </div>
      )}

      {/* Demo controls */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Page URL to attribute (for demo seed)"
          style={{
            flex: 1,
            padding: '8px 10px',
            borderRadius: 8,
            border: '1px solid #333',
            background: '#111',
            color: '#fff',
          }}
        />
        <button
          onClick={seed}
          disabled={busy}
          style={{
            background: '#fff',
            color: '#000',
            border: 0,
            borderRadius: 8,
            padding: '8px 12px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {busy ? 'Seeding…' : 'Run Demo'}
        </button>
      </div>

      {/* Scroll container (episodes + saved rules) */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          paddingRight: 4,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        {/* Episodes */}
        <div style={{ display: 'grid', gap: 12 }}>
          {Object.entries(groups).map(([ep, rows]) => {
            const url = rows[0]?.app?.url ?? '';
            const asks = deriveAskLabels(rows);
            return (
              <div key={ep} style={{ border: '1px solid #222', borderRadius: 12, padding: 12, background: '#0b0b0b' }}>
                <div style={{ fontSize: 12, color: '#aaa', marginBottom: 6 }}>
                  {url} — {rows.length} events
                </div>

                {/* Event list (expandable) */}
                <ul style={{ fontSize: 12, color: '#ccc', maxHeight: 220, overflow: 'auto', margin: 0, paddingLeft: 16 }}>
                  {rows.map((r) => {
                    const isOpen = !!expanded[r.id];
                    return (
                      <li key={r.id} style={{ marginBottom: isOpen ? 6 : 2 }}>
                        <span
                          role="button"
                          onClick={() => setExpanded((s) => ({ ...s, [r.id]: !s[r.id] }))}
                          style={{ cursor: 'pointer', textDecoration: 'underline dotted' }}
                          title="Click to toggle details"
                        >
                          {r.ts} — {r.action?.type}
                        </span>
                        {isOpen && (
                          <pre
                            style={{
                              whiteSpace: 'pre-wrap',
                              background: '#111',
                              color: '#9fe',
                              padding: 8,
                              borderRadius: 8,
                              marginTop: 6,
                              overflowX: 'auto',
                            }}
                          >
{JSON.stringify(r.action, null, 2)}
                          </pre>
                        )}
                      </li>
                    );
                  })}
                </ul>

                {/* Ask buttons → open modal */}
                {asks.length > 0 && (
                  <div style={{ marginTop: 10 }}>
                    <div style={{ color: '#fff', fontSize: 13, marginBottom: 6 }}>Ask (Suggestions)</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {asks.map((label, i) => (
                        <button
                          key={i}
                          style={{
                            background: '#fff',
                            color: '#000',
                            border: 0,
                            borderRadius: 8,
                            padding: '6px 10px',
                            fontSize: 12,
                            cursor: 'pointer',
                          }}
                          onClick={() => onAsk(ep, rows)}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {Object.keys(groups).length === 0 && (
            <div style={{ color: '#aaa', fontSize: 13 }}>
              No episodes yet. Use the app normally or click <b>Run Demo</b>.
            </div>
          )}
        </div>

        {/* Saved rules list */}
        <div>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Saved rules</div>
          {ruleData?.rows?.length ? (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, fontSize: 12, color: '#ccc' }}>
              {ruleData.rows.map((r: any) => (
                <li
                  key={r.id}
                  style={{
                    padding: '6px 8px',
                    border: '1px solid #222',
                    borderRadius: 8,
                    background: '#0b0b0b',
                    marginBottom: 6,
                  }}
                >
                  <div style={{ color: '#fff' }}>{r.name}</div>
                  <div style={{ fontSize: 11, color: '#9aa' }}>
                    {new Date(r.created_at).toLocaleString()} • {Array.isArray(r.steps) ? r.steps.length : 0} steps
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div style={{ fontSize: 12, color: '#888' }}>None saved yet.</div>
          )}
        </div>
      </div>

      {modal && (
        <RuleModal
          url={modal.url}
          episodeId={modal.episodeId}
          initialSteps={modal.steps}
          onClose={() => setModal(null)}
          onSaved={(name) => {
            toast(`Saved rule: ${name}`);
            mutateRules();
          }}
        />
      )}
    </main>
  );
}

/* ===== Helper logic ===== */

function deriveAskLabels(rows: Row[]): string[] {
  const clicks = rows.filter((r) => r.action?.type === 'click').length;
  const inputs = rows.filter((r) => r.action?.type === 'input').length;
  const submits = rows.filter((r) => r.action?.type === 'submit').length;
  const asks: string[] = [];
  if (inputs >= 3 && submits >= 1) asks.push('Auto-fill repeated fields?');
  if (clicks >= 5) asks.push('Record navigation macro?');
  if (rows.some((r) => r.action?.type === 'navigate')) asks.push('Track this as a repeatable flow?');
  return asks;
}

const GENERIC_TAGS = new Set([
  'div',
  'p',
  'span',
  'button',
  'input',
  'textarea',
  'a',
  'label',
  'section',
  'main',
  'form',
  'ul',
  'li',
]);

function stableSelector(sel?: string, role?: string, name?: string) {
  const hasSpecificity = !!sel && (sel.startsWith('#') || sel.includes('.') || sel.includes('['));
  const isGeneric = !sel || GENERIC_TAGS.has(sel);
  // Prefer role[name] for generic/weak selectors
  if ((isGeneric || !hasSpecificity) && role) {
    const trimmed = (name ?? '').trim();
    if (role === 'textbox') {
      // Short/volatile names (like current typed snippet) are flaky -> allow bare 'textbox'
      if (!trimmed || trimmed.length < 4) return 'textbox';
      return `textbox[name="${trimmed.slice(0, 40)}"]`;
    }
    if (trimmed) return `${role}[name="${trimmed.slice(0, 40)}"]`;
    return role;
  }
  return sel || role || 'unknown';
}

function deriveSteps(rows: Row[]): Step[] {
  const structural: Step[] = []; // navigate + clicks (no submit)
  const submits: Step[] = [];
  const bestValueBySel = new Map<string, { val: string; score: number }>();

  for (const r of rows) {
    const a = r.action;
    if (!a) continue;

    if (a.type === 'navigate') {
      structural.push({ type: 'navigate', url: a.url || r.app?.url });
      continue;
    }

    if (a.type === 'input') {
      const sel = stableSelector(a.target?.selector, a.target?.role, a.target?.name);
      if (!sel) continue;
      if (!a.redacted && typeof a.value === 'string') {
        const v = a.value ?? '';
        const score = v.length > 0 ? v.length : 0; // prefer longest non-empty sample
        const prev = bestValueBySel.get(sel);
        if (!prev || score > prev.score) bestValueBySel.set(sel, { val: v, score });
      }
      continue;
    }

    if (a.type === 'click') {
      const sel = stableSelector(a.target?.selector, a.target?.role, a.target?.name);
      structural.push({ type: 'click', selector: sel, name: a.target?.name });
      continue;
    }

    if (a.type === 'submit') {
      const sel = stableSelector(a.target?.selector, a.target?.role, a.target?.name);
      submits.push({ type: 'submit', selector: sel, name: a.target?.name });
      continue;
    }
  }

  // Emit inputs after clicks (so elements exist) but before submits
  const inputs: Step[] = [];
  for (const [sel, { val }] of bestValueBySel.entries()) {
    inputs.push({ type: 'input', selector: sel, value: val });
  }

  const combined: Step[] = [...structural, ...inputs, ...submits];

  // Drop adjacent duplicate clicks
  const cleaned: Step[] = [];
  for (const s of combined) {
    const prev = cleaned[cleaned.length - 1];
    if (prev && prev.type === 'click' && s.type === 'click' && prev.selector === s.selector) continue;
    cleaned.push(s);
  }

  return cleaned;
}

function safeHost(u?: string) {
  try {
    return new URL(u || '').hostname || 'flow';
  } catch {
    return 'flow';
  }
}

/* ===== Rule Modal ===== */

function RuleModal({
  url,
  episodeId,
  initialSteps,
  onClose,
  onSaved,
}: {
  url: string;
  episodeId: string;
  initialSteps: Step[];
  onClose: () => void;
  onSaved: (name: string) => void;
}) {
  const [name, setName] = useState(`Rule for ${safeHost(url)}`);
  const [json, setJson] = useState<string>(JSON.stringify(initialSteps ?? [], null, 2));
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [runLog, setRunLog] = useState<string[]>([]);

  function runPreview() {
    try {
      const steps: Step[] = JSON.parse(json);
      const lines = steps.map((s, i) => {
        if (s.type === 'navigate') return `${i + 1}. navigate → ${s.url}`;
        if (s.type === 'input') return `${i + 1}. input → ${s.selector} = ${truncate(s.value, 40)}`;
        if (s.type === 'click') return `${i + 1}. click → ${s.selector}`;
        if (s.type === 'submit') return `${i + 1}. submit → ${s.selector ?? '(auto)'}`;
        if ((s as any).type === 'openTab') return `${i + 1}. openTab → ${(s as any).url}`;
        if ((s as any).type === 'wait') return `${i + 1}. wait → ${(s as any).ms}ms`;
        return `${i + 1}. ${s.type}`;
      });
      setPreview(lines);
    } catch (e: any) {
      setPreview([`Invalid JSON: ${e.message ?? e}`]);
    }
  }

  async function saveRule() {
    setSaving(true);
    try {
      const steps = JSON.parse(json);
      const r = await fetch('/api/observe/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, episode_id: episodeId, steps }),
      });
      if (!r.ok) throw new Error(await r.text());
      onSaved(name);
      onClose();
    } catch (e: any) {
      alert(`Save failed: ${e.message ?? e}`);
    } finally {
      setSaving(false);
    }
  }

  async function runNow() {
    setRunning(true);
    setRunLog([]);
    const append = (m: string) => setRunLog((p) => [...p, m]);
    try {
      const steps = JSON.parse(json) as RunnerStep[];
      append(`Running ${steps.length} step(s)…`);
      const res = await runRule(steps, {
        maxOpenTabs: 20,
        emitEvents: true,
        onUpdate: append,
      });
      append(res.ok ? '✔ Completed' : `✖ Stopped: ${res.error || 'unknown error'}`);
    } catch (e: any) {
      setRunLog((p) => [...p, `✖ Failed: ${e?.message || e}`]);
    } finally {
      setRunning(false);
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
      }}
    >
      <div
        style={{
          width: 820,
          maxWidth: '92vw',
          background: '#0b0b0b',
          border: '1px solid #333',
          borderRadius: 12,
          padding: 16,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ fontWeight: 700 }}>Create Delegation Rule</div>
          <button
            onClick={onClose}
            style={{ background: '#222', color: '#fff', border: 0, borderRadius: 8, padding: '6px 10px', cursor: 'pointer' }}
          >
            Close
          </button>
        </div>

        <div style={{ display: 'grid', gap: 8, gridTemplateColumns: '1fr', gridAutoRows: 'min-content' }}>
          <label style={{ fontSize: 13, color: '#ccc' }}>
            Name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{
                width: '100%',
                marginTop: 4,
                padding: '8px 10px',
                borderRadius: 8,
                border: '1px solid #333',
                background: '#111',
                color: '#fff',
              }}
            />
          </label>

          <label style={{ fontSize: 13, color: '#ccc' }}>
            Steps (JSON)
            <textarea
              value={json}
              onChange={(e) => setJson(e.target.value)}
              rows={12}
              style={{
                width: '100%',
                marginTop: 4,
                padding: 10,
                borderRadius: 8,
                border: '1px solid #333',
                background: '#111',
                color: '#9fe',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
                fontSize: 12,
              }}
            />
          </label>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              onClick={runPreview}
              style={{ background: '#fff', color: '#000', border: 0, borderRadius: 8, padding: '8px 12px', fontWeight: 600, cursor: 'pointer' }}
            >
              Run (preview)
            </button>
            <button
              onClick={runNow}
              disabled={running}
              style={{ background: '#12a150', color: '#fff', border: 0, borderRadius: 8, padding: '8px 12px', fontWeight: 600, cursor: 'pointer' }}
              title="Execute the steps in this page"
            >
              {running ? 'Running…' : 'Run now (real)'}
            </button>
            <button
              onClick={saveRule}
              disabled={saving}
              style={{ background: '#0a74da', color: '#fff', border: 0, borderRadius: 8, padding: '8px 12px', fontWeight: 600, cursor: 'pointer' }}
            >
              {saving ? 'Saving…' : 'Save rule'}
            </button>
          </div>

          {(running || runLog.length > 0) && (
            <div style={{ marginTop: 8 }}>
              <div style={{ color: '#fff', fontSize: 13, marginBottom: 6 }}>Run log</div>
              <pre
                style={{
                  background: '#111',
                  color: '#ddd',
                  padding: 10,
                  borderRadius: 8,
                  maxHeight: 220,
                  overflowY: 'auto',
                  fontSize: 12,
                }}
              >
{runLog.join('\n')}
              </pre>
            </div>
          )}

          {preview.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <div style={{ color: '#fff', fontSize: 13, marginBottom: 6 }}>Preview</div>
              <ul style={{ margin: 0, paddingLeft: 16, color: '#ccc', fontSize: 12 }}>
                {preview.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function truncate(s?: string, n = 40) {
  if (!s) return '';
  return s.length > n ? s.slice(0, n) + '…' : s;
}

