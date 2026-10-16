window.BC = window.BC || {};
// Yellow brick roads: a road between every pair of villages, found by A* over the terrain (gentle slopes, around water, trees and landmarks).
BC.ORE_PRICE = { 195: 12, 196: 6, 197: 3 };
BC.ORE_TEACH = {
  195: 'Gold! Prospectors once read the plants: horsetail, and in Australia eucalyptus leaves, take up traces of gold from deep roots, and sampling leaves still finds buried deposits.',
  196: 'Silver. Florists use a silver compound to block ethylene, the ripening gas, so cut flowers last twice as long. In soil it is toxic to roots and microbes.',
  197: 'Copper. A micronutrient every plant needs for photosynthesis and lignin: a pinch per acre. Peaty soils run short and cereals get pale, twisted tips.',
};
(function () {
  const P = BC.World.prototype;
  // binary heap keyed on f
  function Heap() { this.a = []; }
  Heap.prototype.push = function (n) { const a = this.a; a.push(n); let i = a.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (a[p].f <= a[i].f) break; [a[p], a[i]] = [a[i], a[p]]; i = p; } };
  Heap.prototype.pop = function () { const a = this.a; const top = a[0]; const last = a.pop(); if (a.length) { a[0] = last; let i = 0; for (;;) { const l = i * 2 + 1, r = l + 1; let m = i; if (l < a.length && a[l].f < a[m].f) m = l; if (r < a.length && a[r].f < a[m].f) m = r; if (m === i) break; [a[m], a[i]] = [a[i], a[m]]; i = m; } } return top; };
  P.placeRoads = function () {
    this.roads = []; const vs = this.villages || []; if (vs.length < 2) return; const W = this.W, D = this.D, WL = this.WL; const G = 2, GW = Math.floor(W / G), GD = Math.floor(D / G);
    // coarse cost grid
    const h = new Float32Array(GW * GD), cost = new Float32Array(GW * GD);
    const boxOf = v => [v.x - 2, v.z - 2, v.x + 30, v.z + 30];
    for (let gz = 0; gz < GD; gz++) for (let gx = 0; gx < GW; gx++) { const x = gx * G, z = gz * G; const ci = x + z * W; let c = 1; const hh = this.height[ci]; h[gx + gz * GW] = hh; if (hh <= WL) c += 7; if (this.stream[ci]) c += 3; if (this.treeAt.has(this.idx(x, hh + 1, z)) || this.treeAt.has(this.idx(x + 1, hh + 1, z))) c += 6; if (this.isReserved(x, z)) c += 60; cost[gx + gz * GW] = c; }
    const inBox = (x, z, b) => x >= b[0] && x < b[2] && z >= b[1] && z < b[3];
    // where a road meets a village: the point on the village's edge toward the other village
    const gate = (v, to) => { const b = boxOf(v); const cx = v.cx, cz = v.cz; const dx = to.cx - cx, dz = to.cz - cz; const tx = dx > 0 ? (b[2] - cx) / dx : dx < 0 ? (b[0] - cx) / dx : 1e9, tz = dz > 0 ? (b[3] - cz) / dz : dz < 0 ? (b[1] - cz) / dz : 1e9; const t = Math.min(tx, tz) + 0.5 / Math.max(1e-6, Math.hypot(dx, dz)); return [Math.round(cx + dx * t), Math.round(cz + dz * t)]; };
    const astar = (sx, sz, ex, ez, boxes) => {
      const s = (sx >> 1) + (sz >> 1) * GW, e = (ex >> 1) + (ez >> 1) * GW; const gScore = new Float32Array(GW * GD).fill(1e9); const came = new Int32Array(GW * GD).fill(-1); const closed = new Uint8Array(GW * GD);
      const H2 = i => { const dx = (i % GW) - (e % GW), dz = Math.floor(i / GW) - Math.floor(e / GW); return Math.hypot(dx, dz); };
      const open = new Heap(); gScore[s] = 0; open.push({ i: s, f: H2(s) });
      while (open.a.length) { const cur = open.pop(); const i = cur.i; if (i === e) break; if (closed[i]) continue; closed[i] = 1; const x = i % GW, z = Math.floor(i / GW);
        for (let k = 0; k < 8; k++) { const dx = [1, -1, 0, 0, 1, 1, -1, -1][k], dz = [0, 0, 1, -1, 1, -1, 1, -1][k]; const nx = x + dx, nz = z + dz; if (nx < 2 || nz < 2 || nx >= GW - 2 || nz >= GD - 2) continue; const j = nx + nz * GW; if (closed[j]) continue; const slope = Math.abs(h[j] - h[i]); let c = cost[j] + slope * 2.5 + (slope > 1 ? 6 : 0); let inOther = false; for (const b of boxes) if (inBox(nx * G, nz * G, b)) inOther = true; if (inOther) c += 25; const g = gScore[i] + c * (k < 4 ? 1 : 1.414); if (g < gScore[j]) { gScore[j] = g; came[j] = i; open.push({ i: j, f: g + H2(j) }); } } }
      if (came[e] < 0 && e !== s) return null; const path = []; let i = e; while (i >= 0) { path.push([(i % GW) * G, Math.floor(i / GW) * G]); if (i === s) break; i = came[i]; } return path.reverse();
    };
    const BRICK = 198; const laid = new Set();
    const lay = (x, z) => { if (x < 1 || z < 1 || x >= W - 1 || z >= D - 1) return; const ci = x + z * W; if (laid.has(ci)) return; if (this.isReserved(x, z)) return; for (const v of vs) if (inBox(x, z, [v.x, v.z, v.x + 28, v.z + 28])) return; const t = this.height[ci]; const top = this.blocks[this.idx(x, t, z)]; const tb = BC.BLOCKS[top];
      let y = t; if (t <= WL || top === 15) { y = WL + 1; } else if (!tb || tb.log || tb.leaves || tb.wood || tb.plank || tb.fence) return;
      if (y < t) return; this.blocks[this.idx(x, y, z)] = BRICK; if (y > t) this.height[ci] = y; const pk = this.idx(x, y + 1, z); if (this.plants.has(pk)) this.plants.delete(pk); if (this.blocks[pk] === 15) this.blocks[pk] = 0; laid.add(ci); this.roads.push(x, z); };
    for (let a = 0; a < vs.length; a++) for (let b = a + 1; b < vs.length; b++) {
      const A = vs[a], B = vs[b]; const [sx, sz] = gate(A, B), [ex, ez] = gate(B, A); const others = vs.filter(v => v !== A && v !== B).map(boxOf);
      const path = astar(sx, sz, ex, ez, others); if (!path) continue;
      for (let i = 0; i < path.length; i++) { const [x0, z0] = path[i]; const [x1, z1] = path[Math.min(path.length - 1, i + 1)]; const n = Math.max(Math.abs(x1 - x0), Math.abs(z1 - z0), 1); for (let s = 0; s <= n; s++) { const x = Math.round(x0 + (x1 - x0) * s / n), z = Math.round(z0 + (z1 - z0) * s / n); lay(x, z); lay(x + 1, z); lay(x, z + 1); lay(x + 1, z + 1); } }
    }
    // embankments: where neighbouring road cells differ by two or more, build the lower side up in brick so every step is one block
    for (let pass = 0; pass < 4; pass++) { let fixed = 0; for (let i = 0; i < this.roads.length; i += 2) { const x = this.roads[i], z = this.roads[i + 1]; const ci = x + z * W; for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nci = (x + dx) + (z + dz) * W; if (!laid.has(nci)) continue; const a = this.height[ci], b = this.height[nci]; if (b - a >= 2) { const y = a + 1; if (this.blocks[this.idx(x, y, z)] !== 0 && this.blocks[this.idx(x, y, z)] !== 15) continue; this.blocks[this.idx(x, y, z)] = BRICK; this.height[ci] = y; const pk = this.idx(x, y + 1, z); if (this.plants.has(pk)) this.plants.delete(pk); fixed++; } } } if (!fixed) break; }
  };
})();
