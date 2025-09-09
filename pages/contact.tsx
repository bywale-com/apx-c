// pages/contact.tsx
import { motion } from 'framer-motion';

export default function Contact() {
  return (
    <main style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff', padding: '60px 24px' }}>
      <motion.section
        style={{ maxWidth: 720, margin: '0 auto' }}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0, transition: { duration: 0.5 } }}
      >
        <h1 style={{ marginTop: 0 }}>Contact</h1>
        <p style={{ color: '#bbb', marginTop: 8 }}>
          Reach us and we’ll get back within one business day.
        </p>

        <form method="post" action="https://formspree.io/f/your-id" style={{ display: 'grid', gap: 10, marginTop: 16 }}>
          <input name="name" placeholder="Your name" style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #333', background: '#111', color: '#fff' }} />
          <input name="email" type="email" placeholder="Email" style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #333', background: '#111', color: '#fff' }} />
          <textarea name="message" placeholder="How can we help?" rows={6} style={{ padding: 12, borderRadius: 8, border: '1px solid #333', background: '#111', color: '#fff' }} />
          <button type="submit" style={{ background: '#fff', color: '#000', border: 0, borderRadius: 8, padding: '10px 16px', fontWeight: 700, cursor: 'pointer' }}>
            Send
          </button>
        </form>
      </motion.section>
    </main>
  );
}
