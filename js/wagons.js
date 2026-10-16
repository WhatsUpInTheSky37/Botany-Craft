window.BC = window.BC || {};
// Wagons: place one on the ground, hitch it to a horse, donkey, camel or other mount with a rope, load its cargo chest, and sit in it to drive.
BC.Wagons = class {
  constructor(game) { this.game = game; this.list = []; this.tmp = new THREE.Vector3(); this.wheelMat = new THREE.MeshLambertMaterial({ color: 0x3a2a1a }); }
  clear() { this.list.forEach(w => this.game.scene.remove(w.mesh)); this.list = []; }
  mesh() {
    const P = new BC.Avatar.Part(); const wood = '#9a6a3a', dark = '#5a3a1a', iron = '#4a4a50';
    P.box(1.5, 0.12, 2.3, 0, 0.56, 0, wood); P.box(1.5, 0.45, 0.1, 0, 0.84, 1.1, wood); P.box(1.5, 0.45, 0.1, 0, 0.84, -1.1, wood); P.box(0.1, 0.45, 2.3, -0.7, 0.84, 0, wood); P.box(0.1, 0.45, 2.3, 0.7, 0.84, 0, wood);
    for (const x of [-0.7, 0.7]) for (const z of [-0.55, 0.55]) P.box(0.06, 0.5, 0.06, x, 0.84, z, dark);
    P.box(1.6, 0.1, 0.1, 0, 0.5, 0.9, dark); P.box(1.6, 0.1, 0.1, 0, 0.5, -0.9, dark); P.box(0.08, 0.1, 1.9, 0, 0.5, 0, dark);
    P.box(1.3, 0.1, 0.4, 0, 0.98, -0.8, shade(wood, 1.1)); P.box(1.3, 0.3, 0.08, 0, 1.15, -0.98, shade(wood, 1.1)); // seat
    P.box(0.08, 0.08, 1.8, -0.35, 0.58, -2.0, dark); P.box(0.08, 0.08, 1.8, 0.35, 0.58, -2.0, dark); P.box(0.9, 0.08, 0.08, 0, 0.58, -2.85, iron); // shafts
    P.box(0.06, 0.08, 0.5, 0, 0.72, -0.9, '#c8a060'); // reins
    const g = new THREE.Group(); const body = P.mesh(); g.add(body);
    g.wheels = []; for (const x of [-0.82, 0.82]) for (const z of [-0.7, 0.75]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(z > 0 ? 0.48 : 0.38, z > 0 ? 0.48 : 0.38, 0.1, 10), this.wheelMat); w.rotation.z = Math.PI / 2; w.position.set(x, z > 0 ? 0.48 : 0.38, z); g.add(w); g.wheels.push(w); }
    const C = new BC.Avatar.Part(); C.box(0.5, 0.45, 0.5, -0.4, 0.84, 0.3, '#b89a5a'); C.box(0.52, 0.06, 0.52, -0.4, 1.07, 0.3, '#8a6a3a'); C.box(0.55, 0.4, 0.5, 0.35, 0.82, 0.5, '#8a6a3a'); C.box(0.3, 0.3, 0.3, 0.35, 1.15, 0.5, '#5a9a3a'); C.box(0.1, 0.2, 0.1, 0.35, 1.4, 0.5, '#3a7a2a'); C.box(0.5, 0.35, 0.4, 0.1, 0.8, -0.2, '#d8b060'); g.cargo = C.mesh(); g.cargo.visible = false; g.add(g.cargo);
    g.traverse(o => { if (o.isMesh) o.castShadow = !!BC.SHADOWS; }); return g;
    function shade(c, k) { return BC.Avatar.shade(c, k); }
  }
  spawn(x, z, yaw, uid, hitch) {
    const w = this.game.world; const t = w.top(Math.floor(x), Math.floor(z)); const wg = { uid: uid || Math.random().toString(36).slice(2, 9), x, y: w.standY(Math.floor(x), Math.floor(z)), z, yaw: yaw || 0, hitch: hitch || null, rider: null, mesh: this.mesh(), dist: 0 };
    wg.mesh.position.set(x, wg.y, z); wg.mesh.rotation.y = wg.yaw; this.game.scene.add(wg.mesh); this.list.push(wg); return wg;
  }
  remove(wg) { this.game.scene.remove(wg.mesh); this.list = this.list.filter(x => x !== wg); if (wg.rider === 'me') this.game.player.riding = null; }
  byUid(uid) { return this.list.find(w => w.uid === uid); }
  chestKey(wg) { return 'w:' + wg.uid; }
  serialize() { return this.list.map(w => ({ uid: w.uid, x: +w.x.toFixed(2), z: +w.z.toFixed(2), yaw: +w.yaw.toFixed(2), hitch: w.hitch || null })); }
  restore(list) { this.clear(); (list || []).forEach(w => this.spawn(w.x, w.z, w.yaw, w.uid, w.hitch)); }
  update(dt) {
    const g = this.game, w = g.world, p = g.player;
    for (const wg of this.list) {
      const e = wg.hitch ? g.animals.byUid(wg.hitch) : null; if (wg.hitch && !e) wg.hitch = null;
      const mine = wg.rider === 'me';
      if (e && (mine || e.rider === 'me' || !e.rider || e.driver)) {
        // the wagon trails its animal by a shaft's length, turning to face it
        const tx = e.x + Math.sin(e.yaw) * 2.9, tz = e.z + Math.cos(e.yaw) * 2.9; const dx = tx - wg.x, dz = tz - wg.z; const d = Math.hypot(dx, dz); const k = Math.min(1, dt * 5); const nx = wg.x + dx * k, nz = wg.z + dz * k; const moved = Math.hypot(nx - wg.x, nz - wg.z); wg.x = nx; wg.z = nz; wg.dist += moved; if (d > 0.3) { let want = Math.atan2(-(e.x - wg.x), -(e.z - wg.z)); let da = want - wg.yaw; da = Math.atan2(Math.sin(da), Math.cos(da)); wg.yaw += da * Math.min(1, dt * 4); }
      }
      const gy = w.standY(Math.floor(wg.x), Math.floor(wg.z)); if (w.waterSurface(Math.floor(wg.x), Math.floor(wg.z)) >= 0 && gy < w.WL + 1) wg.y += ((w.WL + 0.9) - wg.y) * Math.min(1, dt * 6); else wg.y += (gy - wg.y) * Math.min(1, dt * 8);
      wg.mesh.position.set(wg.x, wg.y, wg.z); wg.mesh.rotation.y = wg.yaw; wg.mesh.wheels.forEach(wh => { wh.rotation.x = wg.dist / 0.45; });
      const slots = w.chests.get(this.chestKey(wg)); wg.mesh.cargo.visible = !!(slots && slots.some(Boolean));
      if (mine) { p.pos.set(wg.x + Math.sin(wg.yaw) * -0.8 * 0 + Math.cos(wg.yaw) * 0, wg.y + 1.0, wg.z); p.vel.set(0, 0, 0); }
    }
  }
  raycast(origin, dir, maxD) {
    let best = null, bd = maxD; for (const wg of this.list) { const c = this.tmp.set(wg.x, wg.y + 0.7, wg.z); const ox = c.x - origin.x, oy = c.y - origin.y, oz = c.z - origin.z; const t = ox * dir.x + oy * dir.y + oz * dir.z; if (t < 0 || t > bd) continue; const d2 = ox * ox + oy * oy + oz * oz - t * t; if (d2 < 1.3 * 1.3) { bd = t; best = wg; } }
    return best ? { entity: best, dist: bd } : null;
  }
};
