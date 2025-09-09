
// pages/index.tsx (enhanced with Metrics + How it works on top of your current layout)
import Link from 'next/link';
import { motion } from 'framer-motion';
import fs from 'fs';
import path from 'path';

type Post = { slug: string; title: string; excerpt: string; date?: string };

export async function getStaticProps() {
  const postsDir = path.join(process.cwd(), 'posts');
  const slugs = fs.existsSync(postsDir) ? fs.readdirSync(postsDir).filter(f => f.endsWith('.md')) : [];
  const posts: Post[] = slugs.map((file) => {
    const slug = file.replace(/\.md$/, '');
    const raw = fs.readFileSync(path.join(postsDir, file), 'utf8');
    const firstLine = raw.split('\n').find(l => l.trim().startsWith('#')) || '';
    const title = firstLine.replace(/^#\s*/, '').trim() || slug;
    const body = raw.replace(firstLine, '').trim();
    const excerpt = body.split('\n').filter(Boolean).join(' ').slice(0, 160) + (body.length > 160 ? '…' : '');
    const date = raw.match(/^date:\s*(.+)$/m)?.[1];
    return { slug, title, excerpt, date };
  }).sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 3);

  return { props: { posts } };
}

export default function Landing({ posts }: { posts: Post[] }) {
  return (
    <main style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff', padding: '60px 24px', position: 'relative' }}>
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(600px 200px at 50% 0%, rgba(14,116,219,.12), transparent 60%)' }} />

      <motion.section
        style={{ maxWidth: 980, margin: '0 auto' }}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0, transition: { duration: 0.5, delay: 0.05 } }}
      >
        <h1 style={{ margin: 0, fontSize: 48, lineHeight: 1.1 }}>Apex</h1>
        <p style={{ color: '#bbb', fontSize: 18, marginTop: 12 }}>
          Automate what you repeat. Become the operator every org wants.
        </p>
        <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
          <Link href="/login">
            <button
              style={{ background: '#fff', color: '#000', border: 0, borderRadius: 8, padding: '10px 16px', fontWeight: 700, cursor: 'pointer', transition: 'transform .15s ease, background-color .25s ease' }}
              onMouseDown={e => (e.currentTarget.style.transform = 'translateY(1px)')}
              onMouseUp={e => (e.currentTarget.style.transform = 'translateY(0)')}
              onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
            >
              Get started
            </button>
          </Link>
          <Link href="/blog">
            <button
              style={{ background: '#111', color: '#fff', border: '1px solid #333', borderRadius: 8, padding: '10px 16px', cursor: 'pointer', transition: 'transform .15s ease, border-color .25s ease, background-color .25s ease' }}
              onMouseDown={e => (e.currentTarget.style.transform = 'translateY(1px)')}
              onMouseUp={e => (e.currentTarget.style.transform = 'translateY(0)')}
              onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
            >
              Blog
            </button>
          </Link>
          <Link href="/product" style={{ color: '#8ab4ff', alignSelf: 'center' }}>Product →</Link>
        </div>
      </motion.section>

      {/* Metrics */}
      <motion.section
        style={{ maxWidth: 980, margin: '32px auto 0', display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 12 }}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true }}
        variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.45 } } }}
      >
        {[
          { k: 'Episodes captured', v: '12,480+' },
          { k: 'Rules created', v: '2,310+' },
          { k: 'Minutes saved', v: '180k+' },
        ].map((m, i) => (
          <div key={i} style={{ border: '1px solid #222', background: '#0b0b0b', borderRadius: 12, padding: 16 }}>
            <div style={{ fontSize: 28, fontWeight: 800 }}>{m.v}</div>
            <div style={{ color: '#9aa', marginTop: 4 }}>{m.k}</div>
          </div>
        ))}
      </motion.section>

      {/* How it works */}
      <motion.section
        style={{ maxWidth: 980, margin: '36px auto 0', borderTop: '1px solid #222', paddingTop: 24 }}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-10% 0px' }}
        variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.45 } } }}
      >
        <h2>How it works</h2>
        <div style={{ display: 'grid', gap: 12 }}>
          {[
            { t: 'Observe', d: 'Record your actual work—navigate, input, click—no extra steps.' },
            { t: 'Rule', d: 'Apex suggests steps. Edit JSON, preview the flow, save.' },
            { t: 'Run', d: 'Execute reliably. Iterate and scale what works.' },
          ].map((s, i) => (
            <div key={i} style={{ border: '1px solid #222', background: '#0b0b0b', borderRadius: 12, padding: 16 }}>
              <div style={{ fontWeight: 700 }}>{i + 1}. {s.t}</div>
              <div style={{ color: '#ccc', marginTop: 6 }}>{s.d}</div>
            </div>
          ))}
        </div>
      </motion.section>

      {/* Latest from blog (existing slice) */}
      <motion.section
        style={{ maxWidth: 980, margin: '36px auto 0', borderTop: '1px solid #222', paddingTop: 24 }}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-10% 0px' }}
        variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.45, delay: 0.05 } } }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
          <h2 style={{ margin: 0 }}>Latest from the blog</h2>
          <Link href="/blog" style={{ color: '#8ab4ff', textDecoration: 'none' }}>View all →</Link>
        </div>
        <div style={{ marginTop: 16, display: 'grid', gap: 12 }}>
          {posts?.length ? posts.map(p => (
            <Link key={p.slug} href={`/blog/${p.slug}`} style={{ color: '#fff', textDecoration: 'none' }}>
              <div style={{ border: '1px solid #222', background: '#0b0b0b', borderRadius: 12, padding: 16, transition: 'border-color .2s ease' }}
                   onMouseEnter={e => (e.currentTarget.style.borderColor = '#2a2a2a')}
                   onMouseLeave={e => (e.currentTarget.style.borderColor = '#222')}>
                <div style={{ fontWeight: 700 }}>{p.title}</div>
                <div style={{ color: '#9aa', fontSize: 12, marginTop: 4 }}>{p.date || ''}</div>
                <div style={{ color: '#ccc', marginTop: 6 }}>{p.excerpt}</div>
              </div>
            </Link>
          )) : (
            <div style={{ color: '#aaa' }}>No posts yet.</div>
          )}
        </div>
      </motion.section>
    </main>
  );
}