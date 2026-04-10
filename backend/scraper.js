const axios = require('axios');
const cheerio = require('cheerio');
const { getHexByName } = require('./colorMap');


const httpClient = axios.create({
  timeout: 20000,
  headers: {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
      '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    Accept:
      'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Cache-Control': 'no-cache',
    Referer: 'https://www.ipromo.com/',
  },
});


/** Resolve a possibly-relative URL against iPromo's origin */
function toAbsoluteUrl(url) {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  if (url.startsWith('//')) return 'https:' + url;
  return 'https://www.ipromo.com' + (url.startsWith('/') ? '' : '/') + url;
}

/** Pick the highest-resolution candidate from a srcset string */
function getBestFromSrcset(srcset) {
  if (!srcset) return '';
  const parts = srcset.split(',').map((s) => s.trim());
  const last = parts[parts.length - 1];
  return last ? last.split(/\s+/)[0] : '';
}

/**
 * Try to extract a hex color from an inline style string.
 * Handles both #rrggbb and rgb(r,g,b) forms.
 */
function extractHexFromStyle(style) {
  if (!style) return null;

  const hexMatch = style.match(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/);
  if (hexMatch) return hexMatch[0];

  const rgbMatch = style.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/);
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1]).toString(16).padStart(2, '0');
    const g = parseInt(rgbMatch[2]).toString(16).padStart(2, '0');
    const b = parseInt(rgbMatch[3]).toString(16).padStart(2, '0');
    return `#${r}${g}${b}`;
  }

  return null;
}


const COLOR_SUFFIX_MAP = {
  aq: 'Aqua', nv: 'Navy', bk: 'Black', wh: 'White', gy: 'Grey',
  rd: 'Red', bl: 'Blue', ry: 'Royal Blue', cb: 'Carolina Blue',
  gn: 'Green', mg: 'Maroon', pp: 'Purple', og: 'Orange',
  pk: 'Pink', tl: 'Teal', br: 'Brown', yl: 'Yellow',
};

function colorNameFromImageUrl(src) {
  const match = src.match(/_([a-z]{2,4})\.(jpg|png|webp)$/i);
  if (match) {
    const code = match[1].toLowerCase();
    return COLOR_SUFFIX_MAP[code] || null;
  }
  return null;
}

/**
 * Scrape a single iPromo product page.
 * @param {string} url  Full iPromo product URL
 * @returns {Object}    { productName, primaryImage, colors, sku, sourceUrl }
 */
async function scrapeProduct(url) {
  console.log(`[Scraper] Starting scrape: ${url}`);

  let html;
  try {
    const response = await httpClient.get(url);
    html = response.data;
  } catch (err) {
    throw new Error(`Failed to fetch product page: ${err.message}`);
  }

  const $ = cheerio.load(html);

  const productName =
    $('h1.product-name').first().text().trim() ||
    $('h1[itemprop="name"]').first().text().trim() ||
    $('h1').first().text().trim() ||
    $('meta[property="og:title"]').attr('content') ||
    'iPromo Product';

  console.log(`[Scraper] Product name: ${productName}`);

  let primaryImage = '';

  if (!primaryImage) {
    const fotoramaSelectors = [
      '[data-main-image]',
      '.fotorama__stage img',
      '.fotorama__img',
      '[class*="fotorama"] img',
      '[data-img]',
    ];

    for (const sel of fotoramaSelectors) {
      const el = $(sel).first();
      if (!el.length) continue;

      primaryImage =
        el.attr('data-zoom') ||
        el.attr('data-zoom-image') ||
        el.attr('data-img') ||
        el.attr('data-src') ||
        el.attr('src') ||
        '';

      if (primaryImage && primaryImage.includes('/cache/') && primaryImage.match(/\d+x\d+/)) {
        const zoomCandidate =
          el.attr('data-zoom') || el.attr('data-zoom-image') || '';
        if (zoomCandidate) primaryImage = zoomCandidate;
      }

      if (primaryImage) break;
    }
  }

  if (!primaryImage) {
    const imgSelectors = [
      '.product-image-main img',
      '.main-product-image img',
      '#product-image img',
      '.product-img-box img',
      '[class*="product-image"] img',
      '.gallery-image img',
    ];

    for (const sel of imgSelectors) {
      const el = $(sel).first();
      if (!el.length) continue;

      primaryImage =
        el.attr('data-zoom-image') ||
        el.attr('data-src') ||
        getBestFromSrcset(el.attr('srcset')) ||
        el.attr('src') ||
        '';

      if (primaryImage) break;
    }
  }

  if (!primaryImage) {
    primaryImage = $('meta[property="og:image"]').attr('content') || '';
  }

  if (!primaryImage) {
    $('img').each((_, el) => {
      const src = $(el).attr('src') || '';
      if (
        src &&
        !src.includes('logo') &&
        !src.includes('icon') &&
        !src.includes('sprite') &&
        src.match(/\.(jpg|jpeg|png|webp)/i)
      ) {
        primaryImage = src;
        return false; // break
      }
    });
  }

  primaryImage = toAbsoluteUrl(primaryImage);

  if (primaryImage.includes('/cache/') && primaryImage.includes('x')) {
    primaryImage = primaryImage.replace(/\/cache\/[^/]*\//, '/cache/800x800/');
  }

  console.log(`[Scraper] Primary image: ${primaryImage}`);

  const colors = [];
  const seenNames = new Set();

  function addColor(name, hex) {
    const cleanName = (name || '').replace(/\s*\([^)]*\)\s*$/, '').trim(); // strip " (AQ)"
    if (!cleanName || seenNames.has(cleanName.toLowerCase())) return;
    seenNames.add(cleanName.toLowerCase());
    colors.push({
      name: cleanName,
      hex: hex || getHexByName(cleanName),
    });
  }

  $('[data-attr-color]').each((_, el) => {
    const raw = $(el).attr('data-attr-color') || '';
    const style = $(el).attr('style') || '';
    const hex = extractHexFromStyle(style);
    addColor(raw, hex);
  });

  $('ul.color-swatches li, ul[class*="swatch"] li, ul[id*="color"] li').each((_, el) => {
    const name =
      $(el).attr('title') ||
      $(el).find('a').attr('title') ||
      $(el).find('img').attr('alt') ||
      $(el).find('span').first().text().trim();
    const style = $(el).attr('style') || $(el).find('[style]').first().attr('style') || '';
    const hex = extractHexFromStyle(style);
    addColor(name, hex);
  });

  $('[data-color], [data-colour]').each((_, el) => {
    const name =
      $(el).attr('data-color') ||
      $(el).attr('data-colour') ||
      $(el).attr('title') ||
      $(el).attr('alt');
    const style = $(el).attr('style') || '';
    addColor(name, extractHexFromStyle(style));
  });

  $('[class*="color-swatch"], [class*="colour-swatch"], [class*="swatch-color"]').each((_, el) => {
    const name =
      $(el).attr('title') ||
      $(el).attr('aria-label') ||
      $(el).attr('data-color') ||
      $(el).find('span').first().text().trim();
    const style = $(el).attr('style') || $(el).find('[style]').first().attr('style') || '';
    addColor(name, extractHexFromStyle(style));
  });

  $('select[id*="color"] option, select[name*="color"] option, select[id*="colour"] option').each(
    (_, el) => {
      const name = $(el).text().trim();
      const hex = $(el).attr('data-hex') || $(el).attr('value');
      if (name && !['select', 'choose', '--'].includes(name.toLowerCase())) {
        addColor(name, hex && hex.startsWith('#') ? hex : null);
      }
    }
  );

  $('[class*="color"] img, [class*="swatch"] img, [data-attr-color] img, li.item img').each(
    (_, el) => {
      const altName = $(el).attr('alt') || $(el).attr('title') || '';
      const srcName = colorNameFromImageUrl($(el).attr('src') || '');
      addColor(altName || srcName, null);
    }
  );

  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const json = JSON.parse($(el).html());
      const offers =
        json.offers ||
        json['@graph']?.find((n) => n['@type'] === 'Product')?.offers;
      if (Array.isArray(offers)) {
        offers.forEach((offer) => {
          if (offer.itemOffered?.color) addColor(offer.itemOffered.color, null);
        });
      }
    } catch (_e) {
    }
  });

  const scriptContent = $('script:not([src])')
    .map((_, el) => $(el).html())
    .get()
    .join('\n');

  const colorJsonMatch = scriptContent.match(/colors?\s*[:=]\s*(\[[\s\S]*?\])/);
  if (colorJsonMatch) {
    try {
      const colorArr = JSON.parse(colorJsonMatch[1]);
      colorArr.forEach((c) => {
        if (c.name) addColor(c.name, c.hex || c.color || c.value);
      });
    } catch (_e) {
    }
  }

  if (colors.length === 0) {
    console.log('[Scraper] No colors found via DOM — using defaults');
    ['Black', 'Navy', 'Grey', 'White', 'Red', 'Royal Blue'].forEach((name) =>
      addColor(name, null)
    );
  }

  console.log(
    `[Scraper] Found ${colors.length} colors:`,
    colors.map((c) => c.name).join(', ')
  );

  const sku =
    $('[itemprop="sku"]').first().text().trim() ||
    $('[class*="product-sku"]').first().text().trim() ||
    $('meta[name="product-id"]').attr('content') ||
    (() => {
      let found = '';
      $('*').each((_, el) => {
        const text = $(el).clone().children().remove().end().text().trim();
        const m = text.match(/Item\s*#\s*[:\-]?\s*([A-Z0-9\-]+)/i);
        if (m) { found = m[1]; return false; }
      });
      return found;
    })() ||
    '';

  return {
    productName: productName.replace(/\s+/g, ' '),
    primaryImage,
    colors,
    sku,
    sourceUrl: url,
  };
}

module.exports = { scrapeProduct };