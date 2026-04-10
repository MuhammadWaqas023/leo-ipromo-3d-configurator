/**
 * LoadingScreen.jsx
 * Shown during Meshy model generation (~60 seconds first time).
 * Shows a progress bar and friendly status messages.
 */

import React, { useEffect, useState } from 'react';

const MESSAGES = [
  'Analyzing product image…',
  'Building 3D mesh structure…',
  'Generating fabric geometry…',
  'Applying surface textures…',
  'Optimizing model topology…',
  'Almost there — adding finishing details…',
  'Preparing your 3D model…',
];

export default function LoadingScreen({ progress, productName }) {
  const [msgIndex, setMsgIndex] = useState(0);

  // Cycle through messages every 8 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setMsgIndex(i => (i + 1) % MESSAGES.length);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  const pct = Math.min(Math.max(progress || 0, 0), 100);

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        {/* Animated 3D cube icon */}
        <div style={styles.iconWrap}>
          <div style={styles.cube}>
            <div style={{ ...styles.face, ...styles.front }} />
            <div style={{ ...styles.face, ...styles.back }} />
            <div style={{ ...styles.face, ...styles.left }} />
            <div style={{ ...styles.face, ...styles.right }} />
            <div style={{ ...styles.face, ...styles.top }} />
            <div style={{ ...styles.face, ...styles.bottom }} />
          </div>
        </div>

        <h2 style={styles.title}>Generating 3D Model</h2>
        {productName && <p style={styles.product}>{productName}</p>}

        {/* Progress bar */}
        <div style={styles.barBg}>
          <div style={{ ...styles.barFill, width: `${pct}%` }} />
        </div>
        <p style={styles.pct}>{pct}%</p>

        <p style={styles.message}>{MESSAGES[msgIndex]}</p>

        <p style={styles.note}>
          This takes ~60 seconds the first time.<br />
          After that, it loads instantly from cache.
        </p>
      </div>

      <style>{cubeCSS}</style>
    </div>
  );
}

const cubeCSS = `
  @keyframes rotateCube {
    from { transform: rotateX(-20deg) rotateY(0deg); }
    to   { transform: rotateX(-20deg) rotateY(360deg); }
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.5; }
  }
`;

const styles = {
  wrapper: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: "'Inter', -apple-system, sans-serif",
  },
  card: {
    textAlign: 'center',
    padding: '48px',
    maxWidth: '400px',
    width: '100%',
  },
  iconWrap: {
    perspective: '200px',
    width: '60px',
    height: '60px',
    margin: '0 auto 32px',
  },
  cube: {
    width: '60px',
    height: '60px',
    position: 'relative',
    transformStyle: 'preserve-3d',
    animation: 'rotateCube 3s linear infinite',
  },
  face: {
    position: 'absolute',
    width: '60px',
    height: '60px',
    background: 'rgba(99,102,241,0.3)',
    border: '2px solid rgba(99,102,241,0.7)',
    borderRadius: '4px',
  },
  front:  { transform: 'translateZ(30px)' },
  back:   { transform: 'rotateY(180deg) translateZ(30px)' },
  left:   { transform: 'rotateY(-90deg) translateZ(30px)' },
  right:  { transform: 'rotateY(90deg) translateZ(30px)' },
  top:    { transform: 'rotateX(90deg) translateZ(30px)' },
  bottom: { transform: 'rotateX(-90deg) translateZ(30px)' },
  title: {
    fontSize: '24px',
    fontWeight: '800',
    color: '#fff',
    margin: '0 0 8px',
    letterSpacing: '-0.02em',
  },
  product: {
    fontSize: '14px',
    color: 'rgba(255,255,255,0.5)',
    margin: '0 0 28px',
  },
  barBg: {
    width: '100%',
    height: '6px',
    background: 'rgba(255,255,255,0.1)',
    borderRadius: '99px',
    overflow: 'hidden',
    marginBottom: '8px',
  },
  barFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #6366f1, #818cf8)',
    borderRadius: '99px',
    transition: 'width 0.5s ease',
    boxShadow: '0 0 10px rgba(99,102,241,0.5)',
  },
  pct: {
    fontSize: '13px',
    color: 'rgba(99,102,241,0.9)',
    fontWeight: '700',
    margin: '0 0 20px',
  },
  message: {
    fontSize: '14px',
    color: 'rgba(255,255,255,0.7)',
    margin: '0 0 24px',
    minHeight: '20px',
    animation: 'pulse 2s ease infinite',
  },
  note: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.3)',
    lineHeight: 1.6,
  },
};