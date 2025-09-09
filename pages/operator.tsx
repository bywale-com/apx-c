// pages/operators.tsx
import { motion } from 'framer-motion';

export default function Operators() {
  return (
    <main style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff', padding: '60px 24px' }}>
      <motion.section
        style={{ maxWidth: 980, margin: '0 auto' }}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0, transition: { duration: 0.5 } }}
      >
        <h1 style={{ marginTop: 0 }}>Become an Apex Operator</h1>
        <p style={{ color: '#bbb', marginTop: 8, maxWidth: 720 }}>
          Learn automation, certify, and get placed into modern orgs. Work from anywhere, on your terms.
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
          { title: 'Learn', copy: 'Observe → Rule → Run. Build automations from your own workflows.' },
          { title: 'Certify', copy: 'Demonstrate proficiency with guided scenarios and a short assessment.' },
          { title: 'Get placed', copy: 'We match you with orgs. Take multiple contracts. Deliver more with Apex.' },
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
        <h2>Apply</h2>
        <form method="post" action="https://formspree.io/f/your-id" style={{ display: 'grid', gap: 10 }}>
          <input name="name" placeholder="Full name" style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #333', background: '#111', color: '#fff' }} />
          <input name="email" type="email" placeholder="Email" style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #333', background: '#111', color: '#fff' }} />
          <textarea name="notes" placeholder="Tell us about your work" rows={5} style={{ padding: 12, borderRadius: 8, border: '1px solid #333', background: '#111', color: '#fff' }} />
          <button type="submit" style={{ background: '#fff', color: '#000', border: 0, borderRadius: 8, padding: '10px 16px', fontWeight: 700, cursor: 'pointer' }}>
            Submit
          </button>
        </form>
      </motion.section>
    </main>
  );
}
