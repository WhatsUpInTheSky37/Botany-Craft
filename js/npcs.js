window.BC = window.BC || {};
// Village folk: wander near home, face you when you come close, and open a conversation when tapped.
BC.NPCs = class {
  constructor(game) { this.game = game; this.list = []; this.tmp = new THREE.Vector3(); }
  clear() { this.list.forEach(e => this.game.scene.remove(e.group)); this.list = []; }
  spawnFromWorld() {
    this.clear(); const w = this.game.world; if (!w.villages) return;
    w.villages.forEach(v => v.npcs.forEach(n => {
      const t = BC.NPC_BY_ID[n.type]; if (!t) return;
      const group = this.game.buildAvatar(n.name, t.color);
      const hat = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.12, 0.56), new THREE.MeshLambertMaterial({ color: new THREE.Color(t.hat) })); hat.position.y = 1.82; group.add(hat);
      const crown = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.22, 0.36), new THREE.MeshLambertMaterial({ color: new THREE.Color(t.hat) })); crown.position.y = 1.95; group.add(crown);
      const apron = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.5, 0.06), new THREE.MeshLambertMaterial({ color: 0xe8e0c8 })); apron.position.set(0, 0.8, 0.18); group.add(apron);
      const y = this.floorAt(Math.floor(n.x), Math.floor(n.z), n.y !== undefined ? n.y + 1 : w.top(Math.floor(n.x), Math.floor(n.z)) + 1); group.position.set(n.x, y, n.z); this.game.scene.add(group);
      const arms = [group.children[4], group.children[5]];
      this.list.push({ uid: n.uid, type: t, def: t, name: n.name, village: v, x: n.x, y, z: n.z, home: [n.x, n.z], indoors: !!n.indoors, yaw: Math.random() * 6.28, group, arms, target: null, timer: 1 + Math.random() * 3, talking: 0, work: 0, workT: 0 });
    }));
  }
  // Standing height: the first solid block at or below a reference height, plus one. Ignores roofs overhead.
  floorAt(x, z, refY) { const w = this.game.world; for (let y = Math.min(w.H - 1, Math.floor(refY)); y >= 0; y--) { const b = BC.BLOCKS[w.get(x, y, z)]; if (b && b.solid && !b.liquid) return y + 1; if (b && b.liquid) return -1; } return -1; }
  walkable(x, z, fromY) { const w = this.game.world; if (x < 1 || z < 1 || x >= w.W - 1 || z >= w.D - 1) return false; const f = this.floorAt(x | 0, z | 0, fromY + 0.5); if (f < 0 || Math.abs(f - fromY) > 1.01) return false; const a1 = BC.BLOCKS[w.get(x | 0, f, z | 0)], a2 = BC.BLOCKS[w.get(x | 0, f + 1, z | 0)]; if ((a1 && a1.solid) || (a2 && a2.solid)) return false; return true; }
  update(dt) {
    const g = this.game; const p = g.player.pos; const w = g.world;
    for (const e of this.list) {
      const dpx = p.x - e.x, dpz = p.z - e.z; const d2 = dpx * dpx + dpz * dpz;
      if (d2 > 90 * 90) continue; // far away: do not bother
      if (e.talking > 0) e.talking -= dt;
      if (d2 < 16 || e.talking > 0) { e.target = null; const want = Math.atan2(dpx, dpz); let da = want - e.yaw; da = Math.atan2(Math.sin(da), Math.cos(da)); e.yaw += da * Math.min(1, dt * 6); }
      else {
        e.timer -= dt;
        if (!e.target && e.timer <= 0) { if (e.work <= 0 && Math.random() < 0.5) { e.work = 3 + Math.random() * 4; e.workT = 0; e.timer = e.work + 1; } else { const a = Math.random() * 6.28, r = 0.6 + Math.random() * (e.indoors ? 1.6 : 2.6); const tx = e.home[0] + Math.cos(a) * r, tz = e.home[1] + Math.sin(a) * r; if (this.walkable(tx, tz, e.y)) e.target = [tx, tz]; e.timer = 2 + Math.random() * 5; } }
        if (e.target) { const dx = e.target[0] - e.x, dz = e.target[1] - e.z; const d = Math.hypot(dx, dz); if (d < 0.2) { e.target = null; } else { const sp = 1.3 * dt; const nx = e.x + dx / d * sp, nz = e.z + dz / d * sp; if (this.walkable(nx, nz, e.y)) { e.x = nx; e.z = nz; } else e.target = null; const want = Math.atan2(dx, dz); let da = want - e.yaw; da = Math.atan2(Math.sin(da), Math.cos(da)); e.yaw += da * Math.min(1, dt * 8); } }
      }
      const gy = this.floorAt(Math.floor(e.x), Math.floor(e.z), e.y + 0.5); if (gy >= 0) e.y += (gy - e.y) * Math.min(1, dt * 10);
      // arms: swing when walking, work when busy (potting up, hoeing, sorting seed)
      let bob = 0; if (e.work > 0) { e.work -= dt; e.workT += dt; const s = Math.sin(e.workT * 6); e.arms[0].rotation.x = -1.2 + s * 0.5; e.arms[1].rotation.x = -1.2 - s * 0.5; bob = Math.abs(s) * 0.05; } else if (e.target) { const s = Math.sin(e.bobT = (e.bobT || 0) + dt * 9); e.arms[0].rotation.x = s * 0.6; e.arms[1].rotation.x = -s * 0.6; } else { e.arms[0].rotation.x *= 0.9; e.arms[1].rotation.x *= 0.9; }
      e.group.position.set(e.x, e.y - bob, e.z); e.group.rotation.y = e.yaw; e.group.visible = d2 < 80 * 80;
    }
  }
  raycast(origin, dir, maxD) {
    let best = null, bd = maxD;
    for (const e of this.list) { const c = this.tmp.set(e.x, e.y + 0.9, e.z); const ox = c.x - origin.x, oy = c.y - origin.y, oz = c.z - origin.z; const t = ox * dir.x + oy * dir.y + oz * dir.z; if (t < 0 || t > bd) continue; const d2 = ox * ox + oy * oy + oz * oz - t * t; if (d2 < 0.75 * 0.75) { bd = t; best = e; } }
    return best ? { entity: best, dist: bd } : null;
  }
  nearestVillage(x, z) { const w = this.game.world; let best = null, bd = 1e18; (w.villages || []).forEach(v => { const d = (v.cx - x) ** 2 + (v.cz - z) ** 2; if (d < bd) { bd = d; best = v; } }); return best ? { village: best, dist: Math.sqrt(bd) } : null; }
  inVillage(x, z) { const w = this.game.world; return (w.villages || []).find(v => x >= v.x - 2 && x < v.x + 30 && z >= v.z - 2 && z < v.z + 30) || null; }
};
