// /**
//  * App.jsx — iPromo 3D Configurator
//  *
//  * State machine:
//  *   'input'    → URL paste screen
//  *   'scraping' → fetching product data
//  *   'loading'  → Tripo generating 3D model
//  *   'ready'    → 3D viewer active
//  *   'error'    → something went wrong
//  */

// import React, { useState, useRef, useEffect, useCallback } from 'react';
// import URLInput      from './components/URLInput';
// import LoadingScreen from './components/LoadingScreen';
// import Viewer3D, { ORIGINAL_COLOR } from './components/Viewer3D';
// import ColorPanel    from './components/ColorPanel';
// import LogoUploader  from './components/LogoUploader';
// import { scrapeProduct, startGeneration, pollJobUntilDone } from './utils/api';
// import { encodeShareLink, decodeShareLink, copyToClipboard } from './utils/shareLink';
// import { exportToPDF } from './utils/pdfExport';

// export default function App() {
//   const [screen,       setScreen]       = useState('input');
//   const [errorMsg,     setErrorMsg]     = useState('');
//   const [progress,     setProgress]     = useState(0);
//   const [productData,  setProductData]  = useState(null);
//   const [glbUrl,       setGlbUrl]       = useState(null);
//   const [selectedColor, setSelectedColor] = useState(null);
//   const [logoDataUrl,  setLogoDataUrl]  = useState(null);
//   const [logoScale,    setLogoScale]    = useState(1);
//   const [logoPosition, setLogoPosition] = useState({ x: 0, y: 0 });
//   const [copySuccess,  setCopySuccess]  = useState(false);
//   const [exportingPDF, setExportingPDF] = useState(false);

//   // true while viewer is waiting for user to click to place logo
//   const [isPlacing, setIsPlacing] = useState(false);

//   const viewerRef = useRef(null);

//   // ── Restore shared config ────────────────────────────────
//   useEffect(() => {
//     const shared = decodeShareLink();
//     if (shared?.productUrl) {
//       if (shared.logoDataUrl)  setLogoDataUrl(shared.logoDataUrl);
//       if (shared.logoScale)    setLogoScale(shared.logoScale);
//       if (shared.logoPosition) setLogoPosition(shared.logoPosition);
//       handleURLSubmit(shared.productUrl, shared.color);
//     }
//   }, []); // eslint-disable-line react-hooks/exhaustive-deps

//   // ── URL submit ────────────────────────────────────────────
//   const handleURLSubmit = useCallback(async (url, preselectedColorHex) => {
//     setScreen('scraping');
//     setProgress(0);
//     setErrorMsg('');

//     try {
//       const data = await scrapeProduct(url);
//       setProductData(data);

//       if (data.colors?.length) {
//         const preselected = preselectedColorHex
//           ? data.colors.find(c => c.hex === preselectedColorHex)
//           : null;
//         setSelectedColor(preselected || data.colors[0]);
//       }

//       setScreen('loading');
//       const { jobId, status, glbUrl: cachedGlb } = await startGeneration(data.primaryImage, url);

//       if (status === 'SUCCEEDED' && cachedGlb) {
//         setGlbUrl(cachedGlb);
//         setScreen('ready');
//         return;
//       }

//       const result = await pollJobUntilDone(jobId, (pct) => setProgress(pct));
//       setGlbUrl(result.glbUrl);
//       setScreen('ready');
//     } catch (err) {
//       setErrorMsg(err.message || 'Something went wrong. Please try again.');
//       setScreen('error');
//     }
//   }, []);

//   const handleColorSelect = useCallback((color) => setSelectedColor(color), []);

//   // Called by LogoUploader's "Reposition" button
//   const handleReposition = useCallback(() => {
//     viewerRef.current?.startPlacement();
//   }, []);

//   // Called by Viewer3D when placement mode starts/ends
//   const handlePlacingChange = useCallback((placing) => {
//     setIsPlacing(placing);
//   }, []);

//   // ── Share ─────────────────────────────────────────────────
//   const handleShare = useCallback(async () => {
//     if (!productData) return;
//     const link = encodeShareLink({
//       productUrl: productData.sourceUrl,
//       color: selectedColor?.hex,
//       logoDataUrl, logoPosition, logoScale,
//     });
//     const ok = await copyToClipboard(link);
//     if (ok) { setCopySuccess(true); setTimeout(() => setCopySuccess(false), 2500); }
//   }, [productData, selectedColor, logoDataUrl, logoPosition, logoScale]);

