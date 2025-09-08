// pages/blog/index.tsx
import fs from 'fs';
import path from 'path';
import Link from 'next/link';

export async function getStaticProps() {
  const postsDir = path.join(process.cwd(), 'posts');
  const slugs = fs.existsSync(postsDir) ? fs.readdirSync(postsDir).filter(f => f.endsWith('.md')).map(f => f.replace(/\.md$/, '')) : [];
  return { props: { slugs } };
}

export default function Blog({ slugs }: { slugs: string[] }) {
  return (
    <main style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff', padding: '40px 24px' }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <h1>Blog</h1>
        {slugs.length === 0 ? (
          <div style={{ color: '#aaa' }}>No posts yet.</div>
        ) : (
          <ul>
            {slugs.map(s => (
              <li key={s}>
                <Link href={`/blog/${s}`}>{s}</Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
