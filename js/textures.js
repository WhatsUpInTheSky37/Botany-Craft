window.BC = window.BC || {};
// Procedural pixel-art texture atlas. Everything the game shows is drawn here at load time.
BC.Atlas = (function () {
  const TILE = 32, COLS = 32;
  const tiles = {}; let count = 0;
  let canvas, ctx;
  function rng(seed) { let s = seed >>> 0 || 1; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }
  function hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function hex(c) { const n = parseInt(c.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
  function rgb(a) { return `rgb(${a[0] | 0},${a[1] | 0},${a[2] | 0})`; }
  function shade(c, k) { const a = hex(c); return rgb([Math.min(255, a[0] * k), Math.min(255, a[1] * k), Math.min(255, a[2] * k)]); }
  function mix(c1, c2, t) { const a = hex(c1), b = hex(c2); return rgb([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]); }

  // ---- block tile painters ----
  function noise(g, base, varia, seed, scale) {
    const r = rng(seed); const b = hex(base); scale = scale || 1;
    for (let y = 0; y < TILE; y += scale) for (let x = 0; x < TILE; x += scale) {
      const k = 1 + (r() - 0.5) * varia; g.fillStyle = rgb([b[0] * k, b[1] * k, b[2] * k]); g.fillRect(x, y, scale, scale);
    }
  }
  function speck(g, color, n, seed, size) { const r = rng(seed); g.fillStyle = color; for (let i = 0; i < n; i++) g.fillRect((r() * TILE) | 0, (r() * TILE) | 0, size || 1, size || 1); }
  function grassTop(g, c1, c2, seed) { noise(g, c1, 0.18, seed, 2); const r = rng(seed + 7); g.fillStyle = c2; for (let i = 0; i < 90; i++) g.fillRect((r() * TILE) | 0, (r() * TILE) | 0, 1, 2); }
  function grassSide(g, dirt, c1, seed) { noise(g, dirt, 0.2, seed, 2); const r = rng(seed + 3); g.fillStyle = c1; g.fillRect(0, 0, TILE, 3); for (let x = 0; x < TILE; x++) { const h = 3 + ((r() * 5) | 0); g.fillRect(x, 0, 1, h); } g.fillStyle = shade(c1, 0.8); for (let x = 0; x < TILE; x += 3) g.fillRect(x, 0, 1, 2); }
  function cracks(g, color, seed, n) { const r = rng(seed); g.strokeStyle = color; g.lineWidth = 1; for (let i = 0; i < n; i++) { g.beginPath(); let x = r() * TILE, y = r() * TILE; g.moveTo(x, y); for (let k = 0; k < 4; k++) { x += (r() - 0.5) * 10; y += (r() - 0.5) * 10; g.lineTo(x, y); } g.stroke(); } }
  function bark(g, base, dark, seed) { noise(g, base, 0.15, seed, 1); const r = rng(seed + 1); g.fillStyle = dark; for (let i = 0; i < 14; i++) { const x = (r() * TILE) | 0; const y = (r() * TILE) | 0; g.fillRect(x, y, 1, 4 + ((r() * 14) | 0)); } g.fillStyle = shade(base, 1.2); for (let i = 0; i < 8; i++) { const x = (r() * TILE) | 0; g.fillRect(x, (r() * TILE) | 0, 1, 3 + ((r() * 8) | 0)); } }
  function rings(g, base, dark) { noise(g, base, 0.08, 5, 1); g.strokeStyle = dark; g.lineWidth = 1; for (let rr = 3; rr < 15; rr += 3) { g.beginPath(); g.arc(16, 16, rr, 0, Math.PI * 2); g.stroke(); } g.strokeStyle = shade(dark, 0.7); g.strokeRect(0.5, 0.5, 31, 31); }
  function leaves(g, color, seed) { noise(g, color, 0.3, seed, 2); const r = rng(seed + 9); g.fillStyle = shade(color, 0.68); for (let i = 0; i < 34; i++) g.fillRect((r() * TILE) | 0, (r() * TILE) | 0, 2, 2); g.fillStyle = shade(color, 1.35); for (let i = 0; i < 30; i++) g.fillRect((r() * TILE) | 0, (r() * TILE) | 0, 2, 1); }
  function planks(g, base, seam) { base = base || '#b08a52'; noise(g, base, 0.12, 44, 1); g.fillStyle = seam || shade(base, 0.62); for (let y = 7; y < TILE; y += 8) g.fillRect(0, y, TILE, 1); g.fillStyle = shade(base, 0.78); for (let i = 0; i < 6; i++) g.fillRect(3 + i * 5, 2 + (i % 2) * 8, 1, 3); }
  function clear(g) { g.clearRect(0, 0, TILE, TILE); }

  const BLOCK_PAINTERS = {
    grass_temperate: g => grassTop(g, '#5f9a3c', '#4d8a30', 1),
    grass_side_alfisol: g => grassSide(g, '#7a5a38', '#5f9a3c', 2),
    alfisol: g => { noise(g, '#7a5a38', 0.22, 3, 2); speck(g, '#5a3f26', 40, 4); speck(g, '#9a7a50', 20, 5); },
    grass_prairie: g => grassTop(g, '#9cb04a', '#8aa040', 6),
    grass_side_mollisol: g => grassSide(g, '#3a2c1e', '#9cb04a', 7),
    mollisol: g => { noise(g, '#3a2c1e', 0.25, 8, 2); speck(g, '#1e160e', 50, 9); speck(g, '#5a4a32', 20, 10); },
    sand: g => { noise(g, '#dcc07e', 0.1, 11, 1); speck(g, '#c9a86a', 60, 12); speck(g, '#f0e0a8', 30, 13); },
    caliche: g => { noise(g, '#e6dcc2', 0.08, 14, 2); cracks(g, '#c8bca0', 15, 5); speck(g, '#f8f4e8', 20, 16); },
    litter: g => { noise(g, '#5a4028', 0.25, 17, 2); speck(g, '#8a6a2a', 40, 18, 2); speck(g, '#3a7a2a', 15, 19, 2); speck(g, '#2a1a0a', 30, 20); },
    oxisol_side: g => grassSide(g, '#a04a2a', '#5a4028', 21),
    oxisol: g => { noise(g, '#a04a2a', 0.2, 22, 2); speck(g, '#7a3018', 40, 23); speck(g, '#c86a40', 25, 24); },
    moss: g => { noise(g, '#4f6e3a', 0.25, 25, 2); speck(g, '#7a9a4a', 50, 26, 2); speck(g, '#8a6a3a', 20, 27); },
    podzol_side: g => grassSide(g, '#cfc9bc', '#4f6e3a', 28),
    podzol_e: g => { noise(g, '#cfc9bc', 0.1, 29, 1); speck(g, '#aaa49a', 40, 30); speck(g, '#eeeae0', 30, 31); },
    podzol_b: g => { noise(g, '#b0602a', 0.25, 32, 2); speck(g, '#7a3a10', 40, 33); speck(g, '#d88a4a', 30, 34); },
    peat_top: g => { noise(g, '#3a2a1a', 0.3, 35, 2); speck(g, '#6a8a3a', 40, 36); speck(g, '#8a7a4a', 25, 37, 2); },
    peat: g => { noise(g, '#2a1f14', 0.3, 38, 1); const r = rng(39); g.fillStyle = '#4a3a22'; for (let i = 0; i < 30; i++) g.fillRect((r() * TILE) | 0, (r() * TILE) | 0, 3, 1); },
    gley: g => { noise(g, '#6e7a78', 0.12, 40, 2); speck(g, '#b06a3a', 15, 41, 2); speck(g, '#5a6a70', 30, 42); },
    stone: g => { noise(g, '#7d7d7d', 0.18, 43, 2); cracks(g, '#5a5a5a', 44, 4); speck(g, '#9a9a9a', 25, 45); },
    gravel: g => { noise(g, '#8a8578', 0.3, 46, 3); speck(g, '#5a5550', 30, 47, 2); },
    compost: g => { noise(g, '#3a2a1a', 0.3, 48, 2); speck(g, '#8a6a2a', 25, 49); speck(g, '#5a8a3a', 10, 50); speck(g, '#1a100a', 40, 51); },
    water: g => { noise(g, '#3a7ac8', 0.1, 52, 2); const r = rng(53); g.fillStyle = '#7ab8f0'; for (let i = 0; i < 12; i++) g.fillRect((r() * TILE) | 0, (r() * TILE) | 0, 4 + ((r() * 6) | 0), 1); },
    planks: g => planks(g),
    planks_birch: g => planks(g, '#e0d0a8'), planks_spruce: g => planks(g, '#9a6a3a'), planks_tropical: g => planks(g, '#a85a3a'), planks_cypress: g => planks(g, '#c49460'), planks_mesquite: g => planks(g, '#6a4a30'), planks_paloverde: g => planks(g, '#b8c070'), planks_palm: g => planks(g, '#c8a870'),
    boardwalk: g => { planks(g, '#9a7a4a'); g.fillStyle = '#3a2a1a'; for (let y = 7; y < TILE; y += 8) g.fillRect(0, y, TILE, 2); },
    bark_dark: g => noise(g, '#3a2a1a', 0.2, 70, 1),
    stem: g => noise(g, '#4a8a3a', 0.2, 71, 1),
    bookshelf: g => { planks(g, '#8a6a3a'); const cols = ['#a83a3a', '#3a5aa8', '#3a8a4a', '#d8a83a', '#7a3a8a', '#e8e0d0', '#2a2a2a']; const r = rng(72); for (let row = 0; row < 2; row++) { let x = 2; while (x < 29) { const w = 3 + ((r() * 3) | 0); g.fillStyle = cols[(r() * cols.length) | 0]; g.fillRect(x, 3 + row * 15, w, 11 - ((r() * 3) | 0)); x += w + 1; } } g.fillStyle = '#5a3a1a'; g.fillRect(0, 14, TILE, 2); g.fillRect(0, 29, TILE, 3); g.fillRect(0, 0, TILE, 2); },
    barrel_side: g => { noise(g, '#8a5a30', 0.1, 73, 1); g.fillStyle = '#5a3a1a'; for (let x = 0; x < TILE; x += 6) g.fillRect(x, 0, 1, TILE); g.fillStyle = '#6a6a6a'; g.fillRect(0, 4, TILE, 3); g.fillRect(0, 25, TILE, 3); g.fillStyle = '#9a9a9a'; g.fillRect(0, 5, TILE, 1); g.fillRect(0, 26, TILE, 1); },
    barrel_top: g => { noise(g, '#9a6a3a', 0.1, 74, 1); g.strokeStyle = '#5a3a1a'; g.lineWidth = 1; for (let rr = 4; rr < 16; rr += 4) { g.beginPath(); g.arc(16, 16, rr, 0, 6.283); g.stroke(); } g.strokeStyle = '#6a6a6a'; g.lineWidth = 2; g.beginPath(); g.arc(16, 16, 15, 0, 6.283); g.stroke(); },
    rainbarrel_top: g => { noise(g, '#3a7ac8', 0.1, 75, 2); speck(g, '#7ab8f0', 20, 76, 2); g.strokeStyle = '#6a6a6a'; g.lineWidth = 3; g.beginPath(); g.arc(16, 16, 14.5, 0, 6.283); g.stroke(); },
    crate: g => { planks(g, '#a88a5a'); g.fillStyle = '#6a4a2a'; g.fillRect(0, 0, TILE, 3); g.fillRect(0, 29, TILE, 3); g.fillRect(0, 0, 3, TILE); g.fillRect(29, 0, 3, TILE); g.save(); g.translate(16, 16); g.rotate(0.785); g.fillRect(-20, -1.5, 40, 3); g.restore(); },
    workbench_top: g => { planks(g, '#a07a48'); g.fillStyle = '#4a4a4a'; g.fillRect(4, 6, 12, 3); g.fillStyle = '#7a5a2a'; g.fillRect(16, 5, 10, 5); g.fillStyle = '#b8b8c0'; g.fillRect(6, 18, 18, 2); for (let x = 6; x < 24; x += 3) g.fillRect(x, 20, 1, 3); g.fillStyle = '#c84a2a'; g.fillRect(22, 24, 6, 4); },
    workbench_side: g => { planks(g, '#a07a48'); g.fillStyle = '#6a4a2a'; g.fillRect(0, 14, TILE, 2); g.fillStyle = '#3a2a1a'; g.fillRect(8, 18, 6, 10); g.fillRect(18, 18, 6, 10); },
    chest_top: g => { planks(g, '#9a6a3a'); g.fillStyle = '#5a3a1a'; g.fillRect(0, 0, TILE, 2); g.fillRect(0, 30, TILE, 2); g.fillRect(0, 0, 2, TILE); g.fillRect(30, 0, 2, TILE); g.fillStyle = '#c8a040'; g.fillRect(13, 26, 6, 6); },
    chest_front: g => { planks(g, '#9a6a3a'); g.fillStyle = '#5a3a1a'; g.fillRect(0, 10, TILE, 2); g.fillRect(0, 0, 2, TILE); g.fillRect(30, 0, 2, TILE); g.fillRect(0, 30, TILE, 2); g.fillStyle = '#c8a040'; g.fillRect(13, 7, 6, 7); g.fillStyle = '#3a2a1a'; g.fillRect(15, 10, 2, 2); },
    shingles: g => { noise(g, '#7a4a2a', 0.15, 77, 1); for (let row = 0; row < 4; row++) { const off = (row % 2) * 4; for (let x = -4; x < TILE; x += 8) { g.fillStyle = shade('#8a5a30', 0.9 + ((x + row) % 3) * 0.08); g.beginPath(); g.arc(x + off + 4, row * 8 + 6, 4.5, 0, Math.PI); g.fill(); g.fillRect(x + off, row * 8 - 2, 8, 8); g.fillStyle = '#3a2010'; g.fillRect(x + off, row * 8 + 6, 8, 1); } } },
    carved: g => { planks(g, '#9a7040'); g.fillStyle = '#5a3a1a'; g.strokeStyle = '#5a3a1a'; g.lineWidth = 1.5; g.strokeRect(3.5, 3.5, 25, 25); g.beginPath(); g.moveTo(16, 7); g.quadraticCurveTo(26, 10, 24, 20); g.quadraticCurveTo(16, 26, 9, 20); g.quadraticCurveTo(6, 10, 16, 7); g.stroke(); g.beginPath(); g.moveTo(16, 7); g.lineTo(16, 25); g.stroke(); },
    raisedbed_side: g => { planks(g, '#a08050'); g.fillStyle = '#3a2a1a'; g.fillRect(0, 0, TILE, 2); g.fillStyle = '#5a4a2a'; g.fillRect(0, 2, TILE, 1); },
    raisedbed_top: g => { noise(g, '#3a2a1a', 0.3, 48, 2); speck(g, '#8a6a2a', 25, 49); speck(g, '#5a8a3a', 10, 50); g.fillStyle = '#a08050'; g.fillRect(0, 0, TILE, 3); g.fillRect(0, 29, TILE, 3); g.fillRect(0, 0, 3, TILE); g.fillRect(29, 0, 3, TILE); },
    lantern: g => { noise(g, '#f0c850', 0.15, 78, 2); g.fillStyle = '#3a2a1a'; g.fillRect(0, 0, TILE, 3); g.fillRect(0, 29, TILE, 3); g.fillRect(0, 0, 3, TILE); g.fillRect(29, 0, 3, TILE); g.fillRect(15, 0, 2, TILE); g.fillRect(0, 15, TILE, 2); g.fillStyle = '#fff3c0'; g.fillRect(8, 8, 6, 6); g.fillRect(18, 18, 5, 5); },
    flame: g => { clear(g); g.fillStyle = '#f0a020'; g.beginPath(); g.moveTo(16, 2); g.quadraticCurveTo(28, 16, 16, 30); g.quadraticCurveTo(4, 16, 16, 2); g.fill(); g.fillStyle = '#fff060'; g.beginPath(); g.moveTo(16, 12); g.quadraticCurveTo(22, 20, 16, 28); g.quadraticCurveTo(10, 20, 16, 12); g.fill(); },
    torch_icon: g => { clear(g); g.fillStyle = '#3a2a1a'; g.fillRect(14, 12, 4, 20); g.fillStyle = '#f0a020'; g.beginPath(); g.arc(16, 9, 6, 0, 6.283); g.fill(); g.fillStyle = '#fff060'; g.beginPath(); g.arc(16, 10, 3, 0, 6.283); g.fill(); },
    terracotta: g => { noise(g, '#b8603a', 0.1, 79, 1); g.fillStyle = '#9a4a2a'; g.fillRect(0, 0, TILE, 4); },
    pot_top: g => { noise(g, '#3a2a1a', 0.3, 80, 2); g.strokeStyle = '#b8603a'; g.lineWidth = 4; g.strokeRect(2, 2, 28, 28); },
    pot_flower: g => { clear(g); g.fillStyle = '#4a8a3a'; g.fillRect(6, 18, 20, 6); g.fillStyle = '#e8508a'; for (let a = 0; a < 6; a++) { g.beginPath(); g.arc(16 + Math.cos(a) * 7, 12 + Math.sin(a) * 7, 4, 0, 6.283); g.fill(); } g.fillStyle = '#f0d040'; g.beginPath(); g.arc(16, 12, 3.5, 0, 6.283); g.fill(); },
    pot_icon: g => { clear(g); g.fillStyle = '#b8603a'; g.beginPath(); g.moveTo(6, 14); g.lineTo(26, 14); g.lineTo(23, 30); g.lineTo(9, 30); g.closePath(); g.fill(); g.fillStyle = '#4a8a3a'; g.fillRect(15, 6, 2, 9); g.fillStyle = '#e8508a'; g.beginPath(); g.arc(16, 6, 4, 0, 6.283); g.fill(); },
    birdhouse: g => { planks(g, '#c8a870'); g.fillStyle = '#1a1a1a'; g.beginPath(); g.arc(16, 15, 5, 0, 6.283); g.fill(); g.fillStyle = '#5a3a1a'; g.fillRect(13, 23, 6, 2); },
    trellis: g => { clear(g); g.fillStyle = '#8a6a3a'; for (let i = -1; i < 5; i++) { g.save(); g.translate(16, 16); g.rotate(0.785); g.fillRect(-24, i * 8 - 1.5, 48, 3); g.rotate(1.571); g.fillRect(-24, i * 8 - 1.5, 48, 3); g.restore(); } g.fillStyle = '#4a8a3a'; const r = rng(81); for (let i = 0; i < 12; i++) { g.beginPath(); g.ellipse(r() * 32, r() * 32, 3, 1.8, r() * 3, 0, 6.283); g.fill(); } },
    window: g => { clear(g); g.fillStyle = '#8a6a3a'; g.fillRect(0, 0, TILE, 3); g.fillRect(0, 29, TILE, 3); g.fillRect(0, 0, 3, TILE); g.fillRect(29, 0, 3, TILE); g.fillRect(15, 0, 2, TILE); g.fillRect(0, 15, TILE, 2); g.fillStyle = 'rgba(190,225,245,0.55)'; g.fillRect(3, 3, 12, 12); g.fillRect(17, 17, 12, 12); g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(4, 4, 3, 6); g.fillRect(18, 18, 3, 6); },
    sign: g => { planks(g, '#c8a870'); g.fillStyle = '#5a3a1a'; g.fillRect(0, 0, TILE, 2); g.fillRect(0, 30, TILE, 2); g.fillRect(0, 0, 2, TILE); g.fillRect(30, 0, 2, TILE); g.fillStyle = '#3a2a1a'; for (let y = 9; y < 26; y += 6) g.fillRect(6, y, 14 + ((y / 6) % 2) * 6, 2); },
    ladder: g => { clear(g); g.fillStyle = '#8a6a3a'; g.fillRect(3, 0, 4, TILE); g.fillRect(25, 0, 4, TILE); for (let y = 3; y < TILE; y += 8) g.fillRect(3, y, 26, 3); },
    windowbox_top: g => { noise(g, '#3a2a1a', 0.3, 82, 2); g.fillStyle = '#a08050'; g.fillRect(0, 0, TILE, 3); g.fillRect(0, 29, TILE, 3); g.fillRect(0, 0, 3, TILE); g.fillRect(29, 0, 3, TILE); const cols = ['#e8508a', '#f0d040', '#e03030', '#ffffff']; const r = rng(83); for (let i = 0; i < 9; i++) { g.fillStyle = cols[i % 4]; g.beginPath(); g.arc(5 + r() * 22, 5 + r() * 22, 3, 0, 6.283); g.fill(); } },
    windowbox_icon: g => { planks(g, '#a08050'); g.fillStyle = '#4a8a3a'; g.fillRect(0, 0, TILE, 8); const cols = ['#e8508a', '#f0d040', '#e03030']; for (let i = 0; i < 5; i++) { g.fillStyle = cols[i % 3]; g.beginPath(); g.arc(4 + i * 6, 4, 3, 0, 6.283); g.fill(); } },
    door: g => { planks(g, '#9a6a3a'); g.fillStyle = '#5a3a1a'; g.fillRect(0, 0, 2, TILE); g.fillRect(30, 0, 2, TILE); g.fillRect(0, 0, TILE, 2); g.fillRect(0, 30, TILE, 2); g.fillRect(0, 15, TILE, 2); g.fillStyle = '#c8a040'; g.fillRect(25, 17, 3, 3); g.fillStyle = 'rgba(190,225,245,0.8)'; g.fillRect(8, 4, 16, 9); },
    gate: g => { clear(g); g.fillStyle = '#c8a870'; for (let x = 2; x < TILE; x += 7) g.fillRect(x, 2, 4, 30); g.fillStyle = '#a08050'; g.fillRect(0, 8, TILE, 3); g.fillRect(0, 22, TILE, 3); },
    bed_head: g => { noise(g, '#b83030', 0.1, 84, 2); g.fillStyle = '#f0ece0'; g.fillRect(4, 3, 24, 11); g.fillStyle = '#d8d4c8'; g.fillRect(4, 12, 24, 2); },
    bed_foot: g => { noise(g, '#b83030', 0.1, 85, 2); g.fillStyle = '#902020'; for (let y = 4; y < TILE; y += 8) g.fillRect(0, y, TILE, 2); g.fillStyle = '#e0d8c0'; g.fillRect(0, 26, TILE, 6); },
    bed_side: g => { planks(g, '#9a6a3a'); g.fillStyle = '#b83030'; g.fillRect(0, 0, TILE, 12); g.fillStyle = '#e0d8c0'; g.fillRect(0, 12, TILE, 3); },
    pest: g => { clear(g); g.fillStyle = '#ffffff'; const r = rng(90); for (let i = 0; i < 9; i++) { const x = 6 + r() * 20, y = 6 + r() * 20; g.beginPath(); g.ellipse(x, y, 2.6, 1.8, r() * 3, 0, 6.283); g.fill(); g.fillRect(x - 3.5, y - 0.5, 7, 1); } },
    beehive: g => { planks(g, '#c8a860'); g.fillStyle = '#8a6a3a'; for (let y = 6; y < TILE; y += 7) g.fillRect(0, y, TILE, 2); g.fillStyle = '#2a1a0a'; g.fillRect(12, 22, 8, 4); g.fillStyle = '#f0c020'; g.fillRect(9, 10, 2, 2); g.fillRect(21, 15, 2, 2); },
    beehive_top: g => { planks(g, '#c8a860'); g.fillStyle = '#8a6a3a'; g.fillRect(0, 0, TILE, 2); g.fillRect(0, 30, TILE, 2); g.fillRect(0, 0, 2, TILE); g.fillRect(30, 0, 2, TILE); },
    table_icon: g => { clear(g); g.fillStyle = '#b08a52'; g.fillRect(2, 8, 28, 5); g.fillRect(5, 13, 4, 16); g.fillRect(23, 13, 4, 16); },
    stool_icon: g => { clear(g); g.fillStyle = '#b08a52'; g.fillRect(6, 12, 20, 5); g.fillRect(8, 17, 3, 12); g.fillRect(21, 17, 3, 12); },
    stairs_icon: g => { clear(g); g.fillStyle = '#b08a52'; g.fillRect(2, 16, 28, 14); g.fillRect(16, 2, 14, 14); },
    chair_icon: g => { clear(g); g.fillStyle = '#b08a52'; g.fillRect(6, 14, 20, 4); g.fillRect(22, 2, 4, 16); g.fillRect(7, 18, 3, 11); g.fillRect(22, 18, 3, 11); },
    bench_icon: g => { clear(g); g.fillStyle = '#b08a52'; g.fillRect(1, 15, 30, 4); g.fillRect(1, 8, 30, 3); g.fillRect(4, 19, 3, 10); g.fillRect(25, 19, 3, 10); },
    cactus: g => { noise(g, '#5a8a4a', 0.12, 54, 1); g.fillStyle = '#3f6a35'; for (let x = 2; x < TILE; x += 6) g.fillRect(x, 0, 2, TILE); g.fillStyle = '#7fa86a'; for (let x = 4; x < TILE; x += 6) g.fillRect(x, 0, 1, TILE); g.fillStyle = '#f0f0d0'; for (let x = 3; x < TILE; x += 6) for (let y = 2; y < TILE; y += 7) g.fillRect(x, y, 1, 1); },
    cactus_top: g => { noise(g, '#5a8a4a', 0.1, 55, 2); g.strokeStyle = '#3f6a35'; g.lineWidth = 2; for (let a = 0; a < 8; a++) { g.beginPath(); g.moveTo(16, 16); g.lineTo(16 + Math.cos(a / 8 * 6.283) * 16, 16 + Math.sin(a / 8 * 6.283) * 16); g.stroke(); } },
    log_oak: g => bark(g, '#6b4e2e', '#3f2d18', 56), log_top_oak: g => rings(g, '#c8a060', '#8a6a3a'),
    log_birch: g => { noise(g, '#e8e4dc', 0.06, 57, 2); const r = rng(58); g.fillStyle = '#2a2a2a'; for (let i = 0; i < 10; i++) g.fillRect((r() * TILE) | 0, (r() * TILE) | 0, 3 + ((r() * 8) | 0), 1 + ((r() * 2) | 0)); g.fillStyle = '#b8b0a0'; for (let i = 0; i < 10; i++) g.fillRect((r() * TILE) | 0, (r() * TILE) | 0, 6, 1); }, log_top_birch: g => rings(g, '#e8d8b8', '#b09a70'),
    log_spruce: g => bark(g, '#5a3a2a', '#30200f', 59), log_top_spruce: g => rings(g, '#d0a070', '#8a5a3a'),
    log_tropical: g => bark(g, '#8a7a68', '#5a4a3a', 60), log_top_tropical: g => rings(g, '#d8c0a0', '#9a8060'),
    log_cypress: g => bark(g, '#8a5a40', '#4a2e1c', 61), log_top_cypress: g => rings(g, '#d8a888', '#9a6a4a'),
    log_mesquite: g => bark(g, '#4a3428', '#20140c', 62), log_top_mesquite: g => rings(g, '#a06a4a', '#5a3a2a'),
    log_palm: g => { noise(g, '#8a7a5a', 0.15, 65, 1); g.fillStyle = '#5a4a30'; for (let y = 0; y < TILE; y += 6) { g.fillRect(0, y, TILE, 2); for (let x = (y / 6) % 2 ? 4 : 0; x < TILE; x += 8) g.fillRect(x, y + 2, 1, 4); } }, log_top_palm: g => { noise(g, '#c8b080', 0.1, 66, 2); speck(g, '#8a7a5a', 60, 67); },
    log_paloverde: g => { noise(g, '#8ab05a', 0.1, 63, 1); const r = rng(64); g.fillStyle = '#6a904a'; for (let i = 0; i < 14; i++) g.fillRect((r() * TILE) | 0, (r() * TILE) | 0, 1, 6); }, log_top_paloverde: g => rings(g, '#c8d890', '#8aa060'),
  };

  // ---- plant sprite painter (shared by atlas and UI cards) ----
  function drawPlant(g, p, stage, size, withered) {
    const art = p.art || { stem: '#4a8a3a', leaf: '#4f9a3c' }; const k = size / 32;
    const sc = withered ? 1 : [0.4, 0.68, 1][stage];
    g.save(); g.scale(k, k); g.translate(16, 32); g.scale(sc, sc); g.translate(-16, -32);
    g.imageSmoothingEnabled = false; g.lineCap = 'round';
    const mature = stage === 2 && !withered;
    const stemC = withered ? '#7a6a4a' : art.stem, leafC = withered ? '#9a8a6a' : art.leaf;
    const flowerC = art.flower || '#ffffff', fruitC = art.fruit || '#d04040', centerC = art.center || shade(flowerC, 0.6);
    const line = (x1, y1, x2, y2, w, c) => { g.strokeStyle = c; g.lineWidth = w; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); };
    const curve = (x1, y1, cx, cy, x2, y2, w, c) => { g.strokeStyle = c; g.lineWidth = w; g.beginPath(); g.moveTo(x1, y1); g.quadraticCurveTo(cx, cy, x2, y2); g.stroke(); };
    const disc = (x, y, r, c) => { g.fillStyle = c; g.beginPath(); g.arc(x, y, r, 0, 6.283); g.fill(); };
    const ell = (x, y, rx, ry, ang, c) => { g.save(); g.translate(x, y); g.rotate(ang); g.fillStyle = c; g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, 6.283); g.fill(); g.restore(); };
    const leaf = (x, y, ang, len, wid, c) => ell(x + Math.cos(ang) * len / 2, y + Math.sin(ang) * len / 2, len / 2, wid / 2, ang, c);
    const petals = (x, y, n, r, pr, c, cc) => { for (let i = 0; i < n; i++) { const a = i / n * 6.283; disc(x + Math.cos(a) * r, y + Math.sin(a) * r, pr, c); } disc(x, y, Math.max(1.2, r * 0.55), cc); };
    const droop = withered ? 6 : 0;
    const f = p.form;
    if (f === 'flower' || f === 'sunflower') {
      const top = f === 'sunflower' ? 6 : 8;
      curve(16, 32, 16 + droop, 20, 16 + droop * 1.5, top, f === 'sunflower' ? 2.2 : 1.4, stemC);
      const nL = p.art.leafBig ? 3 : 5;
      for (let i = 0; i < nL; i++) { const y = 28 - i * (18 / nL); const dir = i % 2 ? 1 : -1; leaf(16 + droop * (1 - i / nL), y, dir > 0 ? -0.5 : Math.PI + 0.5, p.art.leafBig ? 9 : 6, p.art.leafBig ? 5 : 2.6, leafC); }
      if (mature) {
        if (p.spike) { for (let i = 0; i < 6; i++) { const y = 16 - i * 2.2; disc(16 + ((i % 2) ? 2.2 : -2.2), y, 1.6, flowerC); } disc(16, 3, 1.3, flowerC); }
        else if (f === 'sunflower') { petals(16, 7, 14, 6, 2.2, flowerC, centerC); disc(16, 7, 3.4, centerC); }
        else { petals(16, top, p.petals || 6, 3.2, 1.8, flowerC, centerC); if (p.berry) disc(16, top, 2.2, fruitC); }
      } else if (stage === 1 && !withered) disc(16, top, 1.5, shade(leafC, 1.2));
    } else if (f === 'grass' || f === 'cattail') {
      const n = f === 'cattail' ? 5 : 7;
      for (let i = 0; i < n; i++) { const t = (i / (n - 1) - 0.5); const x2 = 16 + t * 20 + droop; const y2 = p.tall ? 1 + Math.abs(t) * 10 : 8 + Math.abs(t) * 10; curve(16 + t * 3, 32, 16 + t * 8, 20, x2, y2 + droop, f === 'cattail' ? 1.6 : 1.2, i % 2 ? leafC : shade(leafC, 0.85)); }
      if (mature) { if (f === 'cattail') { line(16, 32, 16, 2, 1.2, '#8a9a5a'); g.fillStyle = art.flower; g.fillRect(14.5, 2, 3, 9); disc(16, 1, 0.8, '#d8c890'); } else for (let i = 0; i < 4; i++) disc(10 + i * 4, 4 + (i % 2) * 3, 1.3, art.flower || '#c0a060'); }
    } else if (f === 'bush') {
      line(16, 32, 16 + droop, 22, 1.8, stemC); line(16, 28, 11, 22, 1.2, stemC); line(16, 28, 21, 22, 1.2, stemC);
      const r = rng(hash(p.id)); for (let i = 0; i < 14; i++) disc(8 + r() * 16, 12 + r() * 12 + droop, 2.4 + r() * 1.6, i % 3 ? leafC : shade(leafC, 0.78));
      if (p.cauliflory && mature) { ell(14, 27, 1.6, 3, 0, fruitC); ell(18, 29, 1.4, 2.6, 0, fruitC); }
      if (mature) { const r2 = rng(hash(p.id) + 1); for (let i = 0; i < 6; i++) { const x = 9 + r2() * 14, y = 13 + r2() * 10; if (p.flowerOnBush) petals(x, y, 6, 1.4, 0.8, flowerC, centerC); else disc(x, y, 1.3, fruitC); } }
    } else if (f === 'rosette') {
      const n = 9; for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + (i / (n - 1) - 0.5) * 2.4; const len = 9 + (i % 2) * 5; g.save(); g.translate(16, 31); g.rotate(a); g.fillStyle = i % 2 ? leafC : shade(leafC, 0.85); g.beginPath(); g.moveTo(0, -2.2); g.lineTo(len, 0); g.lineTo(0, 2.2); g.closePath(); g.fill(); g.restore(); }
      if (mature && p.fruitTop) { g.fillStyle = fruitC; g.beginPath(); g.ellipse(16, 15, 4.5, 6, 0, 0, 6.283); g.fill(); g.fillStyle = shade(fruitC, 0.7); for (let y = 10; y < 21; y += 3) for (let x = 13; x < 20; x += 3) g.fillRect(x, y, 1, 1); for (let i = -2; i <= 2; i++) line(16, 10, 16 + i * 2, 2, 1.2, leafC); }
      else if (mature && art.flower && !p.epiphyte) { line(16, 24, 16, 1, 1.5, '#a09060'); for (let i = 0; i < 5; i++) { disc(13 + (i % 2) * 6, 3 + i * 3, 1.5, flowerC); } }
      else if (mature && p.epiphyte) { line(16, 26, 16, 10, 1.8, '#d07090'); petals(16, 9, 7, 3, 1.5, flowerC, '#f0a0c0'); }
    } else if (f === 'cactus') {
      ell(16, 25, 7, 6, 0, leafC); if (stage >= 1 || withered) ell(11, 15, 5, 6.5, 0.4, shade(leafC, 1.05)); if (stage >= 1 || withered) ell(22, 14, 4.5, 6, -0.3, shade(leafC, 0.9));
      g.fillStyle = '#f0f0d0'; for (let i = 0; i < 24; i++) { const a = i * 2.39; const rr = (i % 7) * 0.9; g.fillRect(16 + Math.cos(a) * rr - 0.5, 25 + Math.sin(a) * rr * 0.8, 1, 1); g.fillRect(11 + Math.cos(a) * rr * 0.7, 15 + Math.sin(a) * rr, 1, 1); }
      if (mature) { petals(11, 8, 7, 2, 1.2, flowerC, centerC); ell(24, 8, 1.6, 2.4, 0, fruitC); ell(20, 7.5, 1.4, 2.2, 0, fruitC); }
    } else if (f === 'vine') {
      curve(16, 32, 8, 22, 16, 12, 1.3, stemC); curve(16, 12, 24, 8, 14, 2, 1.1, stemC);
      for (let i = 0; i < 5; i++) { const y = 28 - i * 5.5; leaf(13 + (i % 2) * 6, y, i % 2 ? -0.3 : Math.PI + 0.3, 6, 4, leafC); }
      if (mature) { petals(21, 16, 7, 2.6, 1.4, flowerC, centerC); if (art.fruit) { ell(10, 20, 1.2, 3.5, 0.2, fruitC); ell(21, 8, 1.2, 3.2, -0.2, fruitC); } }
    } else if (f === 'fern') {
      for (let i = 0; i < 5; i++) { const t = i / 4 - 0.5; const ex = 16 + t * 24, ey = 10 + Math.abs(t) * 8; curve(16, 32, 16 + t * 10, 20, ex, ey, 1, stemC); for (let s = 0.3; s < 1; s += 0.14) { const px = 16 + (ex - 16) * s, py = 32 + (ey - 32) * s; line(px - 2.2, py - 1, px + 2.2, py + 1, 1.4, leafC); } }
    } else if (f === 'moss') {
      const r = rng(hash(p.id)); for (let i = 0; i < 18; i++) disc(6 + r() * 20, 26 + r() * 5, 2 + r() * 2, i % 3 ? leafC : shade(leafC, 0.85)); for (let i = 0; i < 10; i++) line(8 + r() * 16, 30, 8 + r() * 16, 22 + r() * 4, 1, shade(leafC, 1.1));
      if (mature && art.fruit) for (let i = 0; i < 4; i++) disc(9 + i * 5, 21, 1, fruitC);
    } else if (f === 'corn') {
      line(16, 32, 16 + droop, 2, 2, stemC); for (let i = 0; i < 6; i++) { const y = 28 - i * 4.4; const dir = i % 2 ? 1 : -1; curve(16, y, 16 + dir * 7, y - 3, 16 + dir * 12, y + 2, 1.5, leafC); }
      if (mature) { ell(13, 16, 2, 4.5, 0.2, fruitC); line(13, 11, 12, 8, 0.8, '#d8b060'); for (let i = -2; i <= 2; i++) line(16, 3, 16 + i * 3, -1, 0.8, flowerC); }
    } else if (f === 'squash') {
      curve(16, 32, 10, 28, 4, 30, 1.4, stemC); curve(16, 32, 22, 28, 28, 30, 1.4, stemC);
      for (let i = 0; i < 5; i++) { const x = 6 + i * 5; disc(x, 20 + (i % 2) * 4, 4.2, i % 2 ? leafC : shade(leafC, 0.85)); line(x, 24 + (i % 2) * 4, x, 31, 1, stemC); }
      if (mature) { ell(8, 28, 4, 3.2, 0, fruitC); petals(23, 15, 5, 2.4, 1.5, flowerC, centerC); }
    } else if (f === 'heliconia' || f === 'banana') {
      line(16, 32, 16, 10, f === 'banana' ? 3 : 1.8, stemC);
      for (let i = 0; i < 4; i++) { const dir = i % 2 ? 1 : -1; const y = 18 - i * 4; ell(16 + dir * 7, y, 8, 2.6, dir * -0.5, i % 2 ? leafC : shade(leafC, 0.85)); }
      if (mature) { if (f === 'heliconia') { for (let i = 0; i < 4; i++) { g.save(); g.translate(16 + (i % 2 ? 3 : -3), 8 + i * 3); g.rotate(i % 2 ? 0.7 : -0.7); g.fillStyle = flowerC; g.fillRect(0, -1, 5, 2.2); g.fillStyle = centerC; g.fillRect(4, -0.8, 1.5, 1.8); g.restore(); } } else { for (let i = 0; i < 5; i++) ell(20, 14 + i * 1.6, 3.5, 1, 0.3, fruitC); ell(21, 24, 1.6, 2.4, 0, flowerC); } }
    } else if (f === 'pitcher') {
      for (let i = 0; i < 3; i++) { const x = 9 + i * 7; g.fillStyle = i % 2 ? leafC : shade(leafC, 0.85); g.beginPath(); g.moveTo(x - 1, 31); g.lineTo(x - 3.2, 18); g.lineTo(x + 3.2, 18); g.lineTo(x + 1, 31); g.closePath(); g.fill(); ell(x, 17, 3.4, 1.8, 0, shade(leafC, 1.15)); g.fillStyle = '#8a9a5a'; g.fillRect(x - 1.2, 20, 0.8, 7); }
      if (mature) { line(16, 24, 16, 6, 1, '#7a4a4a'); disc(16, 6, 3, flowerC); disc(16, 7.5, 1.5, shade(flowerC, 0.7)); }
    } else if (f === 'lily') {
      disc(16, 16, 11, leafC); g.fillStyle = 'rgba(0,0,0,0)'; g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.moveTo(16, 16); g.lineTo(28, 10); g.lineTo(28, 20); g.closePath(); g.fill(); g.globalCompositeOperation = 'source-over';
      g.strokeStyle = shade(leafC, 0.8); g.lineWidth = 1; for (let a = 0; a < 6; a++) { g.beginPath(); g.moveTo(16, 16); g.lineTo(16 + Math.cos(a) * 10, 16 + Math.sin(a) * 10); g.stroke(); }
      if (mature) { petals(11, 14, 9, 3.6, 1.8, flowerC, centerC); }
    } else if (f === 'sapling') {
      line(16, 32, 16, 18, 1.6, '#6a4a2a'); disc(16, 14, 6, leafC); disc(12, 17, 4, shade(leafC, 0.85)); disc(20, 17, 4, shade(leafC, 1.1));
    } else if (f === 'sapling_conifer') {
      line(16, 32, 16, 20, 1.6, '#5a3a2a'); g.fillStyle = leafC; for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(16, 4 + i * 6); g.lineTo(16 - 5 - i * 2, 12 + i * 6); g.lineTo(16 + 5 + i * 2, 12 + i * 6); g.closePath(); g.fill(); }
    } else if (f === 'sapling_cactus') {
      g.fillStyle = leafC; g.fillRect(12, 10, 8, 22); g.fillStyle = shade(leafC, 0.75); g.fillRect(14, 10, 1, 22); g.fillRect(17, 10, 1, 22); disc(16, 10, 4, leafC); g.fillStyle = '#f0f0d0'; for (let y = 12; y < 31; y += 4) { g.fillRect(12, y, 1, 1); g.fillRect(19, y, 1, 1); }
    }
    g.restore();
  }

  function build() {
    canvas = document.createElement('canvas'); canvas.width = canvas.height = TILE * COLS; ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    const add = (name, painter) => { const i = count++; const x = (i % COLS) * TILE, y = Math.floor(i / COLS) * TILE; ctx.save(); ctx.translate(x, y); ctx.beginPath(); ctx.rect(0, 0, TILE, TILE); ctx.clip(); painter(ctx); ctx.restore(); tiles[name] = i; return i; };
    Object.keys(BLOCK_PAINTERS).forEach(n => add(n, BLOCK_PAINTERS[n]));
    BC.TREES.forEach(t => { if (t.leaf) add('leaves_' + t.id, g => leaves(g, t.leaf, hash(t.id))); });
    BC.PLANTS.forEach(p => { for (let s = 0; s < 3; s++) add(p.id + '_' + s, g => drawPlant(g, p, s, TILE)); });
    const saps = [['sapling_broad', { id: 'sb', form: 'sapling', art: { leaf: '#4f8a32' } }], ['sapling_conifer', { id: 'sc', form: 'sapling_conifer', art: { leaf: '#2e5a3a' } }], ['sapling_cactus', { id: 'sx', form: 'sapling_cactus', art: { leaf: '#5a8a4a' } }]];
    saps.forEach(([n, p]) => { for (let s = 0; s < 3; s++) add(n + '_' + s, g => drawPlant(g, p, s, TILE)); });
    add('withered', g => drawPlant(g, { id: 'w', form: 'flower', petals: 5, art: { stem: '#7a6a4a', leaf: '#9a8a6a' } }, 2, TILE, true));
    const tex = new THREE.CanvasTexture(canvas); tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter; tex.generateMipmaps = false; tex.colorSpace = THREE.SRGBColorSpace;
    return { texture: tex, canvas };
  }
  // UV rect for a tile, inset by a little to stop bleeding.
  function uv(name) { const i = tiles[name]; if (i === undefined) throw new Error('missing tile ' + name); const e = 0.6 / (TILE * COLS); const u0 = (i % COLS) / COLS + e, v0 = 1 - Math.floor(i / COLS) / COLS - e; return [u0, v0, u0 + 1 / COLS - 2 * e, v0 - 1 / COLS + 2 * e]; }
  function spriteCanvas(p, stage, size, withered) { const c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d'); g.imageSmoothingEnabled = false; drawPlant(g, p, stage, size, withered); return c; }
  function tileCanvas(name, size) { const c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d'); g.imageSmoothingEnabled = false; const i = tiles[name]; g.drawImage(canvas, (i % COLS) * TILE, Math.floor(i / COLS) * TILE, TILE, TILE, 0, 0, size, size); return c; }
  // Icon for an ingredient: a glyph per group tinted by a stable colour from its name.
  function ingredientCanvas(ing, size) { const c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d'); const k = size / 32; const h = hash(ing.id); const col = `hsl(${h % 360},${45 + (h >> 8) % 30}%,${38 + (h >> 16) % 20}%)`; g.save(); g.scale(k, k);
    if (ing.group === 'control') { g.fillStyle = '#e8eef0'; g.fillRect(11, 4, 10, 6); g.fillStyle = col; g.beginPath(); g.moveTo(8, 10); g.lineTo(24, 10); g.lineTo(26, 30); g.lineTo(6, 30); g.closePath(); g.fill(); g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(9, 13, 3, 14); }
    else if (ing.group === 'mineral') { g.fillStyle = col; g.beginPath(); g.moveTo(4, 29); g.quadraticCurveTo(16, 2, 28, 29); g.closePath(); g.fill(); g.fillStyle = 'rgba(255,255,255,0.3)'; for (let i = 0; i < 14; i++) g.fillRect(8 + ((i * 7) % 16), 16 + ((i * 5) % 12), 1.5, 1.5); }
    else if (ing.group === 'mulch') { g.fillStyle = col; for (let i = 0; i < 10; i++) { g.save(); g.translate(16, 24); g.rotate(-0.6 + i * 0.13); g.fillRect(-14, -2 - i * 1.6, 28, 2.2); g.restore(); } }
    else if (ing.group === 'fertilizer') { g.fillStyle = '#8a6a3a'; g.beginPath(); g.moveTo(6, 12); g.lineTo(26, 12); g.lineTo(23, 30); g.lineTo(9, 30); g.closePath(); g.fill(); g.fillStyle = col; g.beginPath(); g.ellipse(16, 12, 10, 4, 0, 0, 6.283); g.fill(); g.fillStyle = '#f0e8d0'; g.fillRect(12, 18, 8, 6); }
    else { g.fillStyle = col; g.beginPath(); g.ellipse(16, 18, 10, 8, 0.3, 0, 6.283); g.fill(); g.fillStyle = shade(col.startsWith('#') ? col : '#6a8a4a', 0.7); g.fillRect(15, 6, 2, 10); }
    g.restore(); return c; }
  // Stand-alone tiling water texture so the shader can scroll it along the flow.
  function waterTexture() { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); g.fillStyle = '#3a7ac8'; g.fillRect(0, 0, 64, 64); const r = rng(77); for (let i = 0; i < 90; i++) { g.fillStyle = r() < 0.5 ? '#3270b8' : '#4486d2'; g.fillRect((r() * 64) | 0, (r() * 64) | 0, 3, 3); } g.fillStyle = '#8ac4f4'; for (let i = 0; i < 18; i++) { const x = (r() * 64) | 0, y = (r() * 64) | 0, l = 4 + ((r() * 8) | 0); g.fillRect(x, y, l, 1); if (x + l > 64) g.fillRect(0, y, x + l - 64, 1); } const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t; }
  return { build, uv, spriteCanvas, tileCanvas, ingredientCanvas, waterTexture, TILE, COLS, has: n => tiles[n] !== undefined, shade, mix };
})();