//   // ── PDF ───────────────────────────────────────────────────
//   const handlePDFExport = useCallback(async () => {
//     if (!viewerRef.current || !productData) return;
//     setExportingPDF(true);
//     try {
//       const canvas = viewerRef.current.getCanvas();
//       await exportToPDF({
//         canvas,
//         productName:      productData.productName,
//         selectedColor:    selectedColor?.name,
//         selectedColorHex: selectedColor?.hex === ORIGINAL_COLOR ? null : selectedColor?.hex,
//         sku:              productData.sku,
//         productUrl:       productData.sourceUrl,
//       });
//     } catch (err) {
//       alert('PDF export failed: ' + err.message);
//     } finally {
//       setExportingPDF(false);
//     }
//   }, [productData, selectedColor]);

//   // ── Screens ───────────────────────────────────────────────
//   if (screen === 'input')    return <URLInput onSubmit={handleURLSubmit} loading={false} />;
//   if (screen === 'scraping') return <URLInput onSubmit={handleURLSubmit} loading={true}  />;
//   if (screen === 'loading')  return <LoadingScreen progress={progress} productName={productData?.productName} />;

//   if (screen === 'error') {
//     return (
//       <div style={styles.errorWrapper}>
//         <div style={styles.errorCard}>
//           <div style={styles.errorIcon}>⚠️</div>
//           <h2 style={styles.errorTitle}>Something went wrong</h2>
//           <p style={styles.errorMsg}>{errorMsg}</p>
//           <button style={styles.retryBtn} onClick={() => setScreen('input')}>← Try Again</button>
//         </div>
//       </div>
//     );
//   }

//   // ── Main ready view ───────────────────────────────────────
//   return (
//     <div style={styles.app}>
//       <header style={styles.header}>
//         <div style={styles.headerLeft}>
//           <button style={styles.backBtn} onClick={() => setScreen('input')}>← Back</button>
//           <div>
//             <h1 style={styles.headerTitle}>{productData?.productName}</h1>
//             {productData?.sku && <span style={styles.sku}>SKU: {productData.sku}</span>}
//           </div>
//         </div>
//         <div style={styles.headerActions}>
//           <button style={styles.actionBtn} onClick={handleShare}>
//             {copySuccess ? '✓ Copied!' : '🔗 Share Link'}
//           </button>
//           <button
//             style={{ ...styles.actionBtn, ...styles.pdfBtn }}
//             onClick={handlePDFExport}
//             disabled={exportingPDF}
//           >
//             {exportingPDF ? 'Generating…' : '⬇ PDF Mockup'}
//           </button>
//           {productData?.sourceUrl && (
//             <a href={productData.sourceUrl} target="_blank" rel="noopener noreferrer" style={styles.externalLink}>
//               View on iPromo ↗
//             </a>
//           )}
//         </div>
//       </header>

//       <div style={styles.main}>
//         {/* 3D Viewer */}
//         <div style={styles.viewerPane}>
//           {/* Placement overlay banner */}
//           {isPlacing && (
//             <div style={styles.placingOverlay}>
//               👆 Click on the model to place your logo
//             </div>
//           )}
//           <Viewer3D
//             ref={viewerRef}
//             glbUrl={glbUrl}
//             color={selectedColor?.hex}
//             logoDataUrl={logoDataUrl}
//             logoPosition={logoPosition}
//             logoScale={logoScale}
//             onReady={() => console.log('[App] 3D model ready')}
//             onPlacingChange={handlePlacingChange}
//           />
//           <div style={styles.hint}>🖱 Drag to rotate · Scroll to zoom</div>
//         </div>

//         {/* Right panel */}
//         <aside style={styles.panel}>
//           <ColorPanel
//             colors={productData?.colors || []}
//             selectedHex={selectedColor?.hex}
//             onSelect={handleColorSelect}
//           />
//           <LogoUploader
//             logoDataUrl={logoDataUrl}
//             logoScale={logoScale}
//             logoPosition={logoPosition}
//             onLogo={setLogoDataUrl}
//             onScale={setLogoScale}
//             onPosition={setLogoPosition}
//             isPlacing={isPlacing}
//             onReposition={handleReposition}
//           />
//           {productData?.primaryImage && (
//             <div style={styles.refImageWrap}>
//               <p style={styles.refLabel}>Reference</p>
//               <img src={productData.primaryImage} alt={productData.productName} style={styles.refImage} />
//             </div>
//           )}
//         </aside>
//       </div>
//     </div>
//   );
// }

// const styles = {
//   app:          { minHeight:'100vh', background:'#0f0f1a', display:'flex', flexDirection:'column', fontFamily:"'Inter',-apple-system,sans-serif", color:'#fff' },
//   header:       { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 24px', background:'rgba(255,255,255,0.03)', borderBottom:'1px solid rgba(255,255,255,0.08)', flexWrap:'wrap', gap:'12px' },
//   headerLeft:   { display:'flex', alignItems:'center', gap:'16px' },
//   backBtn:      { background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.1)', color:'rgba(255,255,255,0.7)', borderRadius:'8px', padding:'8px 14px', cursor:'pointer', fontSize:'13px', fontFamily:'inherit' },
//   headerTitle:  { fontSize:'16px', fontWeight:'700', margin:0, color:'#fff' },
//   sku:          { fontSize:'12px', color:'rgba(255,255,255,0.4)' },
//   headerActions:{ display:'flex', gap:'10px', alignItems:'center', flexWrap:'wrap' },
//   actionBtn:    { background:'rgba(99,102,241,0.15)', border:'1px solid rgba(99,102,241,0.35)', color:'#a5b4fc', borderRadius:'8px', padding:'9px 16px', cursor:'pointer', fontSize:'13px', fontWeight:'600', fontFamily:'inherit' },
//   pdfBtn:       { background:'linear-gradient(135deg,#6366f1,#4f46e5)', border:'none', color:'#fff', boxShadow:'0 4px 12px rgba(99,102,241,0.35)' },
//   externalLink: { fontSize:'13px', color:'rgba(255,255,255,0.4)', textDecoration:'none' },
//   main:         { display:'flex', flex:1, overflow:'hidden' },
//   viewerPane:   { flex:1, position:'relative', minHeight:'500px' },
//   placingOverlay: {
//     position:'absolute', top:'16px', left:'50%', transform:'translateX(-50%)',
//     background:'rgba(37,99,235,0.92)', padding:'10px 24px', borderRadius:'24px',
//     fontSize:'13px', fontWeight:'600', color:'#fff', zIndex:10,
//     pointerEvents:'none', whiteSpace:'nowrap',
//     boxShadow:'0 4px 20px rgba(37,99,235,0.5)',
//   },
//   hint:         { position:'absolute', bottom:'16px', left:'50%', transform:'translateX(-50%)', background:'rgba(0,0,0,0.5)', color:'rgba(255,255,255,0.5)', fontSize:'12px', padding:'6px 14px', borderRadius:'20px', backdropFilter:'blur(10px)', pointerEvents:'none', whiteSpace:'nowrap' },
//   panel:        { width:'280px', flexShrink:0, background:'rgba(255,255,255,0.03)', borderLeft:'1px solid rgba(255,255,255,0.08)', overflowY:'auto' },
//   refImageWrap: { padding:'16px', borderTop:'1px solid rgba(255,255,255,0.08)' },
//   refLabel:     { fontSize:'11px', fontWeight:'700', letterSpacing:'0.1em', textTransform:'uppercase', color:'rgba(255,255,255,0.5)', margin:'0 0 10px' },
//   refImage:     { width:'100%', borderRadius:'8px', objectFit:'contain', maxHeight:'160px', background:'rgba(255,255,255,0.05)' },
//   errorWrapper: { minHeight:'100vh', background:'#0f0f1a', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'Inter',-apple-system,sans-serif" },
//   errorCard:    { textAlign:'center', padding:'48px', maxWidth:'400px' },
//   errorIcon:    { fontSize:'48px', marginBottom:'16px' },
//   errorTitle:   { color:'#fff', fontSize:'22px', fontWeight:'700', margin:'0 0 12px' },
//   errorMsg:     { color:'rgba(255,255,255,0.5)', fontSize:'14px', marginBottom:'28px', lineHeight:1.6 },
//   retryBtn:     { background:'linear-gradient(135deg,#6366f1,#4f46e5)', border:'none', color:'#fff', borderRadius:'10px', padding:'12px 28px', cursor:'pointer', fontSize:'14px', fontWeight:'700', fontFamily:'inherit' },
// };















