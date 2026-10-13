window.BC = window.BC || {};
BC.util = {
  clamp: (v, a, b) => v < a ? a : v > b ? b : v,
  lerp: (a, b, t) => a + (b - a) * t,
  rng(seed) { let s = (seed >>> 0) || 1; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; },
  hash2(x, y, seed) { let h = (x * 374761393 + y * 668265263 + seed * 1442695041) | 0; h = (h ^ (h >>> 13)) * 1274126177; h = h ^ (h >>> 16); return (h >>> 0) / 4294967296; },
  // 2D fractal value noise, output ~0..1
  noise2(seed) {
    const h = BC.util.hash2; const sm = t => t * t * (3 - 2 * t);
    const base = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y); const tx = sm(x - xi), ty = sm(y - yi); const a = h(xi, yi, seed), b = h(xi + 1, yi, seed), c = h(xi, yi + 1, seed), d = h(xi + 1, yi + 1, seed); return (a + (b - a) * tx) * (1 - ty) + (c + (d - c) * tx) * ty; };
    return (x, y) => { let v = 0, amp = 0.5, f = 1, tot = 0; for (let o = 0; o < 4; o++) { v += base(x * f, y * f) * amp; tot += amp; amp *= 0.5; f *= 2.1; } return v / tot; };
  },
  hashStr(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; },
  isTouch: () => ('ontouchstart' in window || navigator.maxTouchPoints > 0) && !window.matchMedia('(pointer: fine)').matches,
  esc: s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])),
};
