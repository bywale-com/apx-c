// pages/product.tsx
import { motion } from 'framer-motion';
import Link from 'next/link';

export default function Product() {
  const gridBg = {
    background:
      `radial-gradient(1200px 600px at 60% 30%, rgba(124,92,255,0.10), transparent 60%),` +
      `radial-gradient(900px 500px at 20% 70%, rgba(91,225,255,0.08), transparent 70%),` +
      `#1a1038`,
  } as const;
  const gridOverlay: React.CSSProperties = {
    position: 'absolute', inset: 0, pointerEvents: 'none',
    background:
      'linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px) 0 0/ 80px 80px,' +
      'linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px) 0 0/ 80px 80px',
    opacity: 0.4,
  };

  return (
    <main style={{ minHeight: '100vh', color: '#fff' }}>
      {/* Hero */}
      <section style={{ position: 'relative', minHeight: '52vh', display: 'grid', placeItems: 'center', ...gridBg }}>
        <div style={gridOverlay} />
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0, transition: { duration: 0.6 } }}
          style={{ maxWidth: 980, padding: '120px 24px 60px 24px', textAlign: 'center' }}
        >
          <h1 style={{ margin: 0, fontWeight: 300 }}>Product</h1>
          <p style={{ color: 'rgba(255,255,255,0.8)', marginTop: 12 }}>
            Apex turns what you already do into automations. Observe how you work, generate rules, and run them—fast.
          </p>
        </motion.div>
      </section>

      {/* Feature panels */}
      <motion.section
        style={{ maxWidth: 1040, margin: '36px auto 0', display: 'grid', gap: 16, padding: '0 24px' }}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-10% 0px' }}
        variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.45 } } }}
      >
        {[
          { title: 'Observe', copy: 'Capture navigate, input, and click events as you work—no extra steps.' },
          { title: 'Ask', copy: 'Apex suggests rules from repeated actions and clarifies with simple questions.' },
          { title: 'Run', copy: 'Preview, iterate, and execute rules—hands-on or hands-off.' },
        ].map((c, i) => (
          <div key={i} style={{ border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: 16, backdropFilter: 'blur(8px)' }}>
            <h3 style={{ marginTop: 0 }}>{c.title}</h3>
            <p style={{ color: '#CFE3FF', marginTop: 6 }}>{c.copy}</p>
          </div>
        ))}
      </motion.section>

      {/* Templates */}
      <motion.section
        style={{ maxWidth: 1040, margin: '36px auto 60px', padding: '0 24px' }}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-10% 0px' }}
        variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.45 } } }}
      >
        <h2 style={{ fontWeight: 300 }}>Templates</h2>
        <div style={{ display: 'grid', gap: 12 }}>
          {[
            { name: 'Auto-fill CRM notes', desc: 'Capture customer call notes and sync to CRM.' },
            { name: 'Bulk email follow-up', desc: 'Generate templated follow-ups from spreadsheet.' },
            { name: 'Intake to ticket', desc: 'Convert form submissions into triaged tickets.' },
          ].map((t, i) => (
            <div key={i} style={{ border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: 16, backdropFilter: 'blur(8px)' }}>
              <div style={{ fontWeight: 700 }}>{t.name}</div>
              <div style={{ color: '#BFA9FF', marginTop: 4 }}>{t.desc}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 16 }}>
          <Link href="/login" style={{ color: '#7C5CFF', textDecoration: 'none', borderBottom: '1px solid rgba(124,92,255,0.5)', paddingBottom: 2 }}>Launch app →</Link>
        </div>
      </motion.section>
    </main>
  );
}
