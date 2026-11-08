// Shared by tailwind.config.js (Node) and lib/theme.tsx (app), so the CSS
// variable names and values come from one place: constants/tokens.json.
const tokens = require('./tokens.json');

/** 'bg/canvas' -> '--bg-canvas' */
const cssVarName = (token) => `--${token.replace('/', '-')}`;

/** '#1642E5' -> '22 66 229'; '#08175061' -> 'rgba(8, 23, 80, 0.38)' */
function cssVarValue(hex) {
  const h = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  if (h.length === 8) {
    const a = Math.round((parseInt(h.slice(6, 8), 16) / 255) * 100) / 100;
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }
  return `${r} ${g} ${b}`;
}

/** { '--bg-canvas': '242 243 247', ... } for one mode */
function cssVarsFor(mode) {
  const out = {};
  for (const [token, hex] of Object.entries(tokens[mode])) {
    out[cssVarName(token)] = cssVarValue(hex);
  }
  return out;
}

/**
 * Tailwind colour map keeping Figma names searchable:
 * 'bg/canvas' -> bg-bg-canvas, 'text/secondary' -> text-text-secondary,
 * 'cat/food-tint' -> bg-cat-food-tint. Opacity modifiers work (bg-cat-food/30),
 * except on bg/scrim, which already carries its own alpha.
 */
function tailwindColors() {
  const colors = {};
  for (const [token, hex] of Object.entries(tokens.light)) {
    const [group, name] = token.split('/');
    colors[group] = colors[group] || {};
    colors[group][name] =
      hex.length === 9 ? `var(${cssVarName(token)})` : `rgb(var(${cssVarName(token)}) / <alpha-value>)`;
  }
  return colors;
}

module.exports = { cssVarsFor, tailwindColors };
