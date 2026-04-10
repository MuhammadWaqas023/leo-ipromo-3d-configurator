/**
 * colorMap.js
 * 
 * Fallback color name → hex lookup table.
 * Used when iPromo swatches don't include hex values directly.
 * Covers the most common apparel colors in their catalog.
 */

const COLOR_MAP = {
  // Blacks & Grays
  'black': '#1a1a1a',
  'jet black': '#1a1a1a',
  'charcoal': '#36454f',
  'dark charcoal': '#2b2b2b',
  'graphite': '#474747',
  'smoke': '#738276',
  'grey': '#808080',
  'gray': '#808080',
  'light grey': '#c0c0c0',
  'light gray': '#c0c0c0',
  'heather grey': '#b2b2b2',
  'heather gray': '#b2b2b2',
  'dark grey': '#545454',
  'dark gray': '#545454',
  'ash': '#b2b2b2',
  'silver': '#c0c0c0',

  // Whites & Creams
  'white': '#f5f5f5',
  'natural': '#f5f0e8',
  'ivory': '#fffff0',
  'cream': '#fffdd0',
  'off white': '#faf9f6',

  // Blues
  'navy': '#001f5b',
  'navy blue': '#001f5b',
  'dark navy': '#0a1628',
  'royal': '#2a52be',
  'royal blue': '#2a52be',
  'blue': '#1e40af',
  'light blue': '#add8e6',
  'columbia blue': '#9bddff',
  'sky blue': '#87ceeb',
  'carolina blue': '#56a0d3',
  'steel blue': '#4682b4',
  'deep blue': '#00008b',
  'ocean': '#006994',
  'teal': '#008080',
  'dark teal': '#005f5f',
  'turquoise': '#40e0d0',
  'denim': '#1560bd',
  'slate': '#708090',
  'slate blue': '#6a5acd',
  'cobalt': '#0047ab',
  'sapphire': '#0f52ba',
  'indigo': '#4b0082',

  // Reds & Pinks
  'red': '#cc0000',
  'dark red': '#8b0000',
  'cardinal': '#c41e3a',
  'crimson': '#dc143c',
  'scarlet': '#ff2400',
  'maroon': '#800000',
  'burgundy': '#800020',
  'wine': '#722f37',
  'garnet': '#733635',
  'pink': '#ffc0cb',
  'hot pink': '#ff69b4',
  'light pink': '#ffb6c1',
  'rose': '#ff007f',
  'coral': '#ff6b6b',
  'salmon': '#fa8072',
  'raspberry': '#e30b5c',

  // Greens
  'green': '#228b22',
  'dark green': '#006400',
  'forest green': '#228b22',
  'hunter green': '#355e3b',
  'olive': '#808000',
  'olive green': '#6b8e23',
  'army green': '#4b5320',
  'sage': '#b2ac88',
  'mint': '#98ff98',
  'lime': '#00ff00',
  'lime green': '#32cd32',
  'kelly green': '#4cbb17',
  'emerald': '#50c878',
  'seafoam': '#71eeb8',
  'jade': '#00a86b',

  // Yellows & Oranges
  'yellow': '#ffd700',
  'gold': '#ffd700',
  'old gold': '#cfb53b',
  'bright yellow': '#ffff00',
  'lemon': '#fff44f',
  'orange': '#ff6600',
  'burnt orange': '#cc5500',
  'tangerine': '#f28500',
  'amber': '#ffbf00',
  'mustard': '#ffdb58',

  // Purples
  'purple': '#6a0dad',
  'dark purple': '#4b0082',
  'light purple': '#b19cd9',
  'lavender': '#e6e6fa',
  'violet': '#ee82ee',
  'plum': '#8e4585',
  'eggplant': '#614051',
  'grape': '#6f2da8',
  'mauve': '#e0b0ff',

  // Browns & Tans
  'brown': '#8b4513',
  'dark brown': '#654321',
  'tan': '#d2b48c',
  'khaki': '#c3b091',
  'beige': '#f5f5dc',
  'camel': '#c19a6b',
  'sand': '#c2b280',
  'mocha': '#967969',
  'chocolate': '#7b3f00',
  'coffee': '#6f4e37',
  'stone': '#8e8880',
  'taupe': '#8b8589',

  // Specialty
  'camo': '#78866b',
  'camouflage': '#78866b',
  'tie dye': '#9b59b6',
  'heather navy': '#2c3e6b',
  'heather blue': '#5b7fa6',
  'heather red': '#b05050',
  'heather green': '#5a8a5a',
  'heather charcoal': '#5a5a5a',
  'heather black': '#3d3d3d',
  'heather purple': '#7a5a9a',
};

/**
 * Look up a hex value by color name (case-insensitive)
 * Returns a default gray if the color name isn't found
 */
function getHexByName(colorName) {
  if (!colorName) return '#808080';
  const key = colorName.toLowerCase().trim();
  return COLOR_MAP[key] || '#808080';
}

module.exports = { COLOR_MAP, getHexByName };