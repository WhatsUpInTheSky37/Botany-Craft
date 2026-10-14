window.BC = window.BC || {};
// DOM overlay: HUD, hotbar, journal, quests, cards and quizzes.
BC.UI = class UI {
  constructor(game) {
    this.game = game; this.$ = id => document.getElementById(id);
    this.modal = this.$('modal'); this.modalCard = this.$('modal-card'); this.toasts = this.$('toasts');
    this.modal.addEventListener('click', e => { if (e.target === this.modal) this.closeModal(); });
    this.$('btn-exit').onclick = () => this.confirmExit(); this.$('btn-bag').onclick = () => this.showInventory(); this.$('btn-journal').onclick = () => this.showJournal(); this.$('btn-quests').onclick = () => this.showQuests(); this.$('btn-map').onclick = () => this.showMap(); this.$('btn-menu').onclick = () => this.showMenu();
    this.$('btn-jump').addEventListener('touchstart', e => { e.preventDefault(); game.player.jumpQueued = true; }, { passive: false });
    this.$('btn-sprint').addEventListener('touchstart', e => { e.preventDefault(); game.player.sprint = !game.player.sprint; this.$('btn-sprint').classList.toggle('on', game.player.sprint); }, { passive: false });
    this.onClose = null; this.lastToast = { msg: '', t: 0 };
  }
  esc(s) { return BC.util.esc(s); }
  modalOpen() { return !this.modal.hidden || !this.$('start').hidden; }
  openModal(html, cls) { this.modalCard.className = 'card ' + (cls || ''); this.modalCard.innerHTML = html; this.fillArt(); this.modal.hidden = false; if (document.exitPointerLock) document.exitPointerLock(); const c = this.modalCard.querySelector('.close'); if (c) c.onclick = () => this.closeModal(); this.modalCard.scrollTop = 0; }
  closeModal() { this.modal.hidden = true; const f = this.onClose; this.onClose = null; if (f) f(); this.game.afterModal(); }
  setLockHint(show) { this.$('lock-hint').hidden = !show || this.game.player.touch || this.modalOpen(); }
  toast(msg, kind) {
    const now = performance.now(); if (msg === this.lastToast.msg && now - this.lastToast.t < 4000) return; this.lastToast = { msg, t: now };
    const el = document.createElement('div'); el.className = 'toast ' + (kind || ''); el.textContent = msg; this.toasts.appendChild(el);
    while (this.toasts.children.length > 3) this.toasts.firstChild.remove();
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 400); }, kind === 'bad' ? 6000 : 4500);
  }
  // ---------- HUD ----------
  updateHUD() {
    const g = this.game; const b = BC.BIOMES[g.world.biomeAt(g.player.pos.x, g.player.pos.z)];
    if (this.lastBiome !== b.id) { this.lastBiome = b.id; this.$('biome-name').textContent = b.name; this.$('biome-places').textContent = b.places; }
    const t = g.time.dayFrac; const hr = Math.floor(t * 24), mn = Math.floor((t * 24 - hr) * 60);
    this.$('day').textContent = `Day ${g.time.day} · ${String(hr).padStart(2, '0')}:${String(mn).padStart(2, '0')}`;
    this.$('weather').textContent = g.weather.raining ? 'Rain' : (t > 0.78 || t < 0.22 ? 'Night' : 'Clear'); this.$('weather').className = g.weather.raining ? 'rain' : '';
    this.$('points').textContent = `${g.points} pts`; this.$('level').textContent = g.levelName();
    if (g.growthMult > 1) this.$('ff').hidden = false; else this.$('ff').hidden = true;
    if (g.mode === 'shared' && (this.sharedTick = (this.sharedTick || 0) + 1) % 8 === 0) this.updateShared();
  }
  setTarget(t) {
    const el = this.$('target'); if (!t) { el.hidden = true; return; } el.hidden = false; el.innerHTML = `<b>${this.esc(t.name)}</b>${t.sub ? `<i>${this.esc(t.sub)}</i>` : ''}${t.hint ? `<span>${this.esc(t.hint)}</span>` : ''}`;
  }
  slotEl(it, i, selected, keyLabel) {
    const d = document.createElement('div'); d.className = 'slot' + (selected ? ' sel' : '') + (it ? '' : ' empty'); d.title = this.game.itemName(it);
    const ic = it ? this.game.itemIcon(it, 40) : null; if (ic) d.appendChild(ic); if (it && it.count !== undefined) { const c = document.createElement('span'); c.className = 'count'; c.textContent = it.count; d.appendChild(c); }
    if (keyLabel !== undefined) { const k = document.createElement('span'); k.className = 'key'; k.textContent = keyLabel; d.appendChild(k); }
    return d;
  }
  renderHotbar() {
    const g = this.game; const bar = this.$('hotbar'); bar.innerHTML = '';
    for (let i = 0; i < 9; i++) { const d = this.slotEl(g.inventory[i], i, i === g.selected, i + 1); d.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); g.select(i); }); bar.appendChild(d); }
    this.$('item-name').textContent = g.itemName(g.inventory[g.selected]);
    const bag = g.bagItems().length; const bb = this.$('btn-bag'); bb.innerHTML = `Bag ${bag ? `<em>${bag}</em>` : ''}<small>E</small>`;
  }
  showInventory(tab) {
    const g = this.game; tab = tab || this.invTab || 'items'; this.invTab = tab;
    const nav = `<nav class="tabs"><button class="${tab === 'items' ? 'on' : ''}" data-tab="items">Items</button><button class="${tab === 'craft' ? 'on' : ''}" data-tab="craft">Craft</button></nav>`;
    let body = '';
    if (tab === 'items') {
      const bag = g.bagItems();
      body = `<h3>Hotbar</h3><div class="inv-row" id="inv-hotbar"></div><p class="small">Tap a hotbar slot to select it. Tap an item in the bag to move it into the selected slot (the slot's item goes to the bag).</p><h3>Bag <small>${bag.length} item${bag.length === 1 ? '' : 's'}</small></h3><div class="inv-grid" id="inv-bag">${bag.length ? '' : '<div class="small">Your bag is empty. Items beyond the nine hotbar slots land here.</div>'}</div><h3>Selected</h3><p class="small" id="inv-desc">${this.esc(g.itemName(g.inventory[g.selected]))}</p>`;
    } else {
      body = `<div class="recipes">${BC.RECIPES.map(r => { const ok = g.canCraft(r); const need = r.ins.map(i => `${i.n} ${i.label} <small>(have ${g.count(i.match)})</small>`).join(', '); return `<div class="recipe ${ok ? '' : 'no'}"><div class="ico" data-r="${r.id}"></div><div class="txt"><b>${r.out.count} × ${this.esc(g.itemName(r.out).split(':')[0])}</b><span>Needs ${need}</span><em>${this.esc(r.note)}</em></div><button class="primary make" data-r="${r.id}" ${ok ? '' : 'disabled'}>Make</button></div>`; }).join('')}</div><p class="small">Get logs by chopping tree trunks with the trowel. Plant fibre comes from cattail, big bluestem, wild rice, agave, sphagnum, fireweed and pineapple.</p>`;
    }
    this.openModal(`<button class="close" aria-label="Close">×</button><h2>Bag & crafting</h2>${nav}${body}`, 'journal');
    this.modalCard.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => this.showInventory(b.dataset.tab));
    if (tab === 'items') {
      const hb = this.$('inv-hotbar'); for (let i = 0; i < 9; i++) { const d = this.slotEl(g.inventory[i], i, i === g.selected, i + 1); d.onclick = () => { g.select(i); this.showInventory('items'); }; d.oncontextmenu = e => { e.preventDefault(); g.moveToBag(i); this.showInventory('items'); }; hb.appendChild(d); }
      const bg = this.$('inv-bag'); g.bagItems().forEach(({ it, i }) => { const d = this.slotEl(it, i, false); d.onclick = () => { g.moveToHotbar(i); this.showInventory('items'); }; bg.appendChild(d); });
    } else {
      this.modalCard.querySelectorAll('.recipe .ico').forEach(el => { const r = BC.RECIPES.find(x => x.id === el.dataset.r); const ic = g.itemIcon(r.out, 48); if (ic) el.appendChild(ic); });
      this.modalCard.querySelectorAll('.make').forEach(b => b.onclick = () => { const r = BC.RECIPES.find(x => x.id === b.dataset.r); if (g.craft(r)) this.showInventory('craft'); });
    }
  }
  updateQuestTracker() {
    const g = this.game; const q = g.currentQuest(); const el = this.$('quest-tracker');
    if (!q) { el.innerHTML = '<b>All quests complete!</b><span>Keep exploring and planting.</span>'; return; }
    const p = Math.round(q.check(g.stats) * 100); el.innerHTML = `<small>Quest ${BC.QUESTS.indexOf(q) + 1} of ${BC.QUESTS.length}</small><b>${this.esc(q.title)}</b><span>${this.esc(q.goal)}</span><div class="bar"><i style="width:${p}%"></i></div>`;
  }
  updateCompass() {
    const g = this.game; const el = this.$('compass'); if (g.mode !== 'shared' || !g.peers.size) { if (!el.hidden) el.hidden = true; return; }
    el.hidden = false; const p = g.player.pos; let i = 0;
    g.peers.forEach((pe, key) => {
      let row = el.children[i]; if (!row) { row = document.createElement('div'); row.className = 'peer'; row.innerHTML = '<i><span>➜</span></i><div><b></b> <small></small></div>'; el.appendChild(row); }
      const dx = pe.group.position.x - p.x, dz = pe.group.position.z - p.z; const dist = Math.hypot(dx, dz);
      const ang = Math.atan2(dx, -dz) - (-g.player.yaw); // bearing relative to view
      row.querySelector('i').style.background = pe.color || '#ffd23b'; row.querySelector('span').style.transform = `rotate(${(ang - Math.PI / 2) * 180 / Math.PI}deg)`;
      row.querySelector('b').textContent = pe.name; row.querySelector('small').textContent = dist < 3 ? 'right here' : Math.round(dist) + ' blocks'; i++;
    });
    while (el.children.length > i) el.lastChild.remove();
  }
  // ---------- cards ----------
  reqTable(def) {
    const soils = def.soils.map(s => BC.SOILS[s] ? BC.SOILS[s].name : 'Tree bark').join(', ');
    return `<table class="req"><tr><th>Soil</th><td>${this.esc(soils)}</td></tr><tr><th>pH</th><td>${def.ph[0]} to ${def.ph[1]}</td></tr><tr><th>Water</th><td>${BC.WATER_LABEL[def.water]}</td></tr><tr><th>Light</th><td>${BC.SUN_LABEL[def.sun]}</td></tr><tr><th>Climate</th><td>${this.esc(def.biomes.map(b => BC.BIOMES[b].short).join(', '))}</td></tr>${def.life ? `<tr><th>Life cycle</th><td>${this.esc(def.life)}</td></tr>` : ''}</table>`;
  }
  tags(def) { const t = []; if (def.nFix) t.push(['Nitrogen fixer', 'n']); if (def.pollinator) t.push(['Pollinator plant', 'p']); if (def.invasive) t.push(['Invasive', 'bad']); if (def.epiphyte) t.push(['Epiphyte', 'e']); if (def.notPlant) t.push(['Not a plant', 'e']); if (def.water === 'aquatic') t.push(['Aquatic', 'w']); return t.length ? `<div class="tags">${t.map(x => `<span class="tag ${x[1]}">${x[0]}</span>`).join('')}</div>` : ''; }
  imgFor(kind, def, stage) {
    if (kind === 'plant') return BC.Atlas.spriteCanvas(def, stage === undefined ? 2 : stage, 128);
    if (kind === 'tree') return BC.Atlas.tileCanvas(def.leaf ? 'leaves_' + def.id : 'cactus', 128);
    if (kind === 'soil') { const blk = BC.BLOCKS.find(b => b && b.soil === def.id); return BC.Atlas.tileCanvas(blk ? blk.tex[1] : 'stone', 128); }
    if (kind === 'animal' && !def.colors) { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); g.strokeStyle = '#c87a6a'; g.lineWidth = 14; g.lineCap = 'round'; g.beginPath(); g.moveTo(20, 80); g.bezierCurveTo(40, 30, 70, 120, 108, 60); g.stroke(); g.strokeStyle = '#a85a4a'; g.lineWidth = 4; g.beginPath(); g.moveTo(44, 62); g.lineTo(48, 72); g.moveTo(54, 56); g.lineTo(58, 66); g.stroke(); return c; }
    if (kind === 'animal') { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); g.fillStyle = def.colors.body; g.fillRect(24, 50, 80, 40); g.fillStyle = def.colors.head; g.fillRect(88, 34, 32, 30); g.fillStyle = def.colors.legs; if (def.legH > 0) { g.fillRect(30, 90, 10, 24); g.fillRect(88, 90, 10, 24); } g.fillStyle = def.colors.accent; g.fillRect(96, 44, 6, 6); return c; }
    return null;
  }
  // Canvases lose their pixels when serialised through innerHTML, so cards get a placeholder that fillArt() replaces with the live canvas.
  wrapImg(c) { if (!c) return ''; this.artQueue = this.artQueue || []; const id = 'art' + (this.artSeq = (this.artSeq || 0) + 1); this.artQueue.push([id, c]); return `<div class="art" data-art="${id}"></div>`; }
  fillArt() { (this.artQueue || []).forEach(([id, c]) => { const el = this.modalCard.querySelector(`[data-art="${id}"]`); if (el) el.appendChild(c); }); this.artQueue = []; }
  plantCard(def, inst, ev, isNew) {
    const g = this.game; const isTree = !!def.shape;
    let status = '';
    if (inst && !inst.wild) {
      if (inst.withered) status = `<div class="status bad"><b>Withered.</b> ${ev ? ev.factors.filter(f => f.score < 0.5).map(f => this.esc(f.msg)).join(' ') : ''} Remove it with your hand and try again.</div>`;
      else if (ev) {
        const pct = Math.round(inst.progress * 100); const sc = ev.score; const cls = sc > 0.7 ? 'good' : sc > 0.4 ? 'mid' : 'bad';
        status = `<div class="status ${cls}"><div class="row"><b>${inst.progress >= 1 ? 'Mature: ready to harvest' : 'Growing: ' + pct + '%'}</b><span>Health ${Math.round(inst.health * 100)}%${inst.pollinated ? ' · Pollinated' : ''}</span></div><div class="bar"><i style="width:${pct}%"></i></div><ul class="diag">${ev.factors.map(f => `<li class="${f.score > 0.7 ? 'ok' : f.score > 0.4 ? 'warn' : 'no'}"><b>${f.label}</b> ${this.esc(f.msg)}</li>`).join('')}</ul></div>`;
      }
    }
    const facts = def.facts.map(f => `<li>${this.esc(f)}</li>`).join('');
    return `<button class="close" aria-label="Close">×</button>${isNew ? '<div class="eyebrow">New field note</div>' : ''}<div class="head">${this.wrapImg(this.imgFor(isTree ? 'tree' : 'plant', def))}<div><h2>${this.esc(def.name)}</h2><p class="sci">${this.esc(def.sci)} · ${this.esc(def.family)}</p>${this.tags(def)}</div></div><p class="teach">${this.esc(def.teach)}</p>${status}${this.reqTable(def)}<h3>Field notes</h3><ul class="facts">${facts}</ul>${def.seed ? `<p class="seedline">Propagule: ${this.esc(def.seed)}${def.grow ? ` · grows in about ${Math.round(def.grow / 60)} min under ideal conditions` : ''}</p>` : ''}`;
  }
  soilCard(block, soil, x, y, z, isNew) {
    const g = this.game; const w = g.world; const m = w.moisture[x + z * w.W]; const light = w.lightAt(x, y + 1, z); const biome = BC.BIOMES[w.biomeAt(x, z)];
    const horizons = soil.horizons.map(h => `<li class="${h[0] === block.horizon || (block.horizon || '').startsWith(h[0]) ? 'here' : ''}"><b>${h[0]}</b><span><strong>${this.esc(h[1])}</strong> ${this.esc(h[2])}</span></li>`).join('');
    let fit = '';
    const it = g.cur();
    if (it && it.type === 'seed') { const def = BC.Sim.defFor({ id: it.id }); const fake = { id: it.id, x, y: y + 1, z, wild: false, progress: 0, health: 1 }; const ev = BC.Sim.evaluate(w, fake); fit = `<div class="fit"><b>Your ${this.esc(def.name)} here:</b><ul class="diag">${ev.factors.map(f => `<li class="${f.score > 0.7 ? 'ok' : f.score > 0.4 ? 'warn' : 'no'}"><b>${f.label}</b> ${this.esc(f.msg)}</li>`).join('')}</ul><p>${ev.score > 0.7 ? 'Good match. Plant it!' : ev.score > 0.4 ? 'It will grow slowly here.' : 'Poor match. It will probably wither.'}</p></div>`; }
    const phPos = Math.round((soil.ph / 14) * 100);
    return `<button class="close" aria-label="Close">×</button>${isNew ? '<div class="eyebrow">New field note · soil</div>' : ''}<div class="head">${this.wrapImg(this.imgFor('soil', soil))}<div><h2>${this.esc(block.name)}</h2><p class="sci">${this.esc(soil.name)} · ${this.esc(soil.order)} · horizon ${this.esc(block.horizon || '')}</p></div></div>
    <div class="meters"><div><label>pH ${soil.ph.toFixed(1)}</label><div class="ph"><i style="left:${phPos}%"></i></div><small>acid ← 7 → alkaline</small></div><div><label>Moisture ${Math.round(m * 100)}%</label><div class="bar blue"><i style="width:${Math.round(m * 100)}%"></i></div><small>${biome.short} baseline ${Math.round(biome.baseMoisture * 100)}%</small></div><div><label>Light ${Math.round(light * 100)}%</label><div class="bar sun"><i style="width:${Math.round(light * 100)}%"></i></div><small>${light > 0.8 ? 'full sun' : light > 0.35 ? 'part shade' : 'shade'}</small></div></div>
    ${fit}<table class="req"><tr><th>Texture</th><td>${this.esc(soil.texture)}</td></tr><tr><th>Organic matter</th><td>${this.esc(soil.organic)}</td></tr><tr><th>Drainage</th><td>${this.esc(soil.drainage)}</td></tr><tr><th>Found in</th><td>${this.esc(soil.where)}</td></tr></table>
    <h3>Soil profile</h3><ol class="horizons">${horizons}</ol><h3>Field notes</h3><ul class="facts">${soil.facts.map(f => `<li>${this.esc(f)}</li>`).join('')}</ul><p class="seedline">${this.esc(BC.PH_NOTES)}</p>`;
  }
  animalCard(def, isNew) { return `<button class="close" aria-label="Close">×</button>${isNew ? '<div class="eyebrow">New field note · animal</div>' : ''}<div class="head">${this.wrapImg(this.imgFor('animal', def))}<div><h2>${this.esc(def.name)}</h2><p class="sci">${this.esc(def.sci)}</p><div class="tags"><span class="tag ${def.role === 'herbivore' ? 'bad' : def.role === 'pollinator' ? 'p' : 'e'}">${{ herbivore: 'Eats your crops', pollinator: 'Pollinator', grazer: 'Grazer', neutral: 'Part of the web', soil: 'Soil engineer' }[def.role]}</span></div></div></div><p class="teach">${this.esc(def.teach)}</p><h3>Field notes</h3><ul class="facts">${def.facts.map(f => `<li>${this.esc(f)}</li>`).join('')}</ul>`; }
  biomeCard(b, isNew) { const plants = BC.PLANTS.filter(p => p.biomes[0] === b.id).map(p => p.name); const trees = BC.TREES.filter(t => t.biomes[0] === b.id).map(t => t.name); const animals = BC.ANIMALS.filter(a => a.biomes[0] === b.id).map(a => a.name); return `<button class="close" aria-label="Close">×</button>${isNew ? '<div class="eyebrow">New region</div>' : ''}<div class="head"><div class="art swatch" style="background:${b.sky}"><i style="background:#${b.grass[0].toString(16)}"></i></div><div><h2>${this.esc(b.name)}</h2><p class="sci">${this.esc(b.places)}</p></div></div><p class="teach">${this.esc(b.climate)}</p><table class="req"><tr><th>Typical soil</th><td>${this.esc(BC.SOILS[b.soil].name)} (${this.esc(BC.SOILS[b.soil].order)}), pH about ${BC.SOILS[b.soil].ph}</td></tr><tr><th>Native plants</th><td>${this.esc(plants.join(', '))}</td></tr><tr><th>Trees</th><td>${this.esc(trees.join(', '))}</td></tr><tr><th>Animals</th><td>${this.esc(animals.join(', '))}</td></tr></table><h3>Field notes</h3><ul class="facts">${b.facts.map(f => `<li>${this.esc(f)}</li>`).join('')}</ul>`; }
  showCard(key, isNew, inst, ev) {
    const [kind, id] = key.split(':'); let html = '';
    if (kind === 'plant') html = this.plantCard(BC.PLANT_BY_ID[id], inst, ev, isNew);
    else if (kind === 'tree') html = this.plantCard(BC.TREE_BY_ID[id], inst, ev, isNew);
    else if (kind === 'animal') html = this.animalCard(BC.ANIMAL_BY_ID[id], isNew);
    else if (kind === 'biome') html = this.biomeCard(BC.BIOMES[id], isNew);
    else if (kind === 'soil') { const soil = BC.SOILS[id]; const blk = BC.BLOCKS.find(b => b && b.soil === id); html = this.soilCard(blk, soil, inst ? inst.x : 0, inst ? inst.y : 0, inst ? inst.z : 0, isNew); }
    this.openModal(html, 'note');
  }
  // ---------- journal ----------
  showJournal(tab) {
    const g = this.game; tab = tab || this.journalTab || 'plants'; this.journalTab = tab;
    const tabs = [['plants', 'Plants', BC.PLANTS, 'plant'], ['trees', 'Trees', BC.TREES, 'tree'], ['animals', 'Animals', BC.ANIMALS, 'animal'], ['soils', 'Soils', Object.values(BC.SOILS), 'soil'], ['biomes', 'Regions', BC.BIOME_LIST.map(b => BC.BIOMES[b]), 'biome']];
    const cur = tabs.find(t => t[0] === tab); const kind = cur[3];
    const total = tabs.reduce((a, t) => a + t[2].length, 0), found = tabs.reduce((a, t) => a + t[2].filter(d => g.stats.journal.has(t[3] + ':' + d.id)).length, 0);
    const grid = cur[2].map(d => { const key = kind + ':' + d.id; const has = g.stats.journal.has(key); const img = has ? this.wrapImg(this.imgFor(kind === 'biome' ? null : kind, d)) : '<div class="art q">?</div>'; return `<button class="entry ${has ? '' : 'locked'}" data-key="${key}" ${has ? '' : 'disabled'}>${kind === 'biome' ? `<div class="art swatch" style="background:${d.sky};opacity:${has ? 1 : 0.3}"><i style="background:#${d.grass[0].toString(16)}"></i></div>` : img}<span>${has ? this.esc(d.name) : 'Undiscovered'}</span></button>`; }).join('');
    this.openModal(`<button class="close" aria-label="Close">×</button><div class="eyebrow">Field Journal · ${found} of ${total} discovered</div><h2>Field Journal</h2><nav class="tabs">${tabs.map(t => `<button class="${t[0] === tab ? 'on' : ''}" data-tab="${t[0]}">${t[1]} <small>${t[2].filter(d => g.stats.journal.has(t[3] + ':' + d.id)).length}/${t[2].length}</small></button>`).join('')}</nav><div class="grid">${grid}</div>`, 'journal');
    this.modalCard.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => this.showJournal(b.dataset.tab));
    this.modalCard.querySelectorAll('.entry:not(.locked)').forEach(b => b.onclick = () => { this.onClose = () => this.showJournal(tab); this.showCard(b.dataset.key, false); const c = this.modalCard.querySelector('.close'); c.onclick = () => { this.onClose = null; this.showJournal(tab); }; });
  }
  showQuests() {
    const g = this.game; const list = BC.QUESTS.map((q, i) => { const done = g.stats.questsDone.has(q.id); const p = done ? 1 : q.check(g.stats); const cur = g.currentQuest() === q; return `<li class="${done ? 'done' : cur ? 'cur' : ''}"><div class="n">${done ? '✓' : i + 1}</div><div><b>${this.esc(q.title)}</b><span>${this.esc(q.goal)}</span>${done ? `<em>${this.esc(q.lesson)}</em>` : cur ? `<div class="bar"><i style="width:${Math.round(p * 100)}%"></i></div>` : ''}</div><small>${q.points} pts</small></li>`; }).join('');
    this.openModal(`<button class="close" aria-label="Close">×</button><div class="eyebrow">${g.points} points · ${g.levelName()}</div><h2>Field Quests</h2><p class="teach">Quests guide you through the science. Finish one and answer a quick question for bonus points.</p><ol class="quests">${list}</ol>`, 'journal');
  }
  showQuiz(q, onDone) {
    const opts = q.quiz.options.map((o, i) => ({ o, i })); for (let i = opts.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[opts[i], opts[j]] = [opts[j], opts[i]]; }
    this.openModal(`<div class="eyebrow">Quest complete · ${q.points} pts</div><h2>${this.esc(q.title)}</h2><p class="teach">${this.esc(q.lesson)}</p><h3>Quick question (+10 pts)</h3><p class="q">${this.esc(q.quiz.q)}</p><div class="opts">${opts.map(x => `<button data-i="${x.i}">${this.esc(x.o)}</button>`).join('')}</div><div class="explain" hidden></div>`, 'quiz');
    const ex = this.modalCard.querySelector('.explain');
    this.modalCard.querySelectorAll('.opts button').forEach(b => b.onclick = () => { const ok = +b.dataset.i === q.quiz.answer; this.modalCard.querySelectorAll('.opts button').forEach(x => { x.disabled = true; if (+x.dataset.i === q.quiz.answer) x.classList.add('right'); }); if (!ok) b.classList.add('wrong'); ex.hidden = false; ex.innerHTML = `<b>${ok ? 'Correct! +10 points.' : 'Not quite.'}</b> ${this.esc(q.quiz.explain)}<br><button class="primary continue">Continue</button>`; ex.querySelector('.continue').onclick = () => { this.closeModal(); onDone(ok); }; });
  }
  showMap() {
    const g = this.game; const w = g.world; const c = document.createElement('canvas'); const S = 2; c.width = w.W * S; c.height = w.D * S; const ctx = c.getContext('2d');
    const cols = { temperate: '#4f8a32', prairie: '#a8b84a', desert: '#dcc07e', rainforest: '#1f6a2f', boreal: '#3f5f3a', wetland: '#5f8a60' };
    for (let z = 0; z < w.D; z++) for (let x = 0; x < w.W; x++) { const h = w.height[x + z * w.W]; ctx.fillStyle = h < w.WL ? '#3a7ac8' : cols[BC.BIOME_LIST[w.biome[x + z * w.W]]]; if (h >= w.WL) { const k = 0.85 + (h - 12) * 0.03; ctx.globalAlpha = BC.util.clamp(k, 0.6, 1); } ctx.fillRect(x * S, z * S, S, S); ctx.globalAlpha = 1; }
    // markers for planted crops
    ctx.fillStyle = '#fff'; w.plants.forEach(p => { if (!p.wild) ctx.fillRect(p.x * S - 1, p.z * S - 1, S + 2, S + 2); });
    g.peers.forEach(pe => { ctx.fillStyle = pe.color || '#ffd23b'; ctx.beginPath(); ctx.arc(pe.group.position.x * S, pe.group.position.z * S, 5, 0, 6.283); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke(); ctx.fillStyle = '#fff'; ctx.font = 'bold 12px Nunito, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(pe.name, pe.group.position.x * S, pe.group.position.z * S - 9); });
    const px = g.player.pos.x * S, pz = g.player.pos.z * S; ctx.fillStyle = g.mode === 'shared' ? (g.myColor || '#ff3b30') : '#ff3b30'; ctx.beginPath(); ctx.arc(px, pz, 5, 0, 6.283); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
    ctx.strokeStyle = '#ff3b30'; ctx.beginPath(); ctx.moveTo(px, pz); ctx.lineTo(px - Math.sin(g.player.yaw) * 14, pz - Math.cos(g.player.yaw) * 14); ctx.stroke();
    const legend = BC.BIOME_LIST.map(b => `<li><i style="background:${cols[b]}"></i>${BC.BIOMES[b].short}${g.stats.biomesVisited.has(b) ? '' : ' <small>(not yet visited)</small>'}</li>`).join('');
    this.openModal(`<button class="close" aria-label="Close">×</button><div class="eyebrow">World map · north is up · cold north, hot south · dry west, wet east</div><h2>Where am I?</h2><div class="mapwrap"></div><ul class="legend">${legend}<li><i style="background:${g.mode === 'shared' ? this.esc(g.myColor || '#ff3b30') : '#ff3b30'}"></i>You</li><li><i style="background:#3a7ac8"></i>Water</li><li><i style="background:#fff;border:1px solid #888"></i>Plantings</li>${g.mode === 'shared' ? Array.from(g.peers.values()).map(pe => `<li><i style="background:${this.esc(pe.color || '#ffd23b')}"></i>${this.esc(pe.name)}</li>`).join('') : ''}</ul><p class="teach">Real Earth works the same way at a larger scale: temperature falls toward the poles and with altitude, and rainfall depends on winds, mountains and distance from the sea. Together they decide the biome, and the biome builds the soil.</p>`, 'journal');
    this.modalCard.querySelector('.mapwrap').appendChild(c);
  }
  showMenu() {
    const g = this.game;
    const shared = g.mode === 'shared'; const names = shared ? (g.net.online || []).map(p => p.name + (p.key === g.net.hostKey ? ' (host)' : '')).join(', ') : '';
    const info = shared ? `<p class="teach">Shared world <b>${this.esc(g.net.creds.world)}</b>. Online now: ${this.esc(names || 'just you')}. Anyone with the world name and PIN can join from any device.${g.net.isHost ? ' You are hosting: plants grow and animals move on your device and everyone else sees them.' : ''}</p>` : '';
    this.openModal(`<button class="close" aria-label="Close">×</button><h2>Botany Craft</h2>${info}<div class="menu"><button id="m-exit" class="primary">Save and exit game</button><button id="m-ff" ${shared && !g.net.isHost ? 'disabled' : ''}>${g.growthMult > 1 ? 'Stop fast-forward' : 'Fast-forward growth (×5 for 2 min)' + (shared && !g.net.isHost ? ' (host only)' : '')}</button><button id="m-save">Save game</button><button id="m-help">Controls & how to play</button><button id="m-dir">Shared worlds: who is online</button>${shared ? '<button id="m-leave">Leave shared world</button><button id="m-delete" class="danger">Delete this shared world for everyone</button>' : ''}<button id="m-new" class="danger">${shared ? 'Forget this shared world on this device' : 'Start a new world'}</button></div><p class="small">${shared ? 'Progress saves to the cloud every 30 seconds. Your journal and inventory are yours; the land and plants are shared.' : 'Progress saves automatically every 30 seconds in this browser.'}</p>`, 'journal');
    this.$('m-exit').onclick = () => this.confirmExit(); this.$('m-ff').onclick = () => { g.toggleFastForward(); this.closeModal(); }; this.$('m-save').onclick = () => { Promise.resolve(g.save()).then(() => this.toast('Game saved.', 'good')); this.closeModal(); };
    if (shared) { this.$('m-leave').onclick = () => g.leaveShared(); this.$('m-delete').onclick = () => { const w = g.net.creds.display || g.net.creds.world; const others = (g.net.online || []).filter(p => p.key !== g.net.myKey).map(p => p.name); this.openModal(`<h2>Delete "${this.esc(w)}"?</h2><p class="teach">This erases the world, its plants and every player's progress in it, for everyone. It cannot be undone.${others.length ? ' <b>' + this.esc(others.join(', ')) + ' ' + (others.length === 1 ? 'is' : 'are') + ' in it right now.</b>' : ''}</p><div class="menu"><button id="d-yes" class="danger">Yes, delete it for everyone</button><button id="d-no">Keep it</button></div>`, 'journal'); this.$('d-yes').onclick = () => { this.$('d-yes').disabled = true; this.$('d-yes').textContent = 'Deleting…'; g.deleteSharedWorld(); }; this.$('d-no').onclick = () => this.closeModal(); }; g.peers.forEach((pe, key) => { const b = document.createElement('button'); b.innerHTML = `<i class="dot" style="background:${this.esc(pe.color || '#ffd23b')}"></i> Go to ${this.esc(pe.name)}`; b.onclick = () => { this.closeModal(); g.goToPeer(key); }; this.modalCard.querySelector('.menu').insertBefore(b, this.$('m-ff')); }); const rc = document.createElement('button'); rc.textContent = g.net.live ? 'Live session: connected (reconnect)' : 'Reconnect live session' + (g.net.lastError ? ' (' + g.net.lastError + ')' : ''); rc.onclick = () => { this.closeModal(); g.reconnectLive(); }; this.modalCard.querySelector('.menu').insertBefore(rc, this.$('m-leave')); }
    this.$('m-help').onclick = () => this.showHelp(); this.$('m-dir').onclick = () => this.showDirectory(); this.$('m-new').onclick = () => { this.openModal(`<h2>Start a new world?</h2><p class="teach">Your current world and journal will be erased.</p><div class="menu"><button id="m-yes" class="danger">Yes, erase and start over</button><button id="m-no">Keep playing</button></div>`, 'journal'); this.$('m-yes').onclick = () => { g.reset(); }; if (shared) { this.modalCard.querySelector('.teach').textContent = 'The shared world stays in the cloud for everyone else. This device just forgets the name and PIN.'; } this.$('m-no').onclick = () => this.closeModal(); };
  }
  confirmExit() {
    const g = this.game; const shared = g.mode === 'shared';
    this.openModal(`<h2>Exit game?</h2><p class="teach">${shared ? 'Your progress and the shared world are saved to the cloud first. You can rejoin from the title screen any time.' : 'Your world is saved in this browser first. Pick "Continue your world" on the title screen to come back.'}</p><div class="menu"><button id="x-yes" class="primary">Save and exit</button><button id="x-no">Keep playing</button></div>`, 'journal');
    this.$('x-yes').onclick = () => { this.$('x-yes').disabled = true; this.$('x-yes').textContent = 'Saving…'; g.exitToTitle(); }; this.$('x-no').onclick = () => this.closeModal();
  }
  showHelp() {
    const touch = this.game.player.touch;
    this.openModal(`<button class="close" aria-label="Close">×</button><h2>How to play</h2>
    <h3>Goal</h3><p class="teach">Explore six real-world regions, gather seeds from wild plants, and grow them in the right soil. Everything you meet goes into your Field Journal. Quests teach the science step by step.</p>
    <h3>Controls</h3>${touch ? `<ul class="facts"><li><b>Move</b>: drag on the left side of the screen (virtual joystick).</li><li><b>Look</b>: drag on the right side.</li><li><b>Use / harvest</b>: tap on the right side with the crosshair on something.</li><li><b>Inspect</b>: press and hold.</li><li><b>Jump</b> and <b>Run</b>: buttons at bottom right.</li><li><b>Tools and seeds</b>: tap a slot in the bottom bar. The Bag button opens everything else and crafting.</li></ul>` : `<ul class="facts"><li><b>Move</b>: W A S D, <b>jump</b>: Space, <b>run</b>: hold Shift.</li><li><b>Look</b>: mouse (click the world to capture the mouse, Esc to release).</li><li><b>Use / harvest</b>: left click. <b>Inspect</b>: right click.</li><li><b>Tools and seeds</b>: keys 1 to 9 or the mouse wheel.</li><li><b>E</b> bag and crafting, <b>J</b> journal, <b>Q</b> quests, <b>M</b> map, <b>Esc</b> menu.</li></ul>`}
    <h3>Tools</h3><ul class="facts"><li><b>Hand</b>: collect seeds from mature wild plants, harvest your crops, catch small animals. To read about anything, right-click or press and hold.</li><li><b>Shovel</b>: digs soil in 2 hits, chops wood in 4. <b>Axe</b>: chops wood in 2 hits, digs soil in 2. <b>Hands</b>: 5 hits for wood, 4 for soil, and stone is very slow. On desktop hold the mouse button to keep hitting; on a phone tap repeatedly. The counter under the crosshair shows your progress.</li><li><b>Watering can</b>: soak the soil in one spot.</li><li><b>Seeds</b>: select them, then tap the top of a soil block. Aquatic plants go in shallow water; bromeliads and vanilla go on the side of a tree trunk.</li><li><b>Compost</b>: made from every 3 crops you harvest. Use it on a soil block to improve it.</li><li><b>Building</b>: chop logs, then open the Bag (E) and craft planks and fence posts. Logs, planks, fences, stone and soil blocks can all be placed, so build a house, a shed or raised beds. Fence crops on all four sides to keep deer, hares and rabbits out.</li><li><b>Bag</b>: nine hotbar slots are what you can hold; everything else sits in the bag. Open it with E or the Bag button and tap an item to bring it into the selected slot.</li><li><b>Animals</b>: tap a small animal (bee, butterfly, frog, lizard, hummingbird, dragonfly) with your hand to catch it, then tap the ground to release it, for example bees beside your flowering crops. Big animals need a rope: craft one from 3 plant fibre, tap the animal to lead it, tap again to let go.</li></ul>`, 'journal');
  }
  showStart(o) {
    const s = this.$('start'); s.hidden = false; this.$('hud').hidden = true;
    const cards = BC.BIOME_LIST.map(b => { const bm = BC.BIOMES[b]; return `<button class="region" data-b="${b}"><div class="swatch" style="background:${bm.sky}"><i style="background:#${bm.grass[0].toString(16)}"></i></div><b>${this.esc(bm.name)}</b><span>${this.esc(bm.places)}</span></button>`; }).join('');
    this.$('regions').innerHTML = cards; this.$('continue-wrap').hidden = !o.hasSave;
    s.querySelectorAll('.region').forEach(b => b.onclick = () => { s.hidden = true; o.onNew(b.dataset.b); });
    this.$('btn-continue').onclick = () => { s.hidden = true; o.onContinue(); };
    this.$('start-help').onclick = () => this.showHelp();
    // shared worlds
    this.$('sh-region').innerHTML = BC.BIOME_LIST.map(b => `<option value="${b}">${this.esc(BC.BIOMES[b].name)}</option>`).join('');
    const sh = o.shared; if (sh) this.$('sh-name').value = sh.player;
    this.startOpts = o; this.renderKnownWorlds(o.known || []); this.loadDirectory();
    const read = action => ({ action, player: this.$('sh-name').value, world: this.$('sh-world').value.trim(), pin: this.$('sh-pin').value, region: this.$('sh-region').value, color: this.shColor });
    const go = action => { const v = read(action); this.$('sh-error').hidden = true; if (!v.world) return this.sharedError('Give the world a name.'); if (v.pin.length < 4) return this.sharedError('PIN needs at least 4 characters.'); this.sharedBusy(true); o.onShared(v); };
    const sw = this.$('sh-colors'); this.shColor = (sh && sh.color) || BC.PLAYER_COLORS[Math.floor(Math.random() * BC.PLAYER_COLORS.length)];
    sw.innerHTML = BC.PLAYER_COLORS.map(c => `<button type="button" data-c="${c}" style="background:${c}" aria-label="colour ${c}" class="${c === this.shColor ? 'on' : ''}"></button>`).join('');
    sw.querySelectorAll('button').forEach(b => b.onclick = () => { this.shColor = b.dataset.c; sw.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); });
    this.$('sh-create').onclick = () => go('create'); this.$('sh-join').onclick = () => go('join');
    this.$('sh-form').addEventListener('submit', e => e.preventDefault());
  }
  sharedBusy(b) { ['sh-create', 'sh-join'].forEach(id => this.$(id).disabled = b); this.$('start').querySelectorAll('.world-card .join').forEach(x => x.disabled = b); }
  renderKnownWorlds(list) {
    const wrap = this.$('known-worlds'), el = this.$('known-list'); wrap.hidden = !list.length; if (!list.length) return;
    el.innerHTML = list.map(k => { const id = k.world + '|' + k.player; const reg = k.region && BC.BIOMES[k.region] ? BC.BIOMES[k.region].short : ''; return `<div class="world-card"><b><i class="dot" style="background:${this.esc(k.color || '#888')}"></i>${this.esc(k.display || k.world)}</b><span>as ${this.esc(k.player)}${reg ? ' · ' + this.esc(reg) : ''} · last played ${this.esc(this.ago(k.last))}</span><div class="acts"><button class="join" data-id="${this.esc(id)}">Join</button><button class="forget" data-id="${this.esc(id)}" title="Forget on this device" aria-label="Forget">×</button></div></div>`; }).join('');
    el.querySelectorAll('.join').forEach(b => b.onclick = () => { const k = list.find(x => x.world + '|' + x.player === b.dataset.id); if (!k) return; this.shColor = k.color || this.shColor; this.sharedBusy(true); this.startOpts.onShared({ action: 'join', world: k.world, pin: k.pin, player: k.player, color: k.color }); });
    el.querySelectorAll('.forget').forEach(b => b.onclick = () => this.startOpts.onForget(b.dataset.id));
  }
  ago(t) { if (!t) return 'a while ago'; const m = Math.round((Date.now() - t) / 60000); if (m < 2) return 'just now'; if (m < 60) return m + ' min ago'; const h = Math.round(m / 60); if (h < 48) return h + ' h ago'; return Math.round(h / 24) + ' days ago'; }
  worldCardHtml(w, mode) {
    const on = (w.players || []).filter(p => p.online), off = (w.players || []).filter(p => !p.online);
    const onHtml = on.length ? `<span class="online"><i></i>Online now: ${this.esc(on.map(p => p.name).join(', '))}</span>` : `<span class="offline">Nobody online</span>`;
    const members = (w.players || []).length ? `<span>Players: ${this.esc((w.players || []).map(p => p.name).join(', '))}</span>` : '<span>No players yet</span>';
    const here = this.game.mode === 'shared' && this.game.net.creds && this.game.net.creds.world === w.id;
    const act = mode === 'ingame' ? (here ? '<em class="here">You are here</em>' : `<button class="join ghost" data-id="${this.esc(w.id)}" data-name="${this.esc(w.name)}">Switch</button>`) : `<button class="join ghost" data-id="${this.esc(w.id)}" data-name="${this.esc(w.name)}">Select</button>`;
    return `<div class="world-card ${on.length ? 'active' : ''}"><b>${this.esc(w.name)}</b>${onHtml}${members}<span>${this.esc(BC.BIOMES[w.region] ? BC.BIOMES[w.region].short : w.region)} · active ${this.esc(this.ago(Date.parse(w.updated_at)))}</span><div class="acts">${act}</div></div>`;
  }
  async loadDirectory() {
    const st = this.$('dir-status'), el = this.$('dir-list'); if (this.$('start').hidden) return;
    try { const list = await this.game.net.listWorlds(); const online = list.reduce((a, w) => a + (w.players || []).filter(p => p.online).length, 0); st.textContent = list.length ? `${list.length} world${list.length === 1 ? '' : 's'} · ${online} player${online === 1 ? '' : 's'} online · refreshes every 30 s` : ''; if (!list.length) { el.innerHTML = '<div class="empty">No shared worlds yet. Create the first one below.</div>'; return; }
      el.innerHTML = list.map(w => this.worldCardHtml(w, 'title')).join('');
      el.querySelectorAll('.join').forEach(b => b.onclick = () => this.selectWorld(b.dataset.name));
      let pre = null; try { pre = JSON.parse(sessionStorage.getItem('botanycraft_preselect')); sessionStorage.removeItem('botanycraft_preselect'); } catch (e) { } if (pre) this.selectWorld(pre.name);
    } catch (e) { st.textContent = 'could not load the list (' + this.game.net.friendly(e) + ')'; el.innerHTML = ''; }
    clearTimeout(this.dirTimer); this.dirTimer = setTimeout(() => this.loadDirectory(), 30000);
  }
  selectWorld(name) { this.$('sh-world').value = name; this.$('sh-pin').value = ''; const known = this.game.knownWorlds().find(k => (k.display || k.world) === name || BC.Net.slug(k.display || k.world) === BC.Net.slug(name)); if (known) { this.$('sh-pin').value = known.pin; if (!this.$('sh-name').value) this.$('sh-name').value = known.player; } this.$('sh-form').scrollIntoView({ behavior: 'smooth', block: 'center' }); (known ? this.$('sh-join') : this.$('sh-pin')).focus(); this.$('dir-status').textContent = known ? `"${name}" selected with your saved PIN: press Join` : `"${name}" selected: enter its PIN and press Join`; }
  async showDirectory() {
    this.openModal(`<button class="close" aria-label="Close">×</button><h2>Shared worlds</h2><p class="small" id="dir-modal-status">Loading…</p><div class="world-list dark" id="dir-modal-list"></div>`, 'journal');
    try { const list = await this.game.net.listWorlds(); const el = this.$('dir-modal-list'); if (!el) return; const online = list.reduce((a, w) => a + (w.players || []).filter(p => p.online).length, 0); this.$('dir-modal-status').textContent = `${list.length} world${list.length === 1 ? '' : 's'} · ${online} player${online === 1 ? '' : 's'} online now`; el.innerHTML = list.map(w => this.worldCardHtml(w, 'ingame')).join('');
      el.querySelectorAll('.join').forEach(b => b.onclick = () => { this.openModal(`<h2>Switch to "${this.esc(b.dataset.name)}"?</h2><p class="teach">Your progress here is saved first. You will land on the title screen with that world selected.</p><div class="menu"><button id="sw-yes" class="primary">Save and switch</button><button id="sw-no">Stay</button></div>`, 'journal'); this.$('sw-yes').onclick = () => this.game.switchWorld(b.dataset.id, b.dataset.name); this.$('sw-no').onclick = () => this.showDirectory(); });
    } catch (e) { const st = this.$('dir-modal-status'); if (st) st.textContent = 'Could not load the list: ' + this.game.net.friendly(e); }
  }
  sharedStatus(m) { const el = this.$('sh-status'); el.hidden = !m; el.textContent = m; if (!m) this.sharedBusy(false); }
  sharedError(m) { this.sharedBusy(false); this.$('start').hidden = false; this.$('hud').hidden = true; const el = this.$('sh-error'); el.hidden = false; el.textContent = m; el.scrollIntoView({ block: 'nearest' }); }
  updateShared() {
    const g = this.game; const el = this.$('shared-pill'); if (g.mode !== 'shared') { el.hidden = true; return; } el.hidden = false;
    const n = g.net; const names = (n.online || []).map(p => `<i style="background:${this.esc(p.color || '#888')}"></i>${this.esc(p.name)}${p.key === n.hostKey ? ' (host)' : ''}`);
    let line; if (n.live) line = names.length ? `Live · ${names.join(', ')}` : 'Live · waiting for presence…'; else if (n.status === 'connecting') line = 'Connecting to live session…'; else line = `Not live (cloud save only) · ${this.esc(n.lastError || 'offline')}`;
    el.className = 'pill ' + (n.live ? 'live' : n.status === 'connecting' ? 'wait' : 'down'); el.innerHTML = `<b>Shared: ${this.esc(n.creds.world)}</b><span>${line}</span>`;
  }
  hideStart() { this.$('start').hidden = true; this.$('hud').hidden = false; document.body.classList.toggle('touch', this.game.player.touch); }
};
