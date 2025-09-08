// pages/login.tsx
import { useState } from 'react';
import { useRouter } from 'next/router';

export default function Login() {
  const r = useRouter();
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const next = (r.query.next as string) || '/app';

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) throw new Error((await res.text()) || `HTTP ${res.status}`);
      r.replace(next);
    } catch (e: any) {
      setErr(e?.message || 'Login failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#0a0a0a', color: '#fff' }}>
      <form onSubmit={submit} style={{ width: 360, background: '#0b0b0b', border: '1px solid #222', borderRadius: 12, padding: 20 }}>
        <h1 style={{ marginTop: 0 }}>Sign in</h1>
        <p style={{ color: '#aaa', marginTop: 0 }}>Enter the site password to continue.</p>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="Site password"
          style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #333', background: '#111', color: '#fff' }}
        />
        {err && <div style={{ color: '#ff6b6b', marginTop: 8, fontSize: 13 }}>{err}</div>}
        <button
          type="submit"
          disabled={busy || !password}
          style={{ marginTop: 12, width: '100%', padding: '10px 12px', borderRadius: 8, border: 0, background: '#0a74da', color: '#fff', fontWeight: 700, cursor: busy ? 'not-allowed' : 'pointer' }}
        >
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </main>
  );
}
