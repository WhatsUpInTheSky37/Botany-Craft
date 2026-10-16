window.BC = window.BC || {};
// Rowboats: place one on water, tap it to climb in, steer with the look direction and forward/back. Boats drift with the current.
BC.Boats = class {
  constructor(game) { this.game = game; this.list = []; this.tmp = new THREE.Vector3(); }
  clear() { this.list.forEach(b => this.game.scene.remove(b.mesh)); this.list = []; }
  mesh() {
    const g = new THREE.Group(); const wood = new THREE.MeshLambertMaterial({ color: 0x8a5a2a }); const dark = new THREE.MeshLambertMaterial({ color: 0x5a3a1a });
    const add = (w, h, d, x, y, z, m) => { const mm = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m || wood); mm.position.set(x, y, z); g.add(mm); return mm; };
    add(1.2, 0.12, 2.2, 0, 0.06, 0, dark); add(0.12, 0.45, 2.2, -0.6, 0.3, 0); add(0.12, 0.45, 2.2, 0.6, 0.3, 0); add(1.2, 0.45, 0.12, 0, 0.3, 1.05); add(1.2, 0.45, 0.12, 0, 0.3, -1.05);
    add(1.0, 0.08, 0.25, 0, 0.3, 0.3, dark); add(1.0, 0.08, 0.25, 0, 0.3, -0.5, dark); const oarL = add(0.06, 0.06, 1.6, -0.75, 0.5, 0, dark); oarL.rotation.y = 0.35; const oarR = add(0.06, 0.06, 1.6, 0.75, 0.5, 0, dark); oarR.rotation.y = -0.35;
    return g;
  }
  spawn(x, z, yaw, uid) {
    const w = this.game.world; const ys = w.waterSurface(Math.floor(x), Math.floor(z)); if (ys < 0) return null;
    const b = { uid: uid || Math.random().toString(36).slice(2, 9), x, y: ys + 0.75, z, yaw: yaw || 0, speed: 0, mesh: this.mesh(), rider: null, bob: Math.random() * 6 };
    b.mesh.position.set(x, b.y, z); b.mesh.rotation.y = yaw || 0; this.game.scene.add(b.mesh); this.list.push(b); return b;
  }
  remove(b) { this.game.scene.remove(b.mesh); this.list = this.list.filter(x => x !== b); if (b.rider === 'me') this.game.player.riding = null; }
  byUid(uid) { return this.list.find(b => b.uid === uid); }
  serialize() { return this.list.map(b => ({ uid: b.uid, x: +b.x.toFixed(2), z: +b.z.toFixed(2), yaw: +b.yaw.toFixed(2) })); }
  restore(list) { this.clear(); (list || []).forEach(b => this.spawn(b.x, b.z, b.yaw, b.uid)); }
  canFloat(x, z) { const w = this.game.world; const ys = w.waterSurface(Math.floor(x), Math.floor(z)); if (ys < 0) return false; const above = w.get(Math.floor(x), ys + 1, Math.floor(z)); return above === 0; }
  update(dt) {
    const g = this.game, w = g.world, p = g.player;
    for (const b of this.list) {
      b.bob += dt;
      if (b.rider === 'me') {
        // steer: forward/back along the look direction, the hull turns toward it
        const k = p.keys; let mz = p.joy.y; if (k.KeyW || k.ArrowUp) mz += 1; if (k.KeyS || k.ArrowDown) mz -= 1; mz = Math.max(-1, Math.min(1, mz));
        const target = mz * (p.sprint ? 7 : 4.5); b.speed += (target - b.speed) * Math.min(1, dt * 2.5);
        let da = p.yaw - b.yaw; da = Math.atan2(Math.sin(da), Math.cos(da)); if (Math.abs(b.speed) > 0.2 || Math.abs(da) > 0.3) b.yaw += da * Math.min(1, dt * 2.2);
      } else { b.speed *= Math.max(0, 1 - dt * 1.5); }
      // current carries the boat
      let cx = 0, cz = 0; const ci = Math.floor(b.x) + Math.floor(b.z) * w.W; if (w.isFlowing(Math.floor(b.x), Math.floor(b.z)) && w.flowDir[ci] >= 0) { const d = w.FLOW_DIRS[w.flowDir[ci]]; cx = d[0] * 0.8; cz = d[1] * 0.8; }
      const vx = -Math.sin(b.yaw) * b.speed + cx, vz = -Math.cos(b.yaw) * b.speed + cz;
      const nx = b.x + vx * dt, nz = b.z + vz * dt;
      if (this.canFloat(nx, b.z)) b.x = nx; else b.speed *= 0.3; if (this.canFloat(b.x, nz)) b.z = nz; else b.speed *= 0.3;
      { let wrapped = false; const M = BC.WRAP + 1.5, SX = w.W + 2 * BC.WRAP + 2, SZ = w.D + 2 * BC.WRAP + 2; if (b.x < -M) { b.x += SX; wrapped = true; } else if (b.x > w.W + M) { b.x -= SX; wrapped = true; } if (b.z < -M) { b.z += SZ; wrapped = true; } else if (b.z > w.D + M) { b.z -= SZ; wrapped = true; } if (wrapped && b.rider === 'me') g.onWrap(); }
      const ys = w.waterSurface(Math.floor(b.x), Math.floor(b.z)); if (ys >= 0) b.y += ((ys + 0.75 + Math.sin(b.bob * 2) * 0.03) - b.y) * Math.min(1, dt * 6);
      b.mesh.position.set(b.x, b.y, b.z); b.mesh.rotation.y = b.yaw; b.mesh.rotation.z = Math.sin(b.bob * 1.7) * 0.03;
      if (b.rider === 'me') { p.pos.set(b.x, b.y + 0.2, b.z); p.vel.set(0, 0, 0); }
    }
  }
  raycast(origin, dir, maxD) {
    let best = null, bd = maxD; for (const b of this.list) { if (b.rider === 'me') continue; const c = this.tmp.set(b.x, b.y + 0.3, b.z); const ox = c.x - origin.x, oy = c.y - origin.y, oz = c.z - origin.z; const t = ox * dir.x + oy * dir.y + oz * dir.z; if (t < 0 || t > bd) continue; const d2 = ox * ox + oy * oy + oz * oz - t * t; if (d2 < 1.1 * 1.1) { bd = t; best = b; } }
    return best ? { entity: best, dist: bd } : null;
  }
  // Put the rider on the nearest land, or on the boat if none is near.
  landing(b) { const w = this.game.world; for (let r = 1; r <= 4; r++) for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) { if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue; const x = Math.floor(b.x) + dx, z = Math.floor(b.z) + dz; if (x < 1 || z < 1 || x >= w.W - 1 || z >= w.D - 1) continue; const t = w.top(x, z); if (w.get(x, t, z) === 15 || w.get(x, t + 1, z) !== 0 || w.get(x, t + 2, z) !== 0 || w.waterSurface(x, z) >= 0) continue; if (t > b.y + 1.5) continue; return [x + 0.5, t + 1.01, z + 0.5]; } return null; }
};
