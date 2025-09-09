import Link from 'next/link';
import React from 'react';

type TileProps = { title:string; subtitle?:string; href?:string; onClick?:()=>void; icon?:React.ReactNode };

export default function Tile({ title, subtitle, href, onClick, icon }: TileProps) {
  const Inner = (
    <div className="apx-tile" role="button" aria-label={title} tabIndex={0}>
      {icon && <div className="apx-ico">{icon}</div>}
      <div className="apx-ttl">{title}</div>
      {subtitle && <div className="apx-sub">{subtitle}</div>}
      <style jsx>{`
        .apx-tile{
          position:relative;display:flex;flex-direction:column;justify-content:center;
          height:10rem;padding:1.1rem;border-radius:1rem;
          background:var(--panel);backdrop-filter:blur(10px);
          border:1px solid var(--border);box-shadow:var(--shadow-soft);
          transition:transform .15s ease, box-shadow .15s ease;
          outline:none;user-select:none
        }
        .apx-tile:hover{transform:translateY(-2px);box-shadow:0 14px 28px rgba(0,0,0,.32)}
        .apx-ico{opacity:.85;margin-bottom:.5rem}
        .apx-ttl{font-weight:700;letter-spacing:.2px}
        .apx-sub{margin-top:.25rem;color:var(--ink-mid);font-size:.9rem}
      `}</style>
    </div>
  );
  return href ? <Link href={href}>{Inner}</Link> : <div onClick={onClick}>{Inner}</div>;
}
