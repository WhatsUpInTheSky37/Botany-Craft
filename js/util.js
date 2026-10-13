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
BC.PLAYER_COLORS = ['#4f7a3a', '#e3a62b', '#d8405a', '#3a7ac8', '#8a4ac8', '#e8702a', '#2fb5a0', '#f0e0a0'];

// Crafting recipes. `match` picks an inventory item; `n` is how many are consumed.
BC.RECIPES = [
  { id: 'planks', name: 'Planks', out: { type: 'block', id: 19, count: 4 }, ins: [{ label: 'any log', n: 1, match: it => it.type === 'block' && BC.BLOCKS[it.id] && BC.BLOCKS[it.id].log && BC.BLOCKS[it.id].log !== 'cactus' }],
    note: 'One log splits into four planks. Build walls, floors and raised beds with them.' },
  { id: 'fence', name: 'Fence posts', out: { type: 'block', id: 18, count: 2 }, ins: [{ label: 'planks', n: 2, match: it => it.type === 'block' && it.id === 19 }],
    note: 'Fences keep deer, hares and rabbits off your crops. Fence all four sides.' },
  { id: 'rope', name: 'Rope', out: { type: 'material', id: 'rope', count: 1 }, ins: [{ label: 'plant fibre', n: 3, match: it => it.type === 'material' && it.id === 'fibre' }],
    note: 'Twisted plant fibre. People have made cordage from cattail, agave (sisal), nettle and bark for 30,000 years. Use it to lead large animals.' },
  { id: 'compost', name: 'Compost', out: { type: 'compost', count: 1 }, ins: [{ label: 'plant fibre', n: 4, match: it => it.type === 'material' && it.id === 'fibre' }],
    note: 'Dry plant matter rots down into compost. Slower than the harvest route, but it uses anything green.' },
];
BC.FIBRE_PLANTS = { big_bluestem: 2, cattail: 2, wild_rice: 1, agave: 3, sphagnum: 1, fireweed: 1, pineapple: 1 };
BC.MATERIALS = { fibre: { name: 'Plant fibre', desc: 'Stringy leaves and stems. Craft 3 into rope.' }, rope: { name: 'Rope', desc: 'Tap a large animal to lead it; tap again to let go.' } };
BC.isSmallAnimal = d => !!(d.flies || (d.scale && d.scale <= 0.6));
BC.HAND = { type: 'tool', id: 'hand' };
