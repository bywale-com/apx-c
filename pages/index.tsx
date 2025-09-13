// pages/index.tsx
import { motion } from 'framer-motion';
import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import fs from 'fs';
import path from 'path';

type Post = { slug: string; title: string; excerpt: string; date?: string };

// helper grid style
const sectionGridOverlay: React.CSSProperties = {
  position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
  background:
    'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px) 0 0/ 80px 80px,' +
    'linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px) 0 0/ 80px 80px',
};


// Animated background component removed for production build

// Simple SVG icon set (stroke only)
const IconObserve = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" style={{ display: 'block', margin: '0 auto' }}>
    <circle cx="17" cy="17" r="9" fill="none" stroke="#8B1538" strokeWidth="2" />
    <line x1="23" y1="23" x2="34" y2="34" stroke="#8B1538" strokeWidth="3" strokeLinecap="round" />
  </svg>
);
const IconOrchestrate = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" style={{ display: 'block', margin: '0 auto' }}>
    <circle cx="10" cy="10" r="4" fill="#8B1538" />
    <circle cx="30" cy="10" r="4" fill="#FF9E4A" />
    <circle cx="20" cy="30" r="4" fill="#5BE1FF" />
    <line x1="10" y1="10" x2="30" y2="10" stroke="#8B1538" strokeWidth="2" />
    <line x1="10" y1="10" x2="20" y2="30" stroke="#8B1538" strokeWidth="2" />
    <line x1="30" y1="10" x2="20" y2="30" stroke="#8B1538" strokeWidth="2" />
  </svg>
);
const IconOperate = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" style={{ display: 'block', margin: '0 auto' }}>
    <circle cx="20" cy="20" r="10" fill="none" stroke="#FF6464" strokeWidth="2" />
    <path d="M20 11 L22 16 L27 17 L23.5 20 L24.5 25 L20 22.5 L15.5 25 L16.5 20 L13 17 L18 16 Z" fill="#FF6464" opacity="0.8" />
  </svg>
);

