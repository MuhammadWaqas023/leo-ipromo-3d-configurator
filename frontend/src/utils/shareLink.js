/**
 * shareLink.js
 * 
 * Encodes/decodes the full configurator state into a URL.
 * Anyone with the link sees the exact product + color + logo — no login needed.
 * 
 * State packed into URL:
 *   ?config=<base64(JSON)>
 */

/**
 * Encode the current configuration into a shareable URL
 * @param {Object} state - { productUrl, color, logoDataUrl }
 * @returns {string} Full URL with ?config= param
 */
export function encodeShareLink(state) {
  const payload = {
    u: state.productUrl,                  // product URL
    c: state.color,                       // selected hex color
    l: state.logoDataUrl || null,         // logo as base64 data URL (null if none)
    lx: state.logoPosition?.x ?? 0,      // logo X position
    ly: state.logoPosition?.y ?? 0,      // logo Y position  
    ls: state.logoScale ?? 1,            // logo scale
    v: 1,                                 // schema version
  };

  const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
  const url = new URL(window.location.href);
  url.search = '';
  url.searchParams.set('config', encoded);
  return url.toString();
}

/**
 * Decode a ?config= param back into state
 * @returns {Object|null} state object, or null if no config in URL
 */
export function decodeShareLink() {
  const params = new URLSearchParams(window.location.search);
  const encoded = params.get('config');
  if (!encoded) return null;

  try {
    const json = decodeURIComponent(escape(atob(encoded)));
    const payload = JSON.parse(json);

    return {
      productUrl: payload.u,
      color: payload.c,
      logoDataUrl: payload.l,
      logoPosition: { x: payload.lx ?? 0, y: payload.ly ?? 0 },
      logoScale: payload.ls ?? 1,
    };
  } catch (err) {
    console.warn('[ShareLink] Failed to decode config param:', err);
    return null;
  }
}

/**
 * Copy text to clipboard, returns true on success
 */
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older browsers
    const el = document.createElement('textarea');
    el.value = text;
    el.style.position = 'fixed';
    el.style.opacity = '0';
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(el);
    return ok;
  }
}