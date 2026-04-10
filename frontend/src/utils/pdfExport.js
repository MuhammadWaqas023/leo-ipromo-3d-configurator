/**
 * pdfExport.js
 * 
 * Generates a branded PDF mockup containing:
 *   - iPromo header with 27-year anniversary logo
 *   - 3D canvas screenshot
 *   - Product name, color, and SKU
 *   - iPromo footer with contact info
 */

import { jsPDF } from 'jspdf';

// iPromo brand colors
const IPROMO_BLUE = [0, 82, 165];       // #0052A5
const IPROMO_DARK = [20, 20, 40];
const LIGHT_GRAY = [245, 245, 248];

/**
 * Capture the Three.js canvas as a PNG data URL
 * @param {HTMLCanvasElement} canvas - The Three.js renderer canvas
 */
function captureCanvas(canvas) {
  if (!canvas) throw new Error('No canvas found');
  return canvas.toDataURL('image/png', 1.0);
}

/**
 * Fetch iPromo anniversary logo from their website
 * Falls back to a text-based header if fetch fails
 */
async function fetchIPromoLogo() {
  try {
    const response = await fetch('https://www.ipromo.com/skin/frontend/ultimo/ipromo/images/logo.png');
    if (!response.ok) throw new Error('Logo fetch failed');
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null; // Will fall back to text header
  }
}

/**
 * Main PDF export function
 * 
 * @param {Object} options
 * @param {HTMLCanvasElement} options.canvas    - Three.js canvas element
 * @param {string} options.productName          - e.g. "Crosswind Quarter-Zip Sweatshirt"
 * @param {string} options.selectedColor        - Color name e.g. "Navy"
 * @param {string} options.selectedColorHex     - Hex e.g. "#001f5b"
 * @param {string} options.sku                  - Product SKU (optional)
 * @param {string} options.productUrl           - iPromo product page URL
 */
export async function exportToPDF({
  canvas,
  productName,
  selectedColor,
  selectedColorHex,
  sku,
  productUrl,
}) {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageW = 210;
  const pageH = 297;
  const margin = 15;
  const contentW = pageW - margin * 2;

  pdf.setFillColor(...IPROMO_BLUE);
  pdf.rect(0, 0, pageW, 35, 'F');

  const logoData = await fetchIPromoLogo();

  if (logoData) {
    pdf.addImage(logoData, 'PNG', margin, 8, 50, 18);
  } else {
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(22);
    pdf.setFont('helvetica', 'bold');
    pdf.text('iPromo', margin, 20);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Celebrating 27 Years of Promotional Excellence', margin, 27);
  }

  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.text('3D Product Mockup', pageW - margin, 15, { align: 'right' });
  pdf.text(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), pageW - margin, 22, { align: 'right' });

  let y = 45;

  pdf.setTextColor(...IPROMO_DARK);
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.text(productName, margin, y);
  y += 7;

  if (selectedColorHex) {
    const hexRgb = hexToRgb(selectedColorHex);
    pdf.setFillColor(...hexRgb);
    pdf.roundedRect(margin, y, 8, 5, 1, 1, 'F');
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(100, 100, 100);
    pdf.text(`Color: ${selectedColor || selectedColorHex}`, margin + 11, y + 4);
  }

  if (sku) {
    pdf.setTextColor(150, 150, 150);
    pdf.setFontSize(9);
    pdf.text(`SKU: ${sku}`, pageW - margin, y + 4, { align: 'right' });
  }

  y += 12;

  let mockupImg;
  try {
    mockupImg = captureCanvas(canvas);
  } catch (err) {
    console.warn('[PDF] Could not capture canvas:', err);
  }

  if (mockupImg) {
    pdf.setFillColor(...LIGHT_GRAY);
    pdf.roundedRect(margin, y, contentW, 130, 3, 3, 'F');

    const imgMaxW = contentW - 10;
    const imgMaxH = 120;
    pdf.addImage(mockupImg, 'PNG', margin + 5, y + 5, imgMaxW, imgMaxH, '', 'FAST');
    y += 138;
  }

  pdf.setDrawColor(...IPROMO_BLUE);
  pdf.setLineWidth(0.5);
  pdf.line(margin, y, pageW - margin, y);
  y += 8;

  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...IPROMO_DARK);
  pdf.text('Product Details', margin, y);
  y += 7;

  const details = [
    ['Product', productName],
    ['Selected Color', `${selectedColor || 'N/A'} ${selectedColorHex ? `(${selectedColorHex})` : ''}`],
    ...(sku ? [['Item #', sku]] : []),
    ['Imprint Methods', 'Screen Print, Embroidery, Heat Transfer'],
    ['Customization', 'Logo placement on chest, sleeve, or back'],
  ];

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);

  details.forEach(([label, value]) => {
    pdf.setTextColor(100, 100, 100);
    pdf.text(`${label}:`, margin, y);
    pdf.setTextColor(...IPROMO_DARK);
    pdf.text(value, margin + 45, y);
    y += 6;
  });

  y += 6;

  pdf.setFillColor(...IPROMO_BLUE);
  pdf.roundedRect(margin, y, contentW, 18, 3, 3, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Ready to Order?', pageW / 2, y + 7, { align: 'center' });
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Visit ipromo.com or call (888) 994-7766 to speak with a specialist', pageW / 2, y + 13, { align: 'center' });

  pdf.setFillColor(240, 240, 245);
  pdf.rect(0, pageH - 15, pageW, 15, 'F');
  pdf.setTextColor(120, 120, 140);
  pdf.setFontSize(7.5);
  pdf.setFont('helvetica', 'normal');
  pdf.text('iPromo.com  |  (888) 994-7766  |  Celebrating 27 Years of Promotional Excellence', pageW / 2, pageH - 8, { align: 'center' });
  pdf.text('This mockup is for visualization purposes only. Final product colors may vary slightly.', pageW / 2, pageH - 4, { align: 'center' });

  const filename = `iPromo-Mockup-${productName.replace(/[^a-z0-9]/gi, '-').slice(0, 40)}.pdf`;
  pdf.save(filename);
}

/** Convert hex string to [r, g, b] array */
function hexToRgb(hex) {
  const clean = hex.replace('#', '');
  const full = clean.length === 3
    ? clean.split('').map(c => c + c).join('')
    : clean;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}