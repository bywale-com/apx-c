// pages/blog/[slug].tsx
import fs from 'fs';
import path from 'path';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export async function getStaticPaths() {
  const postsDir = path.join(process.cwd(), 'posts');
  const slugs = fs.existsSync(postsDir) ? fs.readdirSync(postsDir).filter(f => f.endsWith('.md')).map(f => f.replace(/\.md$/, '')) : [];
  return { paths: slugs.map(s => ({ params: { slug: s } })), fallback: false };
}

export async function getStaticProps({ params }: { params: { slug: string } }) {
  const file = path.join(process.cwd(), 'posts', `${params.slug}.md`);
  const content = fs.readFileSync(file, 'utf8');
  return { props: { content, slug: params.slug } };
}

export default function Post({ content, slug }: { content: string; slug: string }) {
  return (
    <main style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff', padding: '40px 24px' }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <h1 style={{ marginTop: 0 }}>{slug}</h1>
        <div style={{ color: '#ddd' }}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        </div>
      </div>
    </main>
  );
}
