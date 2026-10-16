window.BC = window.BC || {};
// First-person player: physics, keyboard/mouse and touch controls.
BC.Player = class Player {
  constructor(game) {
    this.game = game; this.pos = new THREE.Vector3(); this.vel = new THREE.Vector3();
    this.yaw = 0; this.pitch = 0; this.onGround = false; this.inWater = false; this.keys = {}; this.joy = { x: 0, y: 0 };
    this.radius = 0.3; this.height = 1.75; this.eye = 1.62; this.locked = false; this.breath = 60; this.MAX_BREATH = 60; this.riding = null; this.touch = BC.util.isTouch();
    this.jumpQueued = false; this.sprint = false;
  }
  spawn(x, y, z) { this.pos.set(x + 0.5, y + 1.01, z + 0.5); this.vel.set(0, 0, 0); }
  bindDesktop(canvas) {
    canvas.addEventListener('click', () => { if (!this.game.ui.modalOpen() && !this.touch && document.pointerLockElement !== canvas) canvas.requestPointerLock && canvas.requestPointerLock(); });
    document.addEventListener('pointerlockchange', () => { this.locked = document.pointerLockElement === canvas; this.game.ui.setLockHint(!this.locked); });
    document.addEventListener('mousemove', e => { if (!this.locked) return; this.yaw -= e.movementX * 0.0022; this.pitch = BC.util.clamp(this.pitch - e.movementY * 0.0022, -1.5, 1.5); });
    window.addEventListener('keydown', e => { if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return; this.keys[e.code] = true; if (e.code === 'Space') { this.jumpQueued = true; e.preventDefault(); } if (e.code === 'ShiftLeft') this.sprint = true; this.game.onKey(e); });
    window.addEventListener('keyup', e => { this.keys[e.code] = false; if (e.code === 'ShiftLeft') this.sprint = false; });
    canvas.addEventListener('mousedown', e => { if (!this.locked || this.game.ui.modalOpen()) return; e.preventDefault(); if (e.button === 0) { this.game.holdPrimary = true; this.game.primary(); } else if (e.button === 2) this.game.secondary(); });
    window.addEventListener('mouseup', e => { if (e.button === 0) this.game.holdPrimary = false; }); window.addEventListener('blur', () => { this.game.holdPrimary = false; });
    canvas.addEventListener('contextmenu', e => e.preventDefault());
    window.addEventListener('wheel', e => { if (this.locked) this.game.scrollHotbar(Math.sign(e.deltaY)); }, { passive: true });
  }
  bindTouch(canvas, joyEl) {
    let joyId = null, lookId = null, joyOrigin = null, lookLast = null, lookStart = null, lookMoved = 0, lookTime = 0, longTimer = null;
    const knob = joyEl.querySelector('.knob');
    const onStart = e => {
      if (this.game.ui.modalOpen()) return;
      for (const t of e.changedTouches) {
        if (t.clientX < window.innerWidth * 0.42 && t.clientY > window.innerHeight * 0.35 && joyId === null) { joyId = t.identifier; joyOrigin = [t.clientX, t.clientY]; joyEl.classList.add('active'); }
        else if (lookId === null) { lookId = t.identifier; lookLast = [t.clientX, t.clientY]; lookStart = [t.clientX, t.clientY]; lookMoved = 0; lookTime = performance.now(); clearTimeout(longTimer); longTimer = setTimeout(() => { if (lookMoved < 12) { this.game.secondary(); lookId = null; } }, 550); }
      }
      e.preventDefault();
    };
    const onMove = e => {
      for (const t of e.changedTouches) {
        if (t.identifier === joyId) { let dx = t.clientX - joyOrigin[0], dy = t.clientY - joyOrigin[1]; const l = Math.hypot(dx, dy); const m = 40; if (l > m) { dx *= m / l; dy *= m / l; } knob.style.transform = `translate(${dx}px,${dy}px)`; this.joy.x = dx / m; this.joy.y = -dy / m; }
        else if (t.identifier === lookId) { const dx = t.clientX - lookLast[0], dy = t.clientY - lookLast[1]; lookMoved += Math.abs(dx) + Math.abs(dy); this.yaw -= dx * 0.005; this.pitch = BC.util.clamp(this.pitch - dy * 0.005, -1.5, 1.5); lookLast = [t.clientX, t.clientY]; }
      }
      e.preventDefault();
    };
    const onEnd = e => {
      for (const t of e.changedTouches) {
        if (t.identifier === joyId) { joyId = null; this.joy.x = this.joy.y = 0; knob.style.transform = ''; joyEl.classList.remove('active'); }
        else if (t.identifier === lookId) { clearTimeout(longTimer); if (lookMoved < 12 && performance.now() - lookTime < 500) this.game.primary(); lookId = null; }
      }
    };
    canvas.addEventListener('touchstart', onStart, { passive: false }); canvas.addEventListener('touchmove', onMove, { passive: false });
    canvas.addEventListener('touchend', onEnd); canvas.addEventListener('touchcancel', onEnd);
  }
  solidAt(x, y, z) { const b = BC.BLOCKS[this.game.world.get(Math.floor(x), Math.floor(y), Math.floor(z))]; if (!b || !b.solid) return false; if (b.shape) return (y - Math.floor(y)) < BC.blockTop(b.id); return true; }
  collides(px, py, pz) {
    const r = this.radius; for (const dx of [-r, r]) for (const dz of [-r, r]) for (const dy of [0, 0.9, this.height - 0.01]) if (this.solidAt(px + dx, py + dy, pz + dz)) return true; return false;
  }
  update(dt) {
    const w = this.game.world; const k = this.keys; let mx = this.joy.x, mz = this.joy.y;
    if (this.riding) { this.inWater = false; this.headInWater = false; this.onGround = true; if (this.jumpQueued) { this.jumpQueued = false; this.game.leaveBoat(); } this.breath = Math.min(this.MAX_BREATH, this.breath + dt * 4); const cam = this.game.camera; cam.position.set(this.pos.x, this.pos.y + this.eye, this.pos.z); cam.rotation.set(0, 0, 0, 'YXZ'); cam.rotation.y = this.yaw; cam.rotation.x = this.pitch; return; }
    if (k.KeyW || k.ArrowUp) mz += 1; if (k.KeyS || k.ArrowDown) mz -= 1; if (k.KeyA || k.ArrowLeft) mx -= 1; if (k.KeyD || k.ArrowRight) mx += 1;
    const l = Math.hypot(mx, mz); if (l > 1) { mx /= l; mz /= l; }
    const head = w.get(Math.floor(this.pos.x), Math.floor(this.pos.y + 1.2), Math.floor(this.pos.z)); const feet = w.get(Math.floor(this.pos.x), Math.floor(this.pos.y + 0.3), Math.floor(this.pos.z));
    this.inWater = feet === 15; this.headInWater = head === 15;
    if (this.headInWater) { this.breath -= dt; if (this.breath <= 0) { this.breath = this.MAX_BREATH; this.game.blackout(); return; } } else this.breath = Math.min(this.MAX_BREATH, this.breath + dt * 4);
    const speed = (this.sprint ? 7 : 4.3) * (this.inWater ? 0.55 : 1) * (BC.PERK === 'explorer' ? 1.15 : 1);
    const sy = Math.sin(this.yaw), cy = Math.cos(this.yaw);
    const vx = (mx * cy - mz * sy) * speed, vz = (-mx * sy - mz * cy) * speed;
    const accel = this.onGround ? 14 : 5; this.vel.x += (vx - this.vel.x) * Math.min(1, accel * dt); this.vel.z += (vz - this.vel.z) * Math.min(1, accel * dt);
    const onLadder = (BC.BLOCKS[feet] && BC.BLOCKS[feet].climb) || (BC.BLOCKS[head] && BC.BLOCKS[head].climb);
    if (onLadder) { const up = this.jumpQueued || k.Space || mz > 0.3; const down = k.ShiftLeft || mz < -0.3; this.vel.y = up ? 3 : down ? -3 : -0.6; this.vel.x *= 0.5; this.vel.z *= 0.5; }
    else if (this.inWater) { const up = this.jumpQueued || k.Space || (this.touch && this.joy.y > 0.85); const down = k.ShiftLeft && !this.sprint; const want = this.headInWater ? (up ? 3.6 : down ? -2.8 : -0.9) : (up ? 4.2 : -0.6); this.vel.y += (want - this.vel.y) * Math.min(1, 4 * dt);
      // climbing out: moving toward a bank that is one or two blocks above the water line lifts you onto it
      if (mx || mz) { const ax = this.pos.x + (vx / speed) * 0.55, az = this.pos.z + (vz / speed) * 0.55; if (this.solidAt(ax, this.pos.y + 0.4, az) && !this.solidAt(ax, this.pos.y + 1.45, az) && !this.solidAt(ax, this.pos.y + 2.3, az)) this.vel.y = Math.max(this.vel.y, 5.2); else if (this.solidAt(ax, this.pos.y + 0.4, az) && this.headInWater) this.vel.y = Math.max(this.vel.y, 3.0); else if (up && this.solidAt(ax, this.pos.y + 1.45, az) && !this.solidAt(ax, this.pos.y + 2.4, az) && !this.solidAt(ax, this.pos.y + 3.2, az) && !this.headInWater) this.vel.y = Math.max(this.vel.y, 7.4); } } else { this.vel.y -= 22 * dt; if (this.jumpQueued && this.onGround) { this.vel.y = 7.6; this.onGround = false; } }
    this.jumpQueued = false; if (this.vel.y < -40) this.vel.y = -40;
    // move per axis with collision
    const step = (axis, d) => {
      const p = this.pos.clone(); p[axis] += d;
      if (!this.collides(p.x, p.y, p.z)) { this.pos.copy(p); return true; }
      if (axis !== 'y' && (this.onGround || this.inWater)) { const up = p.clone(); up.y += this.inWater ? 1.35 : 1.05; if (!this.collides(up.x, up.y, up.z) && !this.collides(this.pos.x, this.pos.y + 1.05, this.pos.z)) { this.pos.copy(up); return true; } }
      return false;
    };
    let steps = Math.ceil(Math.abs(this.vel.y * dt) / 0.4) || 1;
    const dy = this.vel.y * dt / steps; let hitGround = false; for (let i = 0; i < steps; i++) { if (!step('y', dy)) { if (dy < 0) hitGround = true; this.vel.y = 0; break; } }
    this.onGround = hitGround || (this.vel.y <= 0 && this.collides(this.pos.x, this.pos.y - 0.05, this.pos.z));
    if (!step('x', this.vel.x * dt)) this.vel.x = 0; if (!step('z', this.vel.z * dt)) this.vel.z = 0;
    if (this.pos.y < -5) { const t = w.top(Math.floor(this.pos.x), Math.floor(this.pos.z)); this.pos.y = t + 1.1; this.vel.set(0, 0, 0); }
    this.pos.x = BC.util.clamp(this.pos.x, 0.5, w.W - 0.5); this.pos.z = BC.util.clamp(this.pos.z, 0.5, w.D - 0.5);
    // camera
    const cam = this.game.camera; cam.position.set(this.pos.x, this.pos.y + this.eye, this.pos.z);
    cam.rotation.set(0, 0, 0, 'YXZ'); cam.rotation.y = this.yaw; cam.rotation.x = this.pitch;
  }
  dir() { const d = new THREE.Vector3(0, 0, -1); d.applyEuler(new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ')); return d; }
};
