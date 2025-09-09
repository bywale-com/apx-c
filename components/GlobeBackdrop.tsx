import React from 'react';

export default function GlobeBackdrop() {
  return (
    <div aria-hidden className="apx-globe">
      {/* glow */}
      <div className="apx-glow" />
      {/* spinning grid (replace with your asset if you like) */}
      <img src="/globe-grid.png" alt="" className="apx-globe-img" />
      {/* “satellites” */}
      <div className="apx-sat apx-sat-a" />
      <div className="apx-sat apx-sat-b" />
      <style jsx>{`
        .apx-globe{position:absolute;inset:0;pointer-events:none;overflow:hidden}
        .apx-glow{
          position:absolute;right:-6rem;top:-6rem;width:60rem;height:60rem;border-radius:50%;
          background:radial-gradient(circle at center, rgba(90,169,255,.18), transparent 60%);
          filter:saturate(120%);
        }
        .apx-globe-img{
          position:absolute;right:-10%;top:5%;width:36rem;height:36rem;opacity:.4;
          animation:spin 28s linear infinite;transform-origin:center;
        }
        .apx-sat{
          position:absolute;width:.5rem;height:.5rem;border-radius:999px;background:var(--accent-cyan);
          animation:float 6s ease-in-out infinite;
          box-shadow:0 0 12px rgba(56,225,255,.6);
        }
        .apx-sat-a{right:12%;top:18%}
        .apx-sat-b{right:6%;top:48%;background:var(--accent-blue)}
        @keyframes spin {from{transform:rotate(0deg) scale(1.02)} to{transform:rotate(360deg) scale(1.02)}}
        @keyframes float {0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)}}
      `}</style>
    </div>
  );
}
