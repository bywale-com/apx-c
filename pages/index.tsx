// pages/index.tsx
import Link from 'next/link';
import { motion } from 'framer-motion';
import fs from 'fs';
import path from 'path';
import GlobeBackdrop from '../components/GlobeBackdrop';
import Tile from '../components/Tile';

type Post = { slug: string; title: string; excerpt: string; date?: string };

export async function getStaticProps() {
  const postsDir = path.join(process.cwd(), 'posts');
  const slugs = fs.existsSync(postsDir) ? fs.readdirSync(postsDir).filter(f => f.endsWith('.md')) : [];
  const posts: Post[] = slugs
    .map((file) => {
      const slug = file.replace(/\.md$/, '');
      const raw = fs.readFileSync(path.join(postsDir, file), 'utf8');
      const firstLine = raw.split('\n').find(l => l.trim().startsWith('#')) || '';
      const title = firstLine.replace(/^#\s*/, '').trim() || slug;
      const body = raw.replace(firstLine, '').trim();
      const excerpt =
        body.split('\n').filter(Boolean).join(' ').slice(0, 160) + (body.length > 160 ? '…' : '');
      const date = raw.match(/^date:\s*(.+)$/m)?.[1];
      return { slug, title, excerpt, date };
    })
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    .slice(0, 3);

  return { props: { posts } };
}

export default function Landing({ posts }: { posts: Post[] }) {
  return (
    <main style={{ minHeight: '100vh', position: 'relative', overflow: 'hidden' }}>
      <GlobeBackdrop />

      {/* header bar */}
      <header
        style={{
          position: 'relative',
          zIndex: 10,
          height: 56,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 999,
              border: '1px solid var(--border)',
              background: 'var(--panel)',
              display: 'grid',
              placeItems: 'center',
              color: 'var(--accent-cyan)',
            }}
          >
            ◎
          </div>
          <span
            style={{
              padding: '4px 8px',
              border: '1px solid var(--border)',
              borderRadius: 999,
              background: 'var(--panel)',
              fontSize: 12,
              letterSpacing: 0.6,
              color: 'var(--ink-mid)',
            }}
          >
            EN
          </span>
        </div>
        <div style={{ fontWeight: 700, letterSpacing: 1 }}>WELCOME</div>
        <nav style={{ display: 'flex', gap: 8 }}>
          <Link
            href="/login"
            style={{
              padding: '8px 12px',
              border: '1px solid var(--border)',
              borderRadius: 10,
              background: 'var(--panel)',
              color: 'var(--ink-high)',
              textDecoration: 'none',
              backdropFilter: 'blur(10px)',
            }}
          >
            Login
          </Link>
        </nav>
      </header>

      {/* cockpit grid */}
      <section
        style={{
          position: 'relative',
          zIndex: 10,
          margin: '4rem auto 0',
          maxWidth: 1040,
          padding: '0 20px',
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0, transition: { duration: 0.45 } }}
        >
          <h1 style={{ margin: '0 0 8px' }}>Apex</h1>
          <p style={{ margin: 0, color: 'var(--ink-mid)' }}>
            Automate what you repeat. Become the operator every org wants.
          </p>
          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
            <Link
              href="/product"
              style={{
                fontWeight: 800,
                padding: '10px 16px',
                borderRadius: 10,
                background: '#fff',
                color: '#000',
                textDecoration: 'none',
                display: 'inline-block',
              }}
            >
              Get started
            </Link>
            <Link
              href="/blog"
              style={{
                padding: '10px 16px',
                borderRadius: 10,
                border: '1px solid var(--border)',
                background: 'var(--panel)',
                color: 'var(--ink-high)',
                textDecoration: 'none',
                display: 'inline-block',
                backdropFilter: 'blur(10px)',
              }}
            >
              Blog
            </Link>
          </div>
        </motion.div>

        <div
          style={{
            display: 'grid',
            gap: 16,
            gridTemplateColumns: 'repeat(4, minmax(0,1fr))',
            marginTop: 24,
          }}
        >
          <Tile title="Observe" subtitle="Map work" href="/observe" />
          <Tile title="Orchestrate" subtitle="Automate runs" href="/orchestrate" />
          <Tile title="Operator" subtitle="Fractional ops" href="/operator" />
          <Tile title="Security" subtitle="Least-privilege" href="/security" />
          <Tile title="Client Portal" subtitle="Single cockpit" href="/app" />
          <Tile title="Docs" subtitle="Guides & API" href="/docs" />
          <Tile title="Track" subtitle="Runs & logs" href="/runs" />
          <Tile title="Support" subtitle="We’ll help" href="/support" />
        </div>

        {/* metrics */}
        <motion.div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3,minmax(0,1fr))',
            gap: 12,
            marginTop: 28,
          }}
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          {[
            { k: 'Episodes captured', v: '12,480+' },
            { k: 'Rules created', v: '2,310+' },
            { k: 'Minutes saved', v: '180k+' },
          ].map((m, i) => (
            <div
              key={i}
              style={{
                border: '1px solid var(--border)',
                background: 'var(--panel)',
                borderRadius: 12,
                padding: 16,
                backdropFilter: 'blur(10px)',
              }}
            >
              <div style={{ fontSize: 28, fontWeight: 800 }}>{m.v}</div>
              <div style={{ color: 'var(--ink-mid)', marginTop: 4 }}>{m.k}</div>
            </div>
          ))}
        </motion.div>

        {/* blog preview */}
        <motion.section
          style={{ marginTop: 32, borderTop: '1px solid var(--border)', paddingTop: 20 }}
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              gap: 12,
            }}
          >
            <h2 style={{ margin: 0 }}>Latest from the blog</h2>
            <Link href="/blog" style={{ color: 'var(--accent-blue)', textDecoration: 'none' }}>
              View all →
            </Link>
          </div>
          <div style={{ display: 'grid', gap: 12, marginTop: 12 }}>
            {posts?.length ? (
              posts.map((p) => (
                <Link
                  key={p.slug}
                  href={`/blog/${p.slug}`}
                  style={{ textDecoration: 'none', color: 'inherit' }}
                >
                  <div
                    style={{
                      border: '1px solid var(--border)',
                      background: 'var(--panel)',
                      borderRadius: 12,
                      padding: 16,
                      transition: 'border-color .2s ease',
                      backdropFilter: 'blur(10px)',
                    }}
                    onMouseEnter={(e) =>
                      ((e.currentTarget as HTMLDivElement).style.borderColor = '#ffffff33')
                    }
                    onMouseLeave={(e) =>
                      ((e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)')
                    }
                  >
                    <div style={{ fontWeight: 700 }}>{p.title}</div>
                    <div style={{ color: 'var(--ink-mid)', fontSize: 12, marginTop: 4 }}>
                      {p.date || ''}
                    </div>
                    <div style={{ color: 'var(--ink-high)', opacity: 0.9, marginTop: 6 }}>
                      {p.excerpt}
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <div style={{ color: 'var(--ink-mid)' }}>No posts yet.</div>
            )}
          </div>
        </motion.section>
      </section>
    </main>
  );
}

