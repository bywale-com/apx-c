import React from 'react';

export type WorkflowStep = {
  id: string;
  label: string;
  start?: number; // seconds
  end?: number;   // seconds
};

interface WorkflowBuilderProps {
  steps: WorkflowStep[];
  currentTime: number;
  onAdd?: () => void;
  onRename?: (id: string, next: string) => void;
}

export default function WorkflowBuilder({ steps, currentTime, onAdd, onRename }: WorkflowBuilderProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.12)' }}>
        <div style={{ fontWeight: 600, color: 'rgba(255,255,255,0.9)' }}>Workflow Builder</div>
        <button
          onClick={onAdd}
          style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.22)', background: 'rgba(255,255,255,0.08)', color: '#fff', cursor: 'pointer', fontSize: 12 }}
        >
          + Add Step
        </button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {steps.length === 0 ? (
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>
            Start from blank. As you answer prompts or scrub the replay, steps can be added here.
          </div>
        ) : (
          steps.map((s) => {
            const active = s.start != null && s.end != null && currentTime >= (s.start as number) && currentTime <= (s.end as number);
            return (
              <div key={s.id} style={{
                padding: '10px 12px',
                border: `1px solid ${active ? 'rgba(56,225,255,0.45)' : 'rgba(255,255,255,0.12)'}`,
                background: active ? 'rgba(56,225,255,0.12)' : 'rgba(255,255,255,0.04)',
                color: 'rgba(255,255,255,0.92)',
                borderRadius: 8
              }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{s.label}</div>
                {(s.start != null || s.end != null) && (
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 4 }}>
                    {s.start != null ? `${(s.start as number).toFixed(1)}s` : '–'} → {s.end != null ? `${(s.end as number).toFixed(1)}s` : '–'}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}