// Blueprint Ops Grid - animated schematic for hero
const BlueprintOpsGrid = ({ mouse }: { mouse: { x: number; y: number } }) => {
  const gridColor = 'rgba(207,227,255,0.35)'; // Light Blueprint
  const lineColor = '#CFE3FF';
  const accent = '#5BE1FF';
  const textColor = 'rgba(255,255,255,0.85)';

  const [bursts, setBursts] = useState<{ id: string; x: number; y: number }[]>([]);
  const [clicks, setClicks] = useState<{ id: string; nodeId: string }[]>([]);

  const nodes = [
    // Observe cluster
    { id: 'A', x: 100, y: 180 },
    { id: 'A1', x: 60, y: 120 },
    { id: 'A2', x: 60, y: 240 },
    { id: 'A3', x: 140, y: 120 },
    { id: 'A4', x: 140, y: 240 },
    { id: 'A5', x: 100, y: 60 },
    // Orchestrate cluster
    { id: 'B', x: 380, y: 160 },
    { id: 'B1', x: 320, y: 80 },
    { id: 'B2', x: 320, y: 240 },
    { id: 'B3', x: 440, y: 80 },
    { id: 'B4', x: 440, y: 240 },
    { id: 'B5', x: 380, y: 20 },
    // Operator cluster
    { id: 'C', x: 700, y: 160 },
    { id: 'C1', x: 640, y: 100 },
    { id: 'C2', x: 640, y: 220 },
    { id: 'C3', x: 760, y: 100 },
    { id: 'C4', x: 760, y: 220 },
    { id: 'C5', x: 700, y: 40 },
  ];
  const edges = [
    // Observe to Orchestrate
    ['A', 'B'], ['A1', 'B1'], ['A2', 'B2'], ['A3', 'B3'], ['A4', 'B4'], ['A5', 'B5'],
    // Intra-cluster braces
    ['B1', 'B'], ['B2', 'B'], ['B3', 'B'], ['B4', 'B'], ['B5', 'B'],
    // Orchestrate to Operator
    ['B', 'C'], ['B1', 'C1'], ['B2', 'C2'], ['B3', 'C3'], ['B4', 'C4'], ['B5', 'C5'],
    // Operator cluster to core
    ['C1', 'C'], ['C2', 'C'], ['C3', 'C'], ['C4', 'C'], ['C5', 'C']
  ];

  const find = (id: string) => nodes.find(n => n.id === id)!;

  const vw = typeof window !== 'undefined' ? window.innerWidth : 0;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 0;
  const offsetX = vw ? (mouse.x - vw / 2) * 0.025 : 0;
  const offsetY = vh ? (mouse.y - vh / 2) * 0.02 : 0;

  const handleNodeClick = (nId: string) => {
    const n = find(nId);
    if (!n) return;
    const id = `${nId}-${Date.now()}`;
    setBursts((b) => [...b, { id, x: n.x, y: n.y }]);
    setClicks((c) => [...c, { id, nodeId: nId }]);
    setTimeout(() => setBursts((b) => b.filter((x) => x.id !== id)), 1000);
    setTimeout(() => setClicks((c) => c.filter((x) => x.id !== id)), 1800);
  };

  return (
    <motion.svg
      width={1200}
      height={520}
      viewBox="0 0 1200 520"
      style={{ pointerEvents: 'auto', filter: 'drop-shadow(0 2px 12px rgba(0,0,0,0.25))' }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
    >
      {/* Micro-pan group */}
      <motion.g
        animate={{ x: [offsetX, offsetX + 6, offsetX], y: [offsetY, offsetY - 4, offsetY] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
      >
        {/* Top blueprint gears */}
        <motion.g
          animate={{ rotate: 360 }}
          transition={{ duration: 80, repeat: Infinity, ease: 'linear' }}
          style={{ transformOrigin: '200px 40px' }}
        >
          <circle cx={200} cy={40} r={26} fill="transparent" stroke={lineColor} strokeWidth={2} />
          {Array.from({ length: 12 }).map((_, i) => (
            <line
              key={`g1-${i}`}
              x1={200}
              y1={40}
              x2={200 + 26 * Math.cos((i * 30 * Math.PI) / 180)}
              y2={40 + 26 * Math.sin((i * 30 * Math.PI) / 180)}
              stroke={lineColor}
              strokeWidth={1}
            />
          ))}
        </motion.g>

        <motion.g
          animate={{ rotate: -360 }}
          transition={{ duration: 110, repeat: Infinity, ease: 'linear' }}
          style={{ transformOrigin: '270px 60px' }}
        >
          <circle cx={270} cy={60} r={18} fill="transparent" stroke={lineColor} strokeWidth={2} />
          {Array.from({ length: 10 }).map((_, i) => (
            <line
              key={`g2-${i}`}
              x1={270}
              y1={60}
              x2={270 + 18 * Math.cos((i * 36 * Math.PI) / 180)}
              y2={60 + 18 * Math.sin((i * 36 * Math.PI) / 180)}
              stroke={lineColor}
              strokeWidth={1}
            />
          ))}
        </motion.g>
        {/* Grid */}
        {Array.from({ length: 25 }).map((_, i) => (
          <line key={`v-${i}`} x1={i * 50} y1={0} x2={i * 50} y2={520} stroke={gridColor} strokeWidth={1} />
        ))}
        {Array.from({ length: 11 }).map((_, i) => (
          <line key={`h-${i}`} x1={0} y1={i * 50} x2={1200} y2={i * 50} stroke={gridColor} strokeWidth={1} />
        ))}

        {/* Cockpit perspective construction */}
        <g opacity={0.55}>
          {/* Horizon line */}
          <line x1={0} y1={130} x2={1200} y2={130} stroke={lineColor} strokeWidth={1} />
          {/* Vanishing guide lines */}
          {Array.from({ length: 9 }).map((_, i) => (
            <line key={`vp-left-${i}`} x1={0} y1={130 + i * 18} x2={600} y2={60} stroke={gridColor} strokeWidth={1} />
          ))}
          {Array.from({ length: 9 }).map((_, i) => (
            <line key={`vp-right-${i}`} x1={1200} y1={130 + i * 18} x2={600} y2={60} stroke={gridColor} strokeWidth={1} />
          ))}
          {/* Cockpit frame arcs */}
          <path d="M120 200 C 300 80, 900 80, 1080 200" fill="transparent" stroke={lineColor} strokeWidth={2} />
          <path d="M180 230 C 360 120, 840 120, 1020 230" fill="transparent" stroke={gridColor} strokeWidth={1} />
          {/* Tick marks */}
          {Array.from({ length: 14 }).map((_, i) => (
            <line key={`tick-${i}`} x1={220 + i * 60} y1={210} x2={220 + i * 60} y2={214} stroke={lineColor} strokeWidth={1} />
          ))}
        </g>

        {/* Lane labels */}
        <text x={80} y={36} fill={textColor} fontSize={12} letterSpacing={2}>OBSERVE</text>
        <text x={380} y={36} fill={textColor} fontSize={12} letterSpacing={2}>ORCHESTRATE</text>
        <text x={700} y={36} fill={textColor} fontSize={12} letterSpacing={2}>OPERATOR</text>

        {/* Edges with draw-in */}
        {edges.map(([s, t], idx) => {
          const a = find(s); const b = find(t);
          const length = Math.hypot(b.x - a.x, b.y - a.y);
          return (
            <motion.line
              key={`e-${s}-${t}`}
              x1={a.x} y1={a.y} x2={b.x} y2={b.y}
              stroke={lineColor}
              strokeWidth={2}
              strokeLinecap="round"
              strokeDasharray={length}
              initial={{ strokeDashoffset: length, opacity: 0.0 }}
              animate={{ strokeDashoffset: [length, 0], opacity: [0.0, 1] }}
              transition={{ duration: 1.2, delay: 0.15 * idx, ease: 'easeInOut' }}
            />
          );
        })}

        {/* Flow pulses traveling from Orchestrate to Operator */}
        {['B:C', 'B1:C1', 'B2:C2', 'B3:C3', 'B4:C4']
          .map((pair) => pair.split(':') as [string, string])
          .map(([s, t]) => ({ from: find(s), to: find(t) }))
          .filter((seg) => seg.from && seg.to)
          .map((seg, i) => (
            <motion.circle
              key={`pulse-${i}`}
              r={4}
              fill={accent}
              initial={{ cx: seg.from!.x, cy: seg.from!.y, opacity: 0 }}
              animate={{
                cx: [seg.from!.x, seg.to!.x],
                cy: [seg.from!.y, seg.to!.y],
                opacity: [0, 1, 0]
              }}
              transition={{ duration: 2.4, delay: 0.4 * i, repeat: Infinity, ease: 'easeInOut' }}
            />
          ))}

        {/* Nodes with soft pulse */}
        {nodes.map((n, i) => (
          <g key={n.id} onClick={() => handleNodeClick(n.id)} style={{ cursor: 'pointer' }}>
            <motion.circle
              cx={n.x}
              cy={n.y}
              r={10}
              fill={'rgba(207,227,255,0.18)'}
              stroke={lineColor}
              strokeWidth={2}
              initial={{ scale: 1, opacity: 0.9 }}
              animate={{ scale: [1, 1.12, 1], opacity: [0.9, 1, 0.9] }}
              transition={{ duration: 2.8, delay: i * 0.12, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.circle
              cx={n.x}
              cy={n.y}
              r={24}
              fill="transparent"
              stroke={accent}
              strokeOpacity={0.35}
              strokeWidth={1}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: [0.9, 1.15, 0.9], opacity: [0, 0.6, 0] }}
              transition={{ duration: 3.4, delay: i * 0.18, repeat: Infinity, ease: 'easeOut' }}
            />
          </g>
        ))}

        {/* Click bursts */}
        {bursts.map((b) => (
          <motion.circle
            key={`burst-${b.id}`}
            cx={b.x}
            cy={b.y}
            r={0}
            fill="transparent"
            stroke={accent}
            strokeOpacity={0.5}
            strokeWidth={2}
            animate={{ r: 80, opacity: [0.6, 0] }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        ))}

        {/* Click pulses along adjacent edges */}
        {clicks.flatMap((c) => {
          const from = find(c.nodeId);
          const adj = edges.filter(([s, t]) => s === c.nodeId || t === c.nodeId).map(([s, t]) => ({
            start: s === c.nodeId ? find(s) : find(t),
            end: s === c.nodeId ? find(t) : find(s),
          }));
          return adj.map((seg, i) => (
            <motion.circle
              key={`cp-${c.id}-${i}`}
              r={4}
              fill={accent}
              initial={{ cx: seg.start.x, cy: seg.start.y, opacity: 0 }}
              animate={{ cx: [seg.start.x, seg.end.x], cy: [seg.start.y, seg.end.y], opacity: [0, 1, 0] }}
              transition={{ duration: 1.6, ease: 'easeInOut' }}
            />
          ));
        })}
      </motion.g>
    </motion.svg>
  );
};

// VectorField - straight-arrow field pointing toward cursor when proximate (Apex colors)
const VectorField = ({ mouse }: { mouse: { x: number; y: number } }) => {
  const palette = {
    base: '#120b1f',       // deep purple base
    light: '#CFE3FF',
    white: '#FFFFFF',      // nearest - brightest cosmic light
    yellow: '#FFE066',     // near - warm cosmic light
    orange: '#FF9E4A',     // mid - cosmic warmth
    redOrange: '#FF6B35',  // far-mid - cosmic fire
    red: '#FF4444'         // farthest - deep cosmic ember
  };

  const [size, setSize] = useState<{ w: number; h: number }>({ w: 1200, h: 600 });
  useEffect(() => {
    const update = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  type Arrow = { sx: number; sy: number; ex: number; ey: number; c: string; opacity: number };

  const arrows = useMemo<Arrow[]>(() => {
    const { w, h } = size;
    const cols = Math.max(16, Math.floor(w / 70));
    const rows = Math.max(10, Math.floor(h / 70));
    const spacingX = w / cols;
    const spacingY = h / rows;
    const mx = mouse.x; const my = mouse.y;

    const out: Arrow[] = [];
    for (let r = 1; r < rows; r++) {
      for (let c = 1; c < cols; c++) {
        const sx = c * spacingX;
        const sy = r * spacingY;
        const dx = mx - sx; const dy = my - sy;
        const dist = Math.hypot(dx, dy) || 1;
        const pull = Math.exp(-(dist * dist) / (2 * 260 * 260)); // proximity weight (0..1)
        const len = 28 * pull + 6; // min length 6
        const nx = dx / dist; const ny = dy / dist; // direction to cursor
        const ex = sx + nx * len;
        const ey = sy + ny * len;
        // Color mapping by proximity bands: cosmic light spectrum (white->yellow->orange->redOrange->red)
        let color = palette.red;
        if (pull > 0.6) color = palette.white; 
        else if (pull > 0.45) color = palette.yellow; 
        else if (pull > 0.3) color = palette.orange; 
        else if (pull > 0.15) color = palette.redOrange; 
        // else red (farthest)
        const opacity = Math.max(0.22, Math.min(1, pull * 2));
        out.push({ sx, sy, ex, ey, c: color, opacity });
      }
    }
    return out;
  }, [mouse.x, mouse.y, size.w, size.h]);

  const renderHead = (ax: Arrow, i: number) => {
    const angle = Math.atan2(ax.ey - ax.sy, ax.ex - ax.sx);
    const headLen = 8;
    const a1 = angle + Math.PI - 0.6;
    const a2 = angle + Math.PI + 0.6;
    const hx1x = ax.ex + Math.cos(a1) * headLen;
    const hx1y = ax.ey + Math.sin(a1) * headLen;
    const hx2x = ax.ex + Math.cos(a2) * headLen;
    const hx2y = ax.ey + Math.sin(a2) * headLen;
    return (
      <g key={`h-${i}`}>
        <line x1={ax.ex} y1={ax.ey} x2={hx1x} y2={hx1y} stroke={ax.c} strokeWidth={1.4} strokeLinecap="round" opacity={ax.opacity} />
        <line x1={ax.ex} y1={ax.ey} x2={hx2x} y2={hx2y} stroke={ax.c} strokeWidth={1.4} strokeLinecap="round" opacity={ax.opacity} />
      </g>
    );
  };

  return (
    <svg width={size.w} height={size.h} viewBox={`0 0 ${size.w} ${size.h}`} style={{ position: 'absolute', inset: 0 }}>
      {arrows.map((a, i) => (
        <g key={`arr-${i}`}>
          <line x1={a.sx} y1={a.sy} x2={a.ex} y2={a.ey} stroke={a.c} strokeWidth={1.6} strokeLinecap="round" opacity={a.opacity} />
          {renderHead(a, i)}
        </g>
      ))}
    </svg>
  );
};

// CursorOrb - small 3D sphere that follows the cursor (Apex gradient + specular)
const CursorOrb = ({ x, y }: { x: number; y: number }) => {
  const size = 22;
  return (
    <svg width={size * 4} height={size * 4} style={{ position: 'fixed', left: x - size * 2, top: y - size * 2, pointerEvents: 'none', zIndex: 2 }}>
      <defs>
        <radialGradient id="orbFill" cx="40%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#5BE1FF" />
          <stop offset="50%" stopColor="#8B1538" />
          <stop offset="100%" stopColor="#120b1f" />
        </radialGradient>
        <radialGradient id="orbSpec" cx="35%" cy="30%" r="25%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.9)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
      </defs>
      <g>
        <circle cx={size * 2} cy={size * 2} r={size} fill="url(#orbFill)" opacity={0.95} />
        <circle cx={size * 1.6} cy={size * 1.6} r={size * 0.35} fill="url(#orbSpec)" />
        <circle cx={size * 2} cy={size * 2} r={size + 8} fill="none" stroke="#CFE3FF" strokeOpacity={0.25} />
      </g>
    </svg>
  );
};

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

export default function Landing() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Map vertical wheel to horizontal scroll within the container
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      // If vertical intent is stronger, translate to horizontal
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        el.scrollBy({ left: e.deltaY, behavior: 'smooth' });
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const goToPanel = (direction: 'prev' | 'next') => {
    const el = containerRef.current;
    if (!el) return;
    const width = el.clientWidth;
    const currentIndex = Math.round(el.scrollLeft / width);
    const targetIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    const clampedIndex = Math.max(0, Math.min(targetIndex, Math.ceil(el.scrollWidth / width) - 1));
    const targetLeft = clampedIndex * width;
    el.scrollTo({ left: targetLeft, behavior: 'smooth' });
  };

  return (
    <>
      {/* Persistent Header */}
      <header style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        padding: '20px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(10px)',
        borderTop: '1px solid rgba(139,21,56,0.25)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #8B1538, #5BE1FF)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px',
            color: '#ffffff',
          }}>
          </div>
          <span style={{
            fontSize: '1.2rem',
            fontWeight: '300',
            color: '#ffffff',
            letterSpacing: '-0.5px',
          }}>
            Apex
          </span>
        </div>
        
        <Link href="/login" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'none',
          border: 'none',
          color: '#ffffff',
          fontSize: '0.9rem',
          fontWeight: '500',
          textTransform: 'uppercase',
          letterSpacing: '1px',
          cursor: 'pointer',
          textDecoration: 'none',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <div style={{ width: '18px', height: '2px', backgroundColor: '#ffffff' }} />
            <div style={{ width: '18px', height: '2px', backgroundColor: '#ffffff' }} />
            <div style={{ width: '18px', height: '2px', backgroundColor: '#ffffff' }} />
          </div>
          Login
        </Link>
      </header>

      <main style={{ 
        height: '100vh', 
        position: 'relative', 
        overflow: 'hidden',
        backgroundColor: '#ffffff', // White background like template
        color: '#0B0B0B', // Deep black text
      }}>
      {/* Horizontal Scroll Container */}
      <div ref={containerRef} className="hScroll" style={{
        display: 'flex',
        height: '100vh',
        overflowX: 'auto',
        overflowY: 'hidden',
        scrollSnapType: 'x mandatory',
        scrollBehavior: 'smooth',
      }}>

        {/* Hero Section - Horizontal Panel */}
        <section style={{
          minWidth: '100vw',
          height: '100vh',
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#000000',
          overflow: 'hidden',
          scrollSnapAlign: 'start',
        }}>
        {/* Vector field responsive to cursor (Apex colors) */}
        <div style={{ position: 'absolute', inset: 0, opacity: 0.9 }}>
          <VectorField mouse={mousePosition} />
        </div>

        {/* Cursor Orb */}
        <CursorOrb x={mousePosition.x} y={mousePosition.y} />

        {/* Footer */}
        <footer style={{
          position: 'relative',
          zIndex: 10,
          padding: '60px 40px',
          backgroundColor: 'rgba(11, 11, 11, 0.8)',
          backdropFilter: 'blur(10px)',
          borderTop: '1px solid rgba(139,21,56,0.25)',
        }}>
          <div style={{
            fontSize: '0.75rem',
            color: 'rgba(255,255,255,0.7)',
            lineHeight: 1.4,
            textAlign: 'left',
          }}>
            <div style={{ marginBottom: '8px', color: '#FFFFFF', fontSize: '14px' }}>
              © 2025 Apex Digital Solutions Corp. All Rights Reserved.
            </div>
            <div style={{ color: '#C7DBFF', fontSize: '13px', lineHeight: '1.6' }}>
              Apex provides workflow observation, orchestration, and operator services. 
              Apex Digital Solutions Corp. does not provide legal, financial, or employment advice, 
              and all automation recommendations are offered on a best-effort basis. 
              Clients remain responsible for final decisions regarding staffing and system usage. 
              By engaging with Apex, you agree to our&nbsp;
              <span style={{ color: '#38E1FF', cursor: 'pointer' }}>Privacy Policy</span>,&nbsp;
              <span style={{ color: '#38E1FF', cursor: 'pointer' }}>Terms of Service</span>, and&nbsp;
              <span style={{ color: '#38E1FF', cursor: 'pointer' }}>Acceptable Use Policy</span>.
            </div>
          </div>
        </footer>


        {/* Main Content - Bottom Left */}
        <div style={{
          position: 'absolute',
          bottom: '140px',
          left: '60px',
          right: '60px',
          zIndex: 2,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
        }}>
          {/* Left Text Block */}
          <motion.div
            style={{
              maxWidth: '500px',
            }}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: 'easeOut' }}
          >
            <h1
            style={{
                fontSize: '3rem',
                fontWeight: '300',
                marginBottom: '20px',
                color: '#FFFFFF',
                lineHeight: 1.1,
                letterSpacing: '-1px',
              }}
            >
              A light bridge between professionals and automation
            </h1>
          </motion.div>
        </div>


        {/* Pagination Dots */}
        <div style={{
          position: 'absolute',
          bottom: '40px',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: '12px',
          zIndex: 10,
        }}>
          <div style={{
            width: '24px',
            height: '2px',
            backgroundColor: '#ffffff',
            borderRadius: '1px',
          }} />
          <div style={{
            width: '12px',
            height: '2px',
            backgroundColor: 'rgba(255,255,255,0.4)',
            borderRadius: '1px',
          }} />
          <div style={{
            width: '12px',
            height: '2px',
            backgroundColor: 'rgba(255,255,255,0.4)',
            borderRadius: '1px',
          }} />
          <div style={{
            width: '12px',
            height: '2px',
            backgroundColor: 'rgba(255,255,255,0.4)',
            borderRadius: '1px',
          }} />
        </div>

      </section>

      {/* New Hero Section - 3D Wireframe */}
      <section style={{
        minWidth: '100vw',
        height: '100vh',
        position: 'relative',
        zIndex: 1,
        backgroundColor: '#0b0b0b',
        color: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        scrollSnapAlign: 'start',
        overflow: 'hidden',
      }}>
        {/* Grid Background */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px) 0 0/ 80px 80px, linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px) 0 0/ 80px 80px',
          opacity: 0.3,
        }} />

        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          width: '100%',
          padding: '0 60px',
          position: 'relative',
          zIndex: 1,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '80px',
          alignItems: 'center',
        }}>
          {/* Left Side - 3D Wireframe Graphic */}
          <motion.div
            style={{
              position: 'relative',
              height: '500px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 1 }}
            viewport={{ once: true }}
          >
            <svg width="400" height="400" viewBox="0 0 400 400" style={{ position: 'relative' }}>
              {/* Background wireframe plane */}
              <g opacity="0.3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <line
                    key={`bg-h-${i}`}
                    x1="0"
                    y1={i * 50}
                    x2="400"
                    y2={i * 50}
                    stroke="#ffffff"
                    strokeWidth="1"
                  />
                ))}
                {Array.from({ length: 8 }).map((_, i) => (
                  <line
                    key={`bg-v-${i}`}
                    x1={i * 50}
                    y1="0"
                    x2={i * 50}
                    y2="400"
                    stroke="#ffffff"
                    strokeWidth="1"
                  />
                ))}
              </g>

              {/* Main 3D wireframe surface */}
              <g opacity="0.8">
                {/* Horizontal lines with wave pattern */}
                {Array.from({ length: 8 }).map((_, i) => {
                  const y = i * 50;
                  const amplitude = 30 + Math.sin(i * 0.5) * 20;
                  const points = Array.from({ length: 9 }).map((_, j) => {
                    const x = j * 50;
                    const waveY = y + Math.sin(x * 0.02 + i * 0.3) * amplitude;
                    return `${x},${waveY}`;
                  }).join(' ');
                  return (
                    <polyline
                      key={`main-h-${i}`}
                      points={points}
                      fill="none"
                      stroke="#ffffff"
                      strokeWidth="1.5"
                    />
                  );
                })}

                {/* Vertical lines */}
                {Array.from({ length: 9 }).map((_, i) => {
                  const x = i * 50;
                  const points = Array.from({ length: 8 }).map((_, j) => {
                    const y = j * 50;
                    const amplitude = 30 + Math.sin(j * 0.5) * 20;
                    const waveY = y + Math.sin(x * 0.02 + j * 0.3) * amplitude;
                    return `${x},${waveY}`;
                  }).join(' ');
                  return (
                    <polyline
                      key={`main-v-${i}`}
                      points={points}
                      fill="none"
                      stroke="#ffffff"
                      strokeWidth="1.5"
                    />
                  );
                })}
              </g>
            </svg>
          </motion.div>

          {/* Right Side - Text Content */}
          <motion.div
            style={{
              paddingLeft: '40px',
            }}
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 1, delay: 0.3 }}
            viewport={{ once: true }}
          >
            <h2 style={{
              fontSize: '2.5rem',
              fontWeight: '300',
              color: '#ffffff',
              marginBottom: '30px',
              letterSpacing: '-1px',
            }}>
              A Closer Look at Apex
            </h2>

            <p style={{
              fontSize: '1.1rem',
              lineHeight: 1.6,
              color: 'rgba(255,255,255,0.8)',
              marginBottom: '40px',
            }}>
              What if the job you&apos;re about to hire for is already 60% automatable?
              Apex reveals the truth hidden in your workflows. We don&apos;t start with résumés — we start with reality: observing how work actually happens, showing what can run itself, and proving it with live automations in just days.
            </p>
            
            <p style={{
              fontSize: '1.1rem',
              lineHeight: 1.6,
              color: 'rgba(255,255,255,0.8)',
              marginBottom: '40px',
            }}>
              Instead of gambling on headcount, Apex gives you clarity: what&apos;s automatable, what&apos;s not, and what a fractional operator could handle for a fraction of the cost.
            </p>

            <motion.a
              href="#learn-more"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                color: '#8B1538',
                textDecoration: 'none',
                fontSize: '1.1rem',
                fontWeight: '500',
                padding: '12px 0',
              }}
              whileHover={{ opacity: 0.7 }}
            >
              Learn More
              <span style={{ fontSize: '1.2rem' }}>→</span>
            </motion.a>
          </motion.div>
        </div>
      </section>

        {/* How It Works Section - New Layout */}
        <section style={{
          minWidth: '100vw',
          height: '100vh',
          position: 'relative',
          zIndex: 1,
          padding: '120px 60px 120px 60px', // Reduced top padding for better fit
          backgroundColor: '#0b0b0b',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          scrollSnapAlign: 'start',
        }}>
        <div style={sectionGridOverlay} />
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          position: 'relative',
          zIndex: 1,
          width: '100%',
        }}>
          {/* Header Section */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '80px',
            marginBottom: '80px',
            alignItems: 'start',
          }}>
            {/* Left - Title */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <h2 style={{
                fontSize: '3.5rem',
                fontWeight: '300',
                color: '#ffffff',
                marginBottom: '0',
                letterSpacing: '-2px',
                lineHeight: 1.1,
              }}>
                How It Works
              </h2>
            </motion.div>

            {/* Right - Intro Text */}
            <motion.div
              style={{
                paddingTop: '20px',
              }}
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              viewport={{ once: true }}
            >
              <p style={{
                fontSize: '1.2rem',
                color: 'rgba(255,255,255,0.8)',
                fontWeight: '300',
                lineHeight: 1.6,
                margin: 0,
              }}>
                Apex turns a job description into a live workflow system. Instead of hiring blind, we show you what can run itself, prove it with automations, and cover what&apos;s left with an Apex Operator.
              </p>
            </motion.div>
          </div>

          {/* Workflow Motion Graphic */}
          <motion.div
            style={{
              height: '350px',
              marginBottom: '60px',
              position: 'relative',
              overflow: 'hidden',
              borderRadius: '16px',
              backgroundColor: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.4 }}
            viewport={{ once: true }}
          >
            <svg width="100%" height="100%" viewBox="0 0 1200 400" style={{ position: 'absolute', inset: 0 }}>
              {/* Base Grid */}
              <g opacity="0.15" stroke="#FFFFFF" strokeWidth="1">
                {Array.from({ length: 15 }).map((_, i) => (
                  <line key={`h-${i}`} x1="0" y1={i*26} x2="1200" y2={i*26}/>
                ))}
                {Array.from({ length: 20 }).map((_, i) => (
                  <line key={`v-${i}`} x1={i*60} y1="0" x2={i*60} y2="400"/>
                ))}
              </g>

              {/* OBSERVE Phase - Discovery/Mapping */}
              <g opacity="0.8">
                {/* Nodes appearing and connecting */}
                {[
                  { x: 150, y: 100, id: 'node1', automatable: true },
                  { x: 300, y: 150, id: 'node2', automatable: true },
                  { x: 450, y: 80, id: 'node3', automatable: false },
                  { x: 600, y: 200, id: 'node4', automatable: true },
                  { x: 750, y: 120, id: 'node5', automatable: true },
                  { x: 900, y: 180, id: 'node6', automatable: false },
                ].map((node, i) => (
                  <g key={node.id}>
                    {/* Node */}
                    <motion.circle
                      cx={node.x} cy={node.y} r="8"
                      fill={node.automatable ? "#38E1FF" : "#FF9E4A"}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.6, delay: i * 0.3 }}
                    />
                    {/* Glow for automatable nodes */}
                    {node.automatable && (
                      <motion.circle
                        cx={node.x} cy={node.y} r="12"
                        fill="none"
                        stroke="#38E1FF"
                        strokeWidth="2"
                        opacity="0.6"
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.6, delay: i * 0.3 }}
                      />
                    )}
                    {/* Pulsing animation for automatable nodes */}
                    {node.automatable && (
                      <motion.circle
                        cx={node.x} cy={node.y} r="16"
                        fill="none"
                        stroke="#38E1FF"
                        strokeWidth="1"
                        opacity="0.3"
                        animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0, 0.3] }}
                        transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
                      />
                    )}
                  </g>
                ))}

                {/* Connecting lines appearing */}
                {[
                  { from: { x: 150, y: 100 }, to: { x: 300, y: 150 } },
                  { from: { x: 300, y: 150 }, to: { x: 450, y: 80 } },
                  { from: { x: 450, y: 80 }, to: { x: 600, y: 200 } },
                  { from: { x: 600, y: 200 }, to: { x: 750, y: 120 } },
                  { from: { x: 750, y: 120 }, to: { x: 900, y: 180 } },
                ].map((line, i) => (
                  <motion.line
                    key={`line-${i}`}
                    x1={line.from.x} y1={line.from.y}
                    x2={line.to.x} y2={line.to.y}
                    stroke="#FFFFFF"
                    strokeWidth="2"
                    opacity="0.4"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 1, delay: i * 0.2 + 1 }}
                  />
                ))}
              </g>

              {/* ORCHESTRATE Phase - Automation Flow */}
              <g opacity="0.9">
                {/* Flowing signals */}
                {[
                  { start: { x: 150, y: 100 }, end: { x: 300, y: 150 }, color: "#38E1FF" },
                  { start: { x: 300, y: 150 }, end: { x: 600, y: 200 }, color: "#38E1FF" },
                  { start: { x: 600, y: 200 }, end: { x: 750, y: 120 }, color: "#38E1FF" },
                ].map((signal, i) => (
                  <motion.g key={`signal-${i}`}>
                    {/* Animated pulse along the line */}
                    <motion.circle
                      r="4"
                      fill={signal.color}
                      animate={{
                        cx: [signal.start.x, signal.end.x],
                        cy: [signal.start.y, signal.end.y],
                      }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: 'easeInOut',
                        delay: i * 0.5 + 3,
                      }}
                    />
                    {/* Flowing line */}
                    <motion.line
                      x1={signal.start.x} y1={signal.start.y}
                      x2={signal.end.x} y2={signal.end.y}
                      stroke={signal.color}
                      strokeWidth="3"
                      opacity="0.6"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: [0, 0.6, 0] }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: 'easeInOut',
                        delay: i * 0.5 + 3,
                      }}
                    />
                  </motion.g>
                ))}

                {/* Wiring lines snapping into place */}
                {[
                  { x1: 150, y1: 100, x2: 300, y2: 150 },
                  { x1: 300, y1: 150, x2: 600, y2: 200 },
                  { x1: 600, y1: 200, x2: 750, y2: 120 },
                ].map((wire, i) => (
                  <motion.line
                    key={`wire-${i}`}
                    x1={wire.x1} y1={wire.y1}
                    x2={wire.x2} y2={wire.y2}
                    stroke="#FF9E4A"
                    strokeWidth="2"
                    strokeDasharray="5,5"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ duration: 1.5, delay: i * 0.3 + 4 }}
                  />
                ))}
              </g>

              {/* OPERATE Phase - Human + Automation */}
              <g opacity="1">
                {/* Human operator icon */}
                <motion.g
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.8, delay: 6 }}
                >
                  <circle cx="1050" cy="200" r="20" fill="#FF6B6B" opacity="0.8"/>
                  <circle cx="1050" cy="200" r="30" fill="none" stroke="#FF6B6B" strokeWidth="2" opacity="0.4"/>
                  <text x="1050" y="205" textAnchor="middle" fill="#FFFFFF" fontSize="16" fontWeight="bold">👤</text>
                </motion.g>

                {/* Continuous flowing animation */}
                <motion.g
                  animate={{ opacity: [0.6, 1, 0.6] }}
                  transition={{ duration: 4, repeat: Infinity, delay: 7 }}
                >
                  {/* Flowing arrows */}
                  {Array.from({ length: 3 }).map((_, i) => (
                    <motion.path
                      key={`flow-${i}`}
                      d={`M${200 + i * 200} ${250} L${250 + i * 200} ${250}`}
                      stroke="#38E1FF"
                      strokeWidth="3"
                      fill="none"
                      markerEnd="url(#arrowhead)"
                      animate={{ pathLength: [0, 1, 0] }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: 'easeInOut',
                        delay: i * 0.3 + 7,
                      }}
                    />
                  ))}
                </motion.g>

                {/* Stable rhythm indicators */}
                {[
                  { x: 200, y: 300 },
                  { x: 400, y: 300 },
                  { x: 600, y: 300 },
                  { x: 800, y: 300 },
                ].map((indicator, i) => (
                  <motion.circle
                    key={`rhythm-${i}`}
                    cx={indicator.x} cy={indicator.y} r="6"
                    fill="#8B1538"
                    animate={{ scale: [1, 1.2, 1], opacity: [0.8, 1, 0.8] }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: 'easeInOut',
                      delay: i * 0.2 + 8,
                    }}
                  />
                ))}
              </g>

              {/* Arrow marker definition */}
              <defs>
                <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                  <polygon points="0 0, 10 3.5, 0 7" fill="#38E1FF"/>
                </marker>
              </defs>
            </svg>

            {/* Phase Labels */}
            <div style={{
              position: 'absolute',
              top: '20px',
              left: '20px',
              display: 'flex',
              gap: '40px',
            }}>
              {[
                { label: 'OBSERVE', color: '#38E1FF', delay: 0 },
                { label: 'ORCHESTRATE', color: '#FF9E4A', delay: 3 },
                { label: 'OPERATE', color: '#8B1538', delay: 6 },
              ].map((phase, i) => (
                <motion.div
                  key={phase.label}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '20px',
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    border: `1px solid ${phase.color}`,
                    color: phase.color,
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                  }}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: phase.delay }}
                >
                  {phase.label}
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Three Benefit Blocks */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '40px',
          }}>
            {[
              { 
                number: '01',
                title: 'OBSERVE',
                description: 'Map real work, not job descriptions. In 10 days we deliver a workflow map, the % of the role that\'s automatable, and 1–2 automations in production.'
              },
              { 
                number: '02',
                title: 'ORCHESTRATE',
                description: 'Incremental automation across your stack. We wire triggers, tasks, and monitors so repetitive work stops stealing focus.'
              },
              { 
                number: '03',
                title: 'OPERATE',
                description: 'Fractional operator for the remaining human loop. When a human loop remains, plug in a fractional operator who\'s automation-augmented and outcome-driven.'
              }
            ].map((benefit, index) => (
              <motion.div
                key={index}
                style={{
                  textAlign: 'left',
                }}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.6 + index * 0.1 }}
                viewport={{ once: true }}
              >
                <div style={{
                  fontSize: '1.5rem',
                  fontWeight: 'bold',
                  color: '#FF9E4A',
                  marginBottom: '20px',
                  fontFamily: 'monospace',
                }}>
                  {`{${benefit.number}}`}
                </div>

                <h3 style={{
                  fontSize: '1.1rem',
                  fontWeight: '600',
                  color: '#ffffff',
                  marginBottom: '15px',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                }}>
                  {benefit.title}
                </h3>

                <p style={{
                  fontSize: '0.95rem',
                  color: 'rgba(255,255,255,0.8)',
                  lineHeight: 1.6,
                  margin: 0,
                }}>
                  {benefit.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      
      {/* Navigation arrows */}
      <button
        aria-label="Previous section"
        onClick={() => goToPanel('prev')}
            style={{
          position: 'fixed',
          bottom: 200,
          right: 96,
          zIndex: 120,
          padding: '13px 18px',
          border: '1px solid #CFE3FF',
          background: '#ffffff',
          borderRadius: 8,
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
        }}
      >
        ←
      </button>
      <button
        aria-label="Next section"
        onClick={() => goToPanel('next')}
        style={{
          position: 'fixed',
          bottom: 200,
          right: 24,
          zIndex: 120,
          padding: '13px 18px',
          border: '1px solid #CFE3FF',
          background: '#C7DBFF',
  
          borderRadius: 8,
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(0,0,0,0.12)'
        }}
      >
        →
      </button>

        {/* The Epiphany Section - Redesigned */}
        <section style={{
          minWidth: '100vw',
          height: '100vh',
          position: 'relative',
          zIndex: 1,
          padding: '150px 60px 120px 60px', // Added top padding for header clearance
          backgroundColor: '#0b0b0b',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          scrollSnapAlign: 'start',
        }}>
        <div style={sectionGridOverlay} />
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          position: 'relative',
          zIndex: 1,
          width: '100%',
        }}>
          {/* Header Section */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '80px',
            marginBottom: '80px',
            alignItems: 'start',
          }}>
            {/* Left - Title */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <h2 style={{
                fontSize: '3.5rem',
                fontWeight: '300',
                color: '#ffffff',
                marginBottom: '0',
                letterSpacing: '-2px',
                lineHeight: 1.1,
              }}>
                Discovery
              </h2>
            </motion.div>

            {/* Right - Intro Text */}
            <motion.div
              style={{
                paddingTop: '20px',
              }}
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              viewport={{ once: true }}
            >
              <p style={{
                fontSize: '1.2rem',
                color: 'rgba(255,255,255,0.8)',
                fontWeight: '300',
                lineHeight: 1.6,
                margin: 0,
              }}>
                You don&apos;t need to guess what a new hire will do. See what can be automated now—and what truly needs a person.
              </p>
            </motion.div>
          </div>

          {/* Comparison Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '40px',
            marginBottom: '60px',
          }}>
            {/* Before Card */}
            <motion.div
              style={{
                backgroundColor: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.14)',
                borderRadius: '16px',
                padding: '40px',
                backdropFilter: 'blur(8px)',
                position: 'relative',
                overflow: 'hidden',
              }}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              {/* Card accent line */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '3px',
                background: 'linear-gradient(90deg, #FF6B6B, #FF9E4A)',
                borderRadius: '16px 16px 0 0',
              }} />
              
              <h3 style={{
                fontSize: '1.3rem',
                fontWeight: '600',
                color: '#ffffff',
                marginBottom: '25px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}>
                <span style={{
                  fontSize: '1.8rem',
                  color: '#FF6B6B',
                }}>⚠️</span>
                Before Apex
              </h3>
              
              <div style={{
                fontSize: '0.95rem',
                lineHeight: 1.6,
                color: 'rgba(255,255,255,0.9)',
              }}>
                <p style={{ marginBottom: '20px', fontWeight: '500' }}>Typical hiring process:</p>
                <ul style={{ paddingLeft: '0', listStyle: 'none' }}>
                  <li style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: '#FF6B6B', fontSize: '1.2rem' }}>•</span>
                    <span>Write generic job description</span>
                  </li>
                  <li style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: '#FF6B6B', fontSize: '1.2rem' }}>•</span>
                    <span>Hire full-time employee</span>
                  </li>
                  <li style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: '#FF6B6B', fontSize: '1.2rem' }}>•</span>
                    <span>Hope they figure out the work</span>
                  </li>
                  <li style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: '#FF6B6B', fontSize: '1.2rem' }}>•</span>
                    <span>Pay for repetitive tasks</span>
                  </li>
                </ul>
              </div>
            </motion.div>

            {/* After Card */}
            <motion.div
              style={{
                backgroundColor: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.14)',
                borderRadius: '16px',
                padding: '40px',
                backdropFilter: 'blur(8px)',
                position: 'relative',
                overflow: 'hidden',
              }}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              viewport={{ once: true }}
            >
              {/* Card accent line */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '3px',
                background: 'linear-gradient(90deg, #38E1FF, #8B1538)',
                borderRadius: '16px 16px 0 0',
              }} />
              
              <h3 style={{
                fontSize: '1.3rem',
                fontWeight: '600',
                color: '#ffffff',
                marginBottom: '25px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}>
                <span style={{
                  fontSize: '1.8rem',
                  color: '#38E1FF',
                }}>✨</span>
                With Apex
              </h3>
              
              <div style={{
                fontSize: '0.95rem',
                lineHeight: 1.6,
                color: 'rgba(255,255,255,0.9)',
              }}>
                <p style={{ marginBottom: '20px', fontWeight: '500' }}>Data-driven approach:</p>
                <ul style={{ paddingLeft: '0', listStyle: 'none' }}>
                  <li style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: '#38E1FF', fontSize: '1.2rem' }}>•</span>
                    <span>Map actual workflows</span>
                  </li>
                  <li style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: '#38E1FF', fontSize: '1.2rem' }}>•</span>
                    <span>Identify automation opportunities</span>
                  </li>
                  <li style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: '#38E1FF', fontSize: '1.2rem' }}>•</span>
                    <span>Automate repetitive tasks</span>
                  </li>
                  <li style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: '#38E1FF', fontSize: '1.2rem' }}>•</span>
                    <span>Hire only for human-critical work</span>
                  </li>
                </ul>
              </div>
            </motion.div>
          </div>

          {/* Results Highlight */}
          <motion.div
            style={{
              backgroundColor: 'rgba(139,21,56,0.08)',
              border: '1px solid rgba(139,21,56,0.2)',
              borderRadius: '16px',
              padding: '40px',
              textAlign: 'center',
              position: 'relative',
              overflow: 'hidden',
            }}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            viewport={{ once: true }}
          >
            {/* Animated accent line */}
            <motion.div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '2px',
                background: 'linear-gradient(90deg, transparent, #8B1538, transparent)',
                boxShadow: '0 0 8px rgba(139,21,56,0.35)',
              }}
              animate={{ scaleX: [0, 1, 0], opacity: [0, 1, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            />
            
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '40px',
              flexWrap: 'wrap',
            }}>
              <div style={{
                fontSize: '3.5rem',
                fontWeight: 'bold',
                color: '#8B1538',
                textAlign: 'center',
              }}>
                67%
              </div>
              <div style={{
                fontSize: '1.1rem',
                color: 'rgba(255,255,255,0.9)',
                maxWidth: '400px',
                textAlign: 'left',
              }}>
                <strong>of typical roles are automatable.</strong> The remaining 33% requires human judgment, creativity, and strategic thinking—exactly what you should be hiring for.
              </div>
            </div>
          </motion.div>
        </div>
      </section>


        {/* Trust & Fit Section - Modified */}
        <section style={{
          minWidth: '100vw',
          height: '100vh',
          position: 'relative',
          zIndex: 1,
          padding: '150px 60px 120px 60px', // Added top padding for header clearance
          backgroundColor: '#0b0b0b',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          scrollSnapAlign: 'start',
        }}>
        <div style={sectionGridOverlay} />
        
        {/* Footer */}
        <footer style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 10,
          padding: '60px 40px',
          backgroundColor: 'rgba(11, 11, 11, 0.8)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(139,21,56,0.25)',
        }}>
          <div style={{
            fontSize: '0.75rem',
            color: 'rgba(255,255,255,0.7)',
            lineHeight: 1.4,
            textAlign: 'left',
          }}>
            <div style={{ marginBottom: '8px', color: '#FFFFFF', fontSize: '14px' }}>
              © 2025 Apex Digital Solutions Corp. All Rights Reserved.
            </div>
            <div style={{ color: '#C7DBFF', fontSize: '13px', lineHeight: '1.6' }}>
              Apex provides workflow observation, orchestration, and operator services. 
              Apex Digital Solutions Corp. does not provide legal, financial, or employment advice, 
              and all automation recommendations are offered on a best-effort basis. 
              Clients remain responsible for final decisions regarding staffing and system usage. 
              By engaging with Apex, you agree to our&nbsp;
              <span style={{ color: '#38E1FF', cursor: 'pointer' }}>Privacy Policy</span>,&nbsp;
              <span style={{ color: '#38E1FF', cursor: 'pointer' }}>Terms of Service</span>, and&nbsp;
              <span style={{ color: '#38E1FF', cursor: 'pointer' }}>Acceptable Use Policy</span>.
            </div>
          </div>
        </footer>

        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          position: 'relative',
          zIndex: 1,
          width: '100%',
          paddingTop: '200px', // Add space for the footer
        }}>
          {/* Main Content Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '60px',
            marginBottom: '60px',
          }}>
            {/* Left: Ideal Customer Profile */}
            <motion.div
              style={{
                backgroundColor: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.14)',
                borderRadius: '16px',
                padding: '40px',
                backdropFilter: 'blur(8px)',
                position: 'relative',
                overflow: 'hidden',
              }}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              {/* Card accent line */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '3px',
                background: 'linear-gradient(90deg, #38E1FF, #8B1538)',
                borderRadius: '16px 16px 0 0',
              }} />
              
              <h3 style={{
                fontSize: '1.4rem',
                fontWeight: '600',
                color: '#ffffff',
                marginBottom: '25px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}>
                <span style={{ fontSize: '1.8rem', color: '#38E1FF' }}>🎯</span>
                Perfect Fit
              </h3>
              
              <div style={{
                fontSize: '0.95rem',
                lineHeight: 1.6,
                color: 'rgba(255,255,255,0.9)',
              }}>
                <p style={{ marginBottom: '20px', fontWeight: '500' }}>Ideal for teams that:</p>
                <ul style={{ paddingLeft: '0', listStyle: 'none' }}>
                  <li style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: '#38E1FF', fontSize: '1.2rem' }}>•</span>
                    <span>Seed to Series B SaaS companies</span>
                  </li>
                  <li style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: '#38E1FF', fontSize: '1.2rem' }}>•</span>
                    <span>Tech-enabled SMBs scaling operations</span>
                  </li>
                  <li style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: '#38E1FF', fontSize: '1.2rem' }}>•</span>
                    <span>Teams stretched thin on process management</span>
                  </li>
                  <li style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: '#38E1FF', fontSize: '1.2rem' }}>•</span>
                    <span>Founders, COOs, or RevOps leaders</span>
                  </li>
                </ul>
              </div>
            </motion.div>

            {/* Right: Integration Tools */}
            <motion.div
              style={{
                backgroundColor: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.14)',
                borderRadius: '16px',
                padding: '40px',
                backdropFilter: 'blur(8px)',
                position: 'relative',
                overflow: 'hidden',
              }}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              viewport={{ once: true }}
            >
              {/* Card accent line */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '3px',
                background: 'linear-gradient(90deg, #FF9E4A, #FF6B6B)',
                borderRadius: '16px 16px 0 0',
              }} />
              
              <h3 style={{
                fontSize: '1.4rem',
                fontWeight: '600',
                color: '#ffffff',
                marginBottom: '25px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}>
                <span style={{ fontSize: '1.8rem', color: '#FF9E4A' }}>🔧</span>
                Works with your tools
              </h3>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '16px',
              }}>
                {[
                  { name: 'Salesforce', icon: '🔵', category: 'CRM' },
                  { name: 'HubSpot', icon: '🟠', category: 'Marketing' },
                  { name: 'Slack', icon: '🟣', category: 'Communication' },
                  { name: 'Zapier', icon: '🟡', category: 'Automation' },
                  { name: 'Airtable', icon: '🔴', category: 'Database' },
                  { name: 'Notion', icon: '⚫', category: 'Productivity' },
                  { name: 'Stripe', icon: '💳', category: 'Payments' },
                  { name: 'Intercom', icon: '💬', category: 'Support' },
                  { name: 'Mixpanel', icon: '📊', category: 'Analytics' },
                  { name: 'GitHub', icon: '⚙️', category: 'Development' },
                  { name: 'Linear', icon: '📋', category: 'Project Mgmt' },
                  { name: 'Calendly', icon: '📅', category: 'Scheduling' },
                ].map((tool, index) => (
                  <motion.div
                    key={index}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      padding: '16px 12px',
                      backgroundColor: 'rgba(255,255,255,0.08)',
                      borderRadius: '12px',
                      border: '1px solid rgba(255,255,255,0.12)',
                      transition: 'all 0.3s ease',
                    }}
                    whileHover={{
                      backgroundColor: 'rgba(255,255,255,0.12)',
                      transform: 'translateY(-2px)',
                      borderColor: 'rgba(139,21,56,0.3)',
                    }}
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: index * 0.05 }}
                    viewport={{ once: true }}
                  >
                    <div style={{ fontSize: '1.8rem', marginBottom: '8px' }}>
                      {tool.icon}
                    </div>
                    <span style={{
                      fontSize: '0.8rem',
                      fontWeight: '600',
                      color: '#ffffff',
                      textAlign: 'center',
                      marginBottom: '4px',
                    }}>
                      {tool.name}
                    </span>
                    <span style={{
                      fontSize: '0.7rem',
                      color: 'rgba(255,255,255,0.6)',
                      textAlign: 'center',
                    }}>
                      {tool.category}
                    </span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

        {/* Blog Preview Section - Horizontal Panel */}
        <section style={{
          minWidth: '100vw',
          height: '100vh',
          position: 'relative',
          zIndex: 1,
          padding: '100px 60px',
          backgroundColor: '#0b0b0b',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          scrollSnapAlign: 'start',
        }}>
        <div style={sectionGridOverlay} />
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          position: 'relative',
          zIndex: 1,
        }}>
          <motion.div
            style={{ textAlign: 'center', marginBottom: '80px' }}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 style={{ fontSize: '2.5rem', fontWeight: '300', color: '#ffffff', marginBottom: '20px', letterSpacing: '-1px' }}>
              Latest Insights
            </h2>
            <div style={{ width: '60px', height: '2px', backgroundColor: '#8B1538', margin: '0 auto', boxShadow: '0 0 8px rgba(139,21,56,0.35)' }} />
          </motion.div>

          {/* Blog Posts Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '40px',
          }}>
            {[
              { 
                title: 'We turned 40% of a RevOps JD into automations in 10 days', 
                excerpt: 'A real Observe pilot: mapping the real work, identifying automatable tasks, and shipping quick wins before committing to payroll.',
                date: 'Dec 15, 2024',
                category: 'Observe'
              },
              { 
                title: 'Observe vs. orchestration vs. operator: how to choose the lane', 
                excerpt: 'When to map workflows, when to automate incrementally, and when to plug in a fractional operator.',
                date: 'Dec 10, 2024',
                category: 'Strategy'
              },
              { 
                title: 'Playbook: mapping a workflow when the job description is vague', 
                excerpt: 'Practical steps for understanding what a role actually does when the JD doesn\'t tell the full story.',
                date: 'Dec 5, 2024',
                category: 'Playbook'
              }
            ].map((post, index) => (
              <motion.article
                key={index}
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #CFE3FF',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  position: 'relative',
                }}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                whileHover={{
                  transform: 'translateY(-5px)',
                  boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)',
                }}
              >
                {/* Animated Line Border */}
                <motion.div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '2px',
                    background: 'linear-gradient(90deg, transparent, #8B1538, transparent)',
                    boxShadow: '0 0 8px rgba(139,21,56,0.35)',
                  }}
                  animate={{
                    scaleX: [0, 1, 0],
                    opacity: [0, 1, 0],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: 'easeInOut',
                    delay: index * 0.5,
                  }}
                />

                <div style={{ padding: '30px' }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '15px',
                  }}>
                    <span style={{
                      fontSize: '0.8rem',
                      color: '#8B1538',
                      fontWeight: '600',
                      textTransform: 'uppercase',
                      letterSpacing: '1px',
                    }}>
                      {post.category}
                    </span>
                    <span style={{
                      fontSize: '0.8rem',
                      color: '#666666',
                    }}>
                      {post.date}
                    </span>
                  </div>

                  <h3 style={{
                    fontSize: '1.2rem',
                    fontWeight: '600',
                    color: '#000000',
                    marginBottom: '15px',
                    lineHeight: 1.3,
                  }}>
                    {post.title}
                  </h3>

                  <p style={{
                    fontSize: '0.9rem',
                    color: '#3A4B63',
                    lineHeight: 1.6,
                    marginBottom: '20px',
                  }}>
                    {post.excerpt}
                  </p>

                  <motion.a
                    href="#read-more"
                    style={{
                      color: '#8B1538',
              textDecoration: 'none',
                      fontSize: '0.9rem',
                      fontWeight: '500',
                      textTransform: 'uppercase',
                      letterSpacing: '1px',
                    }}
                    whileHover={{ opacity: 0.7 }}
                  >
                    Read More →
                  </motion.a>
                </div>

                {/* Animated Circuit Pattern */}
                <div style={{
                  position: 'absolute',
                  bottom: '20px',
                  right: '20px',
                  width: '40px',
                  height: '40px',
                  opacity: 0.1,
                }}>
                  <motion.div
                    style={{
                      position: 'absolute',
                      top: '0',
                      left: '0',
                      width: '20px',
                      height: '2px',
                      backgroundColor: '#8B1538',
                    }}
                    animate={{
                      scaleX: [0, 1, 0],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: 'easeInOut',
                      delay: index * 0.3,
                    }}
                  />
                  <motion.div
                    style={{
                      position: 'absolute',
                      top: '0',
                      left: '0',
                      width: '2px',
                      height: '20px',
                      backgroundColor: '#8B1538',
                    }}
                    animate={{
                      scaleY: [0, 1, 0],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: 'easeInOut',
                      delay: index * 0.3 + 0.5,
                    }}
                  />
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

        {/* CTA Band - Horizontal Panel */}
        <section style={{
          minWidth: '100vw',
          height: '100vh',
          position: 'relative',
          zIndex: 1,
          padding: '100px 60px',
          backgroundColor: '#0b0b0b',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          scrollSnapAlign: 'start',
        }}>
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          textAlign: 'center',
        }}>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 style={{
              fontSize: '2.5rem',
              fontWeight: '300',
              color: '#ffffff',
              marginBottom: '20px',
              letterSpacing: '-1px',
            }}>
              Ready to get clarity before headcount?
            </h2>
            
            <p style={{
              fontSize: '1.2rem',
              color: '#ffffff',
              opacity: 0.9,
              marginBottom: '40px',
              fontWeight: '300',
            }}>
              Book a 20-minute intro to discuss your Observe pilot
            </p>

            <motion.button
              style={{
                padding: '18px 40px',
                backgroundColor: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                color: '#8B1538',
                fontSize: '18px',
                fontWeight: '600',
                cursor: 'pointer',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
              }}
              whileHover={{
                backgroundColor: '#f8f8f8',
                transform: 'translateY(-2px)',
                boxShadow: '0 6px 25px rgba(0, 0, 0, 0.15)',
              }}
              whileTap={{ scale: 0.95 }}
            >
              Book a 20-min intro
            </motion.button>

            <div style={{
              marginTop: '30px',
              fontSize: '0.9rem',
              color: '#ffffff',
              opacity: 0.7,
            }}>
              No commitment required • Clear expectations for the call
            </div>
          </motion.div>
        </div>
      </section>

        {/* Footer - Perspective Grid Room */}
        <footer style={{
          minWidth: '100vw',
          height: '100vh',
          position: 'relative',
          zIndex: 1,
          backgroundColor: '#0b0b0b',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          scrollSnapAlign: 'start',
          overflow: 'hidden',
        }}>
        {/* room grid */}
        <div style={{ position: 'absolute', inset: 0, perspective: '1200px' }}>
          <div style={{
            position: 'absolute', inset: '10% 8% 20% 8%', transformStyle: 'preserve-3d', transform: 'rotateX(65deg)', opacity: 0.5,
            background:
              'linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px) 0 0/ 120px 120px,' +
              'linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px) 0 0/ 120px 120px'
          }} />
        </div>
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          width: '100%',
          padding: '0 60px',
          position: 'relative',
          zIndex: 1,
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 1fr', gap: 40, alignItems: 'start' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <div style={{ width: 36, height: 36, background: '#000', display: 'grid', placeItems: 'center', color: '#fff', fontWeight: 700 }}>▲</div>
                <span style={{ fontSize: 26, fontWeight: 600 }}>Apex</span>
              </div>
              <p style={{ color: 'rgba(255,255,255,0.75)' }}>Clarity before headcount.</p>
            </div>
            <div>
              <div style={{ color: '#FF9E4A', fontWeight: 700, marginBottom: 10 }}>Menu</div>
              <div>About</div>
              <div>Book a Service</div>
              <div>Blog</div>
            </div>
            <div>
              <div style={{ color: '#FF9E4A', fontWeight: 700, marginBottom: 10 }}>Legal</div>
              <div>Terms & Conditions</div>
              <div>Privacy Policy</div>
              <div>Accessibility Statement</div>
            </div>
            <div>
              <div style={{ color: '#FF9E4A', fontWeight: 700, marginBottom: 10 }}>Contact</div>
              <div>hello@apex.ai</div>
              <div>123-456-7890</div>
              <div>San Francisco, CA</div>
            </div>
          </div>
          <div style={{ marginTop: 24, borderTop: '1px solid rgba(255,255,255,0.14)', paddingTop: 12, color: 'rgba(255,255,255,0.6)' }}>
            © 2025 Apex. All rights reserved.
          </div>
        </div>
      </footer>
      </div>
    </main>
    </>
  );
}

