// modules/ObserveModule.tsx
import useSWR from 'swr';

type Row = { id:string; ts:string; episode_id:string; action:any; app:any };
const fetcher = (u:string)=>fetch(u).then(r=>r.json());

export default function ObserveModule() {
  const { data } = useSWR<{rows:Row[]}>('/api/observe/episodes?limit=200', fetcher);
  const groups = (data?.rows ?? []).reduce((m, r) => {
    (m[r.episode_id] ||= []).push(r); return m;
  }, {} as Record<string, Row[]>);

  return (
    <main style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', padding: 24 }}>
      <h2 style={{ marginTop: 0, marginBottom: 12 }}>Observe • Watch + Ask</h2>
      <div style={{ display: 'grid', gap: 12 }}>
        {Object.entries(groups).map(([ep, rows])=>{
          const url = rows[0]?.app?.url ?? '';
          const asks = deriveAsks(rows);
          return (
            <div key={ep} style={{
              border: '1px solid #222', borderRadius: 12, padding: 12, background: '#0b0b0b'
            }}>
              <div style={{ fontSize: 12, color: '#aaa', marginBottom: 6 }}>{url} — {rows.length} events</div>
              <ul style={{ fontSize: 12, color: '#ccc', maxHeight: 160, overflow: 'auto', margin: 0, paddingLeft: 16 }}>
                {rows.map(r => <li key={r.id}>{r.ts} — {r.action?.type}</li>)}
              </ul>
              {asks.length>0 && (
                <div style={{ marginTop: 10 }}>
                  <div style={{ color: '#fff', fontSize: 13, marginBottom: 6 }}>Ask (Suggestions)</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {asks.map((a,i)=>(
                      <button
                        key={i}
                        style={{ background: '#fff', color: '#000', border: 0, borderRadius: 8, padding: '6px 10px', fontSize: 12, cursor: 'pointer' }}
                        onClick={()=>console.log('Create rule for:', a)}
                      >
                        {a}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}

function deriveAsks(rows: Row[]) {
  const clicks = rows.filter(r=>r.action?.type==='click').length;
  const inputs = rows.filter(r=>r.action?.type==='input').length;
  const submits = rows.filter(r=>r.action?.type==='submit').length;
  const asks:string[] = [];
  if (inputs>8 && submits>=1) asks.push("Auto-fill repeated fields?");
  if (clicks>15) asks.push("Record navigation macro?");
  if (rows.some(r=>r.action?.type==='navigate')) asks.push("Track this as a repeatable flow?");
  return asks;
}