/**
 * App.jsx — iPromo 3D Configurator
 *
 * Responsive layout:
 *   ≥ 768px  → side-by-side: viewer left, panel right (280px fixed)
 *   < 768px  → stacked: viewer top (350px fixed height), panel below (scrollable)
 *
 * Header actions collapse to icon-only on very small screens.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import URLInput      from './components/URLInput';
import LoadingScreen from './components/LoadingScreen';
import Viewer3D, { ORIGINAL_COLOR } from './components/Viewer3D';
import ColorPanel    from './components/ColorPanel';
import LogoUploader  from './components/LogoUploader';
import { scrapeProduct, startGeneration, pollJobUntilDone } from './utils/api';
import { encodeShareLink, decodeShareLink, copyToClipboard } from './utils/shareLink';
import { exportToPDF } from './utils/pdfExport';

// Simple hook to track window width
function useWindowWidth() {
  const [width, setWidth] = useState(window.innerWidth);
  useEffect(() => {
    const handler = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return width;
}

export default function App() {
  const [screen,        setScreen]        = useState('input');
  const [errorMsg,      setErrorMsg]      = useState('');
  const [progress,      setProgress]      = useState(0);
  const [productData,   setProductData]   = useState(null);
  const [glbUrl,        setGlbUrl]        = useState(null);
  const [selectedColor, setSelectedColor] = useState(null);
  const [logoDataUrl,   setLogoDataUrl]   = useState(null);
  const [logoScale,     setLogoScale]     = useState(1);
  const [logoPosition,  setLogoPosition]  = useState({ x: 0, y: 0 });
  const [copySuccess,   setCopySuccess]   = useState(false);
  const [exportingPDF,  setExportingPDF]  = useState(false);
  const [isPlacing,     setIsPlacing]     = useState(false);

  const viewerRef  = useRef(null);
  const winWidth   = useWindowWidth();
  const isMobile   = winWidth < 768;
  const isSmall    = winWidth < 480;

  // ── Restore shared config ─────────────────────────────────
  useEffect(() => {
    const shared = decodeShareLink();
    if (shared?.productUrl) {
      if (shared.logoDataUrl)  setLogoDataUrl(shared.logoDataUrl);
      if (shared.logoScale)    setLogoScale(shared.logoScale);
      if (shared.logoPosition) setLogoPosition(shared.logoPosition);
      handleURLSubmit(shared.productUrl, shared.color);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── URL submit ────────────────────────────────────────────
  const handleURLSubmit = useCallback(async (url, preselectedColorHex) => {
    setScreen('scraping');
    setProgress(0);
    setErrorMsg('');
    try {
      const data = await scrapeProduct(url);
      setProductData(data);
      if (data.colors?.length) {
        const pre = preselectedColorHex ? data.colors.find(c => c.hex === preselectedColorHex) : null;
        setSelectedColor(pre || data.colors[0]);
      }
      setScreen('loading');
      const { jobId, status, glbUrl: cachedGlb } = await startGeneration(data.primaryImage, url);
      if (status === 'SUCCEEDED' && cachedGlb) { setGlbUrl(cachedGlb); setScreen('ready'); return; }
      const result = await pollJobUntilDone(jobId, (pct) => setProgress(pct));
      setGlbUrl(result.glbUrl);
      setScreen('ready');
    } catch (err) {
      setErrorMsg(err.message || 'Something went wrong.');
      setScreen('error');
    }
  }, []);

  const handleColorSelect    = useCallback((c) => setSelectedColor(c), []);
  const handleReposition     = useCallback(() => viewerRef.current?.startPlacement(), []);
  const handlePlacingChange  = useCallback((p) => setIsPlacing(p), []);

  const handleShare = useCallback(async () => {
    if (!productData) return;
    const link = encodeShareLink({ productUrl: productData.sourceUrl, color: selectedColor?.hex, logoDataUrl, logoPosition, logoScale });
    const ok = await copyToClipboard(link);
    if (ok) { setCopySuccess(true); setTimeout(() => setCopySuccess(false), 2500); }
  }, [productData, selectedColor, logoDataUrl, logoPosition, logoScale]);

  const handlePDFExport = useCallback(async () => {
    if (!viewerRef.current || !productData) return;
    setExportingPDF(true);
    try {
      await exportToPDF({
        canvas:           viewerRef.current.getCanvas(),
        productName:      productData.productName,
        selectedColor:    selectedColor?.name,
        selectedColorHex: selectedColor?.hex === ORIGINAL_COLOR ? null : selectedColor?.hex,
        sku:              productData.sku,
        productUrl:       productData.sourceUrl,
      });
    } catch (err) { alert('PDF export failed: ' + err.message); }
    finally { setExportingPDF(false); }
  }, [productData, selectedColor]);

  // ── Screens ───────────────────────────────────────────────
  if (screen === 'input')    return <URLInput onSubmit={handleURLSubmit} loading={false} />;
  if (screen === 'scraping') return <URLInput onSubmit={handleURLSubmit} loading={true}  />;
  if (screen === 'loading')  return <LoadingScreen progress={progress} productName={productData?.productName} />;

  if (screen === 'error') {
    return (
      <div style={s.errWrap}>
        <div style={s.errCard}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
          <h2 style={s.errTitle}>Something went wrong</h2>
          <p style={s.errMsg}>{errorMsg}</p>
          <button style={s.retryBtn} onClick={() => setScreen('input')}>← Try Again</button>
        </div>
      </div>
    );
  }

  // ── Ready view ────────────────────────────────────────────
  return (
    <div style={s.app}>

      {/* ── Header ── */}
      <header style={s.header}>
        <div style={s.headerLeft}>
          <button style={s.backBtn} onClick={() => setScreen('input')}>← Back</button>
          <div style={{ minWidth: 0 }}>
            <h1 style={{ ...s.headerTitle, fontSize: isMobile ? '13px' : '16px' }}>
              {productData?.productName}
            </h1>
            {productData?.sku && !isSmall && (
              <span style={s.sku}>SKU: {productData.sku}</span>
            )}
          </div>
        </div>

        <div style={s.headerActions}>
          {/* Share */}
          <button style={s.actionBtn} onClick={handleShare}>
            {copySuccess ? '✓' : '🔗'}{!isSmall && <span style={{ marginLeft: 6 }}>{copySuccess ? 'Copied!' : 'Share'}</span>}
          </button>

          {/* PDF */}
          <button style={{ ...s.actionBtn, ...s.pdfBtn }} onClick={handlePDFExport} disabled={exportingPDF}>
            {exportingPDF ? '…' : '⬇'}{!isSmall && <span style={{ marginLeft: 6 }}>{exportingPDF ? 'Generating' : 'PDF'}</span>}
          </button>

          {/* iPromo link — hide on small */}
          {!isMobile && productData?.sourceUrl && (
            <a href={productData.sourceUrl} target="_blank" rel="noopener noreferrer" style={s.extLink}>
              View on iPromo ↗
            </a>
          )}
        </div>
      </header>

      {/* ── Main layout — responsive ── */}
      <div style={{
        ...s.main,
        flexDirection: isMobile ? 'column' : 'row',
        overflow: isMobile ? 'auto' : 'hidden',
      }}>

        {/* 3D Viewer */}
        <div style={{
          ...s.viewerPane,
          // Mobile: fixed height so panel is reachable by scrolling
          // Desktop: flex-1 fills remaining height
          flex:      isMobile ? 'none' : 1,
          height:    isMobile ? '55vw' : undefined,
          minHeight: isMobile ? 280    : 400,
          maxHeight: isMobile ? 520    : undefined,
        }}>
          {isPlacing && (
            <div style={s.placingOverlay}>
              👆 Click on model to place logo
            </div>
          )}
          <Viewer3D
            ref={viewerRef}
            glbUrl={glbUrl}
            color={selectedColor?.hex}
            logoDataUrl={logoDataUrl}
            logoPosition={logoPosition}
            logoScale={logoScale}
            onReady={() => console.log('[App] 3D ready')}
            onPlacingChange={handlePlacingChange}
          />
          <div style={s.hint}>
            {isMobile ? '👆 Drag to rotate · Pinch to zoom' : '🖱 Drag to rotate · Scroll to zoom'}
          </div>
        </div>

        {/* Right / Bottom panel */}
        <aside style={{
          ...s.panel,
          // Mobile: full width, auto height, border on top
          width:         isMobile ? '100%' : 280,
          flexShrink:    0,
          borderLeft:    isMobile ? 'none' : '1px solid rgba(255,255,255,0.08)',
          borderTop:     isMobile ? '1px solid rgba(255,255,255,0.08)' : 'none',
          overflowY:     'auto',
          // On mobile the parent already scrolls, cap panel at reasonable max
          maxHeight:     isMobile ? 'none' : undefined,
        }}>
          <ColorPanel
            colors={productData?.colors || []}
            selectedHex={selectedColor?.hex}
            onSelect={handleColorSelect}
          />
          <LogoUploader
            logoDataUrl={logoDataUrl}
            logoScale={logoScale}
            logoPosition={logoPosition}
            onLogo={setLogoDataUrl}
            onScale={setLogoScale}
            onPosition={setLogoPosition}
            isPlacing={isPlacing}
            onReposition={handleReposition}
          />
          {productData?.primaryImage && (
            <div style={s.refWrap}>
              <p style={s.refLabel}>Reference</p>
              <img src={productData.primaryImage} alt={productData.productName} style={s.refImg} />
              {/* Show iPromo link here on mobile */}
              {isMobile && productData.sourceUrl && (
                <a href={productData.sourceUrl} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'block', marginTop: 10, fontSize: 12, color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>
                  View on iPromo ↗
                </a>
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = {
  app: {
    height: '100vh',
    background: '#0f0f1a',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: "'Inter',-apple-system,sans-serif",
    color: '#fff',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 16px',
    background: 'rgba(255,255,255,0.03)',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    flexShrink: 0,
    gap: 8,
    flexWrap: 'wrap',
  },
  headerLeft: {
    display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1,
  },
  backBtn: {
    background: 'rgba(255,255,255,0.07)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: 'rgba(255,255,255,0.7)',
    borderRadius: 8, padding: '7px 12px',
    cursor: 'pointer', fontSize: 13, fontFamily: 'inherit', flexShrink: 0,
  },
  headerTitle: {
    fontWeight: 700, margin: 0, color: '#fff',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  sku:  { fontSize: 11, color: 'rgba(255,255,255,0.4)' },
  headerActions: { display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 },
  actionBtn: {
    background: 'rgba(99,102,241,0.15)',
    border: '1px solid rgba(99,102,241,0.35)',
    color: '#a5b4fc', borderRadius: 8,
    padding: '7px 12px', cursor: 'pointer',
    fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
    display: 'flex', alignItems: 'center',
  },
  pdfBtn: {
    background: 'linear-gradient(135deg,#6366f1,#4f46e5)',
    border: 'none', color: '#fff',
    boxShadow: '0 3px 10px rgba(99,102,241,0.35)',
  },
  extLink: { fontSize: 12, color: 'rgba(255,255,255,0.4)', textDecoration: 'none' },
  main: {
    display: 'flex', flex: 1, minHeight: 0,
  },
  viewerPane: {
    position: 'relative',
  },
  placingOverlay: {
    position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
    background: 'rgba(37,99,235,0.92)', padding: '9px 20px', borderRadius: 24,
    fontSize: 13, fontWeight: 600, color: '#fff', zIndex: 10,
    pointerEvents: 'none', whiteSpace: 'nowrap',
    boxShadow: '0 4px 20px rgba(37,99,235,0.5)',
  },
  hint: {
    position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)',
    background: 'rgba(0,0,0,0.5)', color: 'rgba(255,255,255,0.5)',
    fontSize: 11, padding: '5px 14px', borderRadius: 20,
    backdropFilter: 'blur(10px)', pointerEvents: 'none', whiteSpace: 'nowrap',
  },
  panel: {
    background: 'rgba(255,255,255,0.03)',
  },
  refWrap: { padding: 16, borderTop: '1px solid rgba(255,255,255,0.08)' },
  refLabel: {
    fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
    textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', margin: '0 0 10px',
  },
  refImg: {
    width: '100%', borderRadius: 8,
    objectFit: 'contain', maxHeight: 160,
    background: 'rgba(255,255,255,0.05)',
  },
  errWrap: {
    minHeight: '100vh', background: '#0f0f1a',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: "'Inter',-apple-system,sans-serif",
  },
  errCard:   { textAlign: 'center', padding: 48, maxWidth: 400 },
  errTitle:  { color: '#fff', fontSize: 22, fontWeight: 700, margin: '0 0 12px' },
  errMsg:    { color: 'rgba(255,255,255,0.5)', fontSize: 14, marginBottom: 28, lineHeight: 1.6 },
  retryBtn:  {
    background: 'linear-gradient(135deg,#6366f1,#4f46e5)',
    border: 'none', color: '#fff', borderRadius: 10,
    padding: '12px 28px', cursor: 'pointer', fontSize: 14, fontWeight: 700, fontFamily: 'inherit',
  },
};