window.BC = window.BC || {};
// Blocky animals built from merged boxes, with simple wander / forage / pollinate behaviour.
BC.Animals = class Animals {
  constructor(game) { this.game = game; this.list = []; this.mat = new THREE.MeshLambertMaterial({ vertexColors: true }); this.tmp = new THREE.Vector3(); }
  buildMesh(def) {
    const geos = []; const col = new THREE.Color();
    const box = (w, h, l, x, y, z, color) => { const g = new THREE.BoxGeometry(w, h, l); g.translate(x, y, z); col.set(color); const n = g.attributes.position.count; const c = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const k = g.attributes.normal.getY(i) > 0.5 ? 1 : g.attributes.normal.getY(i) < -0.5 ? 0.55 : 0.8; c[i * 3] = col.r * k; c[i * 3 + 1] = col.g * k; c[i * 3 + 2] = col.b * k; } g.setAttribute('color', new THREE.BufferAttribute(c, 3)); geos.push(g); };
    const [bw, bh, bl] = def.body; const legH = def.legH; const c = def.colors; const s = def.scale || 1;
    box(bw, bh, bl, 0, legH + bh / 2, 0, c.body);
    const [hw, hh, hl] = def.head; box(hw, hh, hl, 0, legH + bh + hh * 0.2, bl / 2 + hl / 2 - 0.05, c.head);
    box(hw * 0.25, hh * 0.25, hw * 0.25, -hw * 0.3, legH + bh + hh * 0.5, bl / 2 + hl - 0.02, '#111'); box(hw * 0.25, hh * 0.25, hw * 0.25, hw * 0.3, legH + bh + hh * 0.5, bl / 2 + hl - 0.02, '#111');
    if (legH > 0) { const lw = Math.min(0.14, bw * 0.3); for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(lw, legH, lw, sx * (bw / 2 - lw / 2), legH / 2, sz * (bl / 2 - lw / 2), c.legs); }
    if (def.ears) for (const sx of [-1, 1]) box(hw * 0.25, hh * 1.2, hw * 0.15, sx * hw * 0.3, legH + bh + hh * 1.0, bl / 2 + hl * 0.3, c.head);
    if (def.antlers) for (const sx of [-1, 1]) { box(0.5, 0.06, 0.3, sx * 0.4, legH + bh + hh + 0.1, bl / 2, c.accent); box(0.06, 0.3, 0.06, sx * 0.55, legH + bh + hh + 0.25, bl / 2, c.accent); }
    if (def.beak) box(hw * 0.4, hh * 0.35, hl * (def.id === 'toucan' ? 1.6 : 1.2), 0, legH + bh + hh * 0.2, bl / 2 + hl + hl * 0.6, c.accent);
    if (def.wings) for (const sx of [-1, 1]) box(bl * 0.9, 0.02, bl * 0.6, sx * bl * 0.5, legH + bh + 0.02, 0, c.accent);
    if (def.id === 'bumblebee') { box(bw * 1.05, bh * 0.4, bl * 0.25, 0, legH + bh / 2, -bl * 0.1, c.accent); box(bw * 1.05, bh * 0.4, bl * 0.2, 0, legH + bh / 2, bl * 0.25, c.accent); for (const sx of [-1, 1]) box(bl * 0.6, 0.02, bl * 0.4, sx * bw * 0.5, legH + bh + 0.02, 0, '#dfe8f0'); }
    if (def.id === 'heron') { box(0.08, 0.5, 0.08, 0, legH + bh + 0.1, bl / 2 - 0.1, c.body); }
    if (def.id === 'deer' || def.id === 'moose' || def.id === 'bison') box(0.08, 0.2, 0.06, 0, legH + bh * 0.8, -bl / 2 - 0.02, c.accent);
    if (def.id === 'cottontail' || def.id === 'hare') box(0.12, 0.12, 0.12, 0, legH + bh * 0.7, -bl / 2 - 0.04, c.accent);
    if (def.id === 'dart_frog' || def.id === 'lizard' || def.id === 'frog') box(bw * 0.9, bh * 0.4, bl * 0.4, 0, legH + bh * 0.9, -bl * 0.1, c.accent);
    const merged = BC.mergeGeometries(geos); merged.scale(s, s, s); const m = new THREE.Mesh(merged, this.mat); m.castShadow = !!BC.SHADOWS; return m;
  }
  spawn(id, x, z, uid) {
    const def = BC.ANIMAL_BY_ID[id]; if (!def) return null; const w = this.game.world; const y = w.top(x | 0, z | 0) + 1;
    const mesh = this.buildMesh(def); mesh.position.set(x, y, z); this.game.scene.add(mesh);
    const e = { uid: uid || Math.random().toString(36).slice(2, 9), def, mesh, x, y, z, yaw: Math.random() * 6.28, state: 'idle', timer: Math.random() * 3, target: null, cool: 0, bob: Math.random() * 10, fly: def.flies ? 1.5 + Math.random() : 0, home: [x, z], leash: null };
    this.list.push(e); return e;
  }
  byUid(uid) { return this.list.find(e => e.uid === uid); }
  remove(e) { const i = this.list.indexOf(e); if (i < 0) return; this.list.splice(i, 1); this.game.scene.remove(e.mesh); if (e.line) { this.game.scene.remove(e.line); e.line = null; } }
  // Position of the player holding a leash (host resolves by name).
  leaderPos(name) { const g = this.game; if (name === g.playerName) return g.player.pos; let out = null; g.peers.forEach(pe => { if (pe.name.toLowerCase() === name) out = pe.group.position; }); return out; }
  anchor(e) { if (e.tether) { const t = e.tether; return { x: t[0] + 0.5, y: this.game.world.top(t[0], t[1]) + 1, z: t[1] + 0.5, post: true }; } return e.leash ? this.leaderPos(e.leash) : null; }
  updateLeashLines() {
    const g = this.game;
    for (const e of this.list) {
      const lp = this.anchor(e);
      if (!lp) { if (e.line) { g.scene.remove(e.line); e.line = null; } continue; }
      if (!e.line) { const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]); e.line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xc8a060 })); g.scene.add(e.line); }
      const a = e.line.geometry.attributes.position; a.setXYZ(0, lp.x, lp.y + 1.0, lp.z); a.setXYZ(1, e.mesh.position.x, e.mesh.position.y + 0.5 * (e.def.scale || 1), e.mesh.position.z); a.needsUpdate = true; e.line.geometry.computeBoundingSphere();
    }
  }
  nearestPlant(e, pred, range) {
    let best = null, bd = range * range; this.game.world.plants.forEach(p => { if (!pred(p)) return; const d = (p.x + 0.5 - e.x) ** 2 + (p.z + 0.5 - e.z) ** 2; if (d < bd) { bd = d; best = p; } }); return best;
  }
  walkable(e, x, z) { const w = this.game.world; if (x < 1 || z < 1 || x >= w.W - 1 || z >= w.D - 1) return false; const t = w.top(x | 0, z | 0); const under = w.get(x | 0, t, z | 0); const above = w.get(x | 0, t + 1, z | 0); if (e.def.aquatic) return above === 15; if (above === 15 && !(e.def.id === 'moose' || e.def.id === 'frog' || e.def.id === 'heron' || e.def.flies)) return false; if (above === 15 && w.get(x | 0, t + 2, z | 0) === 15) return false; if (BC.BLOCKS[under] && BC.BLOCKS[under].fence) return false; if (Math.abs(t + 1 - e.y) > 1.6 && !e.def.flies) return false; return true; }
  update(dt) {
    const w = this.game.world; const pl = this.game.player.pos; const stats = this.game.stats; const others = this.game.peerPositions();
    for (const e of this.list) {
      const d = e.def; e.timer -= dt; e.cool -= dt; e.bob += dt;
      let far = (e.x - pl.x) ** 2 + (e.z - pl.z) ** 2; for (const o of others) far = Math.min(far, (e.x - o.x) ** 2 + (e.z - o.z) ** 2); if (far > 70 * 70) continue; // sleep far away
      const nearPlayer = (e.x - pl.x) ** 2 + (e.z - pl.z) ** 2 < 3.2 * 3.2; if (nearPlayer && !stats.journal.has('animal:' + d.id)) this.game.discover('animal:' + d.id, 'seen');
      // on a rope: follow the leader, nothing else
      if (e.leash) { const lp = this.leaderPos(e.leash); if (!lp) e.leash = null; else { const dx = lp.x - e.x, dz = lp.z - e.z; const dist = Math.hypot(dx, dz); e.state = 'idle'; e.timer = 1; e.plant = null; const near = BC.PERK === 'ranger' ? 1.3 : 1.8, far = BC.PERK === 'ranger' ? 2.3 : 3.2; if (dist > near) { e.target = [lp.x - dx / dist * (near - 0.4), lp.z - dz / dist * (near - 0.4)]; } else e.target = null; if (dist > far) { const k = (dist - (far - 0.2)) / dist; e.x += dx * k; e.z += dz * k; e.target = e.target || [lp.x, lp.z]; } } }
      if (e.tether) { const a = this.anchor(e); const dx = a.x - e.x, dz = a.z - e.z; const dist = Math.hypot(dx, dz); e.plant = null; if (dist > 2.6) { const k = (dist - 2.4) / dist; e.x += dx * k; e.z += dz * k; e.target = null; e.state = 'idle'; e.timer = 1; } }
      // behaviour selection
      if (!e.leash && (e.state === 'idle' || e.state === 'wander')) {
        if (e.timer <= 0) {
          if (e.state === 'idle') { // choose: forage, pollinate or wander
            let p = null;
            if (e.tether) p = null; else if (d.role === 'herbivore' && e.cool <= 0) p = this.nearestPlant(e, q => !q.wild && !q.withered && !q.id.startsWith('tree:') && !q.protected, 9);
            if (e.tether) p = null; else if (d.role === 'beneficial' && e.cool <= 0) { p = this.nearestPlant(e, q => !q.wild && q.pest && d.eats && d.eats.includes(q.pest.id), 14) || this.nearestPlant(e, q => { const def = BC.PLANT_BY_ID[q.id]; return def && def.pollinator && q.progress >= 1 && !q.withered; }, 10); }
            else if (d.role === 'pollinator' && e.cool <= 0) p = this.nearestPlant(e, q => { const def = BC.PLANT_BY_ID[q.id]; return def && def.pollinator && q.progress >= 1 && !q.withered && (!q.wild || Math.random() < 0.3); }, 12);
            if (p) { e.target = [p.x + 0.5, p.z + 0.5]; e.plant = p; e.state = 'seek'; e.timer = 12; }
            else { const a = Math.random() * 6.28, r = 2 + Math.random() * 5; const hx = e.home[0] + Math.cos(a) * r, hz = e.home[1] + Math.sin(a) * r; if (this.walkable(e, hx, hz)) { e.target = [hx, hz]; e.state = 'wander'; e.timer = 6; } else e.timer = 0.5; }
          } else { e.state = 'idle'; e.timer = 1 + Math.random() * 3; e.target = null; }
        }
      }
      if (e.state === 'seek' && (e.timer <= 0 || !e.plant || !w.plants.has(e.plant.key))) { e.state = 'idle'; e.timer = 1; e.plant = null; e.target = null; }
      // move toward target
      if (e.target) {
        const dx = e.target[0] - e.x, dz = e.target[1] - e.z; const dist = Math.hypot(dx, dz);
        if (dist < (e.state === 'seek' ? 0.9 : 0.4)) {
          if (e.state === 'seek' && e.plant) {
            if (d.role === 'herbivore') { const o = e.plant.owner; if (this.game.isFenced(e.plant)) { e.plant.protected = true; this.game.notify(o, `${d.name} could not get past your fence.`, 'good'); this.game.credit(o, 'fenced', true, true); } else { e.plant.progress = Math.max(0, e.plant.progress - 0.35); if (e.plant.progress < 0.05 && Math.random() < 0.5) { w.removePlant(e.plant); this.game.notify(o, `A ${d.name.toLowerCase()} ate your ${this.game.plantName(e.plant)}. Build a fence from logs to protect crops.`, 'bad'); } else { w.markDirty(e.plant.x, e.plant.z); this.game.notify(o, `A ${d.name.toLowerCase()} nibbled your ${this.game.plantName(e.plant)}.`, 'bad'); } } e.cool = 40; }
            else if (d.role === 'pollinator') { if (!e.plant.wild && !e.plant.pollinated) { e.plant.pollinated = true; this.game.credit(e.plant.owner, 'pollinated', true, true); this.game.notify(e.plant.owner, `A ${d.name.toLowerCase()} pollinated your ${this.game.plantName(e.plant)}. More seeds at harvest!`, 'good'); } e.cool = 15; }
            e.state = 'idle'; e.timer = 2; e.plant = null;
          } else { e.state = 'idle'; e.timer = 1 + Math.random() * 3; }
          e.target = null;
        } else {
          const sp = d.speed * (e.leash ? 2.4 : e.state === 'seek' ? 1.2 : 0.7); const nx = e.x + dx / dist * sp * dt, nz = e.z + dz / dist * sp * dt;
          if (this.walkable(e, nx, nz)) { e.x = nx; e.z = nz; const ty = Math.atan2(dx, dz); let da = ty - e.yaw; da = Math.atan2(Math.sin(da), Math.cos(da)); e.yaw += da * Math.min(1, 6 * dt); }
          else { e.target = null; e.state = 'idle'; e.timer = 0.5; if (e.plant && d.role === 'herbivore') { e.cool = 30; } }
        }
      }
      // ground follow
      const t = w.top(e.x | 0, e.z | 0); let gy = w.standY(e.x | 0, e.z | 0); if (w.get(e.x | 0, t + 1, e.z | 0) === 15) gy = d.aquatic ? t + 1.1 : t + 1.6;
      const targetY = gy + (d.flies ? e.fly + Math.sin(e.bob * 2) * 0.2 : 0); e.y += (targetY - e.y) * Math.min(1, 8 * dt);
      const hop = (d.id === 'cottontail' || d.id === 'hare' || d.id === 'frog' || d.id === 'dart_frog') && e.target ? Math.abs(Math.sin(e.bob * 8)) * 0.25 : (e.target && !d.flies ? Math.abs(Math.sin(e.bob * 10)) * 0.04 : 0);
      e.mesh.position.set(e.x, e.y + hop, e.z); e.mesh.rotation.y = e.yaw; e.mesh.rotation.z = d.flies ? Math.sin(e.bob * 3) * 0.1 : 0;
      if (d.wings) e.mesh.rotation.x = Math.sin(e.bob * 20) * 0.15;
    }
    this.updateLeashLines();
  }
  // Host -> guests: compact positions. Guests interpolate toward them.
  snapshot() { const out = []; this.list.forEach(e => { out.push(e.uid, Math.round(e.x * 20) / 20, Math.round(e.y * 20) / 20, Math.round(e.z * 20) / 20, Math.round(e.yaw * 100) / 100); }); return out; }
  applyRemote(list) { const m = new Map(this.list.map(e => [e.uid, e])); for (let i = 0; i < list.length; i += 5) { const e = m.get(list[i]); if (!e) continue; e.rx = list[i + 1]; e.ry = list[i + 2]; e.rz = list[i + 3]; e.ryaw = list[i + 4]; if (e.rx === undefined || e.first === undefined) { e.x = e.rx; e.y = e.ry; e.z = e.rz; e.yaw = e.ryaw; e.first = 1; } } }
  updateGuest(dt) {
    const pl = this.game.player.pos; const stats = this.game.stats;
    for (const e of this.list) { e.bob += dt; if (e.rx !== undefined) { const k = Math.min(1, dt * 6); const dx = e.rx - e.x, dz = e.rz - e.z; const moving = Math.hypot(dx, dz) > 0.05; e.x += dx * k; e.y += (e.ry - e.y) * k; e.z += dz * k; let da = e.ryaw - e.yaw; da = Math.atan2(Math.sin(da), Math.cos(da)); e.yaw += da * k; e.moving = moving; }
      const d = e.def; if ((e.x - pl.x) ** 2 + (e.z - pl.z) ** 2 < 3.2 * 3.2 && !stats.journal.has('animal:' + d.id)) this.game.discover('animal:' + d.id, 'seen');
      const hop = (d.id === 'cottontail' || d.id === 'hare' || d.id === 'frog' || d.id === 'dart_frog') && e.moving ? Math.abs(Math.sin(e.bob * 8)) * 0.25 : 0;
      e.mesh.position.set(e.x, e.y + hop, e.z); e.mesh.rotation.y = e.yaw; e.mesh.rotation.z = d.flies ? Math.sin(e.bob * 3) * 0.1 : 0; if (d.wings) e.mesh.rotation.x = Math.sin(e.bob * 20) * 0.15; }
    this.updateLeashLines();
  }
  raycast(origin, dir, maxD) {
    let best = null, bd = maxD; for (const e of this.list) { const c = this.tmp.set(e.x, e.y + 0.5 * (e.def.scale || 1), e.z); const oc = c.clone().sub(origin); const t = oc.dot(dir); if (t < 0 || t > bd) continue; const r = Math.max(0.5, Math.max(e.def.body[1], e.def.body[2]) * (e.def.scale || 1) * 0.8); const d2 = oc.lengthSq() - t * t; if (d2 < r * r) { bd = t; best = e; } } return best ? { entity: best, dist: bd } : null;
  }
  serialize() { return this.list.map(e => { const o = { id: e.def.id, x: e.x, z: e.z, uid: e.uid }; if (e.tether) o.tether = e.tether; return o; }); }
};
// Minimal geometry merge (positions, normals, colors) so we don't need the examples bundle.
BC.mergeGeometries = function (geos) {
  let n = 0; geos.forEach(g => n += g.attributes.position.count); const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3); const idx = []; let off = 0;
  geos.forEach(g => { pos.set(g.attributes.position.array, off * 3); nor.set(g.attributes.normal.array, off * 3); col.set(g.attributes.color.array, off * 3); const gi = g.index.array; for (let i = 0; i < gi.length; i++) idx.push(gi[i] + off); off += g.attributes.position.count; });
  const m = new THREE.BufferGeometry(); m.setAttribute('position', new THREE.BufferAttribute(pos, 3)); m.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); m.setAttribute('color', new THREE.BufferAttribute(col, 3)); m.setIndex(idx); return m;
};
