// pages/index.tsx
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function Landing() {
  return (
    <main style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff', padding: '60px 24px', position: 'relative' }}>
      {/* Subtle top glow */}
      <div style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        background: 'radial-gradient(600px 200px at 50% 0%, rgba(14,116,219,.12), transparent 60%)',
      }} />

      <motion.section
        style={{ maxWidth: 920, margin: '0 auto', position: 'relative' }}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0, transition: { duration: 0.5, delay: 0.05, ease: [0.21, 0.47, 0.32, 0.98] } }}
      >
        <h1 style={{ margin: 0, fontSize: 48, lineHeight: 1.1 }}>Apex</h1>
        <p style={{ color: '#bbb', fontSize: 18, marginTop: 12 }}>
          Chat with your agent. Watch user flows. Turn them into reusable rules.
        </p>
        <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
          <Link href="/login">
            <button
              style={{
                background: '#fff',
                color: '#000',
                border: 0,
                borderRadius: 8,
                padding: '10px 16px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'transform .15s ease, background-color .25s ease',
              }}
              onMouseDown={e => (e.currentTarget.style.transform = 'translateY(1px)')}
              onMouseUp={e => (e.currentTarget.style.transform = 'translateY(0)')}
              onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
            >
              Get started
            </button>
          </Link>
          <Link href="/blog">
            <button
              style={{
                background: '#111',
                color: '#fff',
                border: '1px solid #333',
                borderRadius: 8,
                padding: '10px 16px',
                cursor: 'pointer',
                transition: 'transform .15s ease, border-color .25s ease, background-color .25s ease',
              }}
              onMouseDown={e => (e.currentTarget.style.transform = 'translateY(1px)')}
              onMouseUp={e => (e.currentTarget.style.transform = 'translateY(0)')}
              onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
            >
              Blog
            </button>
          </Link>
        </div>
      </motion.section>

      <motion.section
        style={{ maxWidth: 920, margin: '48px auto 0', borderTop: '1px solid #222', paddingTop: 24, position: 'relative' }}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-10% 0px' }}
        variants={{
          hidden: { opacity: 0, y: 14 },
          show: { opacity: 1, y: 0, transition: { duration: 0.45 } },
        }}
      >
        <h2>What is Apex?</h2>
        <ul style={{ color: '#ccc', lineHeight: 1.8 }}>
          <li>Agent chat backed by n8n.</li>
          <li>Observe real user events (navigate, input, click).</li>
          <li>Create, preview, and run automation rules.</li>
        </ul>
      </motion.section>
    </main>
  );
}