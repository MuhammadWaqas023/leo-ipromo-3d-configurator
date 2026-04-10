/**
 * LogoUploader.jsx
 *
 * Drag-and-drop logo upload with:
 *  - Auto-placement on upload (no click needed)
 *  - "Click to Reposition" button to enter placement mode
 *  - Placement mode banner shown while waiting for click
 *  - Size / X / Y sliders for fine-tuning
 */

import React, { useCallback } from 'react';

export default function LogoUploader({
  logoDataUrl,
  logoScale,
  logoPosition,
  onLogo,
  onScale,
  onPosition,
  isPlacing,          // true when viewer is waiting for a placement click
  onReposition,       // call this to tell the viewer to enter placement mode
}) {

  const handleFile = useCallback((file) => {
    if (!file) return;
    if (!file.type.match(/^image\/(png|jpeg|svg\+xml)$/)) {
      alert('Please upload a PNG, JPG, or SVG file.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => onLogo(e.target.result);
    reader.readAsDataURL(file);
  }, [onLogo]);

  const onDrop      = useCallback((e) => { e.preventDefault(); handleFile(e.dataTransfer?.files?.[0]); }, [handleFile]);
  const onInput     = useCallback((e) => { handleFile(e.target.files?.[0]); }, [handleFile]);
  const onDragOver  = (e) => e.preventDefault();

  return (
    <div style={styles.container}>
      <p style={styles.label}>Logo</p>

      {/* Placement mode banner */}
      {isPlacing && (
        <div style={styles.placingBanner}>
          👆 Click on the model to place logo
        </div>
      )}

      {/* Drop zone */}
      <div
        style={{
          ...styles.dropzone,
          ...(logoDataUrl ? styles.dropzoneHasLogo : {}),
          ...(isPlacing   ? styles.dropzonePlacing  : {}),
        }}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onClick={() => document.getElementById('logo-file-input').click()}
      >
        {logoDataUrl ? (
          <img src={logoDataUrl} alt="Logo preview" style={styles.preview} />
        ) : (
          <div style={styles.dropHint}>
            <span style={styles.dropIcon}>↑</span>
            <span style={styles.dropText}>Drop PNG / JPG / SVG</span>
            <span style={styles.dropSub}>or click to browse</span>
          </div>
        )}
        <input
          id="logo-file-input"
          type="file"
          accept=".png,.jpg,.jpeg,.svg"
          style={{ display: 'none' }}
          onChange={onInput}
        />
      </div>

      {/* Controls — only once logo is uploaded */}
      {logoDataUrl && (
        <div style={styles.controls}>

          {/* Reposition */}
          <button
            style={styles.repositionBtn}
            onClick={(e) => { e.stopPropagation(); onReposition && onReposition(); }}
          >
            ✦ Click model to reposition
          </button>

          {/* Remove */}
          <button style={styles.removeBtn} onClick={() => onLogo(null)}>
            ✕ Remove Logo
          </button>

          {/* Size */}
          <label style={styles.sliderLabel}>
            Size
            <input
              type="range" min="0.3" max="3" step="0.05"
              value={logoScale || 1}
              onChange={(e) => onScale(parseFloat(e.target.value))}
              style={styles.slider}
            />
          </label>

          {/* Horizontal */}
          <label style={styles.sliderLabel}>
            ← Position →
            <input
              type="range" min="-5" max="5" step="0.1"
              value={logoPosition?.x || 0}
              onChange={(e) => onPosition({ ...logoPosition, x: parseFloat(e.target.value) })}
              style={styles.slider}
            />
          </label>

          {/* Vertical */}
          <label style={styles.sliderLabel}>
            ↑ Height ↓
            <input
              type="range" min="-5" max="5" step="0.1"
              value={logoPosition?.y || 0}
              onChange={(e) => onPosition({ ...logoPosition, y: parseFloat(e.target.value) })}
              style={styles.slider}
            />
          </label>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    padding: '16px',
    borderTop: '1px solid rgba(255,255,255,0.08)',
  },
  label: {
    fontSize: '11px', fontWeight: '700', letterSpacing: '0.1em',
    textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', margin: '0 0 12px 0',
  },
  placingBanner: {
    background: 'rgba(37,99,235,0.85)',
    color: '#fff',
    fontSize: '12px',
    fontWeight: '600',
    padding: '8px 12px',
    borderRadius: '8px',
    marginBottom: '10px',
    textAlign: 'center',
    animation: 'pulse 1.5s ease infinite',
  },
  dropzone: {
    border: '2px dashed rgba(99,102,241,0.5)',
    borderRadius: '10px',
    padding: '20px',
    textAlign: 'center',
    cursor: 'pointer',
    minHeight: '80px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(99,102,241,0.05)',
    transition: 'border-color 0.2s',
  },
  dropzoneHasLogo: {
    borderColor: 'rgba(74,222,128,0.5)',
    background: 'rgba(74,222,128,0.05)',
  },
  dropzonePlacing: {
    borderColor: 'rgba(37,99,235,0.7)',
  },
  preview: {
    maxWidth: '100%', maxHeight: '80px', objectFit: 'contain', borderRadius: '6px',
  },
  dropHint: {
    display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center',
  },
  dropIcon: { fontSize: '22px', color: 'rgba(99,102,241,0.8)' },
  dropText: { fontSize: '13px', color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
  dropSub:  { fontSize: '11px', color: 'rgba(255,255,255,0.35)' },
  controls: {
    marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '10px',
  },
  repositionBtn: {
    background: 'rgba(99,179,237,0.15)',
    border: '1px solid rgba(99,179,237,0.35)',
    color: '#63b3ed',
    borderRadius: '6px',
    padding: '7px 12px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '600',
    fontFamily: 'inherit',
    textAlign: 'left',
  },
  removeBtn: {
    background: 'rgba(239,68,68,0.15)',
    border: '1px solid rgba(239,68,68,0.3)',
    color: '#ef4444',
    borderRadius: '6px',
    padding: '6px 12px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '600',
    fontFamily: 'inherit',
    alignSelf: 'flex-start',
  },
  sliderLabel: {
    fontSize: '11px', color: 'rgba(255,255,255,0.5)',
    display: 'flex', flexDirection: 'column', gap: '4px',
  },
  slider: { width: '100%', accentColor: '#6366f1' },
};