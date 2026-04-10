/**
 * ColorPanel.jsx
 *
 * Clickable colour swatches that instantly update the 3D model.
 * Includes an "Original" swatch that restores the Tripo-baked texture.
 */

import React from 'react';
import { ORIGINAL_COLOR } from './Viewer3D';

export default function ColorPanel({ colors, selectedHex, onSelect }) {
  if (!colors || colors.length === 0) return null;

  const isOriginal = selectedHex === ORIGINAL_COLOR;

  return (
    <div style={styles.container}>
      <p style={styles.label}>Color</p>
      <div style={styles.swatchGrid}>

        {/* ── "Original" swatch — restores Tripo texture ── */}
        <button
          title="Original (AI-generated texture)"
          onClick={() => onSelect({ name: 'Original', hex: ORIGINAL_COLOR })}
          style={{
            ...styles.swatch,
            ...styles.originalSwatch,
            outline:      isOriginal ? '3px solid #fff' : '2px solid transparent',
            outlineOffset: '2px',
            boxShadow:    isOriginal
              ? '0 0 0 5px rgba(99,102,241,0.6)'
              : '0 2px 4px rgba(0,0,0,0.4)',
            transform:    isOriginal ? 'scale(1.15)' : 'scale(1)',
          }}
          aria-label="Original texture"
        >
          <span style={styles.origLabel}>AI</span>
        </button>

        {/* ── Product color swatches ── */}
        {colors.map((color) => (
          <button
            key={color.hex}
            title={color.name}
            onClick={() => onSelect(color)}
            style={{
              ...styles.swatch,
              backgroundColor: color.hex,
              outline:      selectedHex === color.hex ? '3px solid #fff' : '2px solid transparent',
              outlineOffset: '2px',
              boxShadow:    selectedHex === color.hex
                ? '0 0 0 5px rgba(99,102,241,0.6)'
                : '0 2px 4px rgba(0,0,0,0.4)',
              transform:    selectedHex === color.hex ? 'scale(1.15)' : 'scale(1)',
            }}
            aria-label={color.name}
          />
        ))}
      </div>

      {/* Show selected colour name */}
      <p style={styles.selectedName}>
        {isOriginal
          ? 'Original (AI texture)'
          : (colors.find(c => c.hex === selectedHex)?.name || selectedHex || '')}
      </p>
    </div>
  );
}

const styles = {
  container: {
    padding: '16px',
  },
  label: {
    fontSize: '11px',
    fontWeight: '700',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.5)',
    margin: '0 0 12px 0',
  },
  swatchGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '10px',
  },
  swatch: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    flexShrink: 0,
    padding: 0,
  },
  // "Original" swatch is a gradient to signal "textured"
  originalSwatch: {
    background: 'conic-gradient(#7ecfcf, #e8737a, #c4a882, #2a2a2a, #b0b0b0, #1a2e5a, #7ecfcf)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  origLabel: {
    fontSize: '8px',
    fontWeight: '800',
    color: '#fff',
    textShadow: '0 0 3px rgba(0,0,0,0.8)',
    pointerEvents: 'none',
    letterSpacing: '0.03em',
  },
  selectedName: {
    marginTop: '10px',
    fontSize: '13px',
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
};