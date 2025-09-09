// pages/product.tsx
import { motion } from 'framer-motion';
import Link from 'next/link';

export default function Product() {
  return (
    <main style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff', padding: '60px 24px' }}>
      <motion.section
        style={{ maxWidth: 980, margin: '0 auto' }}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0, transition: { duration: 0.5 } }}
      >
        <h1 style={{ marginTop: 0 }}>Product</h1>
        <p style={{ color: '#bbb', marginTop: 8, maxWidth: 720 }}>
          Apex turns what you already do into automations. Observe how you work, generate rules, and run them—fast.
        </p>
      </motion.section>

      <motion.section
        style={{ maxWidth: 980, margin: '36px auto 0', display: 'grid', gap: 16 }}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-10% 0px' }}
        variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.45 } } }}
      >
        <div style={{ border: '1px solid #222', background: '#0b0b0b', borderRadius: 12, padding: 16 }}>
          <h3 style={{ marginTop: 0 }}>Observe</h3>
          <p style={{ color: '#ccc', marginTop: 6 }}>Capture navigate, input, and click events as you work—no extra steps.</p>
        </div>
        <div style={{ border: '1px solid #222', background: '#0b0b0b', borderRadius: 12, padding: 16 }}>
          <h3 style={{ marginTop: 0 }}>Ask</h3>
          <p style={{ color: '#ccc', marginTop: 6 }}>Apex suggests rules from repeated actions and clarifies with simple questions.</p>
        </div>
        <div style={{ border: '1px solid #222', background: '#0b0b0b', borderRadius: 12, padding: 16 }}>
          <h3 style={{ marginTop: 0 }}>Run</h3>
          <p style={{ color: '#ccc', marginTop: 6 }}>Preview, iterate, and execute rules—hands-on or hands-off.</p>
        </div>
      </motion.section>

      <motion.section
        style={{ maxWidth: 980, margin: '36px auto 0' }}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-10% 0px' }}
        variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.45 } } }}
      >
        <h2>Templates</h2>
        <div style={{ display: 'grid', gap: 12 }}>
          {[
            { name: 'Auto-fill CRM notes', desc: 'Capture customer call notes and sync to CRM.' },
            { name: 'Bulk email follow-up', desc: 'Generate templated follow-ups from spreadsheet.' },
            { name: 'Intake to ticket', desc: 'Convert form submissions into triaged tickets.' },
          ].map((t, i) => (
            <div key={i} style={{ border: '1px solid #222', background: '#0b0b0b', borderRadius: 12, padding: 16 }}>
              <div style={{ fontWeight: 700 }}>{t.name}</div>
              <div style={{ color: '#9aa', marginTop: 4 }}>{t.desc}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 16 }}>
          <Link href="/login" style={{ color: '#8ab4ff', textDecoration: 'none' }}>Launch app →</Link>
        </div>
      </motion.section>
    </main>
  );
}
