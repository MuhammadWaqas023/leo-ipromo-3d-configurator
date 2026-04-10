/**
 * URLInput.jsx
 * The landing screen where users paste their iPromo product URL.
 */

import React, { useState } from 'react';

const EXAMPLE_URL = 'https://www.ipromo.com/crosswind-quarter-zip-sweatshirt.html';

export default function URLInput({ onSubmit, loading }) {
  const [url, setUrl] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
  };

  const useExample = () => {
    setUrl(EXAMPLE_URL);
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        {/* Logo / Brand */}
        <div style={styles.brand}>
          <div style={styles.brandDot} />
          <span style={styles.brandText}>iPromo</span>
          <span style={styles.brandBadge}>3D Configurator</span>
        </div>

        <h1 style={styles.heading}>Build Your 3D Product Mockup</h1>
        <p style={styles.sub}>
          Paste any iPromo product URL. We'll generate a photorealistic 3D model,
          let you pick colors, upload your logo, and share it instantly.
        </p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputRow}>
            <input
              type="url"
              placeholder="https://www.ipromo.com/your-product.html"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              style={styles.input}
              disabled={loading}
              autoFocus
            />
            <button
              type="submit"
              style={{ ...styles.btn, ...(loading ? styles.btnDisabled : {}) }}
              disabled={loading || !url.trim()}
            >
              {loading ? 'Loading…' : 'Generate →'}
            </button>
          </div>
        </form>

        <button style={styles.exampleBtn} onClick={useExample}>
          Try the example: Crosswind Quarter-Zip →
        </button>

        {/* Feature pills */}
        <div style={styles.features}>
          {['Interactive 3D', 'Live Color Switch', 'Logo Upload', 'Shareable Link', 'PDF Export'].map(f => (
            <span key={f} style={styles.pill}>{f}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    fontFamily: "'Inter', -apple-system, sans-serif",
  },
  card: {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '20px',
    padding: '48px',
    maxWidth: '620px',
    width: '100%',
    backdropFilter: 'blur(20px)',
    boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '32px',
  },
  brandDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    background: '#6366f1',
    boxShadow: '0 0 10px #6366f1',
  },
  brandText: {
    fontSize: '18px',
    fontWeight: '800',
    color: '#fff',
    letterSpacing: '-0.02em',
  },
  brandBadge: {
    fontSize: '11px',
    color: 'rgba(99,102,241,0.9)',
    background: 'rgba(99,102,241,0.15)',
    border: '1px solid rgba(99,102,241,0.3)',
    borderRadius: '20px',
    padding: '3px 10px',
    fontWeight: '600',
    letterSpacing: '0.03em',
  },
  heading: {
    fontSize: '32px',
    fontWeight: '800',
    color: '#fff',
    margin: '0 0 12px',
    lineHeight: 1.2,
    letterSpacing: '-0.03em',
  },
  sub: {
    fontSize: '15px',
    color: 'rgba(255,255,255,0.55)',
    lineHeight: 1.6,
    margin: '0 0 32px',
  },
  form: {
    marginBottom: '16px',
  },
  inputRow: {
    display: 'flex',
    gap: '10px',
  },
  input: {
    flex: 1,
    padding: '14px 18px',
    borderRadius: '10px',
    border: '1px solid rgba(255,255,255,0.12)',
    background: 'rgba(255,255,255,0.07)',
    color: '#fff',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s',
    fontFamily: 'inherit',
  },
  btn: {
    padding: '14px 24px',
    borderRadius: '10px',
    border: 'none',
    background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
    color: '#fff',
    fontWeight: '700',
    fontSize: '14px',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    boxShadow: '0 4px 15px rgba(99,102,241,0.4)',
    transition: 'opacity 0.2s',
    fontFamily: 'inherit',
  },
  btnDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  exampleBtn: {
    background: 'none',
    border: 'none',
    color: 'rgba(99,102,241,0.8)',
    fontSize: '13px',
    cursor: 'pointer',
    padding: '0',
    textDecoration: 'underline',
    fontFamily: 'inherit',
  },
  features: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    marginTop: '32px',
  },
  pill: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.5)',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '20px',
    padding: '5px 12px',
    fontWeight: '500',
  },
};