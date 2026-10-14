window.BC = window.BC || {};
// Pest infestations on planted crops, beneficial suppression, companion planting and controls.
BC.Pests = (function () {
  function candidates(def, biome) { const hostId = def.shape ? 'tree:' + def.id : def.id; return BC.PESTS.filter(ps => ps.biomes.includes(biome) && (ps.hosts.includes(hostId) || (ps.hosts.includes('*') && !def.shape))); }
  function nearby(world, p, r, pred) { let n = 0; world.plants.forEach(q => { if (q === p || q.wild) return; if (Math.abs(q.x - p.x) <= r && Math.abs(q.z - p.z) <= r && pred(q)) n++; }); return n; }
  function companionsNear(world, p) { return nearby(world, p, 2, q => { const d = BC.PLANT_BY_ID[q.id]; return d && d.companion && q.progress > 0.3; }); }
  function gearNear(world, p, special, r) { let n = 0; world.special.forEach((id, k) => { const b = BC.BLOCKS[id]; if (!b || b.special !== special) return; const c = world.coords(k); if (Math.abs(c[0] - p.x) <= r && Math.abs(c[2] - p.z) <= r) n++; }); return n; }
  function habitatNear(world, p) { return Math.min(3, gearNear(world, p, 'insect_hotel', 8) * 2 + gearNear(world, p, 'bat_house', 10)) + nearby(world, p, 6, q => { const d = BC.PLANT_BY_ID[q.id]; return d && d.habitat && q.progress >= 1; }) + Math.min(2, nearby(world, p, 6, q => { const d = BC.PLANT_BY_ID[q.id]; return d && d.pollinator && q.progress >= 1; }) / 4);
  }
  function beneficialsNear(game, p, pestId) { let n = 0; for (const e of game.animals.list) { const d = e.def; if (!d.insect) continue; if (d.eats && d.eats.includes(pestId) && (e.x - p.x - 0.5) ** 2 + (e.z - p.z - 0.5) ** 2 < 64) n++; } return n; }
  function predatorsNear(game, p, pestId) { let n = 0; for (const e of game.animals.list) { const d = e.def; const ps = BC.INSECT_BY_ID[pestId]; if (ps && ps.eaten_by && ps.eaten_by.includes(d.id) && (e.x - p.x - 0.5) ** 2 + (e.z - p.z - 0.5) ** 2 < 64) n++; } return n; }
  function tick(game, p, def, ev, dt) {
    const w = game.world;
    if (!p.pest) {
      if (p.covered || p.progress < 0.15) return;
      const biome = w.biomeAt(p.x, p.z); const cands = candidates(def, biome); if (!cands.length) return;
      const mono = nearby(w, p, 3, q => q.id === p.id); const comp = companionsNear(w, p); const hab = habitatNear(w, p);
      let rate = (1 / 900) * (1 + mono * 0.25) * Math.max(0.25, 1 - comp * 0.25) * Math.max(0.4, 1 - hab * 0.15);
      if (ev.chem && ev.chem.n > 0.95) rate *= 1.5; if (ev.score < 0.5) rate *= 1.6; rate *= game.growthMult > 1 ? game.growthMult : 1;
      if (Math.random() < rate * dt) {
        const weighted = []; cands.forEach(c => { const wgt = c.hosts.includes('*') ? 1 : 3; for (let i = 0; i < wgt; i++) weighted.push(c); });
        const ps = weighted[Math.floor(Math.random() * weighted.length)]; p.pest = { id: ps.id, level: 0.15, t: 0 }; w.markDirty(p.x, p.z);
        game.notify(p.owner, `${ps.name} on your ${game.plantName(p)}! Inspect it to learn the signs and what works.`, 'bad'); game.credit(p.owner, 'journal', 'insect:' + ps.id); game.credit(p.owner, 'pestsSeen', 1);
      }
      return;
    }
    const ps = BC.INSECT_BY_ID[p.pest.id]; if (!ps) { p.pest = null; return; }
    const ben = beneficialsNear(game, p, ps.id) + predatorsNear(game, p, ps.id); const comp = companionsNear(w, p);
    let d = 0.02 * (1 - comp * 0.15) - ben * 0.03; if (p.covered) d = -0.05;
    p.pest.level = BC.util.clamp(p.pest.level + d * dt * (game.growthMult > 1 ? game.growthMult : 1), 0, 1); p.pest.t += dt;
    if (ben > 0 && !p.pest.benCredited) { p.pest.benCredited = true; game.credit(p.owner, 'beneficialWin', 1); game.notify(p.owner, `Predators are working on the ${ps.name.toLowerCase()} in your ${game.plantName(p)}.`, 'good'); }
    p.health = Math.max(0, p.health - dt * 0.004 * p.pest.level * ps.severity * (game.growthMult > 1 ? game.growthMult : 1));
    if (p.pest.level <= 0.01) { p.pest = null; w.markDirty(p.x, p.z); game.notify(p.owner, `The pests on your ${game.plantName(p)} are gone.`, 'good'); }
  }
  // Treat a plant with an ingredient or practice. Returns a message; applies the effect.
  function treat(game, p, ingId) {
    const ps = p.pest ? BC.INSECT_BY_ID[p.pest.id] : null; const ing = BC.INGREDIENT_BY_ID[ingId];
    if (ingId === 'row_cover') { if (p.covered) { p.covered = false; game.give({ type: 'ingredient', id: 'row_cover', count: 1 }); return { ok: true, msg: 'Row cover removed. Bees can reach the flowers again.', keep: true }; } p.covered = true; return { ok: true, msg: 'Row cover on. Nothing can lay eggs on it now, but nothing can pollinate it either: take it off when it flowers.' }; }
    if (!ps) return { ok: false, msg: `No pests on this ${game.plantName(p)}. ${ing ? ing.name : ingId} is for treating an infestation.`, keep: true };
    if (!ps.controls.includes(ingId)) { const works = ps.controls.map(c => BC.INGREDIENT_BY_ID[c] ? BC.INGREDIENT_BY_ID[c].name : (BC.PRACTICES[c] || c).split(':')[0]).slice(0, 4).join(', '); return { ok: false, msg: `${ing ? ing.name : ingId} does little against ${ps.name.toLowerCase()}. What works: ${works}.`, keep: true }; }
    const strong = ['bt_spray', 'bt_tenebrionis', 'neem_oil', 'insecticidal_soap', 'horticultural_oil', 'iron_phosphate', 'nematodes', 'milky_spore', 'diatomaceous_earth'].includes(ingId);
    p.pest.level = Math.max(0, p.pest.level - (strong ? 0.7 : 0.4)); if (p.pest.level <= 0.05) { p.pest = null; }
    game.world.markDirty(p.x, p.z); game.credit(p.owner, 'pestsTreated', 1);
    return { ok: true, msg: p.pest ? `${ing.name} knocked the ${ps.name.toLowerCase()} back. Repeat in a few days or bring in their predators.` : `${ing.name} cleared the ${ps.name.toLowerCase()} from your ${game.plantName(p)}.` };
  }
  function handPick(game, p) { const ps = BC.INSECT_BY_ID[p.pest.id]; if (!ps.controls.includes('hand_pick')) return { ok: false, msg: `${ps.name} are too small or too many to pick by hand. ${BC.PRACTICES[ps.controls.find(c => BC.PRACTICES[c])] || 'Try a spray or a predator.'}` }; p.pest.level = Math.max(0, p.pest.level - 0.25); if (p.pest.level <= 0.05) p.pest = null; game.world.markDirty(p.x, p.z); game.credit(p.owner, 'pestsTreated', 1); return { ok: true, msg: p.pest ? `Picked off some ${ps.name.toLowerCase()}. Come back tomorrow morning for the rest.` : `Hand-picked the last of the ${ps.name.toLowerCase()}.` }; }
  function waterSpray(game, p) { const ps = BC.INSECT_BY_ID[p.pest.id]; if (!ps.controls.includes('water_spray') && !['aphid', 'spider_mite'].includes(ps.id)) return { ok: false, msg: `A jet of water does not bother ${ps.name.toLowerCase()}.` }; p.pest.level = Math.max(0, p.pest.level - 0.3); if (p.pest.level <= 0.05) p.pest = null; game.world.markDirty(p.x, p.z); game.credit(p.owner, 'pestsTreated', 1); return { ok: true, msg: `Blasted the ${ps.name.toLowerCase()} off with water. Most will not climb back.` }; }
  return { tick, treat, handPick, waterSpray, candidates };
})();
