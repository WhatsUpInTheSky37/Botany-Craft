window.BC = window.BC || {};
// Articulated voxel animals: body, head, legs, wings and tail as pivots of merged box geometry, with species anatomy
// (snouts, ears, antlers, beaks, fins, shells, claws) and procedural gaits. Used up close; the old merged mesh stays for distance.
BC.Critters = (function () {
  const Part = () => new BC.Avatar.Part(); const shade = BC.Avatar.shade;
  const BIRDS = new Set(['chickadee', 'hummingbird', 'toucan', 'scarlet_macaw', 'wild_turkey', 'roadrunner', 'heron']);
  const INSECTS = new Set(['bumblebee', 'monarch', 'dragonfly']); const FISH = new Set(['bluegill', 'catfish', 'trout', 'piranha']);
  const HOPPERS = new Set(['cottontail', 'hare', 'jackrabbit']); const FROGS = new Set(['frog', 'dart_frog']); const SHELLS = new Set(['box_turtle', 'desert_tortoise']); const BATS = new Set(['little_brown_bat', 'long_nosed_bat']);
  const GRAZERS = new Set(['deer', 'moose', 'bison', 'pronghorn', 'caribou', 'capybara', 'prairie_dog', 'cottontail', 'hare', 'jackrabbit', 'wild_turkey']);
  function kindOf(id) { if (BIRDS.has(id)) return 'bird'; if (INSECTS.has(id)) return 'insect'; if (FISH.has(id)) return 'fish'; if (HOPPERS.has(id)) return 'hopper'; if (FROGS.has(id)) return 'frog'; if (SHELLS.has(id)) return 'shell'; if (BATS.has(id)) return 'bat'; if (id === 'earthworm') return 'worm'; if (id === 'blue_crab') return 'crab'; if (id === 'alligator' || id === 'lizard') return 'reptile'; return 'quad'; }
  const pivot = (parent, x, y, z, part) => { const g = new THREE.Group(); g.position.set(x, y, z); const m = part.mesh(); if (m) g.add(m); parent.add(g); return g; };
  const eyes = (p, hw, hh, hl, y, z, sideways) => { for (const sx of [-1, 1]) { if (sideways) { p.box(0.02, hh * 0.26, hw * 0.26, sx * hw * 0.5, y, z, '#ffffff'); p.box(0.015, hh * 0.16, hw * 0.14, sx * hw * 0.505, y, z + 0.005, '#101010'); } else { p.box(hw * 0.24, hh * 0.24, 0.02, sx * hw * 0.3, y, z, '#ffffff'); p.box(hw * 0.13, hh * 0.16, 0.015, sx * hw * 0.3 + sx * 0.005, y, z + 0.006, '#101010'); p.box(0.015, 0.015, 0.012, sx * hw * 0.3 - 0.01, y + hh * 0.06, z + 0.01, '#ffffff'); } } };

  function build(def) {
    const id = def.id, kind = kindOf(id); const [bw, bh, bl] = def.body; const [hw, hh, hl] = def.head; const legH = def.legH; const c = def.colors; const s = def.scale || 1;
    const root = new THREE.Group(); const rig = { root, kind, id, legs: [], wings: [], tail: null, head: null, t: Math.random() * 10, graze: 0, grazeT: 2 + Math.random() * 5, eyesT: 0 };
    const bodyC = c.body, headC = c.head, legC = c.legs, acc = c.accent; const dark = '#1a1a1a';
    const body = Part(); const y0 = legH;
    if (kind === 'quad' || kind === 'hopper' || kind === 'reptile') {
      const rounded = kind === 'hopper' || id === 'black_bear' || id === 'capybara' || id === 'beaver';
      body.box(bw, bh * 0.82, bl * 0.96, 0, y0 + bh * 0.45, 0, bodyC); body.box(bw * 0.86, bh * 0.3, bl * 0.72, 0, y0 + bh * 0.85, -bl * 0.04, shade(bodyC, 1.06)); body.box(bw * 0.92, bh * 0.6, bl * 0.26, 0, y0 + bh * 0.42, bl * 0.4, shade(bodyC, 1.02));
      body.box(bw * 0.78, bh * 0.22, bl * 0.7, 0, y0 + bh * 0.11, 0, ['deer', 'pronghorn', 'caribou', 'red_fox', 'cottontail', 'hare', 'jackrabbit'].includes(id) ? '#efe6d6' : shade(bodyC, 0.92)); // belly
      if (id === 'bison') { body.box(bw * 1.05, bh * 0.5, bl * 0.35, 0, y0 + bh * 1.05, bl * 0.12, shade(bodyC, 0.85)); body.box(bw * 0.7, bh * 0.4, bl * 0.2, 0, y0 + bh * 0.1, bl * 0.42, shade(bodyC, 0.7)); }
      if (id === 'pronghorn') { body.box(bw * 1.01, bh * 0.2, bl * 0.12, 0, y0 + bh * 0.5, bl * 0.3, '#f4ecdc'); body.box(bw * 1.01, bh * 0.2, bl * 0.12, 0, y0 + bh * 0.5, bl * 0.05, '#f4ecdc'); }
      if (id === 'caribou') body.box(bw * 1.02, bh * 0.5, bl * 0.3, 0, y0 + bh * 0.4, bl * 0.42, '#e8e2d4');
      if (id === 'red_fox') body.box(bw * 0.7, bh * 0.5, bl * 0.2, 0, y0 + bh * 0.35, bl * 0.45, '#f4ece0');
      if (kind === 'reptile') { body.box(bw * 0.6, bh * 0.3, bl * 0.9, 0, y0 + bh * 0.95, 0, shade(bodyC, 0.8)); for (let i = 0; i < 4; i++) body.box(bw * 0.25, bh * 0.25, 0.08, 0, y0 + bh * 1.1, -bl * 0.35 + i * bl * 0.22, shade(bodyC, 0.7)); }
      // neck
      const neckL = ['deer', 'pronghorn', 'caribou', 'moose'].includes(id) ? hl * 0.9 : hl * 0.5; if (kind !== 'reptile') body.box(bw * 0.5, bh * 0.55, neckL, 0, y0 + bh * 0.95, bl / 2 + neckL * 0.25, bodyC, { rx: -0.55 });
      // legs
      const lw = Math.min(0.14, bw * 0.3) * (kind === 'reptile' ? 1.2 : 1);
      [[-1, 1], [1, 1], [-1, -1], [1, -1]].forEach(([sx, sz], i) => { const p = Part(); const big = kind === 'hopper' && sz < 0; const LW = lw * (big ? 1.7 : 1); const LH = legH * (big ? 1.15 : 1); const spread = kind === 'reptile' ? 0.08 : 0;
        p.box(LW * 1.2, LH * 0.55, LW * 1.35, spread * sx, -LH * 0.25, big ? -LW * 0.3 : 0, legC); p.box(LW * 0.9, LH * 0.52, LW, spread * sx * 1.6, -LH * 0.7, 0, shade(legC, 0.92)); p.box(LW * 1.05, LH * 0.14, LW * 1.2 + (big ? LW : 0), spread * sx * 1.6, -LH * 0.96, big ? LW * 0.5 : 0.01, ['deer', 'moose', 'bison', 'pronghorn', 'caribou'].includes(id) ? '#2a2018' : shade(legC, 0.6));
        if (id === 'red_fox') p.box(LW * 1.0, LH * 0.3, LW * 1.1, 0, -LH * 0.85, 0, '#2a2018');
        const leg = pivot(root, sx * (bw / 2 - lw * 0.4), y0 + bh * 0.2, sz * (bl / 2 - lw * 0.9) * (big ? 0.95 : 1), p); rig.legs.push(leg); });
      // tail
      { const p = Part();
        if (id === 'red_fox') { p.box(0.14, 0.14, 0.3, 0, -0.02, -0.15, bodyC); p.box(0.18, 0.18, 0.34, 0, -0.1, -0.42, bodyC); p.box(0.14, 0.14, 0.18, 0, -0.16, -0.66, '#f4ece0'); }
        else if (id === 'beaver') { p.box(0.3, 0.05, 0.42, 0, -0.06, -0.24, '#2a2018'); }
        else if (id === 'black_bear' || id === 'capybara' || id === 'prairie_dog' || id === 'sloth') { p.box(0.1, 0.1, 0.1, 0, -0.03, -0.05, shade(bodyC, 0.9)); }
        else if (kind === 'hopper') { p.box(0.13, 0.13, 0.13, 0, 0, -0.05, '#ffffff'); }
        else if (kind === 'reptile') { p.box(bw * 0.6, bh * 0.6, bl * 0.6, 0, 0, -bl * 0.3, bodyC); p.box(bw * 0.35, bh * 0.4, bl * 0.6, 0, 0, -bl * 0.85, shade(bodyC, 0.95)); }
        else { p.box(0.09, 0.22, 0.07, 0, -0.1, -0.02, bodyC); p.box(0.07, 0.2, 0.03, 0, -0.1, -0.06, '#f4ece0'); if (id === 'bison' || id === 'moose') p.box(0.08, 0.1, 0.08, 0, -0.26, -0.02, shade(bodyC, 0.6)); }
        rig.tail = pivot(root, 0, y0 + bh * 0.8, -bl / 2 + 0.02, p); }
      // head
      { const p = Part(); const neckTop = y0 + bh * 0.95 + (kind === 'reptile' ? -bh * 0.4 : neckL * 0.5); const hz = bl / 2 + (kind === 'reptile' ? 0 : neckL * 0.45);
        const HL = kind === 'reptile' ? hl * 1.6 : hl; p.box(hw, hh, HL * 0.7, 0, hh * 0.1, HL * 0.3, headC); p.box(hw * 0.62, hh * 0.55, HL * 0.55, 0, -hh * 0.02, HL * 0.8, id === 'black_bear' ? '#8a6a4a' : id === 'red_fox' || id === 'deer' ? shade(headC, 1.12) : shade(headC, 1.05));
        p.box(hw * 0.3, hh * 0.18, 0.05, 0, hh * 0.08, HL * 1.07, dark); if (kind !== 'reptile') p.box(hw * 0.5, hh * 0.1, HL * 0.3, 0, -hh * 0.28, HL * 0.82, shade(headC, 0.8)); // nose, jaw line
        eyes(p, hw, hh, HL, hh * 0.32, HL * 0.3, true);
        if (kind === 'reptile') { for (let i = 0; i < 4; i++) p.box(0.03, 0.05, 0.03, (i % 2 ? 1 : -1) * hw * 0.25, -hh * 0.3, HL * (0.6 + i * 0.12), '#ffffff'); }
        if (id !== 'capybara' && kind !== 'reptile') { const eh = kind === 'hopper' ? hh * 1.5 : hh * 0.5, ew = hw * (kind === 'hopper' ? 0.28 : 0.3); for (const sx of [-1, 1]) { p.box(ew, eh, hw * 0.15, sx * hw * 0.34, hh * 0.5 + eh * 0.5, 0.02, id === 'red_fox' ? shade(headC, 0.9) : headC, { rz: sx * -0.15 }); p.box(ew * 0.5, eh * 0.7, 0.02, sx * hw * 0.34, hh * 0.5 + eh * 0.5, 0.02 + hw * 0.08, '#e8a0a0', { rz: sx * -0.15 }); if (id === 'red_fox') p.box(ew, eh * 0.3, hw * 0.16, sx * hw * 0.37, hh * 0.5 + eh * 0.9, 0.02, dark, { rz: sx * -0.15 }); } }
        if (def.antlers) { const ac = acc; for (const sx of [-1, 1]) { if (id === 'moose') { p.box(0.5, 0.05, 0.34, sx * 0.45, hh * 1.05, 0, ac); p.box(0.08, 0.14, 0.08, sx * 0.3, hh * 1.1, 0.1, ac); p.box(0.06, 0.1, 0.06, sx * 0.6, hh * 1.12, 0.08, ac); } else { p.box(0.05, 0.3, 0.05, sx * 0.14, hh * 1.05, 0, ac, { rz: sx * -0.3 }); p.box(0.05, 0.22, 0.05, sx * 0.3, hh * 1.3, 0.02, ac, { rz: sx * -0.9 }); p.box(0.04, 0.16, 0.04, sx * 0.2, hh * 1.4, -0.03, ac, { rz: sx * 0.4 }); p.box(0.04, 0.14, 0.04, sx * 0.4, hh * 1.5, 0.04, ac, { rz: sx * -0.5 }); } } }
        if (id === 'bison') p.box(hw * 1.1, hh * 0.5, HL * 0.5, 0, hh * 0.5, HL * 0.2, shade(headC, 0.8)); if (id === 'beaver') p.box(hw * 0.2, hh * 0.18, 0.03, 0, -hh * 0.2, HL * 1.07, '#f0b040');
        rig.head = pivot(root, 0, neckTop, hz, p); }
    }
    else if (kind === 'bird') {
      const tall = id === 'heron'; body.box(bw, bh, bl, 0, y0 + bh / 2, 0, bodyC); body.box(bw * 0.85, bh * 0.6, bl * 0.5, 0, y0 + bh * 0.35, bl * 0.3, id === 'chickadee' ? '#f4ecdc' : id === 'scarlet_macaw' ? '#f0c030' : shade(bodyC, 1.08)); body.box(bw * 0.8, bh * 0.35, bl * 0.6, 0, y0 + bh * 0.95, -bl * 0.1, shade(bodyC, 0.9));
      if (tall) body.box(bw * 0.3, bh * 1.6, bw * 0.3, 0, y0 + bh + bh * 0.6, bl * 0.3, bodyC);
      // legs
      for (const sx of [-1, 1]) { const p = Part(); const lh = legH || 0.08; p.box(0.04, lh, 0.04, 0, -lh / 2, 0, acc === bodyC ? '#8a7a4a' : (id === 'heron' ? '#4a4a3a' : '#8a7a4a')); p.box(0.1, 0.02, 0.12, 0, -lh, 0.03, '#8a7a4a'); rig.legs.push(pivot(root, sx * bw * 0.25, y0, bl * 0.05, p)); }
      // wings
      for (const sx of [-1, 1]) { const p = Part(); const wl = bl * 0.75; p.box(wl, bh * 0.12, bl * 0.6, sx * wl * 0.5, 0, -bl * 0.05, id === 'scarlet_macaw' ? '#2a60c0' : shade(bodyC, 0.85)); p.box(wl * 0.6, bh * 0.1, bl * 0.25, sx * wl * 0.6, 0.005, -bl * 0.3, id === 'scarlet_macaw' ? '#e8c030' : shade(bodyC, 0.7)); rig.wings.push(pivot(root, sx * bw * 0.5, y0 + bh * 0.85, 0, p)); }
      // tail
      { const p = Part(); if (id === 'wild_turkey') { for (let i = -2; i <= 2; i++) p.box(bw * 0.3, bh * 0.9, 0.04, 0, bh * 0.3, -bl * 0.2, i % 2 ? shade(bodyC, 0.8) : '#c8a060', { rx: -0.9, ry: i * 0.35 }); } else { const tl = id === 'scarlet_macaw' || id === 'roadrunner' ? bl * 1.1 : bl * 0.5; p.box(bw * 0.7, bh * 0.15, tl, 0, 0, -tl * 0.5, id === 'scarlet_macaw' ? '#d03030' : shade(bodyC, 0.85), { rx: id === 'roadrunner' ? -0.6 : 0.35 }); } rig.tail = pivot(root, 0, y0 + bh * 0.6, -bl / 2, p); }
      // head
      { const p = Part(); const ny = tall ? bh * 1.9 : bh * 0.95; p.box(hw, hh, hl, 0, hh * 0.3, hl * 0.2, headC); eyes(p, hw, hh, hl, hh * 0.45, hl * 0.25, true);
        const beakL = id === 'toucan' ? hl * 1.6 : id === 'hummingbird' ? hl * 2.2 : id === 'heron' ? hl * 1.4 : hl * 0.7, beakH = id === 'toucan' ? hh * 0.7 : hh * 0.3; p.box(hw * (id === 'hummingbird' ? 0.15 : 0.4), beakH, beakL, 0, hh * 0.2, hl * 0.7 + beakL * 0.5, acc); if (id === 'toucan') p.box(hw * 0.4, beakH * 0.5, beakL * 0.4, 0, hh * 0.35, hl * 0.7 + beakL * 0.8, '#f0c030');
        if (id === 'chickadee') { p.box(hw * 1.02, hh * 0.45, hl * 0.9, 0, hh * 0.6, hl * 0.2, '#1a1a1a'); p.box(hw * 0.6, hh * 0.25, 0.03, 0, hh * 0.05, hl * 0.65, '#1a1a1a'); }
        if (id === 'wild_turkey') { p.box(hw * 0.2, hh * 0.5, hw * 0.2, 0, -hh * 0.1, hl * 0.6, '#d03030'); p.box(hw * 0.9, hh * 0.3, hl * 0.8, 0, hh * 0.5, hl * 0.1, '#6a8ab0'); }
        if (id === 'roadrunner' || id === 'scarlet_macaw') { p.box(hw * 0.5, hh * 0.45, hl * 0.5, 0, hh * 0.85, -hl * 0.1, id === 'roadrunner' ? shade(headC, 0.7) : '#d03030', { rx: 0.5 }); }
        if (id === 'hummingbird') p.box(hw * 0.7, hh * 0.3, hl * 0.3, 0, -hh * 0.1, hl * 0.6, '#d03060');
        rig.head = pivot(root, 0, y0 + ny, bl / 2 + (tall ? bl * 0.2 : 0), p); }
    }
    else if (kind === 'insect') {
      if (id === 'bumblebee') { body.box(bw, bh, bl, 0, y0 + bh / 2, 0, bodyC); body.box(bw * 1.03, bh * 1.03, bl * 0.18, 0, y0 + bh / 2, -bl * 0.1, acc); body.box(bw * 1.03, bh * 1.03, bl * 0.14, 0, y0 + bh / 2, bl * 0.2, acc); body.box(bw * 0.5, bh * 0.5, bl * 0.25, 0, y0 + bh * 0.4, -bl * 0.55, acc); body.box(bw * 0.06, bh * 0.06, bl * 0.3, 0, y0 + bh * 0.3, -bl * 0.75, dark); for (let i = 0; i < 3; i++) for (const sx of [-1, 1]) body.box(0.02, bh * 0.5, 0.02, sx * bw * 0.45, y0 + bh * 0.1, -bl * 0.25 + i * bl * 0.25, dark, { rz: sx * 0.5 }); }
      else if (id === 'monarch') { body.box(bw, bh, bl, 0, y0 + bh / 2, 0, bodyC); body.box(bw * 1.2, bh * 1.2, bl * 0.2, 0, y0 + bh / 2, bl * 0.45, dark); for (const sx of [-1, 1]) body.box(0.012, 0.012, bl * 0.4, sx * 0.03, y0 + bh * 0.8, bl * 0.65, dark, { ry: sx * 0.4 }); }
      else { body.box(bw, bh, bl * 0.4, 0, y0 + bh / 2, bl * 0.2, shade(bodyC, 1.1)); body.box(bw * 0.6, bh * 0.6, bl * 0.8, 0, y0 + bh / 2, -bl * 0.4, bodyC); for (let i = 0; i < 4; i++) body.box(bw * 0.62, bh * 0.62, 0.012, 0, y0 + bh / 2, -bl * 0.1 - i * bl * 0.17, shade(bodyC, 0.6)); }
      // wings
      const wingPairs = id === 'dragonfly' ? [[-1, 0.08], [1, 0.08], [-1, -0.08], [1, -0.08]] : [[-1, 0], [1, 0]];
      wingPairs.forEach(([sx, dz]) => { const p = Part(); if (id === 'monarch') { const wl = bl * 1.1; p.box(wl, 0.012, bl * 0.7, sx * wl * 0.5, 0, bl * 0.1 + dz, '#f08a1a'); p.box(wl * 0.8, 0.012, bl * 0.5, sx * wl * 0.5, 0.001, -bl * 0.3 + dz, '#f0a030'); p.box(wl * 1.02, 0.013, 0.025, sx * wl * 0.5, 0.002, bl * 0.45 + dz, dark); p.box(0.025, 0.013, bl * 1.2, sx * wl * 1.0, 0.002, -bl * 0.1 + dz, dark); for (let i = 0; i < 3; i++) p.box(0.03, 0.014, 0.03, sx * (wl * 0.5 + i * wl * 0.2), 0.003, bl * 0.2 - i * 0.03 + dz, '#ffffff'); } else { const wl = id === 'dragonfly' ? bl * 0.9 : bl * 0.7; p.box(wl, 0.01, bl * (id === 'dragonfly' ? 0.16 : 0.45), sx * wl * 0.5, 0, dz, '#dde8f0'); } rig.wings.push(pivot(root, sx * bw * 0.4, y0 + bh * 0.95, 0, p)); });
      { const p = Part(); if (id !== 'monarch') { p.box(hw, hh, hl, 0, 0, hl * 0.4, headC); eyes(p, hw, hh, hl, hh * 0.2, hl * 0.3, true); } rig.head = pivot(root, 0, y0 + bh * 0.55, bl / 2, p); }
    }
    else if (kind === 'fish') {
      body.box(bw, bh, bl * 0.8, 0, y0 + bh / 2, 0.05, bodyC); body.box(bw * 0.7, bh * 0.75, bl * 0.3, 0, y0 + bh / 2, bl * 0.5, shade(bodyC, 1.05)); body.box(bw * 0.8, bh * 0.4, bl * 0.6, 0, y0 + bh * 0.3, 0, shade(bodyC, 1.25)); body.box(0.02, bh * 0.5, bl * 0.4, 0, y0 + bh * 1.2, -bl * 0.05, acc); for (const sx of [-1, 1]) body.box(0.02, bh * 0.3, bl * 0.25, sx * bw * 0.5, y0 + bh * 0.35, bl * 0.15, acc, { ry: sx * 0.5 });
      body.box(bw * 0.3, bh * 0.1, 0.03, 0, y0 + bh * 0.25, bl * 0.65, dark); eyes(body, hw, hh, hl, y0 + bh * 0.65, bl * 0.45, true);
      if (id === 'catfish') for (const sx of [-1, 1]) body.box(0.015, 0.015, bl * 0.4, sx * bw * 0.3, y0 + bh * 0.3, bl * 0.75, dark, { ry: sx * 0.6 });
      { const p = Part(); p.box(0.03, bh * 0.9, bl * 0.35, 0, 0, -bl * 0.18, acc); p.box(0.03, bh * 1.2, bl * 0.12, 0, 0, -bl * 0.4, acc); rig.tail = pivot(root, 0, y0 + bh / 2, -bl * 0.35, p); }
    }
    else if (kind === 'frog') {
      body.box(bw, bh * 0.7, bl, 0, y0 + bh * 0.35, 0, bodyC); body.box(bw * 0.8, bh * 0.4, bl * 0.5, 0, y0 + bh * 0.75, bl * 0.1, shade(bodyC, 1.05)); body.box(bw * 0.7, bh * 0.25, bl * 0.8, 0, y0 + bh * 0.12, 0, shade(bodyC, 1.3));
      for (const sx of [-1, 1]) { body.box(bw * 0.28, bh * 0.35, bl * 0.25, sx * bw * 0.32, y0 + bh * 0.95, bl * 0.3, bodyC); body.box(bw * 0.18, bh * 0.2, 0.02, sx * bw * 0.32, y0 + bh * 1.0, bl * 0.43, '#f0d040'); body.box(bw * 0.08, bh * 0.16, 0.015, sx * bw * 0.32, y0 + bh * 1.0, bl * 0.44, dark); }
      body.box(bw * 0.6, 0.02, 0.02, 0, y0 + bh * 0.5, bl * 0.5, shade(bodyC, 0.6));
      for (const sx of [-1, 1]) { const p = Part(); p.box(bw * 0.3, bh * 0.5, bl * 0.45, 0, 0, -bl * 0.1, shade(bodyC, 0.9)); p.box(bw * 0.22, bh * 0.2, bl * 0.5, 0, -bh * 0.3, bl * 0.15, shade(bodyC, 0.85)); rig.legs.push(pivot(root, sx * bw * 0.55, y0 + bh * 0.3, -bl * 0.25, p)); const f = Part(); f.box(bw * 0.15, bh * 0.4, bw * 0.15, 0, -bh * 0.2, 0, shade(bodyC, 0.9)); rig.legs.push(pivot(root, sx * bw * 0.4, y0 + bh * 0.3, bl * 0.3, f)); }
      if (id === 'dart_frog') { for (let i = 0; i < 5; i++) body.box(bw * 0.18, bh * 0.1, bl * 0.14, (i % 2 ? 1 : -1) * bw * 0.2, y0 + bh * 0.72 + 0.005, -bl * 0.3 + i * bl * 0.14, dark); }
    }
    else if (kind === 'shell') {
      body.box(bw, bh * 0.35, bl, 0, y0 + bh * 0.18, 0, shade(bodyC, 1.25)); body.box(bw * 1.08, bh * 0.4, bl * 1.06, 0, y0 + bh * 0.5, 0, bodyC); body.box(bw * 0.8, bh * 0.3, bl * 0.8, 0, y0 + bh * 0.85, 0, shade(bodyC, 0.95)); body.box(bw * 0.45, bh * 0.2, bl * 0.45, 0, y0 + bh * 1.08, 0, shade(bodyC, 0.9));
      for (let i = 0; i < 6; i++) body.box(bw * 0.22, 0.01, bl * 0.2, (i % 3 - 1) * bw * 0.3, y0 + bh * 1.0 + (i < 3 ? 0.005 : 0), (i < 3 ? 1 : -1) * bl * 0.22, acc);
      [[-1, 1], [1, 1], [-1, -1], [1, -1]].forEach(([sx, sz]) => { const p = Part(); p.box(bw * 0.22, legH * 1.1, bw * 0.22, 0, -legH * 0.5, 0, legC); rig.legs.push(pivot(root, sx * bw * 0.4, y0 + bh * 0.1, sz * bl * 0.35, p)); });
      { const p = Part(); p.box(hw * 0.7, hh * 0.7, hl * 0.8, 0, 0, hl * 0.4, headC); p.box(hw, hh, hl * 0.7, 0, hh * 0.1, hl * 0.95, headC); eyes(p, hw, hh, hl, hh * 0.3, hl * 0.9, true); p.box(hw * 0.4, hh * 0.1, 0.02, 0, -hh * 0.1, hl * 1.3, dark); rig.head = pivot(root, 0, y0 + bh * 0.35, bl * 0.45, p); }
      { const p = Part(); p.box(bw * 0.12, bh * 0.15, bl * 0.2, 0, 0, -bl * 0.08, headC); rig.tail = pivot(root, 0, y0 + bh * 0.25, -bl * 0.5, p); }
    }
    else if (kind === 'bat') {
      body.box(bw, bh, bl, 0, y0 + bh / 2, 0, bodyC); body.box(bw * 0.7, bh * 0.6, bl * 0.4, 0, y0 + bh * 0.3, bl * 0.1, shade(bodyC, 1.15));
      for (const sx of [-1, 1]) { const p = Part(); const wl = bl * 1.6; p.box(wl, 0.012, bl * 0.9, sx * wl * 0.5, 0, -bl * 0.15, '#2a2228'); p.box(0.02, 0.02, bl * 0.9, sx * wl * 0.4, 0.003, -bl * 0.15, '#4a3a40'); p.box(0.02, 0.02, bl * 0.8, sx * wl * 0.75, 0.003, -bl * 0.25, '#4a3a40'); rig.wings.push(pivot(root, sx * bw * 0.5, y0 + bh * 0.8, 0, p)); }
      { const p = Part(); p.box(hw, hh, hl, 0, hh * 0.2, hl * 0.3, headC); eyes(p, hw, hh, hl, hh * 0.35, hl * 0.6, false); p.box(hw * 0.3, hh * 0.2, 0.03, 0, hh * 0.05, hl * 0.82, '#e8a0a0'); for (const sx of [-1, 1]) { p.box(hw * 0.3, hh * 0.9, hw * 0.12, sx * hw * 0.3, hh * 0.95, 0, headC); p.box(hw * 0.15, hh * 0.6, 0.015, sx * hw * 0.3, hh * 0.95, hw * 0.07, '#e8a0a0'); } rig.head = pivot(root, 0, y0 + bh * 0.6, bl / 2, p); }
    }
    else if (kind === 'worm') { for (let i = 0; i < 6; i++) body.box(bw * (1 - Math.abs(i - 2.5) * 0.12), bh * (1 - Math.abs(i - 2.5) * 0.12), bl / 6 * 0.95, 0, y0 + bh / 2, -bl / 2 + bl / 12 + i * bl / 6, i === 1 ? shade(bodyC, 1.2) : i % 2 ? shade(bodyC, 0.92) : bodyC); }
    else if (kind === 'crab') {
      body.box(bw, bh, bl, 0, y0 + bh / 2, 0, bodyC); body.box(bw * 0.8, bh * 0.3, bl * 0.8, 0, y0 + bh * 1.05, 0, shade(bodyC, 0.9)); for (const sx of [-1, 1]) { body.box(0.02, bh * 0.6, 0.02, sx * bw * 0.25, y0 + bh * 1.3, bl * 0.4, dark); body.box(0.04, 0.04, 0.04, sx * bw * 0.25, y0 + bh * 1.6, bl * 0.4, dark); for (let i = 0; i < 3; i++) body.box(bw * 0.5, 0.025, 0.025, sx * bw * 0.7, y0 + bh * 0.3, -bl * 0.3 + i * bl * 0.3, legC, { rz: sx * -0.6 }); }
      for (const sx of [-1, 1]) { const p = Part(); p.box(bw * 0.2, bh * 0.3, bl * 0.4, 0, 0, bl * 0.2, legC); p.box(bw * 0.3, bh * 0.45, bl * 0.35, 0, 0, bl * 0.55, acc); p.box(bw * 0.12, bh * 0.15, bl * 0.3, sx * bw * 0.1, 0, bl * 0.85, acc, { ry: sx * 0.3 }); rig.wings.push(pivot(root, sx * bw * 0.45, y0 + bh * 0.4, bl * 0.4, p)); }
    }
    const bm = body.mesh(); if (bm) root.add(bm); root.scale.setScalar(s); rig.body = bm;
    root.traverse(o => { if (o.isMesh) o.castShadow = !!BC.SHADOWS; });
    return rig;
  }

  function animate(rig, dt, st) {
    rig.t += dt; const t = rig.t; const k = rig.kind; const moving = !!st.moving; const sp = st.speed || 1;
    if (k === 'quad' || k === 'reptile' || k === 'shell') { const w = k === 'shell' ? 2.5 : 7 * sp; const a = k === 'shell' ? 0.3 : 0.5; rig.legs.forEach((l, i) => { const ph = (i === 0 || i === 3) ? 0 : Math.PI; l.rotation.x += ((moving ? Math.sin(t * w + ph) * a : 0) - l.rotation.x) * Math.min(1, dt * 10); });
      if (rig.head) { rig.grazeT -= dt; if (rig.grazeT <= 0) { rig.graze = rig.graze > 0 ? 0 : (GRAZERS.has(rig.id) && !moving ? 0.55 : 0.15); rig.grazeT = rig.graze > 0.3 ? 2 + Math.random() * 3 : 3 + Math.random() * 5; } const target = moving ? Math.sin(t * 7 * sp) * 0.05 : rig.graze + Math.sin(t * 1.3) * 0.03; rig.head.rotation.x += (target - rig.head.rotation.x) * Math.min(1, dt * 3); rig.head.rotation.y += ((moving ? 0 : Math.sin(t * 0.7) * 0.25) - rig.head.rotation.y) * Math.min(1, dt * 2); }
      if (rig.tail) { rig.tail.rotation.z = Math.sin(t * (moving ? 6 : 2.2)) * (rig.id === 'red_fox' ? 0.35 : 0.2); rig.tail.rotation.x = k === 'reptile' ? 0 : Math.sin(t * 1.7) * 0.1; if (k === 'reptile') rig.tail.rotation.y = Math.sin(t * (moving ? 5 : 1.5)) * 0.3; }
      if (rig.body && k === 'quad') rig.body.position.y = Math.sin(t * 2.1) * 0.01; }
    else if (k === 'hopper') { const hop = st.hop || 0; rig.legs.forEach((l, i) => { const back = i >= 2; l.rotation.x += (((moving ? (back ? -hop * 2.2 : hop * 1.5) : 0)) - l.rotation.x) * Math.min(1, dt * 12); }); if (rig.head) { rig.head.rotation.x += ((moving ? -0.15 : Math.sin(t * 1.1) * 0.08 + (Math.sin(t * 0.37) > 0.8 ? 0.5 : 0)) - rig.head.rotation.x) * Math.min(1, dt * 4); rig.head.rotation.y = Math.sin(t * 0.9) * 0.2; } }
    else if (k === 'bird') { const flying = st.flying; rig.wings.forEach((wg, i) => { const sx = i === 0 ? -1 : 1; const target = flying ? Math.sin(t * 16) * 0.75 * -sx : -sx * 1.25; wg.rotation.z += (target - wg.rotation.z) * Math.min(1, dt * (flying ? 30 : 8)); }); rig.legs.forEach((l, i) => { l.rotation.x += ((moving && !flying ? Math.sin(t * 9 + i * Math.PI) * 0.6 : (flying ? 0.9 : 0)) - l.rotation.x) * Math.min(1, dt * 10); });
      if (rig.head) { rig.head.rotation.x = moving && !flying ? Math.sin(t * 9) * 0.12 : Math.sin(t * 1.4) * 0.05; rig.head.rotation.y += (((Math.floor(t * 0.6) % 3 === 0) ? 0.6 : (Math.floor(t * 0.6) % 3 === 1 ? -0.5 : 0)) - rig.head.rotation.y) * Math.min(1, dt * 6); } if (rig.tail) rig.tail.rotation.x = Math.sin(t * 2.3) * 0.12; }
    else if (k === 'insect') { rig.wings.forEach((wg, i) => { const sx = i % 2 === 0 ? -1 : 1; wg.rotation.z = Math.sin(t * (rig.id === 'monarch' ? 9 : 45) + (i > 1 ? 1 : 0)) * (rig.id === 'monarch' ? 0.9 : 0.5) * -sx; }); }
    else if (k === 'fish') { if (rig.tail) rig.tail.rotation.y = Math.sin(t * (moving ? 7 : 3)) * 0.5; rig.root.rotation.z = Math.sin(t * 1.3) * 0.05; }
    else if (k === 'frog') { const hop = st.hop || 0; rig.legs.forEach((l, i) => { const back = i % 2 === 0; l.rotation.x += (((moving ? (back ? -hop * 2.5 : hop * 1.2) : 0)) - l.rotation.x) * Math.min(1, dt * 12); }); }
    else if (k === 'bat') { rig.wings.forEach((wg, i) => { const sx = i === 0 ? -1 : 1; wg.rotation.z = Math.sin(t * 14) * 0.8 * -sx; }); }
    else if (k === 'crab') { rig.wings.forEach((cl, i) => { cl.rotation.y += ((Math.sin(t * 1.5 + i) * 0.25) - cl.rotation.y) * Math.min(1, dt * 5); }); rig.root.rotation.z = moving ? Math.sin(t * 10) * 0.05 : 0; }
    else if (k === 'worm') { rig.root.rotation.y += Math.sin(t * 3) * dt * 0.3; }
    if (rig.body && (k === 'bird' || k === 'hopper') && !moving) rig.body.position.y = Math.sin(t * 2.4) * 0.008;
  }
  return { build, animate, kindOf };
})();
