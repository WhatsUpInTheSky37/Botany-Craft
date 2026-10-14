window.BC = window.BC || {};
// World storage + procedural generation.
BC.World = class World {
  constructor(seed, W, D, H) {
    this.W = W || 448; this.D = D || 448; this.H = H || 44; this.seed = seed >>> 0; this.scale = this.W / 224;
    this.WL = 12; // water level
    this.blocks = new Uint8Array(this.W * this.D * this.H);
    this.biome = new Uint8Array(this.W * this.D);
    this.height = new Uint8Array(this.W * this.D);
    this.moisture = new Float32Array(this.W * this.D);
    this.plants = new Map(); this.treeAt = new Map(); this.diffs = new Map();
    this.dirty = new Set(); this.CX = Math.ceil(this.W / 16); this.CZ = Math.ceil(this.D / 16);
    this.rand = BC.util.rng(this.seed);
    this.noise = BC.util.noise2(this.seed);
    this.spawnAnimals = [];
  }
  idx(x, y, z) { return x + this.W * (z + this.D * y); }
  inBounds(x, y, z) { return x >= 0 && z >= 0 && y >= 0 && x < this.W && z < this.D && y < this.H; }
  get(x, y, z) { if (!this.inBounds(x, y, z)) return y < 0 ? 14 : 0; return this.blocks[this.idx(x, y, z)]; }
  set(x, y, z, id, silent) {
    if (!this.inBounds(x, y, z)) return;
    const i = this.idx(x, y, z); if (this.blocks[i] === id) return;
    this.blocks[i] = id; if (!silent) this.diffs.set(i, id);
    if (this.onBlock && !this.remote) this.onBlock(x, y, z, id);
    this.markDirty(x, z); if ((x & 15) === 0) this.markDirty(x - 1, z); if ((x & 15) === 15) this.markDirty(x + 1, z); if ((z & 15) === 0) this.markDirty(x, z - 1); if ((z & 15) === 15) this.markDirty(x, z + 1);
  }
  markDirty(x, z) { if (x < 0 || z < 0 || x >= this.W || z >= this.D) return; this.dirty.add((x >> 4) + (z >> 4) * this.CX); }
  biomeAt(x, z) { x = BC.util.clamp(x | 0, 0, this.W - 1); z = BC.util.clamp(z | 0, 0, this.D - 1); return BC.BIOME_LIST[this.biome[x + z * this.W]]; }
  top(x, z) { for (let y = this.H - 1; y >= 0; y--) { const b = this.get(x, y, z); if (b !== 0 && b !== 15) return y; } return 0; }
  surface(x, z) { for (let y = this.H - 1; y >= 0; y--) if (this.get(x, y, z) !== 0) return y; return 0; }
  soilAt(x, y, z) { const b = BC.BLOCKS[this.get(x, y, z)]; return b && b.soil ? BC.SOILS[b.soil] : null; }
  plantKey(x, y, z) { return this.idx(x, y, z); }
  plantAt(x, y, z) { return this.plants.get(this.idx(x, y, z)); }
  addPlant(p) { p.key = this.idx(p.x, p.y, p.z); this.plants.set(p.key, p); this.markDirty(p.x, p.z); if (this.onPlant && !this.remote && !this.generating) this.onPlant(p, false); return p; }
  removePlant(p) { this.plants.delete(p.key); this.markDirty(p.x, p.z); if (this.onPlant && !this.remote && !this.generating) this.onPlant(p, true); }
  // light reaching a cell: 1 = open sky, lower under leaves.
  lightAt(x, y, z) { let l = 1; for (let yy = y + 1; yy < this.H; yy++) { const b = BC.BLOCKS[this.get(x, yy, z)]; if (!b || b.id === 0 || b.liquid) continue; if (b.leaves) l *= 0.55; else if (b.fence) l *= 0.9; else l *= 0.25; if (l < 0.05) break; } return l; }

  // ---------- generation ----------
  generate() {
    this.generating = true;
    const { W, D, H, WL } = this; const n = this.noise;
    const smooth = t => t * t * (3 - 2 * t);
    for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) {
      const ci = x + z * W;
      // climate: north (z=0) cold, south hot; west dry, east wet
      const sc = this.scale; const temp = BC.util.clamp(z / D + (n(x / (70 * sc), z / (70 * sc)) - 0.5) * 0.35, 0, 1);
      const moist = BC.util.clamp(x / W + (n(x / (60 * sc) + 100, z / (60 * sc)) - 0.5) * 0.5, 0, 1);
      let h = 13 + (n(x / 38, z / 38 + 50) - 0.5) * 14 + (n(x / 12, z / 12 + 80) - 0.5) * 3;
      const edge = Math.min(x, z, W - 1 - x, D - 1 - z) / 14; if (edge < 1) h -= (1 - smooth(edge)) * 7;
      let biome;
      if (temp < 0.34) biome = 'boreal'; else if (temp < 0.66) biome = moist < 0.4 ? 'prairie' : 'temperate'; else biome = moist < 0.44 ? 'desert' : 'rainforest';
      if (biome === 'desert') h = 13 + (h - 13) * 0.6 + 1; // flatter, higher: no lakes
      if (biome !== 'desert' && h >= WL - 1 && h <= WL + 1.2 && moist > 0.38 && temp > 0.2) biome = 'wetland';
      if (biome === 'wetland') h = Math.min(h, WL + 1);
      h = BC.util.clamp(Math.round(h), 3, H - 12);
      this.biome[ci] = BC.BIOME_LIST.indexOf(biome); this.height[ci] = h;
      this.moisture[ci] = BC.BIOMES[biome].baseMoisture;
      this.fillColumn(x, z, h, biome);
    }
    this.placeTrees(); this.placePlants(); this.pickAnimals();
    this.diffs.clear(); this.generating = false;
    this.genPlantKeys = new Set(this.plants.keys()); this.genTreeKeys = new Set(this.treeAt.keys());
  }
  fillColumn(x, z, h, biome) {
    const B = BC.BLOCK, WL = this.WL; const under = h < WL;
    const set = (y, id) => { this.blocks[this.idx(x, y, z)] = id; };
    for (let y = 0; y <= h; y++) {
      const d = h - y; let id = B.STONE;
      if (d >= 5) id = y === 0 ? B.STONE : (d === 5 ? B.GRAVEL : B.STONE);
      else switch (biome) {
        case 'temperate': id = d === 0 ? (under ? B.GLEY : B.GRASS_A) : d < 4 ? B.ALFISOL : B.GRAVEL; break;
        case 'prairie': id = d === 0 ? (under ? B.GLEY : B.GRASS_M) : d < 4 ? B.MOLLISOL : B.GRAVEL; break;
        case 'desert': id = d < 2 ? B.SAND : d < 4 ? B.CALICHE : B.GRAVEL; break;
        case 'rainforest': id = d === 0 ? (under ? B.GLEY : B.FLOOR_O) : B.OXISOL; break;
        case 'boreal': id = d === 0 ? (under ? B.GLEY : B.MOSS) : d === 1 ? B.PODZOL_E : d < 4 ? B.PODZOL_B : B.GRAVEL; break;
        case 'wetland': id = d === 0 ? (under ? B.GLEY : B.PEAT) : d < 2 ? B.PEAT : d < 4 ? B.GLEY : B.GRAVEL; break;
      }
      set(y, id);
    }
    for (let y = h + 1; y <= WL; y++) set(y, B.WATER);
  }
  treeOptions(biome) { return BC.TREES.filter(t => t.biomes[0] === biome || (t.biomes.includes(biome) && this.rand() < 0.3)); }
  placeTrees() {
    const density = { temperate: 0.032, prairie: 0.004, desert: 0.012, rainforest: 0.055, boreal: 0.05, wetland: 0.02 };
    const occupied = new Set();
    for (let z = 3; z < this.D - 3; z += 1) for (let x = 3; x < this.W - 3; x += 1) {
      const biome = this.biomeAt(x, z); const h = this.height[x + z * this.W];
      if (h < this.WL + (biome === 'wetland' ? -1 : 1)) continue;
      if (this.rand() > density[biome]) continue;
      let ok = true; for (let dz = -2; dz <= 2 && ok; dz++) for (let dx = -2; dx <= 2; dx++) if (occupied.has((x + dx) + ',' + (z + dz))) { ok = false; break; }
      if (!ok) continue;
      const opts = BC.TREES.filter(t => t.biomes.includes(biome)); if (!opts.length) continue;
      const t = opts[Math.floor(this.rand() * opts.length)];
      if (t.biomes[0] !== biome && this.rand() < 0.6) continue;
      if (this.buildTree(t, x, h + 1, z, true)) occupied.add(x + ',' + z);
    }
  }
  // Build a tree from blocks. Returns false if blocked.
  buildTree(t, x, y0, z, gen) {
    const R = this.rand; const log = BC.LOG_IDS[t.log]; const leaf = t.leaf ? BC.leafIdFor(t) : null;
    const hgt = t.height[0] + Math.floor(R() * (t.height[1] - t.height[0] + 1));
    if (y0 + hgt + 3 >= this.H) return false;
    const placed = []; const prevRemote = this.remote; if (!gen) this.remote = true;
    const put = (xx, yy, zz, id, force) => { if (!this.inBounds(xx, yy, zz)) return; const cur = this.blocks[this.idx(xx, yy, zz)]; if (cur !== 0 && cur !== 15 && !force) return; if (gen) this.blocks[this.idx(xx, yy, zz)] = id; else { this.set(xx, yy, zz, id); placed.push([xx, yy, zz, id]); } this.treeAt.set(this.idx(xx, yy, zz), t.id); };
    const trunk = (h, from) => { for (let y = from || 0; y < h; y++) put(x, y0 + y, z, log, true); };
    const sparse = t.shape === 'spreading' ? 0.5 : 0.25;
    const blob = (cx, cy, cz, r, flat) => { for (let dy = -r; dy <= r; dy++) for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) { const d = Math.sqrt(dx * dx + (flat ? dy * dy * 2.5 : dy * dy) + dz * dz); if (d <= r + 0.3 - (R() < sparse ? 0.9 : 0)) put(cx + dx, cy + dy, cz + dz, leaf); } };
    switch (t.shape) {
      case 'broad': trunk(hgt - 2); blob(x, y0 + hgt - 1, z, 2 + (hgt > 6 ? 1 : 0)); put(x, y0 + hgt - 2, z, log, true); break;
      case 'tall': trunk(hgt - 2); blob(x, y0 + hgt - 2, z, 2, true); blob(x, y0 + hgt, z, 2); break;
      case 'conifer': trunk(hgt - 1); for (let y = 2; y < hgt + 1; y++) { const r = Math.max(0, Math.round((hgt + 1 - y) * 0.45)); for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) if (Math.abs(dx) + Math.abs(dz) <= r + (y % 2)) put(x + dx, y0 + y, z + dz, leaf); } put(x, y0 + hgt + 1, z, leaf); break;
      case 'spreading': trunk(2); for (let a = 0; a < 4; a++) { const dx = [1, -1, 0, 0][a], dz = [0, 0, 1, -1][a]; put(x + dx, y0 + 2, z + dz, log); put(x + dx * 2, y0 + 3, z + dz * 2, log); } blob(x, y0 + 4, z, 2, true); blob(x + 2, y0 + 4, z, 1, true); blob(x - 2, y0 + 4, z, 1, true); blob(x, y0 + 4, z + 2, 1, true); blob(x, y0 + 4, z - 2, 1, true); put(x, y0 + 2, z, log, true); break;
      case 'saguaro': trunk(hgt); for (let a = 0; a < 2; a++) { if (hgt < 7 && a === 1) break; const dx = a ? -1 : 1; const ay = y0 + 2 + Math.floor(R() * 2) + a; put(x + dx, ay, z, log); for (let k = 1; k <= 2 + (a ? 0 : 1); k++) put(x + dx, ay + k, z, log); } break;
      case 'kapok': trunk(hgt); for (let a = 0; a < 4; a++) { const dx = [1, -1, 0, 0][a], dz = [0, 0, 1, -1][a]; put(x + dx, y0, z + dz, log); if (R() < 0.6) put(x + dx, y0 + 1, z + dz, log); } blob(x, y0 + hgt, z, 4, true); blob(x, y0 + hgt + 1, z, 2, true); break;
      case 'cypress': trunk(hgt); for (let a = 0; a < 4; a++) { const dx = [1, -1, 0, 0][a], dz = [0, 0, 1, -1][a]; if (R() < 0.7) put(x + dx, y0, z + dz, log); if (R() < 0.5) put(x + dx * 2, y0 - 1, z + dz, log); } blob(x, y0 + hgt - 1, z, 2); blob(x, y0 + hgt + 1, z, 1); put(x, y0 + hgt + 2, z, leaf); break;
      case 'palm': trunk(hgt); put(x, y0 + hgt, z, leaf); for (let a = 0; a < 4; a++) { const dx = [1, -1, 0, 0][a], dz = [0, 0, 1, -1][a]; put(x + dx, y0 + hgt, z + dz, leaf); put(x + dx * 2, y0 + hgt, z + dz * 2, leaf); put(x + dx * 3, y0 + hgt - 1, z + dz * 3, leaf); if (R() < 0.6) put(x + dx * 4, y0 + hgt - 2, z + dz * 4, leaf); } for (const [dx, dz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) { put(x + dx, y0 + hgt, z + dz, leaf); put(x + dx * 2, y0 + hgt - 1, z + dz * 2, leaf); } break;
      case 'willow': trunk(hgt - 2); blob(x, y0 + hgt - 1, z, 3, true); for (let dz = -3; dz <= 3; dz++) for (let dx = -3; dx <= 3; dx++) if (Math.abs(dx) + Math.abs(dz) >= 3 && Math.abs(dx) + Math.abs(dz) <= 4 && R() < 0.7) for (let k = 0; k < 2 + Math.floor(R() * 3); k++) put(x + dx, y0 + hgt - 2 - k, z + dz, leaf); break;
    }
    if (!gen) { this.remote = prevRemote; if (this.onBlocks && !prevRemote) this.onBlocks(placed, t.id); }
    return true;
  }
  placePlants() {
    const density = { temperate: 0.07, prairie: 0.1, desert: 0.05, rainforest: 0.09, boreal: 0.07, wetland: 0.1 };
    for (let z = 1; z < this.D - 1; z++) for (let x = 1; x < this.W - 1; x++) {
      const biome = this.biomeAt(x, z); if (this.rand() > density[biome]) continue;
      const h = this.height[x + z * this.W];
      const opts = BC.PLANTS.filter(p => p.biomes[0] === biome || (p.biomes.includes(biome) && this.rand() < 0.4));
      if (!opts.length) continue;
      const p = opts[Math.floor(this.rand() * opts.length)];
      this.placeWild(p, x, z, h);
    }
    // epiphytes on rainforest trunks
    this.treeAt.forEach((tid, key) => { const t = BC.TREE_BY_ID[tid]; if (!t || !t.biomes.includes('rainforest') || this.rand() > 0.12) return; const y = Math.floor(key / (this.W * this.D)); const r = key % (this.W * this.D); const x = r % this.W, z = Math.floor(r / this.W); if (!BC.BLOCKS[this.blocks[key]].log || y < 2) return; const dx = this.rand() < 0.5 ? 1 : -1; if (this.get(x + dx, y, z) !== 0 || this.biomeAt(x + dx, z) !== 'rainforest') return; const p = this.rand() < 0.6 ? BC.PLANT_BY_ID.bromeliad : BC.PLANT_BY_ID.vanilla; this.addPlant({ id: p.id, x: x + dx, y, z, wild: true, progress: 1, health: 1, onBark: true }); });
  }
  placeWild(p, x, z, h) {
    const WL = this.WL;
    if (p.epiphyte) return false;
    if (p.water === 'aquatic') { if (h >= WL || h < WL - 2) return false; if (p.floating) { if (this.get(x, WL + 1, z) !== 0) return false; this.addPlant({ id: p.id, x, y: WL, z, wild: true, progress: 1, health: 1 }); return true; } if (h !== WL - 1) return false; this.addPlant({ id: p.id, x, y: h + 1, z, wild: true, progress: 1, health: 1 }); return true; }
    if (h < WL) return false; if (this.get(x, h + 1, z) !== 0) return false; const soil = this.soilAt(x, h, z); if (!soil) return false;
    this.addPlant({ id: p.id, x, y: h + 1, z, wild: true, progress: 1, health: 1 }); return true;
  }
  pickAnimals() {
    const perBiome = {}; for (let z = 4; z < this.D - 4; z += 3) for (let x = 4; x < this.W - 4; x += 3) { const b = this.biomeAt(x, z); const h = this.height[x + z * this.W]; if (h < this.WL) continue; (perBiome[b] = perBiome[b] || []).push([x, z]); }
    BC.ANIMALS.forEach(a => { if (a.hidden) return; a.biomes.forEach((b, bi) => { const cells = perBiome[b]; if (!cells || !cells.length) return; const n = Math.round((bi === 0 ? 4 : 2) * this.scale); for (let i = 0; i < n; i++) { const c = cells[Math.floor(this.rand() * cells.length)]; this.spawnAnimals.push({ id: a.id, x: c[0] + 0.5, z: c[1] + 0.5 }); } }); });
  }
  openAround(x, z, r) { for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) { const h = this.height[(x + dx) + (z + dz) * this.W]; for (let y = h + 1; y <= h + 3; y++) if (this.get(x + dx, y, z + dz) !== 0) return false; } return true; }
  findSpawn(biome) {
    let best = null, bd = 1e9; const cx = this.W / 2, cz = this.D / 2;
    for (let pass = 0; pass < 2 && !best; pass++)
      for (let z = 8; z < this.D - 8; z += 2) for (let x = 8; x < this.W - 8; x += 2) { if (this.biomeAt(x, z) !== biome) continue; const h = this.height[x + z * this.W]; if (h <= this.WL) continue; if (this.get(x, h + 1, z) !== 0 || this.get(x, h + 2, z) !== 0) continue; if (pass === 0 && !this.openAround(x, z, 3)) continue; const d = (x - cx) ** 2 + (z - cz) ** 2; if (d < bd) { bd = d; best = [x, h, z]; } }
    return best || [this.W / 2 | 0, this.top(this.W / 2 | 0, this.D / 2 | 0), this.D / 2 | 0];
  }
  // save / load
  // Save only what differs from the deterministic generation: changed blocks, changed/added plants, removed wild plants, added tree blocks, moisture that drifted.
  serialize() {
    const diffs = []; this.diffs.forEach((v, k) => diffs.push(k, v));
    const plants = [], removed = []; const gen = this.genPlantKeys || new Set();
    this.plants.forEach(p => { if (p.wild && gen.has(p.key) && p.progress >= 1 && !p.withered) return; plants.push({ id: p.id, x: p.x, y: p.y, z: p.z, wild: p.wild, progress: p.progress, health: p.health, pollinated: p.pollinated, withered: p.withered, onBark: p.onBark, owner: p.owner }); });
    gen.forEach(k => { if (!this.plants.has(k)) removed.push(k); });
    const trees = []; const gt = this.genTreeKeys || new Set(); this.treeAt.forEach((v, k) => { if (!gt.has(k)) trees.push(k, v); });
    const moist = []; for (let i = 0; i < this.moisture.length; i++) { const base = BC.BIOMES[BC.BIOME_LIST[this.biome[i]]].baseMoisture; if (Math.abs(this.moisture[i] - base) > 0.03) moist.push(i, Math.round(this.moisture[i] * 100)); }
    return { v: 2, W: this.W, D: this.D, H: this.H, diffs, plants, removed, trees, moist };
  }
  restore(s) {
    const prev = this.remote; this.remote = true;
    for (let i = 0; i < s.diffs.length; i += 2) { const k = s.diffs[i], v = s.diffs[i + 1]; if (this.blocks[k] !== v) { this.blocks[k] = v; const c = this.coords(k); this.markDirty(c[0], c[2]); } this.diffs.set(k, v); }
    if (s.v === 2) {
      (s.removed || []).forEach(k => { const p = this.plants.get(k); if (p) this.removePlant(p); });
      s.plants.forEach(p => { const ex = this.plants.get(this.idx(p.x, p.y, p.z)); if (ex) this.removePlant(ex); this.addPlant(p); });
      for (let i = 0; i < s.trees.length; i += 2) this.treeAt.set(s.trees[i], s.trees[i + 1]);
      if (s.moist) for (let i = 0; i < s.moist.length; i += 2) this.moisture[s.moist[i]] = s.moist[i + 1] / 100;
    } else {
      this.plants.forEach(p => this.markDirty(p.x, p.z)); this.plants.clear(); s.plants.forEach(p => this.addPlant(p));
      this.treeAt.clear(); for (let i = 0; i < s.trees.length; i += 2) this.treeAt.set(s.trees[i], s.trees[i + 1]);
      if (s.moist) for (let i = 0; i < s.moist.length; i++) this.moisture[i] = s.moist[i] / 100;
    }
    this.remote = prev;
  }
  coords(i) { const y = Math.floor(i / (this.W * this.D)); const r = i % (this.W * this.D); return [r % this.W, y, Math.floor(r / this.W)]; }
};
