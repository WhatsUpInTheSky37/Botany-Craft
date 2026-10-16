window.BC = window.BC || {};
// Village folk: wander near home, face you when you come close, and open a conversation when tapped.
BC.NPCs = class {
  constructor(game) { this.game = game; this.list = []; this.tmp = new THREE.Vector3(); }
  clear() { this.list.forEach(e => this.game.scene.remove(e.group)); this.list = []; }
  spawnFromWorld() {
    this.clear(); const w = this.game.world; if (!w.villages) return;
    w.villages.forEach(v => v.npcs.forEach(n => {
      const t = BC.NPC_BY_ID[n.type]; if (!t) return;
      const look = BC.Avatar.npcLook(t.id, n.name); const group = this.game.buildAvatar(n.name, t.color, Object.assign({ style: 'npc' }, look));
      const y = this.floorAt(Math.floor(n.x), Math.floor(n.z), n.y !== undefined ? n.y + 1 : w.top(Math.floor(n.x), Math.floor(n.z)) + 1); group.position.set(n.x, y, n.z); this.game.scene.add(group);
      this.list.push({ uid: n.uid, type: t, def: t, name: n.name, village: v, x: n.x, y, z: n.z, home: [n.x, n.z], origHome: [n.x, n.z], origY: y, origIndoors: !!n.indoors, indoors: !!n.indoors, yaw: Math.random() * 6.28, group, workStyle: look.work || 'inspect', target: null, timer: 1 + Math.random() * 3, talking: 0, work: 0, workT: 0 });
    }));
  }
  // Standing height: the first solid block at or below a reference height, plus one. Ignores roofs overhead.
  floorAt(x, z, refY) { const w = this.game.world; for (let y = Math.min(w.H - 1, Math.floor(refY)); y >= 0; y--) { const b = BC.BLOCKS[w.get(x, y, z)]; if (b && b.solid && !b.liquid) return y + BC.blockTop(b.id); if (b && b.liquid) return -1; } return -1; }
  walkable(x, z, fromY) { const w = this.game.world; if (x < 1 || z < 1 || x >= w.W - 1 || z >= w.D - 1) return false; const f = this.floorAt(x | 0, z | 0, fromY + 0.5); if (f < 0 || Math.abs(f - fromY) > 1.01) return false; const a1 = BC.BLOCKS[w.get(x | 0, f, z | 0)], a2 = BC.BLOCKS[w.get(x | 0, f + 1, z | 0)]; if ((a1 && a1.solid) || (a2 && a2.solid)) return false; return true; }
  update(dt) {
    const g = this.game; const p = g.player.pos; const w = g.world;
    for (const e of this.list) {
      const dpx = p.x - e.x, dpz = p.z - e.z; const d2 = dpx * dpx + dpz * dpz;
      // sent on a job: work at the hirer's garden until it ends, then go home
      const job = g.hires.find(h => h.uid === e.uid && h.until > g.time.t && !['market', 'rain'].includes(h.service) && h.at);
      if (job) { if (e.home[0] !== job.at[0] + 0.5 || e.home[1] !== job.at[1] + 0.5) { e.home = [job.at[0] + 0.5, job.at[1] + 0.5]; e.indoors = false; let ok = false; for (let r = 1; r <= 5 && !ok; r++) for (let dz = -r; dz <= r && !ok; dz++) for (let dx = -r; dx <= r && !ok; dx++) { const x = job.at[0] + dx, z = job.at[1] + dz; if (x < 1 || z < 1 || x >= w.W - 1 || z >= w.D - 1) continue; const t = w.top(x, z); if (w.waterSurface(x, z) >= 0 || w.get(x, t + 1, z) !== 0 || w.get(x, t + 2, z) !== 0 || w.plantAt(x, t + 1, z)) continue; e.x = x + 0.5; e.z = z + 0.5; e.y = t + 1; ok = true; } e.target = null; e.work = 4; e.workT = 0; } }
      else if (e.home[0] !== e.origHome[0] || e.home[1] !== e.origHome[1]) { e.home = e.origHome.slice(); e.indoors = e.origIndoors; e.x = e.origHome[0]; e.z = e.origHome[1]; e.y = e.origY; e.target = null; }
      if (d2 > 90 * 90 && !job) continue; // far away: do not bother
      if (e.talking > 0) e.talking -= dt;
      if (d2 < 16 || e.talking > 0) { e.target = null; const want = Math.atan2(dpx, dpz); let da = want - e.yaw; da = Math.atan2(Math.sin(da), Math.cos(da)); e.yaw += da * Math.min(1, dt * 6); }
      else {
        e.timer -= dt;
        if (!e.target && e.timer <= 0) { if (e.work <= 0 && Math.random() < 0.5) { e.work = 3 + Math.random() * 4; e.workT = 0; e.timer = e.work + 1; } else { const a = Math.random() * 6.28, r = 0.6 + Math.random() * (e.indoors ? 1.6 : 2.6); const tx = e.home[0] + Math.cos(a) * r, tz = e.home[1] + Math.sin(a) * r; if (this.walkable(tx, tz, e.y)) e.target = [tx, tz]; e.timer = 2 + Math.random() * 5; } }
        if (e.target) { const dx = e.target[0] - e.x, dz = e.target[1] - e.z; const d = Math.hypot(dx, dz); if (d < 0.2) { e.target = null; } else { const sp = 1.3 * dt; const nx = e.x + dx / d * sp, nz = e.z + dz / d * sp; if (this.walkable(nx, nz, e.y)) { e.x = nx; e.z = nz; } else e.target = null; const want = Math.atan2(dx, dz); let da = want - e.yaw; da = Math.atan2(Math.sin(da), Math.cos(da)); e.yaw += da * Math.min(1, dt * 8); } }
      }
      const gy = this.floorAt(Math.floor(e.x), Math.floor(e.z), e.y + 0.5); if (gy >= 0) e.y += (gy - e.y) * Math.min(1, dt * 10);
      // rig animation: walk, idle fidgets and blinking, talk gestures, and the role's own way of working
      if (e.work > 0) { e.work -= dt; e.workT += dt; } BC.Avatar.animate(e.group, dt, { moving: !!e.target, speed: 0.8, talking: e.talking > 0, work: e.work > 0 ? e.workStyle : null, workT: e.workT });
      e.group.position.set(e.x, e.y, e.z); e.group.rotation.y = e.yaw; e.group.visible = d2 < 80 * 80;
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
