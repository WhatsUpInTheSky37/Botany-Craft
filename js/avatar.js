window.BC = window.BC || {};
// Modular voxel characters: a rig of pivots (legs, torso, arms, head, eyes), each one merged box geometry with baked per-face
// shading. One shared material, seven draw calls per character, procedural walk / idle / talk / work animation and blinking.
BC.Avatar = (function () {
  const HIP = 0.78, SHOULDER_Y = 1.34, NECK = 1.40, SHOULDER_X = 0.34;
  const MAT = new THREE.MeshLambertMaterial({ vertexColors: true });
  const tmpColor = new THREE.Color();
  function hexOf(c) { tmpColor.set(c); return tmpColor.clone(); }
  function shade(c, k) { const col = hexOf(c); col.r = Math.min(1, col.r * k); col.g = Math.min(1, col.g * k); col.b = Math.min(1, col.b * k); return '#' + col.getHexString(); }
  // a part accumulates boxes and becomes one mesh
  function Part() { this.geos = []; }
  Part.prototype.box = function (w, h, d, x, y, z, color, opts) {
    const g = new THREE.BoxGeometry(w, h, d); if (opts && opts.rz) g.rotateZ(opts.rz); if (opts && opts.rx) g.rotateX(opts.rx); if (opts && opts.ry) g.rotateY(opts.ry); g.translate(x, y, z);
    tmpColor.set(color); const n = g.attributes.position.count; const c = new Float32Array(n * 3); const nr = g.attributes.normal;
    for (let i = 0; i < n; i++) { const ny = nr.getY(i), nz = nr.getZ(i); const k = ny > 0.5 ? 1.0 : ny < -0.5 ? 0.6 : nz > 0.5 ? 0.9 : nz < -0.5 ? 0.72 : 0.8; c[i * 3] = tmpColor.r * k; c[i * 3 + 1] = tmpColor.g * k; c[i * 3 + 2] = tmpColor.b * k; }
    g.setAttribute('color', new THREE.BufferAttribute(c, 3)); this.geos.push(g); return this;
  };
  Part.prototype.mesh = function () {
    if (!this.geos.length) return null; let n = 0; this.geos.forEach(g => n += g.attributes.position.count); const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3); const idx = []; let off = 0;
    this.geos.forEach(g => { pos.set(g.attributes.position.array, off * 3); nor.set(g.attributes.normal.array, off * 3); col.set(g.attributes.color.array, off * 3); const gi = g.index.array; for (let i = 0; i < gi.length; i++) idx.push(gi[i] + off); off += g.attributes.position.count; g.dispose(); });
    const m = new THREE.BufferGeometry(); m.setAttribute('position', new THREE.BufferAttribute(pos, 3)); m.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); m.setAttribute('color', new THREE.BufferAttribute(col, 3)); m.setIndex(idx); m.computeBoundingSphere();
    const mesh = new THREE.Mesh(m, MAT); mesh.castShadow = !!BC.SHADOWS; return mesh;
  };
  const pick = (arr, h) => arr[Math.floor(h * arr.length) % arr.length];
  const H = (name, salt) => BC.util.hash2(BC.util.hashStr(name) & 0xffff, salt, 77);

  // ---------- looks per villager role; names add variety (skin, hair, height, beard) ----------
  const NPC_LOOKS = {
    nursery: { shirt: '#4a8a3a', pants: '#6a5a40', hat: 'straw', apron: '#c8b890', prop: 'trowel', hairStyles: ['short', 'bun', 'ponytail'], work: 'dig', collar: '#e8e0c8' },
    seed_saver: { shirt: '#a85a2a', pants: '#5a4a3a', hat: 'none', acc: 'satchel', prop: 'seeds', hairStyles: ['long', 'braid', 'short'], work: 'inspect' },
    soil_doctor: { shirt: '#f0f0f0', coat: '#f4f4f4', under: '#5a7a9a', pants: '#4a5a6a', glasses: true, prop: 'clipboard', hairStyles: ['short', 'bun', 'curly'], work: 'inspect' },
    beekeeper: { shirt: '#f8f8f0', pants: '#8a7a5a', hat: 'straw', gloves: '#e0b030', prop: 'jar', hairStyles: ['short', 'ponytail'], work: 'inspect' },
    rancher: { shirt: '#7a4a3a', pants: '#4a6a9a', hat: 'ranger', hatColor: '#5a4030', prop: 'rope', boots: '#3a2a1a', hairStyles: ['short', 'ponytail', 'messy'], work: 'dig' },
    farmhand: { shirt: '#e8e0c8', pants: '#4a6a9a', overalls: '#4a6a9a', hat: 'straw', prop: 'can', hairStyles: ['messy', 'short', 'braid'], work: 'water' },
    pest_scout: { shirt: '#3a7a6a', pants: '#5a5a4a', hat: 'cap', hatColor: '#3a5a4a', acc: 'binoculars', prop: 'net', hairStyles: ['short', 'ponytail'], work: 'survey' },
    carpenter: { shirt: '#5a5a6a', pants: '#6a4a2a', apron: '#8a6a3a', hat: 'cap', hatColor: '#c04a30', prop: 'hammer', hairStyles: ['short', 'messy', 'bun'], work: 'dig' },
    worm_farmer: { shirt: '#6a4a2a', pants: '#3a5a2a', hat: 'beanie', hatColor: '#3a5a2a', gloves: '#5a4a3a', prop: 'bucket', hairStyles: ['curly', 'short'], work: 'dig' },
    arborist: { shirt: '#2a5a3a', pants: '#6a4a2a', hat: 'cap', hatColor: '#e07020', prop: 'saw', hairStyles: ['short', 'ponytail'], work: 'survey', boots: '#3a2a1a' },
    herbalist: { shirt: '#8a5a8a', pants: '#5a4a6a', hat: 'wide', hatColor: '#6a3a7a', flower: '#f0a0c0', acc: 'satchel', prop: 'lavender', hairStyles: ['long', 'curly', 'braid'], work: 'inspect' },
    fisher: { shirt: '#3a6a8a', pants: '#4a4a3a', hat: 'beanie', hatColor: '#e8d090', prop: 'rod', hairStyles: ['short', 'messy'], work: 'survey', boots: '#2a2a2a' },
    almanac: { shirt: '#6a6a9a', pants: '#404060', glasses: true, scarf: '#c8a040', prop: 'book', hairStyles: ['bun', 'short'], hairColors: ['#d8d8d8', '#e8e0c8', '#9a9a9a'], work: 'write' },
    cook: { shirt: '#c0504a', pants: '#3a3a44', apron: '#f8f0e0', prop: 'basket', hairStyles: ['bun', 'short', 'curly'], work: 'dig', collar: '#f8f0e0' },
    teacher: { shirt: '#5a4a8a', pants: '#2a2a3a', glasses: true, prop: 'book', scarf: '#8a9ab0', hairStyles: ['bun', 'short', 'long'], work: 'write' },
    toolkeeper: { shirt: '#8a6a2a', pants: '#4a3a2a', apron: '#5a4a3a', prop: 'wrench', hairStyles: ['short', 'messy'], work: 'dig' },
    trader: { shirt: '#a06a3a', pants: '#6a4a2a', hat: 'cap', hatColor: '#6a4a2a', acc: 'backpack', prop: null, hairStyles: ['short', 'ponytail', 'curly'], work: 'inspect' },
    elder: { shirt: '#6a7a5a', pants: '#8a7a6a', glasses: true, scarf: '#4aa0a0', acc: 'satchel', prop: 'stick', hairStyles: ['short', 'bun', 'curly', 'bald'], hairColors: ['#e8e8e8', '#d0d0d0', '#f0ece0'], beardChance: 0.5, work: 'inspect', stoop: 0.12 },
  };
  const FEM = /^(Miss|Mrs\.|Nana|Granny|Auntie|Grandma|Dr\. Ruth|Dr\. Amara|Mabel|Dolores|Francine|Teresa|Opal|Verna|June|Lupe|Rosa|Birdie|Nia|Carmen|Marisol|Priya|Dee|Hazel|Earlene|Yolanda|Ines|Sage|Wren|Esperanza|Marguerite|Minnie|Rosalind|Odette|Pilar|Rosalie|Beulah|Ingrid)/;
  function npcLook(typeId, name) {
    const base = NPC_LOOKS[typeId] || NPC_LOOKS.nursery; const skins = BC.SKIN_COLORS || ['#e8b890']; const hairs = base.hairColors || (BC.HAIR_COLORS || ['#5a3a1a']);
    const fem = FEM.test(name); const beard = !fem && H(name, 5) < (base.beardChance || 0.22);
    return Object.assign({}, base, { skin: pick(skins, H(name, 1)), hair: pick(hairs, H(name, 2)), hairStyle: pick(base.hairStyles || ['short'], H(name, 3)), eye: pick(['#3a2a1a', '#2a4a7a', '#3a6a3a', '#5a3a1a', '#4a4a4a'], H(name, 4)), beard: beard ? (H(name, 6) < 0.5 ? 'full' : 'stache') : null, mouth: pick(['smile', 'smile', 'neutral', 'grin'], H(name, 7)), height: 0.94 + H(name, 8) * 0.12, headScale: 0.96 + H(name, 9) * 0.1, brows: H(name, 10) < 0.3 ? 'thick' : 'thin', freckles: H(name, 11) < 0.25 });
  }
  // player styles share the same builder: map the picker's look onto a full spec
  function playerLook(look, styleId) {
    if (styleId === 'npc') return look;
    const extra = { explorer: { hairStyle: 'short', boots: '#5a3a1a', belt: true }, botanist: { hairStyle: 'braid', apron: '#4a8a3a', flower: '#ffffff', prop: 'book', collar: '#f0ead8' }, ranger: { hairStyle: 'short', coat: '#4a6a3a', under: '#8a9a6a', boots: '#3a2a1a', belt: true }, researcher: { hairStyle: 'short', coat: '#f0f0f0', under: '#6a8aa0', prop: 'clipboard' }, custom: { hairStyle: 'short' } }[styleId] || {};
    return Object.assign({ skin: '#e8b890', hair: '#5a3a1a', shirt: '#5f9a3c', pants: '#b89a6a', hat: 'none', acc: 'none', eye: '#3a2a1a', mouth: 'smile', height: 1, headScale: 1 }, extra, look || {});
  }

  // ---------- geometry ----------
  function build(spec) {
    const s = Object.assign({ skin: '#e8b890', hair: '#5a3a1a', hairStyle: 'short', shirt: '#5f9a3c', pants: '#4a5a6a', boots: '#4a3a2a', hat: 'none', acc: 'none', eye: '#3a2a1a', mouth: 'smile', height: 1, headScale: 1, brows: 'thin' }, spec);
    const root = new THREE.Group(); const rig = { root, spec: s }; root.userData.rig = rig;
    const skinD = shade(s.skin, 0.88), hairD = shade(s.hair, 0.8), shirtD = shade(s.shirt, 0.82), pantsD = shade(s.pants, 0.85), boots = s.boots || '#4a3a2a', collar = s.collar || shade(s.shirt, 1.25);
    const sleeves = !s.shortSleeves;
    // legs: thigh, shin, boot with sole
    const leg = side => { const p = new Part(); p.box(0.2, 0.36, 0.22, 0, -0.18, 0, s.overalls || s.pants); p.box(0.18, 0.26, 0.2, 0, -0.48, 0, s.overalls ? shade(s.overalls, 0.9) : pantsD); p.box(0.2, 0.15, 0.27, 0, -0.685, 0.02, boots); p.box(0.21, 0.035, 0.28, 0, -0.775, 0.02, shade(boots, 0.6)); p.box(0.14, 0.04, 0.06, 0, -0.63, 0.14, shade(boots, 1.25)); const m = p.mesh(); const g = new THREE.Group(); g.position.set(side * 0.15, HIP, 0); g.add(m); return g; };
    rig.legL = leg(-1); rig.legR = leg(1); root.add(rig.legL, rig.legR);
    // everything above the hips bobs together
    rig.upper = new THREE.Group(); root.add(rig.upper);
    // torso: shirt, shoulders, collar, belt, buttons or apron / coat / overalls, then accessories worn on the body
    { const p = new Part(); const body = s.coat ? s.coat : s.shirt;
      p.box(0.52, 0.62, 0.3, 0, 0.31, 0, body); p.box(0.6, 0.1, 0.32, 0, 0.58, 0, shade(body, 0.92));
      if (s.coat) { p.box(0.14, 0.5, 0.02, 0, 0.3, 0.16, s.under || '#6a8aa0'); p.box(0.56, 0.22, 0.34, 0, -0.1, 0, shade(s.coat, 0.95)); p.box(0.1, 0.06, 0.08, -0.12, 0.6, 0.14, collar, { rz: 0.5 }); p.box(0.1, 0.06, 0.08, 0.12, 0.6, 0.14, collar, { rz: -0.5 }); }
      else { p.box(0.1, 0.06, 0.08, -0.1, 0.6, 0.14, collar, { rz: 0.4 }); p.box(0.1, 0.06, 0.08, 0.1, 0.6, 0.14, collar, { rz: -0.4 }); }
      if (s.overalls) { p.box(0.3, 0.26, 0.02, 0, 0.42, 0.16, s.overalls); p.box(0.05, 0.3, 0.02, -0.12, 0.6, 0.16, s.overalls); p.box(0.05, 0.3, 0.02, 0.12, 0.6, 0.16, s.overalls); p.box(0.12, 0.08, 0.02, 0, 0.4, 0.17, shade(s.overalls, 0.8)); p.box(0.04, 0.04, 0.02, -0.12, 0.56, 0.17, '#e0b030'); p.box(0.04, 0.04, 0.02, 0.12, 0.56, 0.17, '#e0b030'); p.box(0.54, 0.4, 0.32, 0, 0.1, 0, s.overalls); }
      else if (s.apron) { p.box(0.4, 0.48, 0.03, 0, 0.2, 0.17, s.apron); p.box(0.26, 0.16, 0.03, 0, 0.52, 0.17, s.apron); p.box(0.04, 0.12, 0.03, -0.1, 0.66, 0.16, shade(s.apron, 0.8)); p.box(0.04, 0.12, 0.03, 0.1, 0.66, 0.16, shade(s.apron, 0.8)); p.box(0.16, 0.1, 0.02, 0.0, 0.14, 0.19, shade(s.apron, 0.82)); p.box(0.4, 0.14, 0.03, 0, -0.1, 0.17, shade(s.apron, 0.95)); }
      else { for (let i = 0; i < 3; i++) p.box(0.035, 0.035, 0.02, 0, 0.16 + i * 0.15, 0.16, shade(body, 0.45)); p.box(0.14, 0.1, 0.02, 0.14, 0.38, 0.16, shade(body, 0.86)); }
      if (s.belt !== false && !s.overalls) { p.box(0.54, 0.07, 0.32, 0, 0.06, 0, '#4a2e18'); p.box(0.08, 0.06, 0.03, 0, 0.06, 0.165, '#d8b040'); }
      if (s.scarf) { p.box(0.58, 0.1, 0.38, 0, 0.6, 0, s.scarf); p.box(0.1, 0.3, 0.04, 0.14, 0.42, 0.18, shade(s.scarf, 0.9)); }
      if (s.acc === 'backpack') { p.box(0.42, 0.5, 0.22, 0, 0.3, -0.27, '#7a5a3a'); p.box(0.44, 0.14, 0.24, 0, 0.52, -0.27, '#5a4028'); p.box(0.2, 0.16, 0.06, 0, 0.18, -0.4, '#5a8a3a'); p.box(0.12, 0.12, 0.08, -0.26, 0.3, -0.27, '#6a4a2a'); p.box(0.12, 0.12, 0.08, 0.26, 0.3, -0.27, '#6a4a2a'); for (const sx of [-1, 1]) { p.box(0.06, 0.5, 0.04, sx * 0.15, 0.3, 0.165, '#5a4028'); p.box(0.06, 0.04, 0.34, sx * 0.15, 0.62, 0, '#5a4028'); } }
      if (s.acc === 'satchel') { p.box(0.05, 0.74, 0.04, 0.02, 0.32, 0.17, '#6a4a2a', { rz: 0.62 }); p.box(0.05, 0.74, 0.04, 0.02, 0.32, -0.17, '#6a4a2a', { rz: -0.62 }); p.box(0.24, 0.2, 0.12, -0.3, 0.06, -0.02, '#8a6a3a'); p.box(0.26, 0.08, 0.14, -0.3, 0.14, -0.02, '#6a4a2a'); p.box(0.06, 0.05, 0.02, -0.3, 0.05, 0.06, '#d8b040'); }
      if (s.acc === 'binoculars') { p.box(0.1, 0.1, 0.12, -0.06, 0.42, 0.2, '#1a1a1a'); p.box(0.1, 0.1, 0.12, 0.06, 0.42, 0.2, '#1a1a1a'); p.box(0.08, 0.04, 0.06, 0, 0.44, 0.2, '#3a3a3a'); p.box(0.03, 0.3, 0.02, -0.1, 0.58, 0.17, '#2a2a2a', { rz: 0.35 }); p.box(0.03, 0.3, 0.02, 0.1, 0.58, 0.17, '#2a2a2a', { rz: -0.35 }); }
      if (s.acc === 'leaf') { p.box(0.1, 0.14, 0.02, 0.15, 0.48, 0.165, '#5a9a3a'); p.box(0.02, 0.1, 0.02, 0.15, 0.46, 0.17, '#2a5a1a'); }
      rig.torso = new THREE.Group(); rig.torso.position.set(0, HIP, 0); rig.torso.add(p.mesh()); rig.upper.add(rig.torso); }
    // arms: upper arm, cuff, forearm, hand (or glove), optional held prop on the right
    const arm = (side, prop) => { const p = new Part(); const sleeve = s.coat || s.shirt; p.box(0.17, 0.3, 0.19, 0, -0.15, 0, sleeve); if (sleeves) { p.box(0.16, 0.28, 0.18, 0, -0.42, 0, shade(sleeve, 0.95)); p.box(0.18, 0.05, 0.2, 0, -0.56, 0, collar); } else p.box(0.15, 0.28, 0.17, 0, -0.42, 0, s.skin); p.box(0.15, 0.13, 0.16, 0, -0.63, 0, s.gloves || s.skin); if (prop) PROPS[prop] && PROPS[prop](p, side); const g = new THREE.Group(); g.position.set(side * SHOULDER_X, SHOULDER_Y, 0); g.add(p.mesh()); return g; };
    rig.armL = arm(-1, s.propLeft); rig.armR = arm(1, s.prop); rig.upper.add(rig.armL, rig.armR);
    // head: face, ears, hair, hat, glasses, beard; eyes are their own mesh so they can blink
    { const p = new Part(); const hc = s.hair;
      p.box(0.5, 0.5, 0.5, 0, 0.27, 0, s.skin); p.box(0.05, 0.12, 0.08, -0.27, 0.26, 0, skinD); p.box(0.05, 0.12, 0.08, 0.27, 0.26, 0, skinD);
      p.box(0.07, 0.09, 0.07, 0, 0.23, 0.27, skinD); // nose
      const bw = s.brows === 'thick' ? 0.04 : 0.025; p.box(0.13, bw, 0.02, -0.11, 0.395, 0.255, hairD, { rz: 0.1 }); p.box(0.13, bw, 0.02, 0.11, 0.395, 0.255, hairD, { rz: -0.1 });
      if (s.mouth === 'grin') { p.box(0.16, 0.05, 0.02, 0, 0.13, 0.255, '#5a2a2a'); p.box(0.12, 0.02, 0.02, 0, 0.145, 0.26, '#ffffff'); } else if (s.mouth === 'neutral') p.box(0.12, 0.025, 0.02, 0, 0.135, 0.255, '#a0503a'); else { p.box(0.12, 0.025, 0.02, 0, 0.125, 0.255, '#a0503a'); p.box(0.03, 0.03, 0.02, -0.075, 0.145, 0.255, '#a0503a'); p.box(0.03, 0.03, 0.02, 0.075, 0.145, 0.255, '#a0503a'); }
      if (s.freckles) { p.box(0.02, 0.02, 0.01, -0.16, 0.2, 0.255, shade(s.skin, 0.75)); p.box(0.02, 0.02, 0.01, 0.17, 0.19, 0.255, shade(s.skin, 0.75)); p.box(0.02, 0.02, 0.01, -0.19, 0.17, 0.255, shade(s.skin, 0.75)); }
      p.box(0.07, 0.03, 0.02, -0.11, 0.3, 0.254, shade(s.skin, 0.9)); p.box(0.07, 0.03, 0.02, 0.11, 0.3, 0.254, shade(s.skin, 0.9)); // lids
      if (s.beard === 'full') { p.box(0.46, 0.14, 0.1, 0, 0.06, 0.21, hc); p.box(0.3, 0.1, 0.1, 0, -0.02, 0.2, hc); p.box(0.2, 0.05, 0.03, 0, 0.17, 0.26, hc); } else if (s.beard === 'stache') p.box(0.2, 0.05, 0.03, 0, 0.17, 0.26, hc);
      const hat = s.hat && s.hat !== 'none' ? s.hat : null; const hs = s.hairStyle || 'short';
      if (hs !== 'bald') { if (!hat || hat === 'cap' || hat === 'wide' || hat === 'straw' || hat === 'ranger' || hat === 'beanie') { p.box(0.54, 0.22, 0.08, 0, 0.42, -0.23, hc); p.box(0.06, 0.18, 0.5, -0.27, 0.4, 0, hc); p.box(0.06, 0.18, 0.5, 0.27, 0.4, 0, hc); } if (!hat) p.box(0.54, 0.12, 0.54, 0, 0.56, 0, hc); if (!hat || hat !== 'hood') p.box(0.5, 0.07, 0.06, 0, 0.5, 0.25, hc);
        if (hs === 'messy' && !hat) { const r = BC.util.rng ? null : null; [[-0.18, 0.64, 0.1], [0.12, 0.66, -0.12], [0.2, 0.62, 0.14], [-0.08, 0.68, -0.2], [0.02, 0.66, 0.2]].forEach(([x, y, z]) => p.box(0.12, 0.12, 0.12, x, y, z, shade(hc, 1.05))); }
        if (hs === 'long') { p.box(0.56, 0.5, 0.1, 0, 0.18, -0.26, hc); p.box(0.1, 0.46, 0.3, -0.29, 0.2, -0.08, hc); p.box(0.1, 0.46, 0.3, 0.29, 0.2, -0.08, hc); }
        if (hs === 'ponytail') { p.box(0.14, 0.14, 0.14, 0, 0.44, -0.32, hc); p.box(0.12, 0.36, 0.12, 0, 0.2, -0.34, shade(hc, 0.95)); p.box(0.16, 0.04, 0.16, 0, 0.36, -0.32, '#c04a30'); }
        if (hs === 'braid') { p.box(0.11, 0.12, 0.11, -0.22, 0.3, 0.16, hc); p.box(0.1, 0.12, 0.1, -0.23, 0.18, 0.2, shade(hc, 0.92)); p.box(0.1, 0.12, 0.1, -0.22, 0.06, 0.22, hc); p.box(0.08, 0.08, 0.08, -0.22, -0.04, 0.23, shade(hc, 0.9)); p.box(0.12, 0.03, 0.12, -0.22, 0.0, 0.22, '#c04a30'); }
        if (hs === 'curly') { if (!hat) p.box(0.6, 0.2, 0.6, 0, 0.6, 0, hc); [[-0.3, 0.5, 0.2], [0.3, 0.5, 0.2], [-0.3, 0.5, -0.2], [0.3, 0.5, -0.2], [-0.2, 0.66, 0.28], [0.2, 0.66, 0.28], [0, 0.7, -0.3], [-0.31, 0.3, -0.1], [0.31, 0.3, -0.1]].forEach(([x, y, z]) => p.box(0.13, 0.13, 0.13, x, y, z, shade(hc, 1.04))); }
        if (hs === 'bun') { p.box(0.2, 0.18, 0.2, 0, hat ? 0.46 : 0.62, -0.18, hc); }
      } else if (!hat) { p.box(0.06, 0.12, 0.4, -0.27, 0.36, -0.03, hc); p.box(0.06, 0.12, 0.4, 0.27, 0.36, -0.03, hc); p.box(0.4, 0.1, 0.06, 0, 0.36, -0.24, hc); }
      const hatC = s.hatColor || (hat === 'straw' ? '#d8b868' : hat === 'ranger' ? '#4a6a3a' : hat === 'hood' ? shade(s.shirt, 0.75) : hat === 'cap' ? s.pants : '#6a3a7a');
      if (hat === 'straw' || hat === 'wide') { const bw2 = hat === 'wide' ? 1.0 : 0.96; p.box(bw2, 0.05, bw2, 0, 0.56, 0, hatC); p.box(0.48, hat === 'wide' ? 0.3 : 0.22, 0.48, 0, hat === 'wide' ? 0.72 : 0.68, 0, hatC); p.box(0.5, 0.05, 0.5, 0, 0.6, 0, shade(hatC, 0.6)); if (s.flower) { p.box(0.08, 0.08, 0.08, 0.26, 0.62, 0.22, s.flower); p.box(0.04, 0.04, 0.04, 0.26, 0.62, 0.27, '#f0d040'); p.box(0.08, 0.03, 0.06, 0.3, 0.6, 0.16, '#5a9a3a'); } }
      else if (hat === 'ranger') { p.box(0.84, 0.05, 0.84, 0, 0.56, 0, hatC); p.box(0.44, 0.26, 0.44, 0, 0.7, 0, hatC); p.box(0.36, 0.08, 0.36, 0, 0.86, 0, shade(hatC, 1.05)); p.box(0.46, 0.05, 0.46, 0, 0.61, 0, shade(hatC, 0.55)); p.box(0.08, 0.1, 0.02, 0, 0.72, 0.23, '#8ac060'); }
      else if (hat === 'cap') { p.box(0.52, 0.16, 0.52, 0, 0.6, 0, hatC); p.box(0.5, 0.04, 0.28, 0, 0.54, 0.38, shade(hatC, 0.85)); p.box(0.06, 0.06, 0.06, 0, 0.7, 0, shade(hatC, 0.7)); }
      else if (hat === 'beanie') { p.box(0.54, 0.22, 0.54, 0, 0.58, 0, hatC); p.box(0.56, 0.08, 0.56, 0, 0.49, 0, shade(hatC, 0.8)); p.box(0.12, 0.12, 0.12, 0, 0.74, 0, shade(hatC, 1.1)); }
      else if (hat === 'hood') { p.box(0.62, 0.1, 0.62, 0, 0.56, 0, hatC); p.box(0.62, 0.56, 0.1, 0, 0.26, -0.3, hatC); p.box(0.1, 0.56, 0.62, -0.3, 0.26, 0, hatC); p.box(0.1, 0.56, 0.62, 0.3, 0.26, 0, hatC); p.box(0.62, 0.08, 0.2, 0, 0.58, 0.26, hatC); }
      if (s.glasses || s.acc === 'glasses') { const fc = '#2a2a2a'; for (const sx of [-1, 1]) { p.box(0.16, 0.02, 0.02, sx * 0.11, 0.36, 0.27, fc); p.box(0.16, 0.02, 0.02, sx * 0.11, 0.24, 0.27, fc); p.box(0.02, 0.14, 0.02, sx * 0.18, 0.3, 0.27, fc); p.box(0.02, 0.14, 0.02, sx * 0.04, 0.3, 0.27, fc); p.box(0.02, 0.02, 0.3, sx * 0.26, 0.33, 0.12, fc); } p.box(0.06, 0.02, 0.02, 0, 0.32, 0.27, fc); }
      rig.head = new THREE.Group(); rig.head.position.set(0, NECK, 0); rig.head.scale.setScalar(s.headScale || 1); rig.head.add(p.mesh());
      const e = new Part(); for (const sx of [-1, 1]) { e.box(0.11, 0.1, 0.02, sx * 0.11, 0, 0.255, '#ffffff'); e.box(0.065, 0.08, 0.015, sx * 0.11, -0.005, 0.263, s.eye); e.box(0.03, 0.045, 0.01, sx * 0.11 + 0.005, -0.005, 0.27, '#101010'); e.box(0.02, 0.02, 0.01, sx * 0.11 - 0.02, 0.02, 0.275, '#ffffff'); }
      rig.eyes = e.mesh(); rig.eyes.position.y = 0.3; rig.eyes.castShadow = false; rig.head.add(rig.eyes); rig.upper.add(rig.head); }
    root.scale.setScalar(s.height || 1); if (s.stoop) rig.upper.rotation.x = s.stoop;
    rig.anim = { phase: 0, blink: 2 + Math.random() * 4, blinkT: 0, headYaw: 0, headYawT: 0, headTimer: 1 + Math.random() * 3, cur: {}, t: Math.random() * 10 };
    return rig;
  }
  // held props: built into the hand of the arm part (arm pivot at the shoulder; hand sits at y -0.63)
  const PROPS = {
    book: (p, side) => { p.box(0.2, 0.24, 0.05, 0.02, -0.7, 0.12, '#3a6a3a'); p.box(0.17, 0.21, 0.02, 0.02, -0.7, 0.15, '#f0ead8'); p.box(0.08, 0.1, 0.01, 0.02, -0.7, 0.16, '#8ac060'); },
    clipboard: (p) => { p.box(0.2, 0.26, 0.03, 0.02, -0.7, 0.12, '#8a6a3a'); p.box(0.17, 0.22, 0.01, 0.02, -0.71, 0.14, '#ffffff'); p.box(0.08, 0.03, 0.03, 0.02, -0.58, 0.12, '#9a9aa0'); },
    trowel: (p) => { p.box(0.04, 0.24, 0.04, 0, -0.7, 0.1, '#7a4a2a'); p.box(0.1, 0.16, 0.02, 0, -0.9, 0.1, '#b8b8c0'); },
    can: (p) => { p.box(0.22, 0.2, 0.18, 0.06, -0.84, 0.1, '#8a9aa6'); p.box(0.04, 0.04, 0.22, 0.06, -0.78, 0.28, '#8a9aa6', { rx: -0.6 }); p.box(0.16, 0.03, 0.03, 0.06, -0.72, 0.1, '#6a7a86'); p.box(0.08, 0.04, 0.08, 0.06, -0.76, 0.36, '#aab8c4'); },
    stick: (p) => { p.box(0.05, 1.1, 0.05, 0.1, -0.9, 0.08, '#7a5a3a'); p.box(0.09, 0.08, 0.09, 0.1, -0.36, 0.08, '#5a3a1a'); p.box(0.08, 0.02, 0.1, 0.13, -0.5, 0.1, '#5a9a3a'); },
    lavender: (p) => { for (let i = 0; i < 4; i++) { const x = -0.03 + i * 0.03, z = 0.1 + (i % 2) * 0.04; p.box(0.015, 0.3, 0.015, x, -0.74 + i * 0.02, z, '#5a8a4a'); p.box(0.04, 0.12, 0.04, x, -0.92 + i * 0.02, z, '#8a5ac8'); } },
    carrots: (p) => { for (let i = 0; i < 3; i++) { const x = -0.04 + i * 0.04; p.box(0.04, 0.22, 0.04, x, -0.66, 0.1, '#e8702a'); p.box(0.03, 0.12, 0.03, x, -0.5, 0.1, '#4a8a3a'); } },
    basket: (p) => { p.box(0.26, 0.16, 0.2, 0.08, -0.78, 0.1, '#b89a5a'); p.box(0.28, 0.03, 0.22, 0.08, -0.7, 0.1, '#9a7a3a'); p.box(0.04, 0.14, 0.04, 0.08, -0.62, 0.1, '#9a7a3a'); p.box(0.06, 0.06, 0.06, 0.02, -0.68, 0.1, '#d84040'); p.box(0.06, 0.06, 0.06, 0.14, -0.68, 0.1, '#f0c020'); },
    hammer: (p) => { p.box(0.04, 0.3, 0.04, 0, -0.76, 0.1, '#8a6a3a'); p.box(0.14, 0.07, 0.06, 0, -0.9, 0.1, '#5a5a60'); },
    wrench: (p) => { p.box(0.04, 0.26, 0.03, 0, -0.76, 0.1, '#8a8a90'); p.box(0.1, 0.06, 0.03, 0, -0.9, 0.1, '#8a8a90'); },
    saw: (p) => { p.box(0.05, 0.14, 0.04, 0, -0.68, 0.1, '#7a4a2a'); p.box(0.03, 0.34, 0.1, 0, -0.9, 0.1, '#b8b8c0'); },
    net: (p) => { p.box(0.04, 0.5, 0.04, 0, -0.84, 0.1, '#8a6a3a'); p.box(0.24, 0.24, 0.02, 0, -1.14, 0.1, '#e8e8f0'); },
    rod: (p) => { p.box(0.03, 0.9, 0.03, 0, -0.98, 0.1, '#6a4a2a', { rx: 0.3 }); p.box(0.06, 0.06, 0.04, 0, -0.66, 0.1, '#4a4a50'); },
    jar: (p) => { p.box(0.14, 0.16, 0.14, 0.04, -0.72, 0.12, '#e0a020'); p.box(0.14, 0.03, 0.14, 0.04, -0.63, 0.12, '#8a6a3a'); },
    bucket: (p) => { p.box(0.2, 0.2, 0.2, 0.06, -0.86, 0.1, '#6a6a70'); p.box(0.2, 0.02, 0.2, 0.06, -0.77, 0.1, '#3a2a1a'); },
    seeds: (p) => { p.box(0.12, 0.16, 0.02, 0.02, -0.7, 0.13, '#f0e0a0'); p.box(0.08, 0.06, 0.01, 0.02, -0.68, 0.14, '#d84040'); },
    rope: (p) => { p.box(0.16, 0.18, 0.08, 0.1, -0.7, 0.04, '#c8a060'); p.box(0.1, 0.18, 0.06, 0.1, -0.7, 0.05, '#8a6a3a'); },
  };

  // ---------- animation ----------
  const lerp = (a, b, k) => a + (b - a) * k;
  function animate(root, dt, st) {
    const rig = root.userData.rig; if (!rig) return; const a = rig.anim; a.t += dt; const t = a.t; st = st || {};
    const tgt = { legL: 0, legR: 0, armLx: 0, armLz: 0.04, armRx: 0, armRz: -0.04, torsoX: 0, torsoY: 0, headX: 0, headY: 0, upY: 0, rootZ: 0 };
    if (st.moving) { a.phase += dt * (6.5 + (st.speed || 1) * 3); const s = Math.sin(a.phase); tgt.legL = s * 0.6; tgt.legR = -s * 0.6; tgt.armLx = -s * 0.5; tgt.armRx = s * 0.5; tgt.torsoY = s * 0.06; tgt.upY = Math.abs(Math.cos(a.phase)) * 0.035; tgt.headX = 0.04; }
    else { tgt.upY = Math.sin(t * 1.9) * 0.012; tgt.armLz = 0.05 + Math.sin(t * 1.1) * 0.02; tgt.armRz = -0.05 - Math.sin(t * 1.1 + 1) * 0.02; tgt.rootZ = Math.sin(t * 0.45) * 0.015;
      a.headTimer -= dt; if (a.headTimer <= 0) { a.headTimer = 2 + Math.random() * 4; a.headYawT = (Math.random() - 0.5) * 0.9; } a.headYaw = lerp(a.headYaw, a.headYawT, Math.min(1, dt * 3)); tgt.headY = a.headYaw; }
    if (st.talking) { tgt.headX = Math.sin(t * 5.2) * 0.06; tgt.headY = Math.sin(t * 1.7) * 0.12; tgt.armRx = -0.7 + Math.sin(t * 4.1) * 0.3; tgt.armRz = -0.3; tgt.armLx = -0.2 + Math.sin(t * 3.3 + 1) * 0.15; }
    if (st.work) { const wt = st.workT || t;
      if (st.work === 'dig') { tgt.torsoX = 0.28 + Math.sin(wt * 6) * 0.06; tgt.armLx = -1.1 + Math.sin(wt * 6) * 0.5; tgt.armRx = -1.1 - Math.sin(wt * 6) * 0.5; tgt.headX = 0.3; }
      else if (st.work === 'inspect') { tgt.torsoX = 0.3; tgt.headX = 0.45 + Math.sin(wt * 1.5) * 0.05; tgt.armRx = -1.25; tgt.armRz = -0.2; tgt.armLx = -0.6; tgt.armLz = 0.3; }
      else if (st.work === 'survey') { tgt.headY = Math.sin(wt * 0.9) * 0.7; tgt.headX = -0.1; tgt.armRx = -1.95; tgt.armRz = -0.35; tgt.armLx = -0.3; }
      else if (st.work === 'water') { tgt.torsoX = 0.15; tgt.armRx = -0.95 + Math.sin(wt * 2) * 0.08; tgt.armRz = -0.55; tgt.headX = 0.35; tgt.armLx = -0.2; }
      else if (st.work === 'write') { tgt.torsoX = 0.18; tgt.headX = 0.4; tgt.armLx = -1.1; tgt.armLz = 0.4; tgt.armRx = -1.0 + Math.sin(wt * 7) * 0.06; tgt.armRz = -0.2 + Math.cos(wt * 7) * 0.05; }
    }
    const k = Math.min(1, dt * 9); const c = a.cur; for (const key in tgt) c[key] = lerp(c[key] === undefined ? tgt[key] : c[key], tgt[key], k);
    rig.legL.rotation.x = c.legL; rig.legR.rotation.x = c.legR; rig.armL.rotation.x = c.armLx; rig.armL.rotation.z = c.armLz; rig.armR.rotation.x = c.armRx; rig.armR.rotation.z = c.armRz;
    rig.torso.rotation.x = c.torsoX; rig.upper.rotation.y = c.torsoY; rig.upper.rotation.x = (rig.spec.stoop || 0) + c.torsoX * 0.5; rig.head.rotation.x = c.headX - c.torsoX * 0.4; rig.head.rotation.y = c.headY; rig.upper.position.y = c.upY; root.rotation.z = c.rootZ;
    // blink
    a.blink -= dt; if (a.blink <= 0) { a.blinkT = 0.13; a.blink = 2.5 + Math.random() * 4; } if (a.blinkT > 0) { a.blinkT -= dt; rig.eyes.scale.y = a.blinkT > 0 ? 0.12 : 1; } else if (rig.eyes.scale.y !== 1) rig.eyes.scale.y = 1;
  }
  return { build, animate, npcLook, playerLook, NPC_LOOKS, PROPS, MAT, Part, shade };
})();
