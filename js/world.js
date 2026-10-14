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
    this.nutr = new Float32Array(this.W * this.D * 3); this.phShift = new Float32Array(this.W * this.D); this.om = new Float32Array(this.W * this.D); this.mulch = new Float32Array(this.W * this.D); this.hives = new Map(); this.chests = new Map();
    this.hf = new Float32Array(this.W * this.D); this.nutrBase = null; this.flowDir = new Int8Array(this.W * this.D).fill(-1); this.flowAcc = new Float32Array(this.W * this.D); this.wetBonus = new Float32Array(this.W * this.D); this.wlvl = new Uint8Array(this.W * this.D * this.H); this.waterQueue = []; this.stream = new Uint8Array(this.W * this.D);
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
    const was = this.blocks[i]; this.blocks[i] = id; if (!silent) this.diffs.set(i, id);
    if (id === 0 && !this.generating) { const above = this.plantAt(x, y + 1, z); if (above && !above.onBark) { const d = BC.PLANT_BY_ID[above.id]; if (!(d && d.water === 'aquatic' && this.get(x, y + 1, z) === 15)) this.removePlant(above); } }
    if (this.onBlock && !this.remote) this.onBlock(x, y, z, id);
    if (id === 0 || id === 15 || was === 15) this.onWaterChange(x, y, z, id, was);
    this.markDirty(x, z); if ((x & 15) === 0) this.markDirty(x - 1, z); if ((x & 15) === 15) this.markDirty(x + 1, z); if ((z & 15) === 0) this.markDirty(x, z - 1); if ((z & 15) === 15) this.markDirty(x, z + 1);
  }
  markDirty(x, z) { if (x < 0 || z < 0 || x >= this.W || z >= this.D) return; this.dirty.add((x >> 4) + (z >> 4) * this.CX); }
  biomeAt(x, z) { x = BC.util.clamp(x | 0, 0, this.W - 1); z = BC.util.clamp(z | 0, 0, this.D - 1); return BC.BIOME_LIST[this.biome[x + z * this.W]]; }
  top(x, z) { for (let y = this.H - 1; y >= 0; y--) { const b = this.get(x, y, z); if (b !== 0 && b !== 15) return y; } return 0; }
  surface(x, z) { for (let y = this.H - 1; y >= 0; y--) if (this.get(x, y, z) !== 0) return y; return 0; }
  soilAt(x, y, z) { const b = BC.BLOCKS[this.get(x, y, z)]; return b && b.soil ? BC.SOILS[b.soil] : null; }
  plantKey(x, y, z) { return this.idx(x, y, z); }
  col(x, z) { return x + z * this.W; }
  baseNutr(x, z) { const b = BC.BIOMES[this.biomeAt(x, z)]; return BC.SOIL_NUTR[b.soil]; }
  soilChem(x, z, soil) { const i = this.col(x, z); const ph = BC.util.clamp((soil ? soil.ph : 6.5) + this.phShift[i], 3.5, 9); return { ph, n: this.nutr[i * 3], p: this.nutr[i * 3 + 1], k: this.nutr[i * 3 + 2], om: this.om[i], mulch: this.mulch[i] }; }
  // Apply an ingredient to a soil column. Returns a description of what changed.
  amend(x, z, ing) { const i = this.col(x, z); const out = []; const npk = ing.npk || [0, 0, 0]; ['N', 'P', 'K'].forEach((nm, k) => { if (npk[k]) { const before = this.nutr[i * 3 + k]; this.nutr[i * 3 + k] = Math.min(1.2, before + npk[k] * 0.5); out.push(nm + ' +' + Math.round((this.nutr[i * 3 + k] - before) * 100)); } }); if (ing.ph) { this.phShift[i] = BC.util.clamp(this.phShift[i] + ing.ph, -2.5, 2.5); out.push('pH ' + (ing.ph > 0 ? 'up' : 'down') + ' ' + Math.abs(ing.ph).toFixed(1)); } if (ing.om) { this.om[i] = Math.min(1, this.om[i] + ing.om); out.push('humus +' + Math.round(ing.om * 100)); } if (ing.moisture) { this.mulch[i] = Math.min(1, this.mulch[i] + ing.moisture); out.push('mulch'); } this.markDirty(x, z); return out; }
  plantAt(x, y, z) { return this.plants.get(this.idx(x, y, z)); }
  addPlant(p) { p.key = this.idx(p.x, p.y, p.z); this.plants.set(p.key, p); this.markDirty(p.x, p.z); if (this.onPlant && !this.remote && !this.generating) this.onPlant(p, false); return p; }
  removePlant(p) { this.plants.delete(p.key); this.markDirty(p.x, p.z); if (this.onPlant && !this.remote && !this.generating) this.onPlant(p, true); }
  // light reaching a cell: 1 = open sky, lower under leaves.
  lightAt(x, y, z) { let l = 1; for (let yy = y + 1; yy < this.H; yy++) { const b = BC.BLOCKS[this.get(x, yy, z)]; if (!b || b.id === 0 || b.liquid) continue; if (b.leaves) l *= 0.55; else if (b.fence || b.shape || b.cutout) l *= 0.9; else l *= 0.25; if (l < 0.05) break; } return l; }

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
      this.hf[ci] = h; h = BC.util.clamp(Math.round(h), 3, H - 12);
      if (h < WL) h = Math.max(3, WL - 1 - Math.round((WL - h) * 2.2 + 1)); // lakes drop away from the shore: deep enough to swim and dive
      this.biome[ci] = BC.BIOME_LIST.indexOf(biome); this.height[ci] = h;
      this.moisture[ci] = BC.BIOMES[biome].baseMoisture; const nb = BC.SOIL_NUTR[BC.BIOMES[biome].soil]; this.nutr[ci * 3] = nb[0]; this.nutr[ci * 3 + 1] = nb[1]; this.nutr[ci * 3 + 2] = nb[2];
      this.fillColumn(x, z, h, biome);
    }
    this.computeFlow(); this.carveStreams(); this.placeTrees(); this.placePlants(); this.placeVillages(); this.computeWetness(); this.pickAnimals();
    this.pruneFloating(); this.diffs.clear(); this.generating = false;
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
      if (h < this.WL + (biome === 'wetland' ? -1 : 1) || this.stream[x + z * this.W]) continue;
      if (this.rand() > density[biome]) continue;
      let ok = true; for (let dz = -2; dz <= 2 && ok; dz++) for (let dx = -2; dx <= 2; dx++) if (occupied.has((x + dx) + ',' + (z + dz))) { ok = false; break; }
      if (!ok) continue;
      const opts = BC.TREES.filter(t => t.biomes.includes(biome)); if (!opts.length) continue;
      const t = opts[Math.floor(this.rand() * opts.length)];
      if (t.biomes[0] !== biome && this.rand() < 0.6) continue;
      if (this.buildTree(t, x, h + 1, z, true)) occupied.add(x + ',' + z);
    }
  }
  pruneFloating() { const dead = []; this.plants.forEach(p => { if (p.onBark) return; const d = BC.PLANT_BY_ID[p.id]; if (d && d.water === 'aquatic') return; const below = BC.BLOCKS[this.get(p.x, p.y - 1, p.z)]; if (!below || !below.solid || this.get(p.x, p.y, p.z) !== 0) dead.push(p); }); dead.forEach(p => this.plants.delete(p.key)); return dead.length; }
  // ---------- hydrology ----------
  // D8 flow: every column drains to its lowest neighbour; accumulation counts how many columns drain through each cell (a proxy for stream size).
  computeFlow() {
    const W = this.W, D = this.D, H = this.hf; const dirs = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]]; this.FLOW_DIRS = dirs;
    const n = (x, z) => { if (this.height[x + z * W] < this.WL) return -1; const h0 = H[x + z * W]; let best = -1, bd = 0; for (let k = 0; k < 8; k++) { const nx = x + dirs[k][0], nz = z + dirs[k][1]; if (nx < 0 || nz < 0 || nx >= W || nz >= D) continue; const drop = (h0 - H[nx + nz * W]) / (k % 2 ? 1.414 : 1); if (drop > bd) { bd = drop; best = k; } } return best; };
    for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) this.flowDir[x + z * W] = n(x, z);
    const order = new Uint32Array(W * D); for (let i = 0; i < W * D; i++) order[i] = i; order.sort((a, b) => H[b] - H[a]);
    const acc = this.flowAcc; acc.fill(1);
    for (let k = 0; k < order.length; k++) { const i = order[k]; const d = this.flowDir[i]; if (d < 0) continue; const x = i % W, z = (i / W) | 0; const j = (x + dirs[d][0]) + (z + dirs[d][1]) * W; acc[j] += acc[i]; }
  }
  // Streams: where enough land drains through a column above the lake level, cut the surface down one block and fill it with water.
  carveStreams() {
    const W = this.W, D = this.D, WL = this.WL; const dirs = this.FLOW_DIRS;
    const land = []; for (let i = 0; i < W * D; i++) if (this.height[i] > WL) land.push(this.flowAcc[i]); land.sort((a, b) => a - b); const T = Math.max(40, land[Math.floor(land.length * 0.985)] || 40); this.streamT = T;
    const cells = []; for (let i = 0; i < W * D; i++) { if (this.flowAcc[i] >= T && this.height[i] > WL) cells.push(i); }
    const cut = i => { const x = i % W, z = (i / W) | 0; const h = this.height[i]; if (h <= WL) return; if (BC.BIOME_LIST[this.biome[i]] === 'desert' && this.flowAcc[i] < T * 3) return; const bi = this.idx(x, h, z); this.blocks[bi] = 15; for (let y = h + 1; y < this.H; y++) { const k = this.idx(x, y, z); if (this.blocks[k]) { this.blocks[k] = 0; } } this.height[i] = h - 1; this.stream[i] = 1; const under = this.idx(x, h - 1, z); if (!BC.BLOCKS[this.blocks[under]] || !BC.BLOCKS[this.blocks[under]].solid) this.blocks[under] = BC.BLOCK.GRAVEL; };
    cells.forEach(cut);
    // widen the big ones onto neighbours no higher than the channel
    cells.forEach(i => { if (this.flowAcc[i] < T * 4) return; const x = i % W, z = (i / W) | 0; for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, nz = z + dz; if (nx < 1 || nz < 1 || nx >= W - 1 || nz >= D - 1) continue; const j = nx + nz * W; if (this.stream[j] || this.height[j] > this.height[i] + 1) continue; cut(j); } });
    // make every stream block drain: lower a stream cell that sits above its downstream neighbour by more than one so water steps down, not jumps
    for (let pass = 0; pass < 2; pass++) cells.forEach(i => { const d = this.flowDir[i]; if (d < 0) return; const x = i % W, z = (i / W) | 0; const j = (x + dirs[d][0]) + (z + dirs[d][1]) * W; if (this.stream[j] && this.height[j] < this.height[i] - 1) { /* small cascade: fine */ } });
  }
  // Riparian bonus: soil next to water stays wetter; the biggest drainages are fertile bottomland.
  computeWetness() {
    const W = this.W, D = this.D; for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) this.wetBonus[x + z * W] = this.wetAt(x, z);
    for (let i = 0; i < W * D; i++) { this.moisture[i] = Math.min(1, BC.BIOMES[BC.BIOME_LIST[this.biome[i]]].baseMoisture + this.wetBonus[i]); if (this.flowAcc[i] > (this.streamT || 160) * 0.4 && this.height[i] > this.WL) { for (let k = 0; k < 3; k++) this.nutr[i * 3 + k] = Math.min(1, this.nutr[i * 3 + k] * 1.3 + 0.05); this.om[i] = Math.max(this.om[i], 0.15); } }
    this.nutrBase = Float32Array.from(this.nutr); this.omBase = Float32Array.from(this.om);
  }
  wetAt(x, z) { const h = this.height[x + z * this.W]; let best = 0; for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) { const nx = x + dx, nz = z + dz; if (nx < 0 || nz < 0 || nx >= this.W || nz >= this.D) continue; const hn = this.height[nx + nz * this.W]; for (let y = Math.max(0, h - 1); y <= h + 1; y++) { if (this.get(nx, y, nz) === 15) { const d = Math.max(Math.abs(dx), Math.abs(dz)); best = Math.max(best, d <= 1 ? 0.28 : 0.14); } } void hn; } return Math.min(0.45, best + Math.min(0.12, Math.log1p(this.flowAcc[x + z * this.W]) * 0.012)); }
  refreshWetness(x, z) { for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) { const nx = x + dx, nz = z + dz; if (nx < 0 || nz < 0 || nx >= this.W || nz >= this.D) continue; this.wetBonus[nx + nz * this.W] = this.wetAt(nx, nz); } }
  drainage(x, z) { const i = x + z * this.W; const d = this.flowDir[i]; const names = ['east', 'south-east', 'south', 'south-west', 'west', 'north-west', 'north', 'north-east']; const acc = this.flowAcc[i]; const T = this.streamT || 160; return { dir: d < 0 ? 'nowhere (a basin: water pools here)' : names[d], acc, kind: this.stream[i] ? 'stream bed' : acc >= T ? 'stream course' : acc > T * 0.4 ? 'bottomland (floodplain)' : acc > 12 ? 'slope' : 'upland / ridge', wet: this.wetBonus[i] }; }
  // Live water: a dug or placed opening next to water lets it flow in; water falls, then spreads up to seven blocks sideways, losing a level each step.
  onWaterChange(x, y, z, id, was) {
    if (this.generating) return;
    if (id === 0) { for (const [dx, dy, dz] of [[1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1], [0, 1, 0]]) if (this.get(x + dx, y + dy, z + dz) === 15) this.waterQueue.push(this.idx(x + dx, y + dy, z + dz)); }
    if (id === 15) { this.waterQueue.push(this.idx(x, y, z)); }
    if (id === 15 || was === 15) { this.refreshWetness(x, z); if (this.onWater) this.onWater(x, y, z, id); }
  }
  levelOf(i) { return this.wlvl[i]; } // 0 = source (lakes, streams), 1..7 flowing
  tickWater(max) {
    let n = 0; const q = this.waterQueue; const prev = this.remote; this.remote = true;
    while (q.length && n < (max || 150)) {
      const i = q.shift(); n++; if (this.blocks[i] !== 15) continue; const [x, y, z] = this.coords(i); const L = y <= this.WL || this.stream[x + z * this.W] ? 0 : this.wlvl[i];
      const below = y > 0 ? this.get(x, y - 1, z) : 1;
      if (below === 0) { const j = this.idx(x, y - 1, z); this.wlvl[j] = 7; this.set(x, y - 1, z, 15); this.flooded(x, y - 1, z); continue; }
      const spread = L === 0 ? 7 : L - 1; if (spread < 1) continue;
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, nz = z + dz; if (!this.inBounds(nx, y, nz)) continue; if (this.get(nx, y, nz) !== 0) continue; const j = this.idx(nx, y, nz); this.wlvl[j] = spread; this.set(nx, y, nz, 15); this.flooded(nx, y, nz); }
    }
    this.remote = prev; return n;
  }
  flooded(x, y, z) { const p = this.plantAt(x, y, z); if (p && !(BC.PLANT_BY_ID[p.id] && BC.PLANT_BY_ID[p.id].water === 'aquatic')) this.removePlant(p); if (this.onFlood) this.onFlood(x, y, z); }
  waterSurface(x, z) { for (let y = this.H - 1; y >= 0; y--) { const b = this.get(x, y, z); if (b === 15) return y; if (b !== 0) return -1; } return -1; }
  isFlowing(x, z) { return this.stream[x + z * this.W] === 1 || this.flowAcc[x + z * this.W] > (this.streamT || 160); }
  // ---------- villages ----------
  // Villages use their own random stream so adding them does not change the rest of the terrain for worlds saved before they existed.
  placeVillages() {
    this.villages = []; const R = BC.util.rng((this.seed ^ 0x5151a7) >>> 0); const SZ = 28; const WL = this.WL;
    const sites = []; const taken = [];
    const biomes = BC.BIOME_LIST.slice(); for (let i = biomes.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [biomes[i], biomes[j]] = [biomes[j], biomes[i]]; }
    for (const biome of biomes) {
      let best = null;
      for (let tries = 0; tries < 900 && !best; tries++) {
        const ox = 4 + Math.floor(R() * (this.W - SZ - 8)), oz = 4 + Math.floor(R() * (this.D - SZ - 8));
        if (taken.some(t => Math.abs(t[0] - ox) < SZ + 24 && Math.abs(t[1] - oz) < SZ + 24)) continue;
        let same = 0, lo = 1e9, hi = -1e9, sum = 0, dry = 0; const n = SZ * SZ; let water = 0;
        for (let z = 0; z < SZ; z++) for (let x = 0; x < SZ; x++) { const ci = (ox + x) + (oz + z) * this.W; const h = this.height[ci]; if (h <= WL) { water++; continue; } dry++; if (BC.BIOME_LIST[this.biome[ci]] === biome) same++; lo = Math.min(lo, h); hi = Math.max(hi, h); sum += h; }
        const wet = biome === 'wetland'; const tol = tries < 450 ? 3 : 5; if (water > n * (wet ? 0.45 : 0.08) || same < n * (wet ? 0.4 : 0.75) || hi - lo > tol) continue;
        best = { ox, oz, hy: Math.max(WL + 1, Math.round(sum / dry)), biome };
      }
      if (best) { sites.push(best); taken.push([best.ox, best.oz]); }
    }
    sites.forEach((site, vi) => this.buildVillage(site, vi, R));
  }
  buildVillage(site, vi, R) {
    const { ox, oz, hy, biome } = site; const SZ = 28; const B = BC.BIOMES[biome];
    const soilTop = this.get(ox + 1, this.height[(ox + 1) + (oz + 1) * this.W], oz + 1) || 1; const soilId = BC.BLOCKS[soilTop] && BC.BLOCKS[soilTop].soil ? soilTop : 1;
    // flatten the footprint, clearing trees and plants
    for (let z = -1; z <= SZ; z++) for (let x = -1; x <= SZ; x++) {
      const wx = ox + x, wz = oz + z; if (wx < 0 || wz < 0 || wx >= this.W || wz >= this.D) continue; const ci = wx + wz * this.W; const h = this.height[ci];
      for (let y = Math.min(h, hy) + 1; y < this.H; y++) { const i = this.idx(wx, y, wz); if (this.blocks[i] !== 0) { this.blocks[i] = 0; this.treeAt.delete(i); } }
      for (let y = h + 1; y <= hy; y++) this.blocks[this.idx(wx, y, wz)] = y === hy ? soilId : (this.get(wx, h, wz) || soilId);
      if (h > hy) { this.blocks[this.idx(wx, hy, wz)] = soilId; }
      this.height[ci] = hy;
      const keys = []; this.plants.forEach(p => { if (p.x === wx && p.z === wz) keys.push(p); }); keys.forEach(p => this.plants.delete(p.key));
    }
    const y0 = hy + 1; const put = (x, y, z, id) => { const wx = ox + x, wz = oz + z; if (this.inBounds(wx, y, wz)) this.blocks[this.idx(wx, y, wz)] = id; };
    const ground = (x, z, id) => put(x, hy, z, id);
    const plankOf = { temperate: 19, prairie: 19, desert: 64, rainforest: 62, boreal: 61, wetland: 63 }[biome] || 19; const P = plankOf;
    const localPlants = BC.PLANTS.filter(p => p.biomes.includes(biome) && !p.invasive && p.water !== 'aquatic' && !p.epiphyte);
    const crops = localPlants.filter(p => ['tomato', 'potato', 'cabbage', 'cucumber', 'chili', 'corn', 'bean', 'squash', 'basil', 'marigold', 'chives', 'dill', 'nasturtium', 'yarrow', 'sunflower', 'buckwheat', 'alfalfa', 'mustard', 'comfrey', 'coffee', 'banana', 'pineapple', 'blueberry', 'cloudberry', 'prickly_pear', 'agave', 'cacao'].includes(p.id));
    const pool = crops.length >= 4 ? crops : localPlants; const pick = arr => arr[Math.floor(R() * arr.length)];
    const sow = (x, z, def) => { const wx = ox + x, wz = oz + z; if (!def) return; const key = this.idx(wx, y0, wz); if (this.plants.has(key) || this.blocks[key] !== 0 || !BC.BLOCKS[this.blocks[this.idx(wx, hy, wz)]] || !BC.BLOCKS[this.blocks[this.idx(wx, hy, wz)]].solid) return; const p = { id: def.id, x: wx, y: y0, z: wz, wild: true, progress: 1, health: 1, village: true }; p.key = key; this.plants.set(key, p); };
    // paths: gravel cross, boardwalk in the wet
    const pathId = biome === 'wetland' ? 68 : 16;
    for (let x = 0; x < SZ; x++) for (let z = 13; z <= 14; z++) { if (pathId === 68) put(x, y0, z, 68); else ground(x, z, pathId); }
    for (let z = 0; z < SZ; z++) for (let x = 13; x <= 14; x++) { if (pathId === 68) put(x, y0, z, 68); else ground(x, z, pathId); }
    // lamp posts at the crossing
    [[12, 12], [15, 12], [12, 15], [15, 15]].forEach(([x, z]) => { put(x, y0, z, 18); put(x, y0 + 1, z, 18); put(x, y0 + 2, z, 81); });
    // buildings: [x0, z0, w, d, front(0 -z,1 +x,2 +z,3 -x), kind]
    const house = (x0, z0, w, d, front, kind) => {
      const hgt = 3; const doorX = front === 0 || front === 2 ? x0 + (w >> 1) : (front === 1 ? x0 + w - 1 : x0); const doorZ = front === 1 || front === 3 ? z0 + (d >> 1) : (front === 2 ? z0 + d - 1 : z0);
      for (let x = x0; x < x0 + w; x++) for (let z = z0; z < z0 + d; z++) {
        const edge = x === x0 || x === x0 + w - 1 || z === z0 || z === z0 + d - 1; ground(x, z, edge ? P : 19);
        if (!edge) continue;
        const corner = (x === x0 || x === x0 + w - 1) && (z === z0 || z === z0 + d - 1);
        for (let y = 0; y < hgt; y++) { let id = P; if (!corner && y === 1 && ((x - x0) % 2 === 1 || (z - z0) % 2 === 1) && !(x === doorX && z === doorZ)) id = (z === z0 || z === z0 + d - 1) ? 86 : 87; put(x, y0 + y, z, id); }
      }
      put(doorX, y0, doorZ, 118 + front); put(doorX, y0 + 1, doorZ, 0);
      // roof: shingles with stair eaves
      for (let x = x0 - 1; x <= x0 + w; x++) for (let z = z0 - 1; z <= z0 + d; z++) { const id = x === x0 - 1 ? 91 : x === x0 + w ? 93 : z === z0 - 1 ? 92 : z === z0 + d ? 90 : 74; put(x, y0 + hgt, z, id); }
      for (let x = x0 + 1; x < x0 + w - 1; x++) for (let z = z0 + 1; z < z0 + d - 1; z++) put(x, y0 + hgt + 1, z, (x === x0 + 1 || x === x0 + w - 2 || z === z0 + 1 || z === z0 + d - 2) ? 67 : 74);
      // window boxes under front windows, sign and lantern by the door
      const fd = BC.FACING_DIR[front]; put(doorX + fd[0] + (fd[0] === 0 ? 1 : 0), y0 + 1, doorZ + fd[1] + (fd[1] === 0 ? 1 : 0), 106 + front);
      put(doorX + fd[0], y0 + 2, doorZ + fd[1], 80);
      // interior
      const ix = x0 + 1, iz = z0 + 1, iw = w - 2, idp = d - 2;
      if (kind === 'cottage') { put(ix, y0, iz, 134 + 2); put(ix, y0, iz + 1, 138 + 2); put(ix + iw - 1, y0, iz, 69); put(ix + iw - 1, y0, iz + 1, 73); put(ix + (iw >> 1), y0, iz + idp - 1, 78); put(ix + (iw >> 1) + 1, y0, iz + idp - 1, 94 + 3); put(ix + 1, y0 + 2, iz + 1, 80); if (iw > 3) put(ix + 1, y0, iz + idp - 1, 79); }
      else if (kind === 'store') { for (let x = ix; x < ix + iw; x += 2) { put(x, y0, iz, 78); put(x, y0 + 1, iz, 82); } put(ix + iw - 1, y0, iz + 1, 73); put(ix + iw - 1, y0, iz + 2, 71); put(ix + iw - 1, y0, iz + 3, 70); put(ix, y0, iz + idp - 1, 72); put(ix + 1, y0 + 1, iz + idp - 1, 102 + 0); put(ix + 2, y0 + 1, iz + idp - 1, 102 + 0); put(ix + (iw >> 1), y0 + 2, iz + (idp >> 1), 80); put(ix + (iw >> 1), y0, iz + (idp >> 1), 84); for (let x = ix; x < ix + iw; x++) if (x % 2 === 0) put(x, y0, iz + idp - 2, 78); }
      return { doorX, doorZ, front };
    };
    const store = house(1, 1, 11, 9, 2, 'store');
    const cotA = house(17, 1, 7, 6, 2, 'cottage'); const cotB = house(17, 20, 7, 6, 3, 'cottage'); const cotC = house(2, 20, 7, 6, 0, 'cottage');
    // nursery beds in front of the store: raised beds with local seedlings and saplings
    for (let x = 1; x <= 11; x++) for (const z of [11, 12]) { if (x === 6) { ground(x, z, pathId === 68 ? 16 : pathId); continue; } put(x, y0, z, 76); }
    const trees = BC.TREES.filter(t => t.biomes.includes(biome));
    for (let x = 1; x <= 11; x++) for (const z of [11, 12]) { if (x === 6) continue; const wx = ox + x, wz = oz + z; const key = this.idx(wx, y0 + 1, wz); const def = (z === 12 && R() < 0.5 && trees.length) ? pick(trees) : pick(pool); const id = def.shape ? 'tree:' + def.id : def.id; const p = { id, x: wx, y: y0 + 1, z: wz, wild: true, progress: 1, health: 1, village: true }; p.key = key; this.plants.set(key, p); }
    // market stall east of the crossing
    for (let x = 17; x <= 26; x++) for (let z = 9; z <= 11; z++) put(x, y0, z, 68);
    [[18, 10], [20, 10], [22, 10], [24, 10]].forEach(([x, z]) => put(x, y0 + 1, z, 78)); put(19, y0 + 1, 10, 71); put(21, y0 + 1, 10, 70); put(23, y0 + 1, 10, 82); put(25, y0 + 1, 10, 77); put(26, y0 + 1, 9, 18); put(26, y0 + 2, 9, 81); put(17, y0 + 1, 9, 18); put(17, y0 + 2, 9, 81); put(17, y0 + 1, 11, 106 + 3);
    // community garden south-east: fenced plot with rows, hive, well, compost
    for (let x = 16; x <= 26; x++) for (let z = 16; z <= 19; z++) { const edge = x === 16 || x === 26 || z === 16 || z === 19; if (edge) put(x, y0, z, x === 21 && z === 16 ? 126 + 0 : 18); else ground(x, z, 17); }
    for (let x = 17; x <= 25; x++) for (let z = 17; z <= 18; z++) { if (x === 21) continue; sow(x, z, pick(pool)); }
    put(27, y0, 17, 146); put(27, y0, 19, 70); put(16, y0, 21, 77);
    // well west of the crossing
    [[9, 16], [10, 16], [9, 17], [10, 17]].forEach(([x, z]) => put(x, hy, z, 14)); put(9, hy, 16, 15); [[8, 15], [11, 15], [8, 18], [11, 18]].forEach(([x, z]) => { put(x, y0, z, 18); put(x, y0 + 1, z, 18); }); put(9, y0 + 2, 16, 67); put(10, y0 + 2, 16, 67); put(9, y0 + 2, 17, 67); put(10, y0 + 2, 17, 67);
    // benches and a notice board on the plaza, flowers along the paths
    put(11, y0, 14 + 1, 98 + 0); put(16, y0, 12, 98 + 2); put(12, y0, 11, 106 + 2);
    const flowers = localPlants.filter(p => p.pollinator); for (let x = 0; x < SZ; x += 3) { if (x >= 12 && x <= 15) continue; sow(x, 12, pick(flowers.length ? flowers : pool)); sow(x, 15, pick(flowers.length ? flowers : pool)); }
    // choose the folk: nursery owner always; four others, rotating so every kind appears somewhere
    const types = BC.NPC_TYPES.filter(t => t.id !== 'nursery'); const picked = [BC.NPC_BY_ID.nursery]; for (let k = 0; k < 4; k++) picked.push(types[(vi * 4 + k) % types.length]);
    const spots = [[6, 5], [cotA.doorX, cotA.doorZ + 1], [cotB.doorX - 1, cotB.doorZ], [cotC.doorX, cotC.doorZ - 1], [21, 9]]; const spotY = [y0, y0, y0, y0, y0 + 1];
    const name = BC.VILLAGE_NAMES[biome][vi % BC.VILLAGE_NAMES[biome].length];
    const npcs = picked.map((t, i) => ({ type: t.id, name: t.names[(vi + i) % t.names.length], x: ox + spots[i][0] + 0.5, y: spotY[i], z: oz + spots[i][1] + 0.5, uid: 'v' + vi + 'n' + i, indoors: i === 0 }));
    // keep the shopkeeper's spot clear of furniture
    put(6, y0, 5, 0); put(6, y0 + 1, 5, 0);
    this.villages.push({ id: vi, name, biome, x: ox, z: oz, cx: ox + 14, cz: oz + 14, y: hy, npcs });
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
      const h = this.height[x + z * this.W]; if (this.stream[x + z * this.W]) continue;
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
    BC.ANIMALS.forEach(a => { if (a.hidden) return; a.biomes.forEach((b, bi) => { const cells = perBiome[b]; if (!cells || !cells.length) return; const n = Math.round((a.insect ? (bi === 0 ? 1.5 : 0.5) : (bi === 0 ? 4 : 2)) * this.scale); for (let i = 0; i < n; i++) { const c = cells[Math.floor(this.rand() * cells.length)]; this.spawnAnimals.push({ id: a.id, x: c[0] + 0.5, z: c[1] + 0.5 }); } }); });
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
    this.plants.forEach(p => { if (p.wild && gen.has(p.key) && p.progress >= 1 && !p.withered) return; plants.push({ id: p.id, x: p.x, y: p.y, z: p.z, wild: p.wild, progress: p.progress, health: p.health, pollinated: p.pollinated, withered: p.withered, onBark: p.onBark, owner: p.owner, pest: p.pest || undefined, covered: p.covered || undefined }); });
    gen.forEach(k => { if (!this.plants.has(k)) removed.push(k); });
    const trees = []; const gt = this.genTreeKeys || new Set(); this.treeAt.forEach((v, k) => { if (!gt.has(k)) trees.push(k, v); });
    const moist = []; for (let i = 0; i < this.moisture.length; i++) { const base = Math.min(1, BC.BIOMES[BC.BIOME_LIST[this.biome[i]]].baseMoisture + this.wetBonus[i]); if (Math.abs(this.moisture[i] - base) > 0.03) moist.push(i, Math.round(this.moisture[i] * 100)); }
    const soil = []; for (let i = 0; i < this.W * this.D; i++) { const nb = this.nutrBase ? [this.nutrBase[i * 3], this.nutrBase[i * 3 + 1], this.nutrBase[i * 3 + 2]] : BC.SOIL_NUTR[BC.BIOMES[BC.BIOME_LIST[this.biome[i]]].soil]; const ob = this.omBase ? this.omBase[i] : 0; const n = this.nutr[i * 3], pp = this.nutr[i * 3 + 1], k = this.nutr[i * 3 + 2]; if (Math.abs(n - nb[0]) > 0.02 || Math.abs(pp - nb[1]) > 0.02 || Math.abs(k - nb[2]) > 0.02 || Math.abs(this.phShift[i]) > 0.02 || Math.abs(this.om[i] - ob) > 0.02 || this.mulch[i] > 0.02) soil.push(i, Math.round(n * 100), Math.round(pp * 100), Math.round(k * 100), Math.round(this.phShift[i] * 100), Math.round(this.om[i] * 100), Math.round(this.mulch[i] * 100)); }
    const hives = []; this.hives.forEach((h, k) => hives.push(k, h.honey || 0, h.wax || 0, Math.round(h.t || 0)));
    const chests = []; this.chests.forEach((slots, k) => { if (slots.some(Boolean)) chests.push([k, slots.map((it, i) => it ? [i, it.type, it.id === undefined ? null : it.id, it.count] : null).filter(Boolean)]); });
    const wl = []; this.diffs.forEach((v, k) => { if (v === 15 && this.wlvl[k]) wl.push(k, this.wlvl[k]); });
    return { v: 2, W: this.W, D: this.D, H: this.H, diffs, plants, removed, trees, moist, soil, hives, chests, wl };
  }
  restore(s) {
    const prev = this.remote; this.remote = true; let waterTouched = false;
    for (let i = 0; i < s.diffs.length; i += 2) { const k = s.diffs[i], v = s.diffs[i + 1]; if (this.blocks[k] !== v) { if (v === 15 || this.blocks[k] === 15) waterTouched = true; this.blocks[k] = v; const c = this.coords(k); this.markDirty(c[0], c[2]); } this.diffs.set(k, v); }
    if (waterTouched) this.computeWetness();
    if (s.v === 2) {
      (s.removed || []).forEach(k => { const p = this.plants.get(k); if (p) this.removePlant(p); });
      s.plants.forEach(p => { const ex = this.plants.get(this.idx(p.x, p.y, p.z)); if (ex) this.removePlant(ex); this.addPlant(p); });
      for (let i = 0; i < s.trees.length; i += 2) this.treeAt.set(s.trees[i], s.trees[i + 1]);
      if (s.moist) for (let i = 0; i < s.moist.length; i += 2) this.moisture[s.moist[i]] = s.moist[i + 1] / 100;
      if (s.soil) for (let i = 0; i < s.soil.length; i += 7) { const c = s.soil[i]; this.nutr[c * 3] = s.soil[i + 1] / 100; this.nutr[c * 3 + 1] = s.soil[i + 2] / 100; this.nutr[c * 3 + 2] = s.soil[i + 3] / 100; this.phShift[c] = s.soil[i + 4] / 100; this.om[c] = s.soil[i + 5] / 100; this.mulch[c] = s.soil[i + 6] / 100; }
      if (s.wl) for (let i = 0; i < s.wl.length; i += 2) this.wlvl[s.wl[i]] = s.wl[i + 1];
      if (s.chests) { this.chests.clear(); s.chests.forEach(([k, items]) => { const slots = new Array(BC.CHEST_SLOTS).fill(null); items.forEach(([i, type, id, count]) => { if (i < slots.length) slots[i] = id === null ? { type, count } : { type, id, count }; }); this.chests.set(k, slots); }); }
      if (s.hives) { this.hives.clear(); for (let i = 0; i < s.hives.length; i += 4) this.hives.set(s.hives[i], { honey: s.hives[i + 1], wax: s.hives[i + 2], t: s.hives[i + 3] }); }
    } else {
      this.plants.forEach(p => this.markDirty(p.x, p.z)); this.plants.clear(); s.plants.forEach(p => this.addPlant(p));
      this.treeAt.clear(); for (let i = 0; i < s.trees.length; i += 2) this.treeAt.set(s.trees[i], s.trees[i + 1]);
      if (s.moist) for (let i = 0; i < s.moist.length; i++) this.moisture[i] = s.moist[i] / 100;
    }
    this.remote = prev;
  }
  coords(i) { const y = Math.floor(i / (this.W * this.D)); const r = i % (this.W * this.D); return [r % this.W, y, Math.floor(r / this.W)]; }
};
