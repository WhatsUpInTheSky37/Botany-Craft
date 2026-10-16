window.BC = window.BC || {};
// Landmarks hidden in the world: a scale copy of the Giza pyramid complex in the desert and Machu Picchu on a mountain ridge in the north.
// Built on their own pass right after the terrain, so villages, trees and streams go around them.
BC.WONDERS = [
  { id: 'giza', name: 'Giza Pyramid Complex', sci: 'Giza Plateau, Egypt · about 2560 to 2500 BC', tile: 'limestone', region: 'desert', radius: 64,
    hint: 'Somewhere in the far desert, where the dunes go flat. Climb a cactus hill and look for a square shape that is too straight to be natural.',
    teach: 'Three pyramids of the Fourth Dynasty kings Khufu, Khafre and Menkaure, built here at one tenth scale. The Great Pyramid of Khufu was the tallest building on Earth for 3,800 years: 2.3 million limestone blocks, laid so level that the base is off by less than 2 cm. None of it would exist without the Nile: every summer the river flooded and left a layer of black silt (the Egyptians called their country Kemet, the black land). That silt grew the wheat, barley, onions, garlic, lentils and lettuce that fed the builders, who were paid in bread and beer, not slaves, and who worked in the flood season when the fields were under water.',
    facts: ['Khafre\'s pyramid looks tallest because it stands on higher ground and keeps some of its smooth white Tura limestone casing at the top; every pyramid once gleamed white like that.', 'The Great Sphinx was carved from one knoll of bedrock left in a quarry; it has the body of a lion and the face of a king, and it faces the sunrise.', 'The builders\' town south-east of the plateau has bakeries that could turn out thousands of loaves a day, and cattle bones from herds driven in from the delta.', 'Find the entrance low on the north face of the biggest pyramid: a passage climbs to a chamber in the heart of it.', 'The small pyramids beside Khufu\'s and Menkaure\'s are for queens; the rows of flat benches (mastabas) are the tombs of nobles who wanted to lie near the king.'] },
  { id: 'machu_picchu', name: 'Machu Picchu', sci: 'Cusco Region, Peru · about AD 1450', tile: 'inca', region: 'boreal', radius: 56,
    hint: 'In the cold north a ridge rises far above everything else, a sharp peak at its end like a raised finger. The city is in the saddle below the peak.',
    teach: 'An Inca royal estate on a ridge 2,430 m above the Urubamba river, built for the emperor Pachacuti and abandoned a century later. About 60% of the construction is underground: foundations and drainage. The famous terraces (andenes) are soil engineering. Each one is a layered filter: topsoil carried up from the valley, then sandy soil, then gravel, then broken rock, behind a stone wall, so the heaviest rains on Earth drain through instead of washing the hillside away. The terraces also face the sun and store its heat in the stone, making warm pockets where maize, potatoes, quinoa and coca could grow a thousand metres higher than usual.',
    facts: ['The walls are dry stone: granite blocks cut so exactly that no mortar was needed and a knife blade cannot enter the joints. They have ridden out five centuries of earthquakes by rocking and settling back.', 'The Temple of the Sun is a curved tower with a window that catches the first sunrise of the June solstice; the Intihuatana stone on the highest point was a sun-tracking instrument.', 'Sixteen fountains carry spring water down a stair of stone channels through the city, past the emperor\'s own door first.', 'The sharp peak to the north is Huayna Picchu (young peak); a stair climbs its face to a temple at the top. The ridge itself is Machu Picchu (old peak).', 'The site was never found by the Spanish. Local farmers were growing crops on the terraces when Hiram Bingham was led there in 1911.'] },
  { id: 'atlantis', name: 'Atlantis, the Ring City', sci: 'Plato, Timaeus and Critias · about 360 BC', tile: 'ore_gold', region: 'the open sea', radius: 60,
    hint: 'Sail out from the coast and follow the edge of the sea until you find a bay walled in rings: water inside land inside water, with a white bridge running to a temple at the heart.',
    teach: 'Plato told the story in two dialogues around 360 BC: an island empire beyond the Pillars of Heracles, 9,000 years before his day, whose capital was built in rings. Poseidon cut the hill where his mortal wife Cleito lived into three rings of water and two of land; the kings bridged them, tunnelled ship canals through the land rings and sheathed each ring in metal, brass outside, tin in the middle and red-glowing orichalcum around the citadel. At the centre stood the temple of Poseidon, clad in silver with golden pinnacles, beside a hot spring and a cold one, with a racecourse a stadion wide running round the outer ring. The Atlanteans grew greedy and warlike, Athens defeated them, and in a single day and night of earthquakes and floods the island sank. Plato meant it as a lesson about pride, not a map, which is why nobody has found it. The rings, the bridge, the metal walls and the drowning are built here as he described them.',
    facts: ['Plato is the only ancient source; every later Atlantis is a retelling of his. His pupil Aristotle is said to have remarked that the man who invented it also made it disappear.', 'The Bronze Age eruption of Thera (Santorini) around 1600 BC buried a Minoan town under ash and sent tsunamis across Crete; many think a memory of it fed the tale.', 'Orichalcum was a real alloy, probably a kind of brass; ingots of it were raised from a 2,600-year-old shipwreck off Sicily in 2015.'] },
];
BC.WONDER_BY_ID = {}; BC.WONDERS.forEach(w => { BC.WONDER_BY_ID[w.id] = w; });
// The soil hammer walks a block through every ground type in the game, in climate order.
BC.SOIL_CYCLE = [1, 2, 3, 4, 7, 8, 9, 10, 11, 12, 13, 5, 6, 17, 16, 14];
(function () {
  const P = BC.World.prototype; const LIME = 191, CASING = 192, GRANITE = 193, INCA = 194;
  P.placeWonders = function () {
    this.reserved = new Set(); this.wonders = [];
    try { this.buildGiza(); } catch (e) { console.warn('giza', e); }
    try { this.buildMachuPicchu(); } catch (e) { console.warn('machu picchu', e); }
    try { this.buildAtlantis(); } catch (e) { console.warn('atlantis', e); }
  };
  P.isReserved = function (x, z) { return this.reserved && this.reserved.has(x + z * this.W); };
  // Reset a column to a new ground height, keeping that column's own biome layering.
  P.reshape = function (x, z, h) {
    if (x < 0 || z < 0 || x >= this.W || z >= this.D) return; h = BC.util.clamp(Math.round(h), 3, this.H - 2); const ci = x + z * this.W; const WL = this.WL;
    this.height[ci] = h; this.hf[ci] = h; this.fillColumn(x, z, h, BC.BIOME_LIST[this.biome[ci]]);
    for (let y = h + 1; y < this.H; y++) this.blocks[this.idx(x, y, z)] = (h < WL && y <= WL) ? 15 : 0;
  };
  // Find a window of the map that is mostly one biome and mostly dry, nearest to a preferred origin.
  P.findSite = function (w, d, biome, px, pz, minFrac) {
    let best = null, bd = 1e18, bestFrac = 0, fallback = null;
    for (let oz = 12; oz <= this.D - d - 12; oz += 4) for (let ox = 12; ox <= this.W - w - 12; ox += 4) {
      let n = 0, same = 0, dry = 0; for (let z = 0; z < d; z += 4) for (let x = 0; x < w; x += 4) { const ci = (ox + x) + (oz + z) * this.W; n++; if (BC.BIOME_LIST[this.biome[ci]] === biome) same++; if (this.height[ci] > this.WL) dry++; }
      const frac = Math.min(same, dry) / n; if (frac > bestFrac) { bestFrac = frac; fallback = [ox, oz]; } if (frac < minFrac) continue;
      const dist = (ox - px) ** 2 + (oz - pz) ** 2; if (dist < bd) { bd = dist; best = [ox, oz]; }
    }
    return best || (bestFrac > minFrac * 0.7 ? fallback : null);
  };
  P.buildGiza = function () {
    const W = this.W, WL = this.WL; const SW = 116, SD = 108; const site = this.findSite(SW, SD, 'desert', 12, Math.round(this.D * 0.72), 0.98) || this.findSite(SW, SD, 'desert', 12, Math.round(this.D * 0.72), 0.9); if (!site) return;
    const [ox, oz] = site; const cx = ox + 80, cz = oz + 18; // Khufu's centre
    // the plateau: flatten to the window's typical height, feathered into the dunes around it
    let sum = 0, n = 0; for (let z = 0; z < SD; z++) for (let x = 0; x < SW; x++) { sum += this.height[(ox + x) + (oz + z) * W]; n++; }
    const hp = BC.util.clamp(Math.round(sum / n), WL + 3, 19); const F = 8;
    for (let z = -F; z < SD + F; z++) for (let x = -F; x < SW + F; x++) { const wx = ox + x, wz = oz + z; if (wx < 1 || wz < 1 || wx >= W - 1 || wz >= this.D - 1) continue; const out = Math.max(0, -x, -z, x - SW + 1, z - SD + 1); const t = Math.min(1, out / F); const h0 = this.height[wx + wz * W]; const h = Math.round(hp * (1 - t) + h0 * t); if (h !== h0) this.reshape(wx, wz, h); if (t === 0) this.reserved.add(wx + wz * W); }
    const y0 = hp + 1; const B = (x, y, z, id) => { if (this.inBounds(x, y, z)) this.blocks[this.idx(x, y, z)] = id; };
    const box = (x0, y0, z0, x1, y1, z1, id) => { for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) B(x, y, z, id); };
    const pyramid = (px, pz, half, hgt, base, idFor) => { for (let k = 0; k < hgt; k++) { const r = Math.round(half * (1 - k / (hgt - 1))); box(px - r, base + k, pz - r, px + r, base + k, pz + r, idFor(k, hgt)); } };
    const floor = (x0, z0, x1, z1, id) => { for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) { B(x, hp, z, id); } };
    const walls = (x0, z0, x1, z1, y, hgt, id) => { for (let k = 0; k < hgt; k++) for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) if (x === x0 || x === x1 || z === z0 || z === z1) B(x, y + k, z, id); };
    const path = (xa, za, xb, zb, id) => { const steps = Math.max(Math.abs(xb - xa), Math.abs(zb - za)); for (let i = 0; i <= steps; i++) { const x = Math.round(xa + (xb - xa) * i / steps), z = Math.round(za + (zb - za) * i / steps); B(x, hp, z, id); } };
    // Khufu: 230 m base, 146 m high -> 23 x 15 blocks. Casing long gone: stepped limestone core.
    pyramid(cx, cz, 11, 15, y0, () => LIME);
    // interior: entrance on the north face, a passage climbing to a chamber in the middle, lit by a lantern
    B(cx, y0 + 2, cz - 9, 0); B(cx, y0 + 3, cz - 9, 0); for (let z = cz - 8; z <= cz - 6; z++) { B(cx, y0 + 2, z, 0); B(cx, y0 + 3, z, 0); }
    for (let s = 1; s <= 4; s++) { B(cx, y0 + 2 + s, cz - 6 + s, 0); B(cx, y0 + 3 + s, cz - 6 + s, 0); }
    box(cx - 1, y0 + 6, cz - 2, cx + 1, y0 + 8, cz + 2, 0); B(cx - 1, y0 + 6, cz + 1, GRANITE); B(cx + 1, y0 + 8, cz, 80);
    // mortuary temple on the east face, causeway running east-south-east, three queens' pyramids east of it, two boat pits on the south side
    floor(cx + 12, cz - 3, cx + 16, cz + 3, LIME); walls(cx + 12, cz - 3, cx + 16, cz + 3, y0, 1, LIME); B(cx + 16, y0, cz, 0);
    path(cx + 17, cz, cx + 42, cz + 7, LIME); floor(cx + 42, cz + 5, cx + 45, cz + 9, LIME); walls(cx + 42, cz + 5, cx + 45, cz + 9, y0, 1, LIME);
    [cz - 3, cz + 3, cz + 9].forEach(qz => pyramid(cx + 19, qz, 2, 3, y0, () => LIME));
    [[cx - 7, cx - 3], [cx + 3, cx + 7]].forEach(([a, b]) => { for (let x = a; x <= b; x++) { B(x, hp, cz + 13, 0); this.height[x + (cz + 13) * W] = hp - 1; } });
    // western and eastern cemeteries: rows of mastabas (flat bench tombs)
    for (let r = 0; r < 5; r++) for (let c = 0; c < 4; c++) { const mx = cx - 32 + c * 5, mz = cz - 10 + r * 4; box(mx, y0, mz, mx + 2, y0, mz + 1, LIME); }
    for (let r = 0; r < 4; r++) for (let c = 0; c < 2; c++) { const mx = cx + 24 + c * 5, mz = cz - 8 + r * 5; box(mx, y0, mz, mx + 2, y0, mz + 1, LIME); }
    // Khafre: 215 m, 136 m high, on a rise, with the white casing still on its top courses and a granite bottom course
    const kx = cx - 34, kz = cz + 38; for (let z = kz - 13; z <= kz + 13; z++) for (let x = kx - 13; x <= kx + 13; x++) this.reshape(x, z, hp + 1);
    pyramid(kx, kz, 10, 14, hp + 2, (k, h) => k === 0 ? GRANITE : k >= h - 4 ? CASING : LIME);
    floor(kx + 11, kz - 3, kx + 15, kz + 3, LIME); walls(kx + 11, kz - 3, kx + 15, kz + 3, hp + 2, 1, LIME); B(kx + 15, hp + 2, kz, 0);
    for (let x = kx + 14; x <= kx + 16; x++) this.reshape(x, kz, hp); // the causeway drops off the rise
    path(kx + 16, kz, cx + 14, cz + 50, LIME);
    // valley temple of Khafre, and the Sphinx just north of it, carved from the bedrock knoll, facing the sunrise
    floor(cx + 14, cz + 48, cx + 19, cz + 53, LIME); walls(cx + 14, cz + 48, cx + 19, cz + 53, y0, 2, GRANITE); B(cx + 19, y0, cz + 50, 0); B(cx + 19, y0 + 1, cz + 50, 0);
    box(cx + 12, y0, cz + 43, cx + 18, y0 + 1, cz + 44, LIME); box(cx + 19, y0, cz + 43, cx + 21, y0, cz + 44, LIME); box(cx + 18, y0 + 2, cz + 43, cx + 19, y0 + 2, cz + 44, LIME); B(cx + 19, y0 + 3, cz + 43, LIME); B(cx + 19, y0 + 3, cz + 44, LIME);
    floor(cx + 22, cz + 42, cx + 25, cz + 45, LIME); walls(cx + 22, cz + 42, cx + 25, cz + 45, y0, 1, LIME);
    // Menkaure: 103 m, 65 m high, lower courses in red granite; three small queens' pyramids on its south side
    const mx = cx - 64, mz = cz + 71; pyramid(mx, mz, 5, 7, y0, k => k < 2 ? GRANITE : LIME);
    floor(mx + 6, mz - 2, mx + 9, mz + 2, LIME); walls(mx + 6, mz - 2, mx + 9, mz + 2, y0, 1, LIME); B(mx + 9, y0, mz, 0); path(mx + 10, mz, mx + 28, mz + 4, LIME);
    [mx - 4, mx, mx + 4].forEach(qx => pyramid(qx, mz + 8, 1, 2, y0, () => LIME));
    // the builders' town south-east of the plateau: mud-brick galleries and bakeries
    for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) { const hx = cx + 20 + c * 4, hz = cz + 74 + r * 5; walls(hx, hz, hx + 2, hz + 3, y0, 1, 8); B(hx + 2, y0, hz + 1, 0); }
    this.wonders.push({ id: 'giza', x: cx - 20, z: cz + 30, y: y0 });
  };
  P.buildMachuPicchu = function () {
    const W = this.W, D = this.D, WL = this.WL; const SW = 124, SD = 184; const site = this.findSite(SW, SD, 'boreal', Math.round(W * 0.16), 8, 0.45); if (!site) return;
    const [ox, oz] = site; const cx = ox + 62, cz = oz + 80; const TOP = 28;
    const terraceAt = (dx, dz) => { const ax = Math.abs(dx); if (ax >= 13 && ax <= 34 && Math.abs(dz) <= 42) return TOP - Math.floor((ax - 13) / 2); if (dz >= 44 && dz <= 70 && ax <= 22) return TOP - Math.floor((dz - 44) / 2); return -1; };
    const targetAt = (dx, dz) => {
      const s = Math.sqrt((dx / 24) ** 2 + (dz / 44) ** 2); let t = s <= 1 ? TOP : TOP - (s - 1) * 34 / 1.4;
      const tt = terraceAt(dx, dz); if (tt > 0) t = tt; else if (Math.abs(dx) > 34 && Math.abs(dz) <= 42) t = Math.max(t, 17 - (Math.abs(dx) - 34) * 0.8); else if (dz > 70 && Math.abs(dx) <= 22) t = Math.max(t, 15 - (dz - 70) * 0.6); if (Math.abs(dx) > 22 && dz > 42 && dz <= 70) t = Math.max(t, (TOP - Math.floor((dz - 44) / 2)) - (Math.abs(dx) - 22) * 0.9);
      const dh = Math.hypot(dx - 2, dz + 58); const hp = 42 - dh * 0.9; const dm = Math.hypot(dx - 8, dz - 98); const mp = 40 - dm * 0.6;
      if (dz === 43 && Math.abs(dx) <= 22) t = TOP - 1; // the dry moat between the farms and the city
      return Math.max(t, hp, mp);
    };
    for (let dz = -82; dz <= 146; dz++) for (let dx = -62; dx <= 62; dx++) { const x = cx + dx, z = cz + dz; if (x < 1 || z < 1 || x >= W - 1 || z >= D - 1) continue; const h = Math.round(targetAt(dx, dz)); const ci = x + z * W; if (h > this.height[ci]) this.reshape(x, z, h);
      const s = Math.sqrt((dx / 24) ** 2 + (dz / 44) ** 2); if (s <= 1.35 || (Math.abs(dx) <= 24 && dz >= 42 && dz <= 72) || Math.hypot(dx - 2, dz + 58) <= 9) this.reserved.add(ci); }
    const B = (x, y, z, id) => { if (this.inBounds(x, y, z)) this.blocks[this.idx(x, y, z)] = id; };
    const G = (dx, dz) => this.height[(cx + dx) + (cz + dz) * W]; // ground height at a site offset
    const top = (dx, dz, id) => B(cx + dx, G(dx, dz), cz + dz, id);
    const box = (x0, y0, z0, x1, y1, z1, id) => { for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) B(cx + x, y, cz + z, id); };
    const walls = (x0, z0, x1, z1, hgt, id, doors) => { const y = G(x0, z0) + 1; for (let k = 0; k < hgt; k++) for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) if (x === x0 || x === x1 || z === z0 || z === z1) B(cx + x, y + k, cz + z, id); (doors || []).forEach(([dx, dz]) => { B(cx + dx, y, cz + dz, 0); B(cx + dx, y + 1, cz + dz, 0); }); return y; };
    // retaining walls: the outer column of every terrace step is faced with cut stone
    for (let dz = -82; dz <= 104; dz++) for (let dx = -62; dx <= 62; dx++) { const tt = terraceAt(dx, dz); if (tt < 0) continue; const ax = Math.abs(dx); const edge = (ax >= 13 && Math.abs(dz) <= 42) ? ((ax - 13) % 2 === 1) : ((dz - 44) % 2 === 1); if (edge) top(dx, dz, INCA); }
    // the city floor is turf between the stone; the main plaza is a long lawn down the middle of the saddle
    for (let dz = -42; dz <= 42; dz++) for (let dx = -12; dx <= 12; dx++) if (Math.sqrt((dx / 24) ** 2 + (dz / 44) ** 2) <= 1) top(dx, dz, 1);
    for (let dz = -20; dz <= 12; dz++) for (let dx = -4; dx <= 4; dx++) top(dx, dz, 1);
    // Sacred Rock at the north end of the plaza
    box(-1, TOP + 1, -26, 1, TOP + 2, -25, 14);
    // Intihuatana: a stepped pyramid of terraces with the carved sun-stone on top, the highest point of the city
    box(-15, TOP + 1, -23, -6, TOP + 1, -14, INCA); box(-13, TOP + 2, -21, -8, TOP + 2, -16, INCA); box(-11, TOP + 3, -19, -10, TOP + 3, -18, INCA); B(cx - 11, TOP + 4, cz - 19, GRANITE);
    for (let i = 0; i < 3; i++) B(cx - 5 + i, TOP + 1 + (2 - i) * 0, cz - 18, INCA); // approach steps
    // Sacred Plaza: Principal Temple (three walls, open to the plaza) and the Temple of the Three Windows looking east
    for (let dz = -12; dz <= -5; dz++) for (let dx = -16; dx <= -6; dx++) top(dx, dz, INCA);
    for (let k = 0; k < 3; k++) { for (let dx = -16; dx <= -9; dx++) B(cx + dx, TOP + 1 + k, cz - 12, INCA); for (let dz = -12; dz <= -8; dz++) { B(cx - 16, TOP + 1 + k, cz + dz, INCA); B(cx - 9, TOP + 1 + k, cz + dz, INCA); } }
    for (let k = 0; k < 3; k++) for (let dz = -12; dz <= -5; dz++) B(cx - 6, TOP + 1 + k, cz + dz, INCA); [-11, -9, -7].forEach(dz => B(cx - 6, TOP + 2, cz + dz, 0));
    for (let k = 0; k < 3; k++) for (let dx = -8; dx <= -6; dx++) { B(cx + dx, TOP + 1 + k, cz - 12, INCA); B(cx + dx, TOP + 1 + k, cz - 5, INCA); }
    // Temple of the Sun: a curved tower on a rock outcrop with the Royal Tomb cave beneath, solstice window facing east
    box(-17, TOP + 1, 0, -11, TOP + 1, 6, 14); box(-16, TOP + 1, 1, -12, TOP + 1, 5, 0); B(cx - 14, TOP + 1, cz + 6, 0); B(cx - 13, TOP + 1, cz + 6, 0);
    for (let k = 0; k < 3; k++) { for (let a = -90; a <= 90; a += 12) { const r = a * Math.PI / 180; B(cx - 14 + Math.round(3 * Math.cos(r)), TOP + 2 + k, cz + 3 + Math.round(3 * Math.sin(r)), INCA); } for (let dz = 0; dz <= 6; dz++) B(cx - 16, TOP + 2 + k, cz + dz, INCA); B(cx - 15, TOP + 2 + k, cz, INCA); B(cx - 15, TOP + 2 + k, cz + 6, INCA); }
    B(cx - 11, TOP + 3, cz + 3, 0);
    // the royal residence beside it, and the stair of sixteen fountains running south past its door
    walls(-18, 8, -13, 12, 2, INCA, [[-13, 10]]);
    for (let dz = -4; dz <= 12; dz++) { top(-10, dz, 14); if (dz % 2 === 0) B(cx - 10, TOP + 1, cz + dz, 168); }
    // quarry: the half-worked granite the builders left
    for (let i = 0; i < 14; i++) { const dx = -22 + (i * 7) % 11, dz = 14 + (i * 5) % 8; B(cx + dx, TOP + 1, cz + dz, 14); if (i % 3 === 0) B(cx + dx, TOP + 2, cz + dz, 14); }
    // city wall above the dry moat, with the main gate (two jambs and a lintel)
    for (let dx = -22; dx <= 22; dx++) { if (Math.abs(dx + 18) <= 0) continue; B(cx + dx, TOP + 1, cz + 42, INCA); B(cx + dx, TOP + 2, cz + 42, INCA); } B(cx - 18, TOP + 3, cz + 42, INCA); B(cx - 19, TOP + 3, cz + 42, INCA); B(cx - 17, TOP + 3, cz + 42, INCA);
    // the guardhouse on the upper farm terraces, the one building with its thatch restored
    { const y = walls(-25, 46, -21, 50, 2, INCA, [[-23, 46]]); for (let dz = 45; dz <= 51; dz++) for (let dx = -26; dx <= -20; dx++) { const edge = Math.min(dx + 26, -20 - dx, dz - 45, 51 - dz); B(cx + dx, y + 2 + Math.min(edge, 1), cz + dz, 74); } }
    // east side: the Group of the Three Doorways and the residential blocks (kanchas) facing the plaza
    for (let r = 0; r < 4; r++) for (let c = 0; c < 2; c++) { const x0 = 7 + c * 7, z0 = -20 + r * 6; walls(x0, z0, x0 + 5, z0 + 4, 2, INCA, [c === 0 ? [x0, z0 + 2] : [x0, z0 + 2]]); }
    for (let dz = -8; dz <= 8; dz++) { B(cx + 6, TOP + 1, cz + dz, INCA); B(cx + 6, TOP + 2, cz + dz, INCA); } [-5, 0, 5].forEach(dz => { B(cx + 6, TOP + 1, cz + dz, 0); B(cx + 6, TOP + 2, cz + dz, 0); });
    // Temple of the Condor: two natural rock wings and the carved head on the floor
    for (let i = 0; i < 6; i++) { box(8 + i, TOP + 1, 8 + i, 8 + i, TOP + 2 + (i < 3 ? 1 : 0), 8 + i, 14); box(8 + i, TOP + 1, 14 - i, 8 + i, TOP + 2, 14 - i, 14); } top(10, 11, INCA); top(11, 11, INCA);
    // industrial sector further south-east
    for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++) { const x0 = 8 + c * 7, z0 = 18 + r * 7; walls(x0, z0, x0 + 5, z0 + 4, 2, INCA, [[x0 + 2, z0]]); }
    // the stair up Huayna Picchu: cut stone steps all the way to the top
    for (let i = 0; i <= 31; i++) { const dz = -27 - i, dx = Math.round(2 * i / 31); top(dx, dz, INCA); }
    this.wonders.push({ id: 'machu_picchu', x: cx, z: cz, y: TOP + 1 });
  };
  // Atlantis as Plato tells it: a bay carved out of the coast at the map edge, open to the sea, with the ring city in it.
  P.buildAtlantis = function () {
    const W = this.W, D = this.D, WL = this.WL; const S = 84, HALF = 42; const SEA = WL - 3;
    const cands = []; for (let i = 2; i <= W - S - 2; i += 6) { cands.push([i, 2]); cands.push([i, D - S - 2]); } for (let i = 2; i <= D - S - 2; i += 6) { cands.push([2, i]); cands.push([W - S - 2, i]); }
    let best = null, bs = -1e9;
    for (const [ox, oz] of cands) { let wet = 0, sum = 0, n = 0, res = 0; for (let z = -12; z < S + 12; z += 3) for (let x = -12; x < S + 12; x += 3) { const wx = ox + x, wz = oz + z; if (wx < 0 || wz < 0 || wx >= W || wz >= D) continue; const ci = wx + wz * W; if (this.reserved.has(ci)) res++; if (x < 0 || z < 0 || x >= S || z >= S) continue; n++; const h = this.height[ci]; sum += h; if (h < WL) wet++; } if (res || !n) continue; const score = (wet / n) * 10 - (sum / n - WL) * 0.3; if (score > bs) { bs = score; best = [ox, oz]; } }
    if (!best) return;
    const [ox, oz] = best; const cx = ox + HALF, cz = oz + HALF; const ex = ox === 2 ? -1 : ox === W - S - 2 ? 1 : 0, ez = ex ? 0 : (oz === 2 ? -1 : 1);
    const along = (dx, dz) => ex ? dx * ex : dz * ez, across = (dx, dz) => ex ? dz : dx; // along runs from the citadel out to the open sea
    const ISLAND = 7, W1 = 9, L1 = 14, W2 = 19, L2 = 27, W3 = 35, WALL = 36;
    const drowned = (dx, dz) => { let a = Math.atan2(dz, dx) * 180 / Math.PI; if (a < 0) a += 360; return a >= 200 && a <= 250; }; // the quarter that went under
    const ringH = (dx, dz) => { const r = Math.hypot(dx, dz); if (Math.abs(across(dx, dz)) <= 1 && along(dx, dz) >= ISLAND) return SEA; // ship channel under the bridge
      if (r <= ISLAND) return WL + 3; if (r <= W1) return SEA; if (r <= L1) return WL + 1; if (r <= W2) return SEA; if (r <= L2) return drowned(dx, dz) ? WL - 1 : WL + 1; if (r <= W3) return SEA; if (r <= WALL) return drowned(dx, dz) ? WL - 1 : WL + 1; return SEA; };
    const F = 10;
    for (let dz = -HALF - F; dz <= HALF + F; dz++) for (let dx = -HALF - F; dx <= HALF + F; dx++) { const x = cx + dx, z = cz + dz; if (x < 0 || z < 0 || x >= W || z >= D) continue; const ci = x + z * W; const out = Math.max(Math.abs(dx), Math.abs(dz)) - HALF; let h;
      const seaward = along(dx, dz) > HALF && Math.abs(across(dx, dz)) <= HALF; // between the bay and the map edge: open water
      if (out <= 0) h = ringH(dx, dz); else if (seaward) h = SEA; else { const t = Math.min(1, out / F); h = SEA * (1 - t) + this.height[ci] * t; if (this.height[ci] <= SEA) h = this.height[ci]; }
      this.reshape(x, z, h); if (out <= 0 && ringH(dx, dz) > SEA) this.reserved.add(ci); }
    const B = (x, y, z, id) => { if (this.inBounds(x, y, z)) this.blocks[this.idx(x, y, z)] = id; };
    const P = (dx, dz, y, id) => B(cx + dx, y, cz + dz, id);
    const GOLD = 195, TIN = 196, BRASS = 197, BASALT = 221, WHITE = CASING, RED = GRANITE, BRICK = 198;
    for (let dz = -WALL - 1; dz <= WALL + 1; dz++) for (let dx = -WALL - 1; dx <= WALL + 1; dx++) { const r = Math.hypot(dx, dz); const al = along(dx, dz), ac = across(dx, dz); const gate = Math.abs(ac) <= 1 && al > 0; const sunk = drowned(dx, dz);
      // metal walls on the outer edge of each land ring, in Plato's order from the sea inward: brass, tin, orichalcum
      if (!gate && r > L2 - 1 && r <= L2 && !sunk) { P(dx, dz, WL + 2, BRASS); P(dx, dz, WL + 3, BRASS); }
      if (!gate && r > L1 - 1 && r <= L1) { P(dx, dz, WL + 2, TIN); P(dx, dz, WL + 3, TIN); }
      if (!gate && r > ISLAND - 1 && r <= ISLAND) { P(dx, dz, WL + 4, GOLD); P(dx, dz, WL + 5, GOLD); }
      if (!gate && r > WALL - 1 && r <= WALL && !sunk) { P(dx, dz, WL + 2, BASALT); if ((dx + dz) % 2 === 0) P(dx, dz, WL + 3, BASALT); }
      // the racecourse, a stadion wide around the outer land ring
      if (r >= 22.5 && r < 24.5 && !sunk && !gate) P(dx, dz, WL + 1, BRICK);
      // drowned walls: broken stubs standing out of the shallows
      if (sunk && ((r > L2 - 1 && r <= L2) || (r > WALL - 1 && r <= WALL)) && (dx * 7 + dz * 3) % 5 === 0) P(dx, dz, WL, r <= L2 ? BRASS : BASALT); }
    // the white bridge from the sea gate to the citadel, over the water rings and the ship channels
    for (let al = ISLAND; al <= WALL + 1; al++) for (let ac = -1; ac <= 1; ac++) { const dx = ex ? al * ex : ac, dz = ex ? ac : al * ez; P(dx, dz, WL + 2, WHITE); if (al === ISLAND) P(dx, dz, WL + 3, WHITE); }
    [L1, L2, WALL].forEach(rr => { for (const side of [-2, 2]) { const dx = ex ? rr * ex : side, dz = ex ? side : rr * ez; for (let y = WL + 2; y <= WL + 5; y++) P(dx, dz, y, rr === L1 ? TIN : rr === L2 ? BRASS : BASALT); P(dx, dz, WL + 6, GOLD); } });
    // the temple of Poseidon at the centre: white floor, red and black pillars, a silver roof with golden pinnacles, a golden god inside
    const tx = (a, c) => ex ? [a * ex, c] : [c, a * ez];
    for (let a = -4; a <= 4; a++) for (let c = -2; c <= 2; c++) { const [dx, dz] = tx(a, c); P(dx, dz, WL + 3, WHITE); }
    for (let a = -4; a <= 4; a += 2) for (const c of [-2, 2]) { const [dx, dz] = tx(a, c); for (let y = WL + 4; y <= WL + 6; y++) P(dx, dz, y, (a + 4) % 4 === 0 ? RED : BASALT); }
    for (const a of [-4, 4]) { const [dx, dz] = tx(a, 0); for (let y = WL + 4; y <= WL + 6; y++) P(dx, dz, y, BASALT); }
    for (let a = -4; a <= 4; a++) for (let c = -2; c <= 2; c++) { const [dx, dz] = tx(a, c); P(dx, dz, WL + 7, TIN); if (c === 0) P(dx, dz, WL + 8, GOLD); }
    { const [dx, dz] = tx(0, 0); P(dx, dz, WL + 4, GOLD); P(dx, dz, WL + 5, GOLD); P(dx, dz, WL + 6, GOLD); }
    // the two springs, hot and cold, either side of the temple
    for (const c of [-5, 4]) for (let a = -1; a <= 0; a++) for (let cc = c; cc <= c + 1; cc++) { const [dx, dz] = tx(a, cc); const i = this.idx(cx + dx, WL + 3, cz + dz); if (this.inBounds(cx + dx, WL + 3, cz + dz)) { this.blocks[i] = 15; this.wlvl[i] = 7; } }
    // Poseidon's grove on the inner land ring: a few trees planted by hand
    { const t = BC.TREES.find(tt => tt.log === 'oak' && tt.leaf) || BC.TREES.find(tt => tt.leaf); if (t) { const log = BC.LOG_IDS[t.log], leaf = BC.leafIdFor(t); for (let k = 0; k < 6; k++) { const ang = k * 1.047 + 0.5; const dx = Math.round(11.5 * Math.cos(ang)), dz = Math.round(11.5 * Math.sin(ang)); if (Math.abs(across(dx, dz)) <= 3 && along(dx, dz) > 0) continue;
      for (let y = WL + 2; y <= WL + 4; y++) { P(dx, dz, y, log); this.treeAt.set(this.idx(cx + dx, y, cz + dz), t.id); } for (let yy = WL + 4; yy <= WL + 6; yy++) for (let zz = -1; zz <= 1; zz++) for (let xx = -1; xx <= 1; xx++) { if (yy === WL + 6 && (xx || zz)) continue; if (yy === WL + 4 && !xx && !zz) continue; P(dx + xx, dz + zz, yy, leaf); this.treeAt.set(this.idx(cx + dx + xx, yy, cz + dz + zz), t.id); } } } }
    // houses crowded along the outer land ring, and a dock on the harbour side opposite the sea gate
    for (let k = 0; k < 8; k++) { const ang = k * 0.785 + 0.39; const hx = Math.round(24.5 * Math.cos(ang)), hz = Math.round(24.5 * Math.sin(ang)); if (drowned(hx, hz) || Math.abs(across(hx, hz)) <= 3) continue;
      for (let zz = -1; zz <= 1; zz++) for (let xx = -1; xx <= 1; xx++) { const edge = Math.abs(xx) === 1 || Math.abs(zz) === 1; if (edge) { P(hx + xx, hz + zz, WL + 2, LIME); P(hx + xx, hz + zz, WL + 3, LIME); } P(hx + xx, hz + zz, WL + 4, RED); }
      const tdx = Math.sign(-hx), tdz = Math.sign(-hz); P(hx + (Math.abs(hx) >= Math.abs(hz) ? tdx : 0), hz + (Math.abs(hx) >= Math.abs(hz) ? 0 : tdz), WL + 2, 0); }
    for (let al = -L2 + 1; al >= -W2 - 3; al--) for (let ac = -1; ac <= 1; ac++) { const dx = ex ? al * ex : ac, dz = ex ? ac : al * ez; P(dx, dz, WL + 1, 19); }
    this.wonders.push({ id: 'atlantis', x: cx, z: cz, y: WL + 4 });
  };
  // lore: the elders drop a hint about each landmark
  if (BC.REGION_LORE) { ['wetland', 'temperate', 'rainforest'].forEach(k => { if (BC.REGION_LORE[k]) BC.REGION_LORE[k].topics.push(['The ring city', 'Fishermen say that out along the edge of the sea there is a bay where the water runs in circles between walls of red metal, and a white bridge leads to a temple in the middle. It sank in a night, long ago, they say, and a quarter of it is under the water still.']); }); if (BC.REGION_LORE.desert) BC.REGION_LORE.desert.topics.push(['The old kings', 'Far out where the sand goes flat there are hills too square to be hills. My grandmother said kings sleep under them and that the river that fed their builders is a thousand miles away.']); if (BC.REGION_LORE.boreal) BC.REGION_LORE.boreal.topics.push(['The city on the ridge', 'Follow the high ground north until a peak stands up like a finger. In the saddle below it someone built a whole town of fitted stone and farmed the cliffs in steps. Nobody here remembers who.']); }
})();
