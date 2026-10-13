window.BC = window.BC || {};
// Game orchestration: rendering, loop, interactions, inventory, quests, save/load, shared worlds.
BC.Game = class Game {
  constructor() {
    this.canvas = document.getElementById('gl');
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: false, powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.scene = new THREE.Scene(); this.camera = new THREE.PerspectiveCamera(72, 1, 0.1, 260);
    this.player = new BC.Player(this); this.ui = new BC.UI(this); this.animals = new BC.Animals(this); this.net = new BC.Net(this);
    this.chunks = new Map(); this.time = { t: 0, day: 1, dayFrac: 0.3 }; this.weather = { raining: false, timer: 90 };
    this.points = 0; this.growthMult = 1; this.ffTimer = 0; this.pending = []; this.running = false; this.simAcc = 0; this.questAcc = 0; this.saveAcc = 0; this.hudAcc = 0;
    this.mode = 'solo'; this.playerName = 'me'; this.peers = new Map(); this.netAcc = { pos: 0, plants: 0, animals: 0, time: 0 }; this.worldVersion = 0; this.syncRequested = false;
    this.DAY = 600; this.SAVE_KEY = 'botanycraft_save_v1'; this.SHARED_KEY = 'botanycraft_shared_v1';
    this.resetStats();
    this.setupScene(); this.resize(); window.addEventListener('resize', () => this.resize());
    this.player.bindDesktop(this.canvas); if (this.player.touch) this.player.bindTouch(this.canvas, document.getElementById('joystick'));
    window.addEventListener('beforeunload', () => this.running && this.save()); document.addEventListener('visibilitychange', () => { if (document.hidden && this.running) this.save(); });
    let hasSave = false, shared = null; try { hasSave = !!localStorage.getItem(this.SAVE_KEY); shared = JSON.parse(localStorage.getItem(this.SHARED_KEY)); } catch (e) { }
    this.ui.showStart({ hasSave, shared, onNew: region => this.newGame(region), onContinue: () => this.load() || this.newGame('temperate'), onShared: opts => this.startShared(opts) });
  }
  resetStats() {
    this.stats = { inspected: new Set(), seedSpecies: new Set(), maxDig: 0, plantedGood: 0, watered: 0, matured: 0, legumesPlanted: 0, threeSisters: false, pollinated: false, blueberryAcid: false, cactusInSand: false, compostMade: 0, compostUsed: false, biomesVisited: new Set(), treeGrown: false, fenced: false, invasiveRemoved: 0, journal: new Set(), questsDone: new Set(), harvests: 0, compostMaterial: 0, planted: 0 };
    this.inventory = [{ type: 'tool', id: 'hand' }, { type: 'tool', id: 'trowel' }, { type: 'tool', id: 'can' }]; this.selected = 0; this.points = 0;
  }
  setupScene() {
    const atlas = BC.Atlas.build(); this.atlas = atlas.texture;
    this.matSolid = new THREE.MeshLambertMaterial({ map: this.atlas, vertexColors: true });
    this.matPlant = new THREE.MeshLambertMaterial({ map: this.atlas, vertexColors: true, alphaTest: 0.5, side: THREE.DoubleSide });
    this.matWater = new THREE.MeshLambertMaterial({ map: this.atlas, vertexColors: true, transparent: true, opacity: 0.7, depthWrite: false });
    this.hemi = new THREE.HemisphereLight(0xcfe3ff, 0x6a5a40, 1.05); this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xfff4e0, 1.25); this.scene.add(this.sun); this.scene.add(this.sun.target);
    this.scene.fog = new THREE.Fog(0x8fc4ea, 40, 150); this.scene.background = new THREE.Color(0x8fc4ea);
    this.sunMesh = new THREE.Mesh(new THREE.SphereGeometry(4, 12, 12), new THREE.MeshBasicMaterial({ color: 0xfff1c0, fog: false })); this.scene.add(this.sunMesh);
    this.moonMesh = new THREE.Mesh(new THREE.SphereGeometry(2.5, 12, 12), new THREE.MeshBasicMaterial({ color: 0xdde6f5, fog: false })); this.scene.add(this.moonMesh);
    this.clouds = new THREE.Group(); const cm = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 });
    for (let i = 0; i < 26; i++) { const g = new THREE.BoxGeometry(6 + Math.random() * 14, 1.2, 4 + Math.random() * 8); const m = new THREE.Mesh(g, cm); m.position.set(Math.random() * 300 - 40, 46 + Math.random() * 6, Math.random() * 300 - 40); this.clouds.add(m); } this.scene.add(this.clouds);
    const rp = new Float32Array(900 * 3); for (let i = 0; i < 900; i++) { rp[i * 3] = Math.random() * 30 - 15; rp[i * 3 + 1] = Math.random() * 20; rp[i * 3 + 2] = Math.random() * 30 - 15; }
    const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.BufferAttribute(rp, 3)); this.rain = new THREE.Points(rg, new THREE.PointsMaterial({ color: 0xbfd8ff, size: 0.12, transparent: true, opacity: 0.7 })); this.rain.visible = false; this.scene.add(this.rain);
  }
  resize() { const w = window.innerWidth, h = window.innerHeight; this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.player.touch ? 1.5 : 2)); this.renderer.setSize(w, h, false); this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); }
  isAuthority() { return this.mode === 'solo' || !this.net.live || this.net.isHost; }
  // ---------- lifecycle ----------
  newGame(region) {
    this.mode = 'solo'; this.playerName = 'me'; this.resetStats(); this.time = { t: this.DAY * 0.3, day: 1, dayFrac: 0.3 }; this.region = region;
    this.seed = (Math.random() * 4294967295) >>> 0; this.startWorld(() => { const s = this.world.findSpawn(region); this.player.spawn(s[0], s[1], s[2]); this.player.yaw = Math.PI; this.spawnAnimals(this.world.spawnAnimals); this.begin(); this.welcome(region); });
  }
  welcome(region) { const b = BC.BIOMES[region]; this.toast(`Welcome to the ${b.name.toLowerCase()}. Walk up to a plant and tap it to collect seeds.`, 'good'); setTimeout(() => this.toast(this.player.touch ? 'Drag left to move, right to look. Press and hold to inspect anything.' : 'Click the world to look around. Right-click inspects anything.', ''), 5000); }
  startWorld(then) {
    const loading = document.getElementById('loading'); loading.hidden = false;
    setTimeout(() => { this.world = new BC.World(this.seed); this.world.generate(); this.hookWorld(); this.clearChunks(); this.buildAllChunks(); loading.hidden = true; then(); }, 30);
  }
  hookWorld() {
    const w = this.world;
    w.onBlock = (x, y, z, id) => { if (this.mode === 'shared') this.net.send('block', { x, y, z, id }); };
    w.onBlocks = (list, tid) => { if (this.mode === 'shared') this.net.send('blocks', { list, tid }); };
    w.onPlant = (p, removed) => { if (this.mode === 'shared') this.net.send('plant', removed ? { key: p.key, rm: true } : { key: p.key, p: this.packPlant(p) }); };
  }
  packPlant(p) { return { id: p.id, x: p.x, y: p.y, z: p.z, wild: p.wild, progress: p.progress, health: p.health, pollinated: p.pollinated, withered: p.withered, onBark: p.onBark, owner: p.owner }; }
  begin() { this.ui.hideStart(); this.ui.renderHotbar(); this.ui.updateQuestTracker(); this.ui.setLockHint(true); this.ui.updateShared(); this.ui.updateHUD(); this.running = true; this.last = performance.now(); if (!this.loopStarted) { this.loopStarted = true; requestAnimationFrame(t => this.loop(t)); } }
  clearChunks() { this.chunks.forEach(c => ['solid', 'water', 'plants'].forEach(k => { if (c[k]) { this.scene.remove(c[k]); c[k].geometry.dispose(); } })); this.chunks.clear(); this.animals.list.forEach(e => this.scene.remove(e.mesh)); this.animals.list = []; }
  buildAllChunks() { for (let cz = 0; cz < this.world.CZ; cz++) for (let cx = 0; cx < this.world.CX; cx++) this.rebuildChunk(cx + cz * this.world.CX); this.world.dirty.clear(); }
  rebuildChunk(ci) {
    const cx = ci % this.world.CX, cz = Math.floor(ci / this.world.CX); let c = this.chunks.get(ci); if (!c) { c = {}; this.chunks.set(ci, c); }
    const res = BC.Mesher.buildChunk(this.world, cx, cz); const pg = BC.Mesher.buildPlants(this.world, cx, cz);
    const swap = (k, geo, mat) => { if (c[k]) { this.scene.remove(c[k]); c[k].geometry.dispose(); c[k] = null; } if (geo) { const m = new THREE.Mesh(geo, mat); m.frustumCulled = true; this.scene.add(m); c[k] = m; } };
    swap('solid', res.solid, this.matSolid); swap('water', res.water, this.matWater); swap('plants', pg, this.matPlant);
  }
  spawnAnimals(list) { list.forEach(a => this.animals.spawn(a.id, a.x, a.z)); }
  reset() { try { if (this.mode === 'shared') localStorage.removeItem(this.SHARED_KEY); else localStorage.removeItem(this.SAVE_KEY); } catch (e) { } location.reload(); }
  async leaveShared() { this.running = false; try { await this.save(); } catch (e) { } await this.net.leave(); try { localStorage.removeItem(this.SHARED_KEY); } catch (e) { } location.reload(); }
  // ---------- shared worlds ----------
  async startShared(opts) {
    const status = m => this.ui.sharedStatus(m);
    try {
      const player = (opts.player || '').trim(); if (player.length < 2) throw new Error('Enter a player name (at least 2 letters).');
      this.net.creds = { world: opts.world, pin: opts.pin, player };
      let data;
      if (opts.action === 'create') {
        status('Growing a new world…'); this.seed = (Math.random() * 4294967295) >>> 0; this.region = opts.region || 'temperate';
        await new Promise(r => setTimeout(r, 30)); this.world = new BC.World(this.seed); this.world.generate(); this.hookWorld();
        this.time = { t: this.DAY * 0.3, day: 1, dayFrac: 0.3 }; this.weather = { raining: false, timer: 90 };
        status('Saving it to the cloud…'); const res = await this.net.createWorld(opts.world, opts.pin, this.seed, this.region, this.sharedState()); this.worldVersion = res.version; this.net.creds.world = res.id;
      } else {
        status('Looking up that world…'); data = await this.net.loadWorld(opts.world, opts.pin); this.net.creds.world = data.id;
        status('Growing the world…'); await new Promise(r => setTimeout(r, 30)); this.seed = Number(data.seed); this.region = data.region; this.world = new BC.World(this.seed); this.world.generate(); this.hookWorld(); this.applySharedState(data.state); this.worldVersion = data.version;
      }
      this.mode = 'shared'; this.playerName = player.toLowerCase(); this.clearChunks(); this.buildAllChunks(); this.world.dirty.clear();
      status('Loading your journal…'); this.resetStats(); const ps = await this.net.loadPlayer();
      if (ps && ps.inventory) { this.applyPlayerState(ps); } else { const s = this.world.findSpawn(this.region); this.player.spawn(s[0], s[1], s[2]); this.player.yaw = Math.PI; }
      this.spawnAnimals((this.sharedAnimals && this.sharedAnimals.length) ? this.sharedAnimals : this.world.spawnAnimals);
      try { localStorage.setItem(this.SHARED_KEY, JSON.stringify(this.net.creds)); } catch (e) { }
      status('Connecting to the live session…'); this.bindNetEvents(); let liveError = null;
      try { await this.net.join(this.net.creds.world, player); } catch (e) { liveError = e; await this.net.leave(); }
      status(''); this.begin(); if (!ps || !ps.inventory) this.welcome(this.region);
      if (liveError) this.toast('Live play is unavailable on this network, so you will not see other players move. Your shared world still saves to the cloud; the last save wins.', 'bad');
      else this.toast(`Shared world "${opts.world}". Others join with the same name and PIN.`, 'good');
    } catch (e) { console.error(e); status(''); this.mode = 'solo'; await this.net.leave(); this.ui.sharedError(this.net.friendly(e)); }
  }
  sharedState() { return { world: this.world.serialize(), time: this.time, weather: this.weather, animals: this.animals.list.length ? this.animals.serialize() : (this.world.spawnAnimals || []) }; }
  applySharedState(state) { if (!state || !state.world) return; this.world.restore(state.world); if (state.time) this.time = state.time; if (state.weather) { this.weather = state.weather; this.rain.visible = !!this.weather.raining; } this.sharedAnimals = state.animals; }
  playerState() { const st = this.stats; const S = o => Array.from(o); return { inventory: this.inventory, selected: this.selected, points: this.points, pos: { x: this.player.pos.x, y: this.player.pos.y, z: this.player.pos.z, yaw: this.player.yaw, pitch: this.player.pitch }, stats: Object.assign({}, st, { inspected: S(st.inspected), seedSpecies: S(st.seedSpecies), biomesVisited: S(st.biomesVisited), journal: S(st.journal), questsDone: S(st.questsDone) }) }; }
  applyPlayerState(ps) { const st = ps.stats; this.stats = Object.assign(this.stats, st, { inspected: new Set(st.inspected), seedSpecies: new Set(st.seedSpecies), biomesVisited: new Set(st.biomesVisited), journal: new Set(st.journal), questsDone: new Set(st.questsDone) }); this.inventory = ps.inventory; this.selected = Math.min(ps.selected || 0, this.inventory.length - 1); this.points = ps.points || 0; if (ps.pos) { this.player.pos.set(ps.pos.x, ps.pos.y, ps.pos.z); this.player.yaw = ps.pos.yaw; this.player.pitch = ps.pos.pitch; } }
  bindNetEvents() {
    const n = this.net, w = () => this.world;
    const remote = fn => { const W = w(); const prev = W.remote; W.remote = true; try { fn(W); } finally { W.remote = prev; } };
    // World-changing events. While a snapshot sync is in flight they are buffered and replayed after it lands.
    const apply = {
      block: m => remote(W => { const above = W.plantAt(m.x, m.y + 1, m.z); if (m.id !== 0 && above) W.removePlant(above); W.set(m.x, m.y, m.z, m.id); }),
      blocks: m => remote(W => { m.list.forEach(b => { W.set(b[0], b[1], b[2], b[3]); W.treeAt.set(W.idx(b[0], b[1], b[2]), m.tid); }); }),
      plant: m => remote(W => { const ex = W.plants.get(m.key); if (m.rm) { if (ex) W.removePlant(ex); } else { if (ex) W.removePlant(ex); W.addPlant(m.p); } }),
      plants: m => { const W = w(); m.list.forEach(u => { const p = W.plants.get(u[0]); if (!p) return; const before = BC.Mesher.plantTile(p); p.progress = u[1]; p.health = u[2]; p.withered = !!u[3]; p.pollinated = !!u[4]; if (BC.Mesher.plantTile(p) !== before) W.markDirty(p.x, p.z); }); },
      water: m => this.applyWater(m.x, m.z, false),
    };
    Object.keys(apply).forEach(ev => n.on(ev, m => { if (this.syncBuffer) this.syncBuffer.push([ev, m]); else apply[ev](m); }));
    this.replaySync = () => { const buf = this.syncBuffer || []; this.syncBuffer = null; buf.forEach(([ev, m]) => { try { apply[ev](m); } catch (e) { console.warn(e); } }); };
    n.on('animals', m => { if (!n.isHost) this.animals.applyRemote(m.list); });
    n.on('pos', (m, from) => { const pe = this.peers.get(from); if (pe) { pe.target.set(m.x, m.y, m.z); pe.yaw = m.yaw; } });
    n.on('time', m => { if (!n.isHost && Math.abs(m.t - this.time.t) > 3) this.time.t = m.t; });
    n.on('weather', m => { if (!n.isHost) { this.weather = m.w; this.rain.visible = !!m.w.raining; } });
    n.on('need_sync', async () => { if (n.isHost) { try { const r = await n.saveWorld(this.sharedState()); this.worldVersion = r.version; n.send('synced', { version: r.version }); } catch (e) { console.warn(e); } } });
    n.on('synced', async m => { if (!this.syncRequested) return; this.syncRequested = false; clearTimeout(this.syncTimer); try { if (m.version > this.worldVersion) { const d = await n.loadWorld(n.creds.world, n.creds.pin); this.applySharedState(d.state); this.worldVersion = d.version; } } catch (e) { console.warn(e); } this.replaySync(); });
    n.on('stat', m => { if (m.to === this.playerName) this.applyCredit(m.key, m.val, m.set); });
    n.on('toast', m => { if (m.to === this.playerName) this.toast(m.msg, m.kind); });
    n.on('hello', (m, from) => { const pe = this.peers.get(from); if (pe) { pe.target.set(m.x, m.y, m.z); pe.group.position.copy(pe.target); } });
  }
  requestSync() { if (this.syncRequested) return; this.syncRequested = true; this.syncBuffer = []; this.net.send('need_sync', {}); clearTimeout(this.syncTimer); this.syncTimer = setTimeout(() => { if (this.syncRequested) { this.syncRequested = false; this.replaySync(); } }, 20000); }
  onPeerJoined(key, name) { const g = this.buildAvatar(name); g.position.copy(this.player.pos); this.scene.add(g); this.peers.set(key, { name, group: g, target: this.player.pos.clone(), yaw: 0 }); if (this.running) this.toast(`${name} joined the world.`, 'good'); this.net.send('hello', { x: this.player.pos.x, y: this.player.pos.y, z: this.player.pos.z }); this.ui.updateShared(); }
  onPeerLeft(key) { const pe = this.peers.get(key); if (pe) { this.scene.remove(pe.group); this.toast(`${pe.name} left the world.`, ''); this.peers.delete(key); } this.ui.updateShared(); }
  onPresence(list, isHost, wasHost) { if (!isHost && list.length > 1 && !this.firstSyncDone) { this.firstSyncDone = true; this.requestSync(); } if (isHost && !wasHost && this.running && list.length > 1) this.toast('You are now hosting the simulation for this world.', ''); if (isHost) this.firstSyncDone = true; this.ui.updateShared(); }
  peerPositions() { const out = []; this.peers.forEach(pe => out.push(pe.group.position)); return out; }
  buildAvatar(name) {
    const g = new THREE.Group(); const h = BC.util.hashStr(name); const shirt = new THREE.Color().setHSL((h % 360) / 360, 0.55, 0.45), skin = new THREE.Color(0xe8b890), pants = new THREE.Color(0x3a4a6a);
    const box = (w, hh, d, x, y, z, c) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, hh, d), new THREE.MeshLambertMaterial({ color: c })); m.position.set(x, y, z); g.add(m); };
    box(0.5, 0.65, 0.3, 0, 1.0, 0, shirt); box(0.45, 0.45, 0.45, 0, 1.55, 0, skin); box(0.18, 0.7, 0.22, -0.16, 0.35, 0, pants); box(0.18, 0.7, 0.22, 0.16, 0.35, 0, pants); box(0.14, 0.6, 0.2, -0.33, 1.0, 0, shirt); box(0.14, 0.6, 0.2, 0.33, 1.0, 0, shirt);
    const c = document.createElement('canvas'); c.width = 256; c.height = 64; const x = c.getContext('2d'); x.fillStyle = 'rgba(20,28,18,0.7)'; x.fillRect(0, 0, 256, 64); x.fillStyle = '#f3efe2'; x.font = 'bold 34px Nunito, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(name.slice(0, 14), 128, 32);
    const tex = new THREE.CanvasTexture(c); const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false })); sp.scale.set(1.6, 0.4, 1); sp.position.y = 2.1; g.add(sp);
    return g;
  }
  updatePeers(dt) { this.peers.forEach(pe => { pe.group.position.lerp(pe.target, Math.min(1, dt * 8)); let da = pe.yaw - pe.group.rotation.y; da = Math.atan2(Math.sin(da), Math.cos(da)); pe.group.rotation.y += da * Math.min(1, dt * 8); }); }
  netTick(dt) {
    const n = this.net, a = this.netAcc; a.pos += dt; a.plants += dt; a.animals += dt; a.time += dt;
    if (a.pos >= 0.2) { a.pos = 0; const p = this.player.pos; const k = `${p.x.toFixed(1)},${p.y.toFixed(1)},${p.z.toFixed(1)},${this.player.yaw.toFixed(1)}`; if (k !== this.lastPosKey) { this.lastPosKey = k; n.send('pos', { x: +p.x.toFixed(2), y: +p.y.toFixed(2), z: +p.z.toFixed(2), yaw: +this.player.yaw.toFixed(2) }); } }
    if (!n.isHost) return;
    if (a.plants >= 1) { a.plants = 0; const list = []; this.world.plants.forEach(p => { if (p.wild && p.progress >= 1) return; const sig = `${p.progress.toFixed(3)}|${p.health.toFixed(2)}|${p.withered ? 1 : 0}|${p.pollinated ? 1 : 0}`; if (p.netSig !== sig) { p.netSig = sig; list.push([p.key, +p.progress.toFixed(3), +p.health.toFixed(2), p.withered ? 1 : 0, p.pollinated ? 1 : 0]); } }); if (list.length && this.peers.size) n.send('plants', { list }); }
    if (a.animals >= 0.5 && this.peers.size) { a.animals = 0; n.send('animals', { list: this.animals.snapshot() }); }
    if (a.time >= 10 && this.peers.size) { a.time = 0; n.send('time', { t: this.time.t }); }
  }
  // ---------- loop ----------
  loop(now) {
    requestAnimationFrame(t => this.loop(t)); if (!this.running) return;
    let dt = Math.min(0.05, (now - this.last) / 1000); this.last = now; if (this.ui.modalOpen() && this.mode === 'solo') dt = 0;
    const auth = this.isAuthority();
    this.player.update(this.ui.modalOpen() ? 0 : dt); if (auth) this.animals.update(dt); else this.animals.updateGuest(dt);
    this.time.t += dt; this.time.dayFrac = (this.time.t / this.DAY) % 1; this.time.day = Math.floor(this.time.t / this.DAY) + 1;
    if (this.ffTimer > 0) { this.ffTimer -= dt; if (this.ffTimer <= 0) { this.growthMult = 1; this.toast('Fast-forward finished.', ''); } }
    this.simAcc += dt; if (this.simAcc >= 0.5) { if (auth) { BC.Sim.tick(this, this.simAcc); this.updateWeather(this.simAcc); } this.simAcc = 0; }
    if (this.mode === 'shared' && this.net.live) { this.netTick(dt); this.updatePeers(dt); }
    this.questAcc += dt; if (this.questAcc >= 1) { this.questAcc = 0; this.checkQuests(); this.checkBiome(); }
    this.saveAcc += dt; if (this.saveAcc >= 30) { this.saveAcc = 0; this.save(); }
    this.hudAcc += dt; if (this.hudAcc >= 0.25) { this.hudAcc = 0; this.ui.updateHUD(); }
    this.updateSky(); this.updateDirtyChunks(); this.updateTarget();
    this.renderer.render(this.scene, this.camera);
  }
  updateDirtyChunks() { if (!this.world.dirty.size) return; const px = this.player.pos.x, pz = this.player.pos.z; const arr = Array.from(this.world.dirty); arr.sort((a, b) => { const da = ((a % this.world.CX) * 16 - px) ** 2 + (Math.floor(a / this.world.CX) * 16 - pz) ** 2; const db = ((b % this.world.CX) * 16 - px) ** 2 + (Math.floor(b / this.world.CX) * 16 - pz) ** 2; return da - db; }); for (let i = 0; i < Math.min(3, arr.length); i++) { this.rebuildChunk(arr[i]); this.world.dirty.delete(arr[i]); } }
  updateSky() {
    const f = this.time.dayFrac; const ang = (f - 0.25) * Math.PI * 2; const elev = Math.sin(ang); const day = BC.util.clamp(elev * 1.6 + 0.15, 0, 1);
    const biome = BC.BIOMES[this.world.biomeAt(this.player.pos.x, this.player.pos.z)]; const skyDay = new THREE.Color(biome.sky), dusk = new THREE.Color(0xe8955a), night = new THREE.Color(0x0b1026);
    const col = elev > 0.15 ? skyDay.clone().lerp(dusk, BC.util.clamp(1 - (elev - 0.15) / 0.25, 0, 1) * 0.6) : night.clone().lerp(dusk, BC.util.clamp((elev + 0.15) / 0.3, 0, 1));
    if (this.weather.raining) col.lerp(new THREE.Color(0x6a7a86), 0.6);
    this.scene.background.copy(col); this.scene.fog.color.copy(col); this.scene.fog.near = this.weather.raining ? 20 : 40; this.scene.fog.far = this.weather.raining ? 90 : 150;
    this.sun.intensity = 0.25 + day * (this.weather.raining ? 0.6 : 1.1); this.hemi.intensity = 0.4 + day * 0.75;
    const p = this.player.pos; const sx = Math.cos(ang) * 120, sy = Math.sin(ang) * 120; this.sun.position.set(p.x + sx, p.y + Math.max(sy, 10), p.z + 40); this.sun.target.position.set(p.x, p.y, p.z);
    this.sunMesh.position.set(p.x + sx * 1.6, p.y + sy * 1.6, p.z + 60); this.moonMesh.position.set(p.x - sx * 1.6, p.y - sy * 1.6, p.z - 60); this.sunMesh.visible = elev > -0.1; this.moonMesh.visible = elev < 0.1;
    this.clouds.position.x = (this.time.t * 0.4) % 120 - 60; this.clouds.position.z = p.z - 150 + ((p.z + 150) % 1);
    if (this.rain.visible) { const a = this.rain.geometry.attributes.position; for (let i = 0; i < a.count; i++) { let y = a.getY(i) - 0.45; if (y < 0) y = 20; a.setY(i, y); } a.needsUpdate = true; this.rain.position.set(p.x, p.y, p.z); }
  }
  updateWeather(dt) {
    const w = this.weather; w.timer -= dt; if (w.timer > 0) return;
    const biome = BC.BIOMES[this.world.biomeAt(this.player.pos.x, this.player.pos.z)];
    if (w.raining) { w.raining = false; w.timer = 120 + Math.random() * 180; this.toast('The rain has passed. Soil moisture is up across the land.', ''); }
    else if (Math.random() < biome.rainChance) { w.raining = true; w.timer = 35 + Math.random() * 40; this.toast(biome.id === 'desert' ? 'A rare desert rain! Dormant seeds in the sand are waking up.' : 'Rain. Plants drink, and so does the soil.', 'good'); }
    else w.timer = 60 + Math.random() * 120;
    this.rain.visible = w.raining; if (this.mode === 'shared') this.net.send('weather', { w });
  }
  checkBiome() { const b = this.world.biomeAt(this.player.pos.x, this.player.pos.z); if (!this.stats.biomesVisited.has(b)) { this.stats.biomesVisited.add(b); this.discover('biome:' + b, 'entered'); } }
  // ---------- quests, points, cross-player credit ----------
  currentQuest() { return BC.QUESTS.find(q => !this.stats.questsDone.has(q.id)); }
  checkQuests() {
    for (const q of BC.QUESTS) { if (this.stats.questsDone.has(q.id)) continue; if (q.check(this.stats) >= 1) { this.stats.questsDone.add(q.id); this.points += q.points; this.queue(() => this.ui.showQuiz(q, ok => { if (ok) this.points += 10; this.ui.updateQuestTracker(); })); } }
    this.ui.updateQuestTracker();
  }
  levelName() { let n = BC.LEVELS[0][1]; for (const [p, name] of BC.LEVELS) if (this.points >= p) n = name; return n; }
  queue(fn) { if (this.ui.modalOpen()) this.pending.push(fn); else fn(); }
  afterModal() { const f = this.pending.shift(); if (f) setTimeout(f, 150); else this.ui.setLockHint(true); }
  toast(msg, kind) { this.ui.toast(msg, kind); }
  // Give a stat (or a toast) to whoever owns a plant. In shared mode it may be another player.
  credit(owner, key, val, set) { if (this.mode !== 'shared' || !owner || owner === this.playerName) this.applyCredit(key, val, set); else this.net.send('stat', { to: owner, key, val, set }); }
  applyCredit(key, val, set) { if (key === 'journal') { this.discover(val, 'grown'); return; } if (set) this.stats[key] = val; else this.stats[key] = (this.stats[key] || 0) + val; }
  notify(owner, msg, kind) { if (this.mode !== 'shared' || !owner || owner === this.playerName) this.toast(msg, kind); else this.net.send('toast', { to: owner, msg, kind }); }
  discover(key, how) {
    if (this.stats.journal.has(key)) return false; this.stats.journal.add(key); this.points += 3;
    const [kind, id] = key.split(':');
    if (kind === 'animal' && how === 'seen') { this.toast(`New animal spotted: ${BC.ANIMAL_BY_ID[id].name}. Inspect it to add notes to your journal.`, 'good'); return true; }
    if (kind === 'tree' && how === 'grown') return true;
    this.queue(() => this.ui.showCard(key, true, this.lastInspect)); return true;
  }
  // ---------- targeting ----------
  raycast(maxD) {
    maxD = maxD || 6; const o = this.camera.position, d = this.player.dir(); const w = this.world;
    const an = this.animals.raycast(o, d, maxD);
    let x = Math.floor(o.x), y = Math.floor(o.y), z = Math.floor(o.z); const sx = Math.sign(d.x), sy = Math.sign(d.y), sz = Math.sign(d.z);
    const tdx = Math.abs(1 / (d.x || 1e-9)), tdy = Math.abs(1 / (d.y || 1e-9)), tdz = Math.abs(1 / (d.z || 1e-9));
    let tmx = (sx > 0 ? (x + 1 - o.x) : (o.x - x)) * tdx, tmy = (sy > 0 ? (y + 1 - o.y) : (o.y - y)) * tdy, tmz = (sz > 0 ? (z + 1 - o.z) : (o.z - z)) * tdz;
    let n = [0, 0, 0], dist = 0; const it = this.inventory[this.selected]; const wantsWater = it && it.type === 'seed' && BC.Sim.defFor({ id: it.id }).water === 'aquatic';
    let hit = null;
    for (let i = 0; i < 40 && dist <= maxD; i++) {
      const p = w.plantAt(x, y, z); if (p && dist > 0.2) { hit = { type: 'plant', plant: p, x, y, z, dist }; break; }
      const id = w.get(x, y, z); const b = BC.BLOCKS[id];
      if (b && b.solid) { hit = { type: 'block', x, y, z, id, normal: n, dist }; break; }
      if (b && b.liquid && wantsWater && w.get(x, y + 1, z) === 0) { hit = { type: 'water', x, y, z, dist }; break; }
      if (tmx < tmy && tmx < tmz) { x += sx; dist = tmx; tmx += tdx; n = [-sx, 0, 0]; } else if (tmy < tmz) { y += sy; dist = tmy; tmy += tdy; n = [0, -sy, 0]; } else { z += sz; dist = tmz; tmz += tdz; n = [0, 0, -sz]; }
    }
    if (an && (!hit || an.dist < hit.dist)) return { type: 'animal', entity: an.entity, dist: an.dist };
    return hit;
  }
  updateTarget() {
    const h = this.raycast(); let info = null; const it = this.inventory[this.selected];
    if (h) {
      if (h.type === 'plant') { const def = BC.Sim.defFor(h.plant); const p = h.plant; const mine = !p.wild && (this.mode !== 'shared' || !p.owner || p.owner === this.playerName); const whose = p.wild ? '' : (mine ? 'Your crop' : `${p.owner}'s crop`); const st = p.withered ? 'Withered' : p.wild ? (p.progress >= 1 ? 'Wild, mature' : 'Wild, regrowing') : p.progress >= 1 ? `${whose}: ready to harvest` : `${whose}: ${Math.round(p.progress * 100)}% grown`; info = { name: def.name, sub: def.sci + ' · ' + st, hint: it.type === 'tool' && it.id === 'hand' ? (p.wild ? (p.progress >= 1 ? (def.invasive ? 'Tap to pull it out' : 'Tap to collect seeds') : 'Regrowing: come back soon') : p.progress >= 1 ? 'Tap to harvest' : 'Tap to check its health') : 'Inspect: right-click or long-press' }; }
      else if (h.type === 'block') { const b = BC.BLOCKS[h.id]; const tree = (b.log || b.leaves) ? BC.TREE_BY_ID[this.world.treeAt.get(this.world.idx(h.x, h.y, h.z))] : null; const soil = b.soil ? BC.SOILS[b.soil] : null; info = { name: tree ? tree.name : b.name, sub: tree ? tree.sci + (b.leaves ? ' · leaves' : ' · trunk') : soil ? `${soil.name} (${soil.order}) · pH ${soil.ph}` : '', hint: this.hintFor(it, b, tree, h) }; }
      else if (h.type === 'water') info = { name: 'Shallow water', sub: 'Tap to plant here', hint: '' };
      else if (h.type === 'animal') { const d = h.entity.def; info = { name: d.name, sub: d.sci, hint: 'Tap to add to your journal' }; }
    }
    const s = JSON.stringify(info); if (s !== this.lastTargetStr) { this.lastTargetStr = s; this.ui.setTarget(info); }
  }
  hintFor(it, b, tree, h) {
    if (it.type === 'tool') { if (it.id === 'trowel') return b.unbreakable ? 'Bedrock cannot be dug' : b.log ? 'Tap to chop: fence posts' : b.leaves ? 'Tap to shake out seeds' : 'Tap to dig'; if (it.id === 'can') return b.soil ? 'Tap to water this spot' : ''; return b.soil ? 'Tap to read the soil' : tree ? 'Tap to read about this tree' : ''; }
    if (it.type === 'seed') { const def = BC.Sim.defFor({ id: it.id }); if (def.epiphyte) return b.log ? 'Tap the trunk side to attach it' : 'Epiphytes need a tree trunk'; return h.normal[1] === 1 && b.soil ? 'Tap to plant here' : 'Aim at the top of a soil block'; }
    if (it.type === 'compost') return b.soil ? 'Tap to amend this soil' : ''; if (it.type === 'block') return 'Tap to place'; return '';
  }
  // ---------- actions ----------
  applyWater(x, z, local) { const w = this.world; for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) { const xx = x + dx, zz = z + dz; if (xx >= 0 && zz >= 0 && xx < w.W && zz < w.D) w.moisture[xx + zz * w.W] = Math.min(1, w.moisture[xx + zz * w.W] + (dx === 0 && dz === 0 ? 1 : 0.5)); } w.markDirty(x, z); if (local && this.mode === 'shared') this.net.send('water', { x, z }); }
  primary() {
    if (this.ui.modalOpen()) return; const h = this.raycast(); if (!h) return; const it = this.inventory[this.selected]; const w = this.world; const st = this.stats;
    if (h.type === 'animal') return this.inspect(h);
    if (it.type === 'tool' && it.id === 'hand') {
      if (h.type === 'plant') return this.handOnPlant(h.plant);
      return this.inspect(h);
    }
    if (it.type === 'tool' && it.id === 'trowel') {
      if (h.type === 'plant') { w.removePlant(h.plant); this.toast('Plant removed.', ''); return; }
      if (h.type !== 'block') return; const b = BC.BLOCKS[h.id]; if (b.unbreakable) { this.toast('Bedrock. Soil ends here: the R horizon.', ''); return this.inspect(h); }
      const above = w.plantAt(h.x, h.y + 1, h.z); if (above) w.removePlant(above);
      w.set(h.x, h.y, h.z, 0);
      if (b.log) { this.give({ type: 'block', id: BC.BLOCK.FENCE, count: 2 }); const tid = w.treeAt.get(w.idx(h.x, h.y, h.z)); if (tid) { this.lastInspect = null; this.discover('tree:' + tid, 'chopped'); } this.toast('Chopped a log: 2 fence posts.', 'good'); }
      else if (b.leaves) { const tid = w.treeAt.get(w.idx(h.x, h.y, h.z)); if (tid && Math.random() < 0.4) { this.give({ type: 'seed', id: 'tree:' + tid, count: 1 }); this.toast(`Found ${BC.TREE_BY_ID[tid].seed}!`, 'good'); st.seedSpecies.add('tree:' + tid); } else this.toast('Just leaves. Shake another branch for seeds.', ''); if (tid) this.discover('tree:' + tid, 'leaves'); }
      else if (b.soil) {
        this.give({ type: 'block', id: h.id, count: 1 }); const depth = Math.max(1, w.height[h.x + h.z * w.W] - h.y + 1); if (h.y <= w.height[h.x + h.z * w.W]) st.maxDig = Math.max(st.maxDig, depth);
        this.lastInspect = { x: h.x, y: h.y, z: h.z };
        if (!this.discover('soil:' + b.soil, 'dug')) { const below = BC.BLOCKS[w.get(h.x, h.y - 1, h.z)]; if (below && below.soil && below.soil !== b.soil) this.toast(`Dug through ${b.name.toLowerCase()} (${b.horizon} horizon). Below: ${below.name.toLowerCase()}.`, ''); }
        if (b.soil !== 'stone' && Math.random() < 0.12 && ['alfisol', 'mollisol', 'histosol', 'compost'].includes(b.soil)) { this.discover('animal:earthworm', 'dug'); }
      } else if (b.fence || b.id === BC.BLOCK.PLANKS) this.give({ type: 'block', id: h.id, count: 1 });
      return;
    }
    if (it.type === 'tool' && it.id === 'can') { if (h.type !== 'block' && h.type !== 'plant') return; this.applyWater(h.x, h.z, true); st.watered++; this.toast(`Watered. Moisture here is now ${Math.round(w.moisture[h.x + h.z * w.W] * 100)}%.`, 'good'); return; }
    if (it.type === 'seed') return this.plantSeed(it, h);
    if (it.type === 'compost') { if (h.type !== 'block' || !BC.BLOCKS[h.id].soil) return this.toast('Compost goes on soil.', ''); const b = BC.BLOCKS[h.id]; if (b.soil === 'stone') return this.toast('Rock is not soil. Nothing to amend.', ''); w.set(h.x, h.y, h.z, BC.BLOCK.COMPOST); this.take(it); st.compostUsed = true; this.toast('Soil amended with compost: pH buffered to 6.5, more humus, better water holding.', 'good'); this.lastInspect = { x: h.x, y: h.y, z: h.z }; this.discover('soil:compost', 'made'); return; }
    if (it.type === 'block') { if (h.type !== 'block') return; const [nx, ny, nz] = h.normal; const x = h.x + nx, y = h.y + ny, z = h.z + nz; const cur = w.get(x, y, z); if (cur !== 0 && cur !== 15) return; if (w.plantAt(x, y, z)) return this.toast('A plant is in the way.', ''); const p = this.player.pos; if (x + 1 > p.x - 0.3 && x < p.x + 0.3 && z + 1 > p.z - 0.3 && z < p.z + 0.3 && y + 1 > p.y && y < p.y + 1.8) return; w.set(x, y, z, it.id); this.take(it); if (it.id === BC.BLOCK.FENCE) this.checkFences(); return; }
  }
  secondary() { if (this.ui.modalOpen()) return; const h = this.raycast(); if (h) this.inspect(h); }
  inspect(h) {
    const w = this.world; const st = this.stats;
    if (h.type === 'animal') { const key = 'animal:' + h.entity.def.id; st.inspected.add(key); if (!this.discover(key, 'inspected')) this.ui.showCard(key, false); return; }
    if (h.type === 'plant') { const p = h.plant; const def = BC.Sim.defFor(p); const key = (p.id.startsWith('tree:') ? 'tree:' : 'plant:') + def.id; st.inspected.add(key); const ev = p.wild ? null : BC.Sim.evaluate(w, p); this.lastInspect = p; if (!this.discover(key, 'inspected')) this.ui.showCard(key, false, p, ev); return; }
    if (h.type === 'block') { const b = BC.BLOCKS[h.id]; const tid = (b.log || b.leaves) ? w.treeAt.get(w.idx(h.x, h.y, h.z)) : null; if (tid) { const key = 'tree:' + tid; st.inspected.add(key); this.lastInspect = null; if (!this.discover(key, 'inspected')) this.ui.showCard(key, false); return; } if (b.soil) { const key = 'soil:' + b.soil; st.inspected.add(key); this.lastInspect = { x: h.x, y: h.y, z: h.z }; if (!this.discover(key, 'inspected')) this.ui.showCard(key, false, this.lastInspect); return; } if (b.fence) this.toast('A fence. Herbivores cannot step over it.', ''); }
  }
  handOnPlant(p) {
    const w = this.world, st = this.stats; const def = BC.Sim.defFor(p); const isTree = p.id.startsWith('tree:'); const key = (isTree ? 'tree:' : 'plant:') + def.id;
    if (p.withered) { w.removePlant(p); const ev = BC.Sim.evaluate(w, p); const worst = ev.factors.slice().sort((a, b) => a.score - b.score)[0]; this.toast(`Removed the withered ${def.name.toLowerCase()}. Main problem: ${worst.msg}`, 'bad'); return; }
    if (p.wild) {
      if (p.progress < 1) { this.toast(`This ${def.name.toLowerCase()} is regrowing. It will set seed again soon.`, ''); return; }
      if (def.invasive) { w.removePlant(p); st.invasiveRemoved++; this.points += 4; this.toast(`Pulled up ${def.name}. Roots and all: it would resprout otherwise.`, 'good'); this.lastInspect = p; this.discover(key, 'pulled'); return; }
      p.progress = 0.5; w.markDirty(p.x, p.z); this.syncPlant(p); const first = !st.seedSpecies.has(def.id); st.seedSpecies.add(def.id); if (first) this.points += 5;
      this.give({ type: 'seed', id: def.id, count: 2 }); this.lastInspect = p; if (!this.discover(key, 'collected')) this.toast(`Collected 2 × ${def.seed}.`, 'good'); st.inspected.add(key); return;
    }
    if (p.progress < 1) { const ev = BC.Sim.evaluate(w, p); st.inspected.add(key); if (!this.discover(key, 'inspected')) this.ui.showCard(key, false, p, ev); return; }
    // harvest
    const n = p.pollinated ? 4 : 2; this.give({ type: 'seed', id: def.id, count: n }); st.harvests++; this.points += 2; st.compostMaterial++;
    let msg = `Harvested ${def.name}: ${n} × ${def.seed}${p.pollinated ? ' (pollinated: double seeds)' : ''}.`;
    if (st.compostMaterial >= 3) { st.compostMaterial -= 3; st.compostMade++; this.give({ type: 'compost', count: 1 }); msg += ' Plant waste became 1 compost.'; }
    if (def.life && def.life.startsWith('Annual')) { w.removePlant(p); msg += ' Annuals die after seeding.'; } else { p.progress = 0.45; p.pollinated = false; w.markDirty(p.x, p.z); this.syncPlant(p); }
    this.toast(msg, 'good');
  }
  syncPlant(p) { if (this.mode === 'shared') this.net.send('plant', { key: p.key, p: this.packPlant(p) }); }
  plantSeed(it, h) {
    const w = this.world, st = this.stats; const def = BC.Sim.defFor({ id: it.id }); let x, y, z, onBark = false;
    if (def.epiphyte) { if (h.type !== 'block' || !BC.BLOCKS[h.id].log || h.normal[1] !== 0) return this.toast(`${def.name} is an epiphyte: aim at the side of a tree trunk.`, ''); x = h.x + h.normal[0]; y = h.y; z = h.z + h.normal[2]; onBark = true; if (w.get(x, y, z) !== 0) return; }
    else if (def.water === 'aquatic') { if (h.type === 'water') { x = h.x; y = h.y; z = h.z; if (!def.floating && w.get(x, y - 1, z) === 15) return this.toast('Too deep. Emergent plants root in mud under shallow water.', ''); } else if (h.type === 'block' && h.normal[1] === 1 && BC.BLOCKS[h.id].soil) { x = h.x; y = h.y + 1; z = h.z; if (w.get(x, y, z) !== 0) return; } else return this.toast('Aim at shallow water or saturated mud.', ''); }
    else { if (h.type !== 'block' || h.normal[1] !== 1) return this.toast('Aim at the top of a soil block.', ''); const b = BC.BLOCKS[h.id]; if (!b.soil) return this.toast(b.leaves || b.log ? 'That is a tree, not soil.' : 'Seeds need soil.', ''); x = h.x; y = h.y + 1; z = h.z; if (w.get(x, y, z) !== 0) return; }
    if (w.plantAt(x, y, z)) return this.toast('Something already grows here.', '');
    const p = w.addPlant({ id: it.id, x, y, z, wild: false, progress: 0, health: 1, onBark, owner: this.playerName }); this.take(it); st.planted++;
    const ev = BC.Sim.evaluate(w, p); if (ev.score > 0.6) st.plantedGood++;
    if (def.nFix) st.legumesPlanted++;
    if (['corn', 'bean', 'squash'].includes(def.id)) { const near = id => { let f = false; w.plants.forEach(q => { if (!q.wild && q.id === id && Math.abs(q.x - x) <= 2 && Math.abs(q.z - z) <= 2) f = true; }); return f; }; if (near('corn') && near('bean') && near('squash')) st.threeSisters = true; }
    const worst = ev.factors.slice().sort((a, b) => a.score - b.score)[0];
    this.toast(ev.score > 0.7 ? `Planted ${def.name}. Conditions look good.` : ev.score > 0.4 ? `Planted ${def.name}. It will struggle: ${worst.msg}` : `Planted ${def.name}, but ${worst.msg.charAt(0).toLowerCase() + worst.msg.slice(1)}`, ev.score > 0.7 ? 'good' : ev.score > 0.4 ? '' : 'bad');
  }
  isFenced(p) { const w = this.world; for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const b = BC.BLOCKS[w.get(p.x + dx, p.y, p.z + dz)]; if (!b || !b.solid) return false; } return true; }
  checkFences() { let any = false; this.world.plants.forEach(p => { if (!p.wild && this.isFenced(p)) { p.protected = true; any = true; } }); if (any && !this.stats.fenced) { this.stats.fenced = true; this.toast('Your crop is fenced on all four sides. Deer and rabbits will go hungry.', 'good'); } }
  // ---------- inventory ----------
  give(item) { const ex = this.inventory.find(i => i.type === item.type && i.id === item.id); if (ex) ex.count += item.count; else this.inventory.push(item); this.ui.renderHotbar(); }
  take(item) { item.count--; if (item.count <= 0) { const i = this.inventory.indexOf(item); this.inventory.splice(i, 1); if (this.selected >= this.inventory.length) this.selected = this.inventory.length - 1; } this.ui.renderHotbar(); }
  select(i) { if (i < 0 || i >= this.inventory.length) return; this.selected = i; this.ui.renderHotbar(); }
  scrollHotbar(d) { this.select((this.selected + d + this.inventory.length) % this.inventory.length); }
  itemName(it) { if (!it) return ''; if (it.type === 'tool') return { hand: 'Hand: collect, harvest, inspect', trowel: 'Trowel: dig soil, chop logs, shake leaves', can: 'Watering can' }[it.id]; if (it.type === 'seed') { const d = BC.Sim.defFor({ id: it.id }); return `${d.seed} (${d.name})`; } if (it.type === 'compost') return 'Compost: tap a soil block to amend it'; if (it.type === 'block') { const b = BC.BLOCKS[it.id]; return b.fence ? 'Fence post: place around crops' : b.name + ' (block)'; } return ''; }
  itemIcon(it, size) {
    if (it.type === 'seed') { const d = BC.Sim.defFor({ id: it.id }); if (d.shape) { const c = BC.Atlas.tileCanvas(d.leaf ? 'leaves_' + d.id : 'cactus', size); const g = c.getContext('2d'); g.fillStyle = '#5a3a1a'; g.beginPath(); g.ellipse(size * 0.5, size * 0.72, size * 0.16, size * 0.22, 0.3, 0, 6.283); g.fill(); return c; } return BC.Atlas.spriteCanvas(d, 2, size); }
    if (it.type === 'block') { const b = BC.BLOCKS[it.id]; const c = BC.Atlas.tileCanvas(b.tex[1], size); if (b.fence) { const g = c.getContext('2d'); g.clearRect(0, 0, size, size); g.fillStyle = '#9a7a4a'; g.fillRect(size * 0.2, size * 0.1, size * 0.14, size * 0.85); g.fillRect(size * 0.66, size * 0.1, size * 0.14, size * 0.85); g.fillRect(size * 0.1, size * 0.3, size * 0.8, size * 0.1); g.fillRect(size * 0.1, size * 0.6, size * 0.8, size * 0.1); } return c; }
    if (it.type === 'compost') return BC.Atlas.tileCanvas('compost', size);
    const c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d'); const s = size / 32;
    if (it.id === 'hand') { g.fillStyle = '#e8b890'; g.fillRect(9 * s, 12 * s, 14 * s, 14 * s); for (let i = 0; i < 4; i++) g.fillRect((9 + i * 3.6) * s, (4 + (i === 0 || i === 3 ? 3 : 0)) * s, 2.8 * s, 10 * s); g.fillRect(4 * s, 14 * s, 6 * s, 3 * s); }
    else if (it.id === 'trowel') { g.fillStyle = '#7a4a2a'; g.fillRect(14 * s, 2 * s, 4 * s, 12 * s); g.fillStyle = '#b8b8c0'; g.beginPath(); g.moveTo(9 * s, 14 * s); g.lineTo(23 * s, 14 * s); g.lineTo(16 * s, 30 * s); g.closePath(); g.fill(); }
    else if (it.id === 'can') { g.fillStyle = '#5a7a9a'; g.fillRect(8 * s, 12 * s, 14 * s, 14 * s); g.fillRect(20 * s, 10 * s, 8 * s, 3 * s); g.fillStyle = '#4a6a8a'; g.fillRect(10 * s, 8 * s, 10 * s, 4 * s); g.strokeStyle = '#5a7a9a'; g.lineWidth = 2 * s; g.beginPath(); g.arc(15 * s, 10 * s, 6 * s, Math.PI, 0); g.stroke(); g.fillStyle = '#8ac0f0'; for (let i = 0; i < 4; i++) g.fillRect((26 + i) * s, (14 + i * 3) * s, 1.5 * s, 2 * s); }
    return c;
  }
  plantName(p) { const d = BC.Sim.defFor(p); return d ? d.name.toLowerCase() : 'plant'; }
  toggleFastForward() { if (this.growthMult > 1) { this.growthMult = 1; this.ffTimer = 0; } else { this.growthMult = 5; this.ffTimer = 120; this.toast('Fast-forward: plants grow 5× faster for 2 minutes.', 'good'); } }
  onKey(e) {
    if (e.code === 'Escape') { if (!this.ui.modal.hidden) this.ui.closeModal(); else if (document.getElementById('start').hidden) this.ui.showMenu(); return; }
    if (this.ui.modalOpen()) return;
    if (e.code === 'KeyJ') this.ui.showJournal(); else if (e.code === 'KeyQ') this.ui.showQuests(); else if (e.code === 'KeyM') this.ui.showMap(); else if (e.code === 'KeyF') this.primary(); else if (e.code === 'KeyR') this.secondary();
    else if (/^Digit[1-9]$/.test(e.code)) this.select(+e.code.slice(5) - 1);
  }
  // ---------- save / load ----------
  save() {
    if (!this.world) return;
    if (this.mode === 'shared') { const jobs = [this.net.savePlayer(this.playerState())]; if (this.isAuthority()) jobs.push(this.net.saveWorld(this.sharedState()).then(r => { this.worldVersion = r.version; })); return Promise.all(jobs).catch(e => console.warn('cloud save failed', e)); }
    const data = { v: 1, seed: this.seed, region: this.region, time: this.time, world: this.world.serialize(), animals: this.animals.serialize(), weather: this.weather, player: this.playerState() };
    try { localStorage.setItem(this.SAVE_KEY, JSON.stringify(data)); } catch (e) { console.warn('save failed', e); }
  }
  load() {
    let data = null; try { data = JSON.parse(localStorage.getItem(this.SAVE_KEY)); } catch (e) { } if (!data || data.v !== 1) return false;
    this.mode = 'solo'; this.playerName = 'me'; this.seed = data.seed; this.region = data.region; this.time = data.time; this.weather = data.weather || this.weather; this.rain.visible = this.weather.raining;
    this.startWorld(() => {
      this.world.restore(data.world); this.world.dirty.forEach(ci => this.rebuildChunk(ci)); this.world.dirty.clear();
      this.resetStats(); const ps = (data.player && data.player.inventory) ? data.player : { inventory: data.inventory, selected: data.selected, points: data.points, pos: data.player, stats: data.stats }; this.applyPlayerState(ps);
      this.spawnAnimals(data.animals && data.animals.length ? data.animals : this.world.spawnAnimals);
      this.begin(); this.toast('Welcome back. Time here passes only while you play, so your garden is just as you left it.', '');
    });
    return true;
  }
};
window.addEventListener('DOMContentLoaded', () => { try { window.game = new BC.Game(); } catch (e) { console.error(e); const el = document.getElementById('fatal'); el.hidden = false; el.textContent = 'Botany Craft could not start: ' + e.message + '. This browser may not support WebGL.'; } });
