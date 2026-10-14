window.BC = window.BC || {};
// Plant growth simulation: suitability from soil, pH, water, light and climate.
BC.Sim = (function () {
  const WATER_IDEAL = { low: [0.05, 0.45], med: [0.3, 0.8], high: [0.55, 1.0], aquatic: [0.9, 1.0] };
  function defFor(p) { return p.id.startsWith('tree:') ? BC.TREE_BY_ID[p.id.slice(5)] : BC.PLANT_BY_ID[p.id]; }
  function evaluate(world, p) {
    const def = defFor(p); const factors = []; const x = p.x, y = p.y, z = p.z;
    const isTree = p.id.startsWith('tree:');
    // ---- soil ----
    let soil = null, soilBlock = null; let soilKey = null;
    if (def.epiphyte || p.onBark) { let bark = false; for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const b = BC.BLOCKS[world.get(x + dx, y, z + dz)]; if (b && b.log) bark = true; } soilKey = bark ? 'bark' : null; }
    else { soilBlock = BC.BLOCKS[world.get(x, y - 1, z)]; soil = soilBlock && soilBlock.soil ? BC.SOILS[soilBlock.soil] : null; soilKey = soil ? soil.id : null; }
    let sScore, sMsg;
    if (!soilKey) { sScore = 0; sMsg = def.epiphyte ? 'No tree trunk to cling to. Epiphytes grow on bark, not soil.' : 'There is no soil under this plant.'; }
    else if (def.soils.includes(soilKey)) { sScore = 1; sMsg = `${soil ? soil.name : 'Tree bark'} suits it well.`; }
    else if (soilKey === 'compost') { sScore = 0.7; sMsg = 'Compost soil is forgiving, though not its native ground.'; }
    else if (soilKey === 'bark') { sScore = 0; sMsg = 'This plant needs soil, not a tree trunk.'; }
    else if (def.epiphyte) { sScore = 0.05; sMsg = 'Epiphytes rot in soil. Plant it against a tree trunk.'; }
    else { sScore = 0.2; sMsg = `${soil.name} is the wrong soil: it prefers ${def.soils.map(s => BC.SOILS[s] ? BC.SOILS[s].name.toLowerCase() : s).join(' or ')}.`; }
    factors.push({ key: 'soil', label: 'Soil', score: sScore, msg: sMsg });
    // ---- pH ----
    const ph = soil ? world.soilChem(x, z, soil).ph : (soilKey === 'bark' ? 5.5 : 6.5); let phScore, phMsg;
    if (ph >= def.ph[0] && ph <= def.ph[1]) { phScore = 1; phMsg = `pH ${ph.toFixed(1)} is in its range (${def.ph[0]} to ${def.ph[1]}).`; }
    else { const off = ph < def.ph[0] ? def.ph[0] - ph : ph - def.ph[1]; phScore = off < 0.6 ? 0.6 : off < 1.5 ? 0.3 : 0.08; phMsg = ph < def.ph[0] ? `pH ${ph.toFixed(1)} is too acidic; it wants ${def.ph[0]} to ${def.ph[1]}. Phosphorus and calcium are locked up in acid soil.` : `pH ${ph.toFixed(1)} is too alkaline; it wants ${def.ph[0]} to ${def.ph[1]}. Iron becomes unavailable and leaves yellow (chlorosis).`; }
    factors.push({ key: 'ph', label: 'Soil pH', score: phScore, msg: phMsg });
    // ---- water ----
    let m = world.moisture[x + z * world.W]; const inWater = world.get(x, y, z) === 15 || world.get(x, y - 1, z) === 15 || p.onBark && world.biomeAt(x, z) === 'rainforest';
    let nearWater = false; for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) if (world.get(x + dx, y - 1, z + dz) === 15 || world.get(x + dx, y, z + dz) === 15) nearWater = true;
    if (inWater) m = 1; else if (nearWater) m = Math.max(m, 0.8);
    const [lo, hi] = WATER_IDEAL[def.water]; let wScore, wMsg;
    if (def.water === 'aquatic') { if (inWater) { wScore = 1; wMsg = 'Standing water: just right for an aquatic plant.'; } else if (m > 0.85) { wScore = 0.7; wMsg = 'Saturated soil is acceptable, though it would prefer shallow water.'; } else { wScore = 0.1; wMsg = 'Far too dry. This plant lives in water or saturated mud.'; } }
    else if (m >= lo && m <= hi) { wScore = 1; wMsg = `Moisture ${Math.round(m * 100)}%: good.`; }
    else if (m < lo) { wScore = m < lo * 0.5 ? 0.1 : 0.45; wMsg = `Too dry (${Math.round(m * 100)}%). Water it, or plant it nearer water.`; }
    else { wScore = m > 0.95 && def.water === 'low' ? 0.05 : 0.4; wMsg = `Too wet (${Math.round(m * 100)}%). Roots need air; soggy soil rots them.`; }
    factors.push({ key: 'water', label: 'Water', score: wScore, msg: wMsg });
    // ---- light ----
    const light = world.lightAt(x, y, z); let lScore, lMsg;
    if (def.sun === 'full') { lScore = light > 0.8 ? 1 : light > 0.5 ? 0.55 : 0.2; lMsg = light > 0.8 ? 'Full sun: perfect.' : 'Too shady. It needs full sun; move it away from tree canopy.'; }
    else if (def.sun === 'part') { lScore = light > 0.35 ? 1 : 0.4; lMsg = light > 0.35 ? 'Light level suits it.' : 'Deep shade is a little dark for it.'; }
    else { lScore = light < 0.65 ? 1 : 0.55; lMsg = light < 0.65 ? 'Dappled shade: just what a forest-floor plant wants.' : 'Full sun scorches this shade plant. Plant under trees.'; }
    factors.push({ key: 'light', label: 'Light', score: lScore, msg: lMsg });
    // ---- climate ----
    // ---- nutrients ----
    const chem = world.soilChem(x, z, soil); const needs = def.needs || (def.hungry ? [0.6, 0.4, 0.5] : def.nFix ? [0.1, 0.3, 0.3] : [0.3, 0.25, 0.3]);
    const avail = [chem.n, chem.p, chem.k]; const names = ['nitrogen', 'phosphorus', 'potassium']; const symptoms = ['older leaves yellow from the tips, growth stalls', 'purple undersides, stunted roots, few flowers', 'brown scorched leaf edges, weak stems']; const fixes = ['bean pods, nettle tea, fish emulsion, manure, legumes nearby', 'bone meal, rock phosphate, buckwheat cuttings, bat guano', 'comfrey tea, wood ash, kelp meal, banana peels'];
    let nScore = 1, nMsg = 'Nutrients: enough N, P and K for this plant.'; let worst = -1, worstRatio = 1;
    for (let k = 0; k < 3; k++) { const ratio = Math.min(1, avail[k] / Math.max(0.05, needs[k] * 0.7)); if (ratio < worstRatio) { worstRatio = ratio; worst = k; } }
    if (worstRatio < 0.95 && worst >= 0) { nScore = Math.max(0.1, worstRatio); nMsg = `Short of ${names[worst]}: ${symptoms[worst]}. Feed the soil with ${fixes[worst]}.`; }
    if (!def.epiphyte && !(def.water === 'aquatic')) factors.push({ key: 'nutrients', label: 'Nutrients', score: nScore, msg: nMsg });
    const biome = world.biomeAt(x, z); let cScore, cMsg;
    if (def.biomes.includes(biome)) { cScore = 1; cMsg = `${BC.BIOMES[biome].short} is its home climate.`; }
    else if ((BC.CLIMATE_NEIGHBORS[def.biomes[0]] || []).includes(biome)) { cScore = 0.55; cMsg = `${BC.BIOMES[biome].short} is a stretch; it grows slowly outside its native ${BC.BIOMES[def.biomes[0]].short.toLowerCase()}.`; }
    else { cScore = 0.08; const home = BC.BIOMES[def.biomes[0]]; const cold = BC.BIOMES[biome].temp === 'cold' || (BC.BIOMES[biome].temp === 'cool' && home.temp === 'hot'); cMsg = cold ? `Wrong climate: frost kills a ${home.short.toLowerCase()} plant here.` : `Wrong climate: a ${home.short.toLowerCase()} plant cannot take this heat and drought.`; }
    factors.push({ key: 'climate', label: 'Climate', score: cScore, msg: cMsg });
    const min = Math.min(...factors.map(f => f.score)); const mean = factors.reduce((a, f) => a + f.score, 0) / factors.length;
    const score = min * 0.6 + mean * 0.4;
    return { score, factors, def, soil, moisture: m, light, biome, chem };
  }
  function tick(game, dt) {
    const w = game.world;
    // moisture relaxes toward biome base; rain raises it
    const rain = game.weather.raining; const n = w.moisture.length;
    for (let i = 0; i < n; i += 1) { const base = BC.BIOMES[BC.BIOME_LIST[w.biome[i]]].baseMoisture; let m = w.moisture[i]; if (rain) m += dt * 0.03 * (BC.BIOMES[BC.BIOME_LIST[w.biome[i]]].rainChance + 0.1); const rate = m > base ? 0.01 * (1 - 0.6 * w.mulch[i]) : 0.01; m += (base - m) * Math.min(1, dt * rate); w.moisture[i] = BC.util.clamp(m, 0, 1); }
    game.soilAcc = (game.soilAcc || 0) + dt; if (game.soilAcc >= 10) { const T = game.soilAcc; game.soilAcc = 0; for (let i = 0; i < n; i++) { const nb = BC.SOIL_NUTR[BC.BIOMES[BC.BIOME_LIST[w.biome[i]]].soil]; for (let k = 0; k < 3; k++) { const v = w.nutr[i * 3 + k]; if (v < nb[k]) w.nutr[i * 3 + k] = Math.min(nb[k], v + T * 0.0004 * (1 + w.om[i])); } if (w.mulch[i] > 0) w.mulch[i] = Math.max(0, w.mulch[i] - T * 0.0005); } }
    const toRemove = [];
    w.plants.forEach(p => {
      const def = defFor(p); if (!def) { toRemove.push(p); return; }
      if (p.wild) { if (p.progress < 1) { p.progress = Math.min(1, p.progress + dt / 90); if (p.progress >= 1) w.markDirty(p.x, p.z); } return; }
      if (p.withered) return;
      const ev = evaluate(w, p); p.lastScore = ev.score;
      const before = BC.Mesher.plantTile(p);
      if (ev.score < 0.3) { p.health -= dt / 60; if (p.health <= 0) { p.withered = true; w.markDirty(p.x, p.z); game.notify(p.owner, `Your ${game.plantName(p)} withered. Inspect it to learn why.`, 'bad'); return; } }
      else if (p.health < 1) p.health = Math.min(1, p.health + dt / 120);
      // soil draw-down and nitrogen fixing
      if (!def.epiphyte) { const ci = w.col(p.x, p.z); const needs = def.needs || (def.hungry ? [0.6, 0.4, 0.5] : def.nFix ? [0.1, 0.3, 0.3] : [0.3, 0.25, 0.3]); if (p.progress < 1) for (let k = 0; k < 3; k++) w.nutr[ci * 3 + k] = Math.max(0, w.nutr[ci * 3 + k] - needs[k] * dt * ev.score * game.growthMult / def.grow * 0.8); if (def.nFix) w.nutr[ci * 3] = Math.min(1, w.nutr[ci * 3] + dt * 0.0015 * game.growthMult); }
      // pests
      BC.Pests.tick(game, p, def, ev, dt);
      const pestDrag = p.pest ? Math.min(0.8, p.pest.level * BC.INSECT_BY_ID[p.pest.id].severity) : 0;
      if (p.progress < 1) {
        const stage0 = p.progress; p.progress = Math.min(1, p.progress + dt * ev.score * (1 - pestDrag) * game.growthMult / def.grow);
        if (p.progress >= 1 && stage0 < 1) {
          if (p.id.startsWith('tree:')) { const t = def; w.removePlant(p); if (w.buildTree(t, p.x, p.y, p.z, false)) { game.credit(p.owner, 'treeGrown', true, true); game.notify(p.owner, `Your ${t.name} sapling grew into a tree!`, 'good'); game.credit(p.owner, 'journal', 'tree:' + t.id); } return; }
          game.credit(p.owner, 'matured', 1); game.notify(p.owner, `Your ${def.name} is mature. Harvest it with your hand.`, 'good');
          if (def.id === 'blueberry' && ev.soil && ev.soil.ph < 5.3 && ev.score > 0.7) game.credit(p.owner, 'blueberryAcid', true, true);
          if (def.id === 'prickly_pear' && ev.soil && ev.soil.id === 'aridisol') game.credit(p.owner, 'cactusInSand', true, true);
        }
      }
      if (BC.Mesher.plantTile(p) !== before) w.markDirty(p.x, p.z);
    });
    toRemove.forEach(p => w.removePlant(p));
  }
  return { evaluate, tick, defFor, WATER_IDEAL };
})();
