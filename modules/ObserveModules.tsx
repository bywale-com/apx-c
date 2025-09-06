// modules/ObserveModule.tsx
import useSWR from 'swr';
import React, { useMemo, useState } from 'react';

type Row = { id:string; ts:string; episode_id:string; action:any; app:any };
const fetcher = (u:string)=>fetch(u).then(r=>r.json());

export default function ObserveModule() {
  const { data, mutate } = useSWR<{rows:Row[]}>('/api/observe/episodes?limit=400', fetcher);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [modal, setModal] = useState<null | { episodeId: string; url: string; steps: Step[] }> (null);
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState('https://example.com/form'); // demo seeder url

  const groups = useMemo(()=>{
    const m: Record<string, Row[]> = {};
    for (const r of (data?.rows ?? [])) (m[r.episode_id] ||= []).push(r);
    for (const k of Object.keys(m)) m[k].sort((a,b)=>a.ts.localeCompare(b.ts));
    return m;
  },[data]);

  async function seed() {
    setBusy(true);
    try {
      await fetch('/api/observe/seed', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ url })
      });
      await mutate();
    } finally { setBusy(false); }
  }

  function onAsk(episodeId: string, rows: Row[], nameHint: string) {
    const steps = deriveSteps(rows);
    const url = rows[0]?.app?.url ?? '';
    setModal({ episodeId, url, steps: steps.length ? steps : [] });
  }

  return (
    <main style={{ flexGrow: 1, display:'flex', flexDirection:'column', padding:24 }}>
      <h2 style={{ marginTop:0, marginBottom:12 }}>Observe • Watch + Ask</h2>

      {/* Demo controls */}
      <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:12 }}>
        <input
          value={url}
          onChange={(e)=>setUrl(e.target.value)}
          placeholder="Page URL to attribute (for demo seed)"
          style={{ flex:1, padding:'8px 10px', borderRadius:8, border:'1px solid #333', background:'#111', color:'#fff' }}
        />
        <button
          onClick={seed}
          disabled={busy}
          style={{ background:'#fff', color:'#000', border:0, borderRadius:8, padding:'8px 12px', fontWeight:600, cursor:'pointer' }}
        >
          {busy ? 'Seeding…' : 'Run Demo'}
        </button>
      </div>

      <div style={{ display:'grid', gap:12 }}>
        {Object.entries(groups).map(([ep, rows])=>{
          const url = rows[0]?.app?.url ?? '';
          const asks = deriveAskLabels(rows);
          return (
            <div key={ep} style={{ border:'1px solid #222', borderRadius:12, padding:12, background:'#0b0b0b' }}>
              <div style={{ fontSize:12, color:'#aaa', marginBottom:6 }}>
                {url} — {rows.length} events
              </div>

              {/* Event list with expandable details */}
              <ul style={{ fontSize:12, color:'#ccc', maxHeight:220, overflow:'auto', margin:0, paddingLeft:16 }}>
                {rows.map(r => {
                  const isOpen = !!expanded[r.id];
                  return (
                    <li key={r.id} style={{ marginBottom: isOpen ? 6 : 2 }}>
                      <span
                        role="button"
                        onClick={()=>setExpanded(s=>({ ...s, [r.id]: !s[r.id] }))}
                        style={{ cursor:'pointer', textDecoration:'underline dotted' }}
                        title="Click to toggle details"
                      >
                        {r.ts} — {r.action?.type}
                      </span>
                      {isOpen && (
                        <pre style={{
                          whiteSpace:'pre-wrap', background:'#111', color:'#9fe', padding:8,
                          borderRadius:8, marginTop:6, overflowX:'auto'
                        }}>
{JSON.stringify(r.action, null, 2)}
                        </pre>
                      )}
                    </li>
                  );
                })}
              </ul>

              {/* Ask buttons */}
              {asks.length>0 && (
                <div style={{ marginTop:10 }}>
                  <div style={{ color:'#fff', fontSize:13, marginBottom:6 }}>Ask (Suggestions)</div>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                    {asks.map((label,i)=>(
                      <button
                        key={i}
                        style={{ background:'#fff', color:'#000', border:0, borderRadius:8, padding:'6px 10px', fontSize:12, cursor:'pointer' }}
                        onClick={()=>onAsk(ep, rows, label)}
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
        {Object.keys(groups).length===0 && (
          <div style={{ color:'#aaa', fontSize:13 }}>No episodes yet. Use the app normally or click <b>Run Demo</b>.</div>
        )}
      </div>

      {modal && (
        <RuleModal
          url={modal.url}
          episodeId={modal.episodeId}
          initialSteps={modal.steps}
          onClose={()=>setModal(null)}
        />
      )}
    </main>
  );
}

/** ===== Step derivation & Ask logic ===== */

type Step = { type:'navigate'|'input'|'click'|'submit'; url?:string; selector?:string; value?:string; name?:string; };

function deriveAskLabels(rows: Row[]): string[] {
  const clicks = rows.filter(r=>r.action?.type==='click').length;
  const inputs = rows.filter(r=>r.action?.type==='input').length;
  const submits = rows.filter(r=>r.action?.type==='submit').length;
  const asks:string[] = [];
  if (inputs>=3 && submits>=1) asks.push('Auto-fill repeated fields?');
  if (clicks>=5) asks.push('Record navigation macro?');
  if (rows.some(r=>r.action?.type==='navigate')) asks.push('Track this as a repeatable flow?');
  return asks;
}

function stableSelector(sel?:string, role?:string, name?:string) {
  // crude fallback chain
  if (sel && sel !== 'input' && sel !== 'button' && !sel.startsWith('unknown')) return sel;
  if (role && name) return `${role}[name="${name.slice(0,40)}"]`;
  return sel || role || 'unknown';
}

function deriveSteps(rows: Row[]): Step[] {
  const steps: Step[] = [];
  const latestValueBySel = new Map<string,string>();

  for (const r of rows) {
    const a = r.action;
    if (!a) continue;

    if (a.type === 'navigate') {
      steps.push({ type:'navigate', url: a.url || r.app?.url });
      continue;
    }

    if (a.type === 'input') {
      const sel = stableSelector(a.target?.selector, a.target?.role, a.target?.name);
      if (!sel) continue;
      // Debounce/merge: keep only the latest value per selector
      if (!a.redacted && typeof a.value === 'string') latestValueBySel.set(sel, a.value);
      continue;
    }

    if (a.type === 'click') {
      const sel = stableSelector(a.target?.selector, a.target?.role, a.target?.name);
      steps.push({ type:'click', selector: sel, name: a.target?.name });
      continue;
    }

    if (a.type === 'submit') {
      const sel = stableSelector(a.target?.selector, a.target?.role, a.target?.name);
      steps.push({ type:'submit', selector: sel, name: a.target?.name });
      continue;
    }
  }

  // Append merged inputs after we’ve scanned
  for (const [sel, val] of latestValueBySel.entries()) {
    steps.push({ type:'input', selector: sel, value: val });
  }

  // Simple cleanup: drop adjacent duplicate clicks on same selector
  const cleaned: Step[] = [];
  for (const s of steps) {
    const prev = cleaned[cleaned.length-1];
    if (prev && prev.type==='click' && s.type==='click' && prev.selector===s.selector) continue;
    cleaned.push(s);
  }

  return cleaned;
}

/** ===== Rule Modal ===== */

function RuleModal({ url, episodeId, initialSteps, onClose }:{
  url: string; episodeId: string; initialSteps: Step[]; onClose: ()=>void;
}) {
  const [name, setName] = useState(`Rule for ${new URL(url).hostname}`);
  const [json, setJson] = useState(JSON.stringify(initialSteps, null, 2));
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<string[]>([]);

  function runPreview() {
    // Dry-run: describe what we would do
    try {
      const steps: Step[] = JSON.parse(json);
      const lines = steps.map((s,i)=>{
        if (s.type==='navigate') return `${i+1}. navigate → ${s.url}`;
        if (s.type==='input') return `${i+1}. input → ${s.selector} = ${truncate(s.value,40)}`;
        if (s.type==='click') return `${i+1}. click → ${s.selector}`;
        if (s.type==='submit') return `${i+1}. submit → ${s.selector}`;
        return `${i+1}. ${s.type}`;
      });
      setPreview(lines);
    } catch (e:any) {
      setPreview([`Invalid JSON: ${e.message}`]);
    }
  }

  async function saveRule() {
    setSaving(true);
    try {
      const steps = JSON.parse(json);
      const r = await fetch('/api/observe/rules', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ name, episode_id: episodeId, steps })
      });
      if (!r.ok) {
        const t = await r.text();
        alert(`Save failed: ${t}`);
      } else {
        onClose();
      }
    } catch (e:any) {
      alert(`Save failed: ${e.message}`);
    } finally { setSaving(false); }
  }

  return (
    <div style={{
      position:'fixed', inset:0, background:'rgba(0,0,0,.6)', display:'flex',
      alignItems:'center', justifyContent:'center', zIndex:2000
    }}>
      <div style={{ width:720, maxWidth:'90vw', background:'#0b0b0b', border:'1px solid #333', borderRadius:12, padding:16 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
          <div style={{ fontWeight:700 }}>Create Delegation Rule</div>
          <button onClick={onClose} style={{ background:'#222', color:'#fff', border:0, borderRadius:8, padding:'6px 10px', cursor:'pointer' }}>Close</button>
        </div>

        <div style={{ display:'grid', gap:8 }}>
          <label style={{ fontSize:13, color:'#ccc' }}>
            Name
            <input value={name} onChange={e=>setName(e.target.value)}
              style={{ width:'100%', marginTop:4, padding:'8px 10px', borderRadius:8, border:'1px solid #333', background:'#111', color:'#fff' }} />
          </label>

          <label style={{ fontSize:13, color:'#ccc' }}>
            Steps (JSON)
            <textarea value={json} onChange={e=>setJson(e.target.value)} rows={12}
              style={{ width:'100%', marginTop:4, padding:10, borderRadius:8, border:'1px solid #333', background:'#111', color:'#9fe', fontFamily:'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', fontSize:12 }} />
          </label>

          <div style={{ display:'flex', gap:8 }}>
            <button onClick={runPreview} style={{ background:'#fff', color:'#000', border:0, borderRadius:8, padding:'8px 12px', fontWeight:600, cursor:'pointer' }}>
              Run (preview)
            </button>
            <button onClick={saveRule} disabled={saving} style={{ background:'#0a74da', color:'#fff', border:0, borderRadius:8, padding:'8px 12px', fontWeight:600, cursor:'pointer' }}>
              {saving ? 'Saving…' : 'Save rule'}
            </button>
          </div>

          {preview.length>0 && (
            <div style={{ marginTop:8 }}>
              <div style={{ color:'#fff', fontSize:13, marginBottom:6 }}>Preview</div>
              <ul style={{ margin:0, paddingLeft:16, color:'#ccc', fontSize:12 }}>
                {preview.map((p,i)=><li key={i}>{p}</li>)}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function truncate(s?:string, n=40){ if(!s) return ''; return s.length>n ? s.slice(0,n)+'…' : s; }

