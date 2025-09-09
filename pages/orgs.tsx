// pages/orgs.tsx
import { motion } from 'framer-motion';

export default function Orgs() {
  return (
    <main style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff', padding: '60px 24px' }}>
      <motion.section
        style={{ maxWidth: 980, margin: '0 auto' }}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0, transition: { duration: 0.5 } }}
      >
        <h1 style={{ marginTop: 0 }}>For Organizations</h1>
        <p style={{ color: '#bbb', marginTop: 8, maxWidth: 720 }}>
          Hire Apex Operators to automate repetitive work and increase output—without adding headcount.
        </p>
      </motion.section>

      <motion.section
        style={{ maxWidth: 980, margin: '36px auto 0', display: 'grid', gap: 16 }}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-10% 0px' }}
        variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.45 } } }}
      >
        {[
          { title: 'Faster delivery', copy: 'Senior operators amplified by Apex deliver in days, not weeks.' },
          { title: 'Quiet automation', copy: 'We observe, codify, and run—minimizing disruption to teams.' },
          { title: 'Flexible engagements', copy: 'Scoped contracts or ongoing automation support.' },
        ].map((c, i) => (
          <div key={i} style={{ border: '1px solid #222', background: '#0b0b0b', borderRadius: 12, padding: 16 }}>
            <h3 style={{ marginTop: 0 }}>{c.title}</h3>
            <p style={{ color: '#ccc', marginTop: 6 }}>{c.copy}</p>
          </div>
        ))}
      </motion.section>

      <motion.section
        style={{ maxWidth: 720, margin: '36px auto 0' }}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true }}
        variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } }}
      >
        <h2>Request Info</h2>
        <form method="post" action="https://formspree.io/f/your-id" style={{ display: 'grid', gap: 10 }}>
          <input name="name" placeholder="Your name" style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #333', background: '#111', color: '#fff' }} />
          <input name="email" type="email" placeholder="Work email" style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #333', background: '#111', color: '#fff' }} />
          <input name="company" placeholder="Company" style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #333', background: '#111', color: '#fff' }} />
          <textarea name="needs" placeholder="What do you want to automate?" rows={5} style={{ padding: 12, borderRadius: 8, border: '1px solid #333', background: '#111', color: '#fff' }} />
          <button type="submit" style={{ background: '#fff', color: '#000', border: 0, borderRadius: 8, padding: '10px 16px', fontWeight: 700, cursor: 'pointer' }}>
            Send
          </button>
        </form>
      </motion.section>
    </main>
  );
}
