window.BC = window.BC || {};
// Builds THREE meshes for 16x16 chunks: opaque blocks, water, and plant sprites.
BC.Mesher = (function () {
  // face: [normal, 4 vertex offsets, uv index 0 top/1 side/2 bottom, shade]
  const FACES = [
    { n: [0, 1, 0], v: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]], t: 0, s: 1.0 },
    { n: [0, -1, 0], v: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]], t: 2, s: 0.5 },
    { n: [1, 0, 0], v: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]], t: 1, s: 0.8 },
    { n: [-1, 0, 0], v: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]], t: 1, s: 0.8 },
    { n: [0, 0, 1], v: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]], t: 1, s: 0.68 },
    { n: [0, 0, -1], v: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]], t: 1, s: 0.68 },
  ];
  // AO neighbours for each vertex of each face: pairs of tangent directions.
  function aoFor(world, x, y, z, face, vi) {
    const n = face.n; const v = face.v[vi];
    // tangent axes
    let t1, t2; if (n[1] !== 0) { t1 = [v[0] ? 1 : -1, 0, 0]; t2 = [0, 0, v[2] ? 1 : -1]; } else if (n[0] !== 0) { t1 = [0, v[1] ? 1 : -1, 0]; t2 = [0, 0, v[2] ? 1 : -1]; } else { t1 = [v[0] ? 1 : -1, 0, 0]; t2 = [0, v[1] ? 1 : -1, 0]; }
    const bx = x + n[0], by = y + n[1], bz = z + n[2];
    const occ = (dx, dy, dz) => { const id = world.get(bx + dx, by + dy, bz + dz); const b = BC.BLOCKS[id]; return b && b.solid && !b.fence && !b.shape ? 1 : 0; };
    const s1 = occ(t1[0], t1[1], t1[2]), s2 = occ(t2[0], t2[1], t2[2]); const c = occ(t1[0] + t2[0], t1[1] + t2[1], t1[2] + t2[2]);
    return s1 && s2 ? 3 : s1 + s2 + c;
  }
  const AO_SHADE = [1, 0.8, 0.66, 0.52];

  class Builder {
    constructor() { this.pos = []; this.nor = []; this.uv = []; this.col = []; this.idx = []; this.n = 0; }
    quad(verts, normal, uvr, shades, tint) { // verts: 4 [x,y,z]; shades: 4 floats; uvr [u0,v0,u1,v1]
      const [u0, v0, u1, v1] = uvr; const uvs = [[u0, v1], [u1, v1], [u1, v0], [u0, v0]];
      for (let i = 0; i < 4; i++) { this.pos.push(verts[i][0], verts[i][1], verts[i][2]); this.nor.push(normal[0], normal[1], normal[2]); this.uv.push(uvs[i][0], uvs[i][1]); const s = shades[i]; this.col.push(s * (tint ? tint[0] : 1), s * (tint ? tint[1] : 1), s * (tint ? tint[2] : 1)); }
      const b = this.n; if (shades[0] + shades[2] > shades[1] + shades[3]) this.idx.push(b, b + 1, b + 2, b, b + 2, b + 3); else this.idx.push(b + 1, b + 2, b + 3, b + 1, b + 3, b);
      this.n += 4;
    }
    box(x0, y0, z0, x1, y1, z1, tile, shadeK) { // axis-aligned box with all faces; tile is a name or {top, side, bottom}
      const k = shadeK || 1; const tiles = typeof tile === 'string' ? [tile, tile, tile] : [tile.top, tile.side, tile.bottom];
      const X = [x0, x1], Y = [y0, y1], Z = [z0, z1];
      FACES.forEach(f => { const verts = f.v.map(v => [X[v[0]], Y[v[1]], Z[v[2]]]); this.quad(verts, f.n, BC.Atlas.uv(tiles[f.t]), [f.s * k, f.s * k, f.s * k, f.s * k]); });
    }
    geometry() {
      if (!this.n) return null; const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
      g.setIndex(this.idx); g.computeBoundingSphere(); return g;
    }
  }

  function buildChunk(world, cx, cz) {
    const solid = new Builder(), water = new Builder(), cutout = new Builder();
    const x0 = cx * 16, z0 = cz * 16, x1 = Math.min(world.W, x0 + 16), z1 = Math.min(world.D, z0 + 16);
    for (let z = z0; z < z1; z++) for (let x = x0; x < x1; x++) for (let y = 0; y < world.H; y++) {
      const id = world.blocks[world.idx(x, y, z)]; if (id === 0) continue; const b = BC.BLOCKS[id]; if (!b) continue;
      if (b.liquid) {
        if (world.get(x, y + 1, z) === 0) { const f = FACES[0]; const uvr = BC.Atlas.uv('water'); solid; water.quad(f.v.map(v => [x + v[0], y + v[1] - 0.12, z + v[2]]), f.n, uvr, [1, 1, 1, 1]); }
        for (let fi = 2; fi < 6; fi++) { const f = FACES[fi]; if (world.get(x + f.n[0], y + f.n[1], z + f.n[2]) === 0) water.quad(f.v.map(v => [x + v[0], y + v[1] * 0.88, z + v[2]]), f.n, BC.Atlas.uv('water'), [f.s, f.s, f.s, f.s]); }
        continue;
      }
      if (b.shape) { const dst = b.cutout ? cutout : solid; const lit = b.lit ? 1.25 : 1; b.shape.forEach(bx => dst.box(x + bx[0], y + bx[1], z + bx[2], x + bx[3], y + bx[4], z + bx[5], bx[6], lit)); continue; }
      if (b.fence) {
        solid.box(x + 0.375, y, z + 0.375, x + 0.625, y + 1, z + 0.625, 'planks');
        const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
        dirs.forEach(([dx, dz]) => { const nb = BC.BLOCKS[world.get(x + dx, y, z + dz)]; if (nb && (nb.fence || (nb.solid && !nb.leaves && !nb.shape))) { const ax = dx !== 0; for (const ry of [0.35, 0.75]) solid.box(x + (ax ? (dx > 0 ? 0.6 : 0) : 0.44), y + ry, z + (ax ? 0.44 : (dz > 0 ? 0.6 : 0)), x + (ax ? (dx > 0 ? 1 : 0.4) : 0.56), y + ry + 0.12, z + (ax ? 0.56 : (dz > 0 ? 1 : 0.4)), 'planks', 0.9); } });
        continue;
      }
      for (let fi = 0; fi < 6; fi++) {
        const f = FACES[fi]; const nid = world.get(x + f.n[0], y + f.n[1], z + f.n[2]); const nb = BC.BLOCKS[nid];
        if (nb && nb.solid && !nb.fence && !nb.shape) continue;
        if (y === 0 && fi === 1) continue;
        const tile = b.tex[f.t]; const uvr = BC.Atlas.uv(tile);
        const shades = [0, 1, 2, 3].map(vi => f.s * AO_SHADE[aoFor(world, x, y, z, f, vi)]);
        // subtle biome tint on grass tops
        let tint = null; if (b.grassTop && fi === 0) { const bm = BC.BIOMES[world.biomeAt(x, z)]; const m = world.moisture[x + z * world.W]; const k = 0.92 + m * 0.1; tint = [k, k * (bm.id === 'desert' ? 1 : 1.02), k * 0.98]; }
        solid.quad(f.v.map(v => [x + v[0], y + v[1], z + v[2]]), f.n, uvr, shades, tint);
      }
    }
    return { solid: solid.geometry(), water: water.geometry(), cutout: cutout.geometry() };
  }

  function plantTile(p) {
    if (p.withered) return 'withered';
    const stage = p.progress >= 1 ? 2 : p.progress >= 0.4 ? 1 : 0;
    if (p.id.startsWith('tree:')) { const t = BC.TREE_BY_ID[p.id.slice(5)]; const n = t.shape === 'conifer' ? 'sapling_conifer' : t.shape === 'saguaro' ? 'sapling_cactus' : 'sapling_broad'; return n + '_' + stage; }
    return p.id + '_' + stage;
  }
  function buildPlants(world, cx, cz) {
    const b = new Builder(); const x0 = cx * 16, z0 = cz * 16;
    world.plants.forEach(p => {
      if (p.x < x0 || p.x >= x0 + 16 || p.z < z0 || p.z >= z0 + 16) return;
      const def = BC.PLANT_BY_ID[p.id]; const uvr = BC.Atlas.uv(plantTile(p));
      const h = BC.util.hash2(p.x, p.z, 7); const ox = p.x + 0.5 + (h - 0.5) * 0.3, oz = p.z + 0.5 + (BC.util.hash2(p.z, p.x, 9) - 0.5) * 0.3;
      const light = 0.75 + 0.25 * world.lightAt(p.x, p.y, p.z); const sh = [light, light, light * 1.05, light * 1.05];
      if (def && def.floating) { const y = p.y + 0.9; const s = 0.5 * (p.progress >= 1 ? 1 : 0.7); b.quad([[ox - s, y, oz + s], [ox + s, y, oz + s], [ox + s, y, oz - s], [ox - s, y, oz - s]], [0, 1, 0], uvr, [1, 1, 1, 1]); return; }
      const tall = def && (def.tall || def.form === 'corn' || def.form === 'banana' || def.form === 'cattail') ? 1.5 : 1.0; const scale = tall; const y = p.y + (def && def.water === 'aquatic' ? -0.05 : 0);
      const r = 0.5 * (p.id.startsWith('tree:') ? 0.8 : 1); const a = (h - 0.5) * 0.6;
      const c = Math.cos(a) * r, s = Math.sin(a) * r;
      b.quad([[ox - c, y, oz - s], [ox + c, y, oz + s], [ox + c, y + scale, oz + s], [ox - c, y + scale, oz - s]], [-s, 0, c], uvr, sh);
      b.quad([[ox + s, y, oz - c], [ox - s, y, oz + c], [ox - s, y + scale, oz + c], [ox + s, y + scale, oz - c]], [c, 0, s], uvr, sh);
      if (p.pest && !p.wild) { const ps = BC.INSECT_BY_ID[p.pest.id]; const col = new THREE.Color(ps ? ps.color : '#ffffff'); const t = [col.r, col.g, col.b]; const pu = BC.Atlas.uv('pest'); const r2 = 0.42 * (0.5 + 0.5 * p.pest.level); const y2 = y + scale * 0.35; b.quad([[ox - r2, y2, oz], [ox + r2, y2, oz], [ox + r2, y2 + r2 * 2, oz], [ox - r2, y2 + r2 * 2, oz]], [0, 0, 1], pu, [1, 1, 1, 1], t); b.quad([[ox, y2, oz - r2], [ox, y2, oz + r2], [ox, y2 + r2 * 2, oz + r2], [ox, y2 + r2 * 2, oz - r2]], [1, 0, 0], pu, [1, 1, 1, 1], t); }
      if (p.covered && !p.wild) { const cu = BC.Atlas.uv('trellis'); const yc = y + scale * 0.9; b.quad([[ox - 0.5, yc, oz + 0.5], [ox + 0.5, yc, oz + 0.5], [ox + 0.5, yc, oz - 0.5], [ox - 0.5, yc, oz - 0.5]], [0, 1, 0], cu, [1, 1, 1, 1], [1.6, 1.6, 1.6]); }
    });
    return b.geometry();
  }
  return { buildChunk, buildPlants, plantTile };
})();
