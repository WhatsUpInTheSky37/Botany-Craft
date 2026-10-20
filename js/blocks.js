window.BC = window.BC || {};
// Block table. tex: [top, side, bottom] tile names in the atlas.
(function () {
  const B = [];
  function def(id, o) { o.id = id; B[id] = o; return o; }
  def(0, { name: 'Air', solid: false, tex: null });
  def(1, { name: 'Forest topsoil', soil: 'alfisol', horizon: 'A', tex: ['grass_temperate', 'grass_side_alfisol', 'alfisol'], solid: true, grassTop: true });
  def(2, { name: 'Forest subsoil', soil: 'alfisol', horizon: 'B', tex: ['alfisol', 'alfisol', 'alfisol'], solid: true });
  def(3, { name: 'Prairie topsoil', soil: 'mollisol', horizon: 'A', tex: ['grass_prairie', 'grass_side_mollisol', 'mollisol'], solid: true, grassTop: true });
  def(4, { name: 'Prairie black earth', soil: 'mollisol', horizon: 'A', tex: ['mollisol', 'mollisol', 'mollisol'], solid: true });
  def(5, { name: 'Desert sand', soil: 'aridisol', horizon: 'A', tex: ['sand', 'sand', 'sand'], solid: true, grassTop: true });
  def(6, { name: 'Caliche hardpan', soil: 'sand_subsoil', horizon: 'Bk', tex: ['caliche', 'caliche', 'caliche'], solid: true });
  def(7, { name: 'Rainforest floor', soil: 'oxisol', horizon: 'O/A', tex: ['litter', 'oxisol_side', 'oxisol'], solid: true, grassTop: true });
  def(8, { name: 'Red tropical clay', soil: 'oxisol', horizon: 'Bo', tex: ['oxisol', 'oxisol', 'oxisol'], solid: true });
  def(9, { name: 'Boreal moss mat', soil: 'spodosol', horizon: 'O', tex: ['moss', 'podzol_side', 'podzol_e'], solid: true, grassTop: true });
  def(10, { name: 'Leached grey layer', soil: 'spodosol', horizon: 'E', tex: ['podzol_e', 'podzol_e', 'podzol_e'], solid: true });
  def(11, { name: 'Rusty iron layer', soil: 'spodosol', horizon: 'Bs', tex: ['podzol_b', 'podzol_b', 'podzol_b'], solid: true });
  def(12, { name: 'Peat', soil: 'histosol', horizon: 'Oa', tex: ['peat_top', 'peat', 'peat'], solid: true, grassTop: true });
  def(13, { name: 'Gley clay', soil: 'gley', horizon: 'Bg', tex: ['gley', 'gley', 'gley'], solid: true });
  def(14, { name: 'Stone', soil: 'stone', horizon: 'R', tex: ['stone', 'stone', 'stone'], solid: true });
  def(15, { name: 'Water', solid: false, liquid: true, tex: ['water', 'water', 'water'] });
  def(16, { name: 'Gravel', soil: 'stone', horizon: 'C', tex: ['gravel', 'gravel', 'gravel'], solid: true });
  def(17, { name: 'Compost-amended soil', soil: 'compost', horizon: 'A', tex: ['compost', 'compost', 'compost'], solid: true, grassTop: true });
  def(18, { name: 'Fence', solid: true, fence: true, tex: ['planks', 'planks', 'planks'] });
  def(19, { name: 'Wood planks', solid: true, tex: ['planks', 'planks', 'planks'] });
  const logs = { oak: 20, birch: 21, spruce: 22, tropical: 23, cypress: 24, cactus: 25, mesquite: 26, paloverde: 27, palm: 28 };
  Object.keys(logs).forEach(k => def(logs[k], { name: k === 'cactus' ? 'Saguaro trunk' : { oak: 'Oak log', birch: 'Birch log', spruce: 'Spruce log', tropical: 'Hardwood log', cypress: 'Cypress log', mesquite: 'Mesquite log', paloverde: 'Palo verde log', palm: 'Palm trunk' }[k], log: k, tex: [k === 'cactus' ? 'cactus_top' : 'log_top_' + k, k === 'cactus' ? 'cactus' : 'log_' + k, k === 'cactus' ? 'cactus_top' : 'log_top_' + k], solid: true }));
  BC.LOG_IDS = logs;
  BC.LEAF_BASE = 30; const leafIdx = i => i < 30 ? 30 + i : i < 50 ? 170 + (i - 30) : i < 70 ? 200 + (i - 50) : 300 + (i - 70); // 200-219: fruit trees added after the ore ids; 300+: trees added once ids went 16-bit
  BC.TREES.forEach((t, i) => { if (t.leaf) def(leafIdx(i), { name: 'Leaves', leaves: true, tree: t.id, tex: ['leaves_' + t.id, 'leaves_' + t.id, 'leaves_' + t.id], solid: true }); });
  // ---------- planks by species (19 = oak) ----------
  B[19].name = 'Oak planks'; B[19].plank = true; B[19].wood = true; B[18].wood = true;
  const PLANKS = [['birch', 60, 'Birch planks'], ['spruce', 61, 'Spruce planks'], ['tropical', 62, 'Hardwood planks'], ['cypress', 63, 'Cypress planks'], ['mesquite', 64, 'Mesquite planks'], ['paloverde', 65, 'Palo verde planks'], ['palm', 66, 'Palm planks']];
  PLANKS.forEach(([k, id, name]) => def(id, { name, plank: true, wood: true, solid: true, tex: ['planks_' + k, 'planks_' + k, 'planks_' + k] }));
  BC.PLANK_FOR_LOG = { oak: 19, birch: 60, spruce: 61, tropical: 62, cypress: 63, mesquite: 64, paloverde: 65, palm: 66 };
  // ---------- shaped wood furniture ----------
  // Boxes are [x0,y0,z0,x1,y1,z1, tile] in cell units for facing 0 (front toward -Z); rot() turns them for facings 1..3.
  const rot = (bx, k) => { let [x0, y0, z0, x1, y1, z1, t] = bx; for (let i = 0; i < k; i++) { const nx0 = 1 - z1, nz0 = x0, nx1 = 1 - z0, nz1 = x1; x0 = nx0; z0 = nz0; x1 = nx1; z1 = nz1; } return [x0, y0, z0, x1, y1, z1, t]; };
  const P = 'planks';
  const shapes = {
    slab: [[0, 0, 0, 1, 0.5, 1, P]],
    boardwalk: [[0, 0, 0, 1, 0.15, 1, 'boardwalk']],
    table: [[0, 0.8, 0, 1, 1, 1, P], [0.08, 0, 0.08, 0.22, 0.8, 0.22, P], [0.78, 0, 0.08, 0.92, 0.8, 0.22, P], [0.08, 0, 0.78, 0.22, 0.8, 0.92, P], [0.78, 0, 0.78, 0.92, 0.8, 0.92, P]],
    stool: [[0.25, 0.4, 0.25, 0.75, 0.55, 0.75, P], [0.3, 0, 0.3, 0.4, 0.4, 0.4, P], [0.6, 0, 0.3, 0.7, 0.4, 0.4, P], [0.3, 0, 0.6, 0.4, 0.4, 0.7, P], [0.6, 0, 0.6, 0.7, 0.4, 0.7, P]],
    lantern: [[0.3, 0.1, 0.3, 0.7, 0.75, 0.7, 'lantern'], [0.4, 0.75, 0.4, 0.6, 0.9, 0.6, 'bark_dark'], [0.44, 0, 0.44, 0.56, 0.1, 0.56, 'bark_dark']],
    torch: [[0.44, 0, 0.44, 0.56, 0.6, 0.56, 'bark_dark'], [0.38, 0.6, 0.38, 0.62, 0.85, 0.62, 'flame']],
    flowerpot: [[0.28, 0, 0.28, 0.72, 0.4, 0.72, { top: 'pot_top', side: 'terracotta', bottom: 'terracotta' }], [0.46, 0.4, 0.46, 0.54, 0.75, 0.54, 'stem'], [0.36, 0.7, 0.36, 0.64, 0.9, 0.64, 'pot_flower']],
    birdhouse: [[0.44, 0, 0.44, 0.56, 0.45, 0.56, 'bark_dark'], [0.2, 0.45, 0.2, 0.8, 0.95, 0.8, { top: 'shingles', side: 'birdhouse', bottom: P }]],
    trellis: [[0, 0, 0.44, 1, 1, 0.56, 'trellis']],
    window: [[0, 0, 0.42, 1, 1, 0.58, 'window']],
    stairs: [[0, 0, 0, 1, 0.5, 1, P], [0, 0.5, 0.5, 1, 1, 1, P]],
    chair: [[0.1, 0.45, 0.1, 0.9, 0.55, 0.9, P], [0.1, 0.55, 0.78, 0.9, 1.1, 0.9, P], [0.12, 0, 0.12, 0.24, 0.45, 0.24, P], [0.76, 0, 0.12, 0.88, 0.45, 0.24, P], [0.12, 0, 0.76, 0.24, 0.45, 0.88, P], [0.76, 0, 0.76, 0.88, 0.45, 0.88, P]],
    bench: [[0, 0.4, 0.25, 1, 0.5, 0.75, P], [0, 0.5, 0.65, 1, 0.95, 0.75, P], [0.05, 0, 0.3, 0.17, 0.4, 0.7, P], [0.83, 0, 0.3, 0.95, 0.4, 0.7, P]],
    shelf: [[0, 0.7, 0.75, 1, 0.8, 1, P], [0, 0.3, 0.75, 1, 0.4, 1, P], [0.1, 0.4, 0.8, 0.9, 0.7, 0.98, 'bookshelf'], [0, 0.8, 0.8, 1, 1, 1, 'barrel_side']],
    sign: [[0.44, 0, 0.44, 0.56, 0.55, 0.56, 'bark_dark'], [0.05, 0.5, 0.42, 0.95, 1, 0.58, 'sign']],
    ladder: [[0.1, 0, 0.84, 0.9, 1, 0.96, 'ladder']],
    windowbox: [[0.05, 0.05, 0.6, 0.95, 0.5, 1, { top: 'windowbox_top', side: P, bottom: P }]],
    door: [[0, 0, 0.4, 1, 2, 0.6, 'door']],
    dooropen: [[0, 0, 0.4, 0.2, 2, 1.4, 'door']],
    gate: [[0, 0, 0.42, 1, 1, 0.58, 'gate']],
    gateopen: [[0, 0, 0.42, 0.16, 1, 1.42, 'gate']],
    bedhead: [[0, 0, 0, 1, 0.55, 1, { top: 'bed_head', side: 'bed_side', bottom: P }], [0, 0.55, 0, 1, 0.95, 0.15, P]],
    bedfoot: [[0, 0, 0, 1, 0.55, 1, { top: 'bed_foot', side: 'bed_side', bottom: P }], [0, 0.55, 0.85, 1, 0.7, 1, P]],
  };
  const face = (id, name, shape, o) => { for (let k = 0; k < 4; k++) def(id + k, Object.assign({ name, wood: true, solid: true, shape: shapes[shape].map(bx => rot(bx, k)), facing: k, item: id, dir: true, tex: o.tex }, o.extra || {})); };
  // non-directional
  def(67, { name: 'Wood slab', wood: true, solid: true, shape: shapes.slab, tex: [P, P, P] });
  def(68, { name: 'Boardwalk', wood: true, solid: true, shape: shapes.boardwalk, tex: ['boardwalk', 'boardwalk', 'boardwalk'] });
  def(69, { name: 'Bookshelf', wood: true, solid: true, tex: [P, 'bookshelf', P] });
  def(70, { name: 'Barrel', wood: true, solid: true, tex: ['barrel_top', 'barrel_side', 'barrel_top'] });
  def(71, { name: 'Crate', wood: true, solid: true, tex: ['crate', 'crate', 'crate'] });
  def(72, { name: 'Workbench', wood: true, solid: true, tex: ['workbench_top', 'workbench_side', P] });
  def(73, { name: 'Chest', wood: true, solid: true, chest: true, tex: ['chest_top', 'chest_front', P] });
  def(74, { name: 'Wood shingles', wood: true, solid: true, tex: ['shingles', 'shingles', 'shingles'] });
  def(75, { name: 'Carved panel', wood: true, solid: true, tex: ['carved', 'carved', 'carved'] });
  def(76, { name: 'Raised garden bed', wood: true, solid: true, soil: 'compost', horizon: 'A', grassTop: true, tex: ['raisedbed_top', 'raisedbed_side', P] });
  def(77, { name: 'Rain barrel', wood: true, solid: true, tex: ['rainbarrel_top', 'barrel_side', 'barrel_top'] });
  def(78, { name: 'Table', wood: true, solid: true, shape: shapes.table, tex: [P, 'table_icon', P] });
  def(79, { name: 'Stool', wood: true, solid: true, shape: shapes.stool, tex: [P, 'stool_icon', P] });
  def(80, { name: 'Lantern', wood: true, solid: false, shape: shapes.lantern, tex: ['lantern', 'lantern', 'lantern'], lit: true });
  def(81, { name: 'Torch', wood: true, solid: false, shape: shapes.torch, cutout: true, tex: ['flame', 'torch_icon', 'flame'], lit: true });
  def(82, { name: 'Flower pot', wood: true, solid: false, shape: shapes.flowerpot, tex: ['pot_top', 'pot_icon', 'terracotta'] });
  def(83, { name: 'Birdhouse', wood: true, solid: true, shape: shapes.birdhouse, tex: ['shingles', 'birdhouse', P] });
  def(84, { name: 'Trellis', wood: true, solid: true, shape: shapes.trellis, cutout: true, tex: ['trellis', 'trellis', 'trellis'], item: 84, dir: true, facing: 0 });
  def(85, { name: 'Trellis', wood: true, solid: true, shape: shapes.trellis.map(bx => rot(bx, 1)), cutout: true, tex: ['trellis', 'trellis', 'trellis'], item: 84, dir: true, facing: 1, hidden: true });
  def(86, { name: 'Window', wood: true, solid: true, shape: shapes.window, cutout: true, tex: ['window', 'window', 'window'], item: 86, dir: true, facing: 0, pane: true });
  def(87, { name: 'Window', wood: true, solid: true, shape: shapes.window.map(bx => rot(bx, 1)), cutout: true, tex: ['window', 'window', 'window'], item: 86, dir: true, facing: 1, pane: true, hidden: true });
  // directional (4 ids each)
  face(90, 'Wood stairs', 'stairs', { tex: [P, 'stairs_icon', P] });
  face(94, 'Chair', 'chair', { tex: [P, 'chair_icon', P] });
  face(98, 'Bench', 'bench', { tex: [P, 'bench_icon', P] });
  face(102, 'Wall shelf', 'shelf', { tex: [P, 'bookshelf', P], extra: { solid: false } });
  face(106, 'Sign', 'sign', { tex: ['sign', 'sign', 'sign'], extra: { solid: false } });
  face(110, 'Ladder', 'ladder', { tex: ['ladder', 'ladder', 'ladder'], extra: { solid: false, climb: true, cutout: true } });
  face(114, 'Window box', 'windowbox', { tex: ['windowbox_top', 'windowbox_icon', P], extra: { solid: false } });
  face(118, 'Door', 'door', { tex: ['door', 'door', 'door'], extra: { tall: true } }); for (let k = 0; k < 4; k++) { B[118 + k].toggle = 122 + k; }
  face(122, 'Door (open)', 'dooropen', { tex: ['door', 'door', 'door'], extra: { solid: false, tall: true, hidden: true } }); for (let k = 0; k < 4; k++) { B[122 + k].toggle = 118 + k; B[122 + k].item = 118; }
  face(126, 'Picket gate', 'gate', { tex: ['gate', 'gate', 'gate'], extra: { fence: false } }); for (let k = 0; k < 4; k++) { B[126 + k].toggle = 130 + k; }
  face(130, 'Picket gate (open)', 'gateopen', { tex: ['gate', 'gate', 'gate'], extra: { solid: false, hidden: true } }); for (let k = 0; k < 4; k++) { B[130 + k].toggle = 126 + k; B[130 + k].item = 126; }
  face(134, 'Bed', 'bedhead', { tex: ['bed_head', 'bed_side', P], extra: { bedPart: 'head' } });
  face(138, 'Bed', 'bedfoot', { tex: ['bed_foot', 'bed_side', P], extra: { bedPart: 'foot', hidden: true } }); for (let k = 0; k < 4; k++) B[138 + k].item = 134;
  // monument stone (Giza and Machu Picchu)
  def(191, { name: 'Limestone block', solid: true, rock: true, tex: ['limestone', 'limestone', 'limestone'] });
  def(192, { name: 'Tura casing stone', solid: true, rock: true, tex: ['casing', 'casing', 'casing'] });
  def(193, { name: 'Red granite', solid: true, rock: true, tex: ['granite', 'granite', 'granite'] });
  def(194, { name: 'Inca ashlar', solid: true, rock: true, tex: ['inca', 'inca', 'inca'] });
  // ores in the deep stone, and the yellow brick of the roads
  def(195, { name: 'Gold ore', solid: true, rock: true, ore: true, tex: ['ore_gold', 'ore_gold', 'ore_gold'] });
  def(196, { name: 'Silver ore', solid: true, rock: true, ore: true, tex: ['ore_silver', 'ore_silver', 'ore_silver'] });
  def(197, { name: 'Copper ore', solid: true, rock: true, ore: true, tex: ['ore_copper', 'ore_copper', 'ore_copper'] });
  def(198, { name: 'Yellow brick', solid: true, rock: true, tex: ['yellowbrick', 'yellowbrick', 'yellowbrick'] });
  def(199, { name: 'Pond liner (puddled clay)', solid: true, tex: ['pondliner', 'pondliner', 'pondliner'], gear: true });
  def(222, { name: 'Snow', solid: true, snow: true, tex: ['snow', 'snow', 'snow'] });
  def(223, { name: 'Tundra lichen mat', soil: 'gelisol', horizon: 'O', tex: ['tundra_top', 'tundra_side', 'permafrost'], solid: true, grassTop: true });
  def(224, { name: 'Permafrost', soil: 'gelisol', horizon: 'Cf', tex: ['permafrost', 'permafrost', 'permafrost'], solid: true });
  def(225, { name: 'Ice', solid: true, ice: true, transparent: true, cutout: true, shape: [[0, 0, 0, 1, 1, 1, 'ice']], tex: ['ice', 'ice', 'ice'] });
  def(221, { name: 'Black basalt', solid: true, rock: true, tex: ['basalt', 'basalt', 'basalt'] });
  def(220, { name: 'Solar panel', solid: true, special: 'solar', gear: true, shape: [[0, 0, 0, 1, 0.2, 1, 'solar']], tex: ['solar', 'solar', 'solar'] });
  def(146, { name: 'Beehive', wood: true, solid: true, hive: true, tex: ['beehive_top', 'beehive', 'planks'] });
  // ---------- garden gear (25 essentials) ----------
  // tilled soil: one variant per topsoil, keeps that soil's chemistry
  const TILL = [[147, 1, 'alfisol', 'Tilled forest soil'], [148, 3, 'mollisol', 'Tilled prairie soil'], [149, 5, 'aridisol', 'Tilled desert soil'], [150, 7, 'oxisol', 'Tilled rainforest soil'], [151, 9, 'spodosol', 'Tilled boreal soil'], [152, 12, 'histosol', 'Tilled peat'], [153, 17, 'compost', 'Tilled compost soil'], [226, 223, 'gelisol', 'Tilled tundra soil']];
  BC.TILL_FOR = {}; BC.UNTILL = {}; TILL.forEach(([id, from, soil, name]) => { def(id, { name, soil, horizon: 'Ap', tilled: true, solid: true, grassTop: false, tex: ['tilled', B[from].tex[1], B[from].tex[2]], item: from }); BC.TILL_FOR[from] = id; BC.UNTILL[id] = from; });
  def(154, { name: 'Glass', solid: true, transparent: true, cutout: true, shape: [[0, 0, 0, 1, 1, 1, 'glass']], tex: ['glass', 'glass', 'glass'], gear: true });
  def(155, { name: 'Stone wall', solid: true, fence: true, tex: ['stonewall', 'stonewall', 'stonewall'], gear: true });
  def(156, { name: 'Compost bin', wood: true, solid: true, special: 'compost_bin', tex: ['compostbin_top', 'compostbin', 'planks'], gear: true });
  def(157, { name: 'Sprinkler', wood: true, solid: false, special: 'sprinkler', shape: [[0.42, 0, 0.42, 0.58, 0.7, 0.58, 'bark_dark'], [0.3, 0.7, 0.3, 0.7, 0.85, 0.7, 'sprinkler']], tex: ['sprinkler', 'sprinkler', 'sprinkler'], gear: true });
  def(158, { name: 'Scarecrow', wood: true, solid: false, special: 'scarecrow', shape: [[0.46, 0, 0.46, 0.54, 1.6, 0.54, 'bark_dark'], [0.05, 1.0, 0.44, 0.95, 1.1, 0.56, 'bark_dark'], [0.25, 0.7, 0.35, 0.75, 1.3, 0.65, 'scarecrow'], [0.35, 1.3, 0.35, 0.65, 1.6, 0.65, 'straw_face'], [0.2, 1.58, 0.2, 0.8, 1.68, 0.8, 'straw_hat']], tex: ['scarecrow', 'scarecrow', 'scarecrow'], gear: true });
  def(159, { name: 'Fish trap', wood: true, solid: false, special: 'fish_trap', shape: [[0.1, 0, 0.1, 0.9, 0.6, 0.9, 'fishtrap']], tex: ['fishtrap', 'fishtrap', 'fishtrap'], gear: true });
  def(160, { name: 'Bird feeder', wood: true, solid: false, special: 'bird_feeder', shape: [[0.46, 0, 0.46, 0.54, 0.8, 0.54, 'bark_dark'], [0.2, 0.8, 0.2, 0.8, 0.9, 0.8, 'planks'], [0.3, 0.9, 0.3, 0.7, 1.15, 0.7, 'birdfeeder'], [0.15, 1.15, 0.15, 0.85, 1.25, 0.85, 'shingles']], tex: ['birdfeeder', 'birdfeeder', 'birdfeeder'], gear: true });
  def(161, { name: 'Bat house', wood: true, solid: false, special: 'bat_house', shape: [[0.46, 0, 0.46, 0.54, 0.5, 0.54, 'bark_dark'], [0.2, 0.5, 0.35, 0.8, 1.3, 0.65, 'bathouse']], tex: ['bathouse', 'bathouse', 'bathouse'], gear: true });
  def(162, { name: 'Well', solid: true, special: 'well', wellWater: true, shape: [[0, 0, 0, 1, 0.8, 1, { top: 'water', side: 'stonewall', bottom: 'stone' }], [0.08, 0.8, 0.08, 0.2, 1.6, 0.2, 'bark_dark'], [0.8, 0.8, 0.8, 0.92, 1.6, 0.92, 'bark_dark'], [0, 1.6, 0, 1, 1.75, 1, 'shingles']], tex: ['stonewall', 'stonewall', 'stonewall'], gear: true });
  def(163, { name: 'Drip line', wood: true, solid: false, special: 'drip', shape: [[0, 0, 0.42, 1, 0.12, 0.58, 'dripline'], [0.42, 0, 0, 0.58, 0.12, 1, 'dripline']], tex: ['dripline', 'dripline', 'dripline'], gear: true });
  def(164, { name: 'Weather vane', wood: true, solid: false, special: 'vane', shape: [[0.46, 0, 0.46, 0.54, 1.2, 0.54, 'bark_dark'], [0.15, 1.2, 0.46, 0.85, 1.32, 0.54, 'vane'], [0.3, 1.0, 0.3, 0.7, 1.08, 0.7, 'bark_dark']], tex: ['vane', 'vane', 'vane'], gear: true });
  def(165, { name: 'Insect hotel', wood: true, solid: true, special: 'insect_hotel', habitat: true, tex: ['shingles', 'insecthotel', 'planks'], gear: true });
  def(166, { name: 'Mushroom log', wood: true, solid: true, special: 'mushroom_log', shape: [[0.1, 0, 0.1, 0.9, 0.6, 0.9, { top: 'mushlog', side: 'mushlog', bottom: 'bark_dark' }]], tex: ['mushlog', 'mushlog', 'mushlog'], gear: true });
  def(167, { name: 'Waypoint flag', wood: true, solid: false, special: 'flag', shape: [[0.46, 0, 0.46, 0.54, 1.8, 0.54, 'bark_dark'], [0.54, 1.2, 0.47, 1.1, 1.75, 0.53, 'flag']], tex: ['flag', 'flag', 'flag'], gear: true });
  def(168, { name: 'Clay olla', solid: false, special: 'olla', shape: [[0.3, 0, 0.3, 0.7, 0.35, 0.7, 'terracotta'], [0.38, 0.35, 0.38, 0.62, 0.5, 0.62, 'terracotta']], tex: ['terracotta', 'terracotta', 'terracotta'], gear: true });
  // ---------- solid metals (ids above 255: world.blocks is a Uint16Array) ----------
  def(227, { name: 'Gold block', solid: true, metal: true, tex: ['gold_block', 'gold_block', 'gold_block'] });
  def(228, { name: 'Silver block', solid: true, metal: true, tex: ['silver_block', 'silver_block', 'silver_block'] });
  def(229, { name: 'Copper block', solid: true, metal: true, tex: ['copper_block', 'copper_block', 'copper_block'] });
  def(230, { name: 'Weathered copper (verdigris)', solid: true, metal: true, tex: ['verdigris', 'verdigris', 'verdigris'] });
  // ---------- 20 carpentry shapes for realistic villages and homes ----------
  // iso: true makes the hotbar draw a little 3-D view of the shape instead of a flat tile.
  Object.assign(shapes, {
    upperslab: [[0, 0.5, 0, 1, 1, 1, P]],
    post: [[0.3, 0, 0.3, 0.7, 1, 0.7, P]],
    column: [[0.36, 0.1, 0.36, 0.64, 0.9, 0.64, 'column'], [0.2, 0, 0.2, 0.8, 0.1, 0.8, P], [0.2, 0.9, 0.2, 0.8, 1, 0.8, P], [0.3, 0.82, 0.3, 0.7, 0.9, 0.7, P], [0.3, 0.1, 0.3, 0.7, 0.18, 0.7, P]],
    hatch: [[0, 0, 0, 1, 0.12, 1, { top: 'hatch', side: P, bottom: P }]],
    beam: [[0, 0.65, 0.3, 1, 1, 0.7, 'beam']],
    railing: [[0, 0.82, 0.42, 1, 0.95, 0.58, P], [0.06, 0, 0.44, 0.16, 0.82, 0.56, P], [0.3, 0, 0.45, 0.38, 0.82, 0.55, P], [0.54, 0, 0.45, 0.62, 0.82, 0.55, P], [0.78, 0, 0.45, 0.88, 0.82, 0.55, P], [0, 0.12, 0.45, 1, 0.2, 0.55, P]],
    shutters: [[0, 0.08, 0, 0.42, 0.92, 0.1, 'shutter'], [0.58, 0.08, 0, 1, 0.92, 0.1, 'shutter']],
    roofslope: [[0, 0, 0, 1, 0.25, 1, 'shingles'], [0, 0.25, 0.25, 1, 0.5, 1, 'shingles'], [0, 0.5, 0.5, 1, 0.75, 1, 'shingles'], [0, 0.75, 0.75, 1, 1, 1, 'shingles']],
    ridge: [[0, 0, 0, 1, 0.34, 1, 'shingles'], [0, 0.34, 0.17, 1, 0.67, 0.83, 'shingles'], [0, 0.67, 0.34, 1, 1, 0.66, 'shingles']],
    awning: [[0, 0.8, 0, 1, 0.92, 1, { top: 'shingles', side: 'shingles', bottom: P }], [0.1, 0.55, 0.8, 0.22, 0.8, 1, P], [0.78, 0.55, 0.8, 0.9, 0.8, 1, P], [0.1, 0.55, 0.6, 0.22, 0.65, 1, P], [0.78, 0.55, 0.6, 0.9, 0.65, 1, P]],
    logwall: [[0, 0, 0.1, 1, 0.33, 0.9, { top: 'bark_dark', side: 'logwall', bottom: 'bark_dark' }], [0, 0.33, 0.06, 1, 0.67, 0.94, { top: 'bark_dark', side: 'logwall', bottom: 'bark_dark' }], [0, 0.67, 0.1, 1, 1, 0.9, { top: 'bark_dark', side: 'logwall', bottom: 'bark_dark' }]],
    wainscot: [[0, 0, 0.84, 1, 0.56, 1, 'carved'], [0, 0.56, 0.78, 1, 0.64, 1, P], [0, 0, 0.78, 1, 0.08, 1, P]],
    cupboard: [[0, 0, 0.3, 1, 0.86, 1, { top: P, side: 'cupboard', bottom: P }], [0, 0.86, 0.22, 1, 0.94, 1, { top: 'counter', side: P, bottom: P }]],
    splitrail: [[0.38, 0.22, 0, 0.62, 0.36, 1, 'beam'], [0.38, 0.58, 0, 0.62, 0.72, 1, 'beam'], [0.34, 0, 0.34, 0.66, 0.9, 0.66, 'bark_dark']],
    pergola: [[0, 0.82, 0, 1, 1, 0.14, 'beam'], [0, 0.82, 0.43, 1, 1, 0.57, 'beam'], [0, 0.82, 0.86, 1, 1, 1, 'beam'], [0, 0.7, 0.3, 1, 0.82, 0.7, 'beam']],
    arch: [[0, 0.5, 0.3, 0.22, 1, 0.7, P], [0.78, 0.5, 0.3, 1, 1, 0.7, P], [0.12, 0.68, 0.3, 0.3, 1, 0.7, P], [0.7, 0.68, 0.3, 0.88, 1, 0.7, P], [0.22, 0.82, 0.3, 0.78, 1, 0.7, P]],
    cornerboards: [[0, 0, 0, 0.14, 1, 1, P], [0, 0, 0, 1, 1, 0.14, P], [0.14, 0, 0.14, 1, 1, 1, 'clapboard']],
    balcony: [[0, 0, 0, 1, 0.14, 1, { top: 'boardwalk', side: P, bottom: P }], [0, 0.82, 0, 1, 0.94, 0.12, P], [0.05, 0.14, 0.02, 0.15, 0.82, 0.1, P], [0.3, 0.14, 0.03, 0.38, 0.82, 0.09, P], [0.54, 0.14, 0.03, 0.62, 0.82, 0.09, P], [0.8, 0.14, 0.02, 0.9, 0.82, 0.1, P]],
  });
  const iso = { iso: true };
  def(231, { name: 'Upper slab', wood: true, solid: true, shape: shapes.upperslab, tex: [P, P, P], iso: true });
  def(232, { name: 'Timber post', wood: true, solid: true, shape: shapes.post, tex: [P, P, P], iso: true });
  def(233, { name: 'Porch column', wood: true, solid: true, shape: shapes.column, tex: [P, 'column', P], iso: true });
  def(234, { name: 'Timber-frame wall', wood: true, solid: true, tex: ['planks', 'halftimber', 'planks'] });
  def(235, { name: 'Clapboard siding', wood: true, solid: true, tex: ['planks', 'clapboard', 'planks'] });
  def(236, { name: 'Floor hatch', wood: true, solid: true, shape: shapes.hatch, tex: ['hatch', 'hatch', P], iso: true });
  face(240, 'Timber beam', 'beam', { tex: ['beam', 'beam', 'beam'], extra: iso });
  face(244, 'Porch railing', 'railing', { tex: [P, P, P], extra: iso });
  face(248, 'Window shutters', 'shutters', { tex: ['shutter', 'shutter', 'shutter'], extra: { iso: true, solid: false } });
  face(252, 'Roof slope', 'roofslope', { tex: ['shingles', 'shingles', 'shingles'], extra: iso });
  face(256, 'Roof ridge', 'ridge', { tex: ['shingles', 'shingles', 'shingles'], extra: iso });
  face(260, 'Awning', 'awning', { tex: ['shingles', 'shingles', P], extra: iso });
  face(264, 'Log cabin wall', 'logwall', { tex: ['bark_dark', 'logwall', 'bark_dark'], extra: iso });
  face(268, 'Wainscot panel', 'wainscot', { tex: ['carved', 'carved', 'carved'], extra: { iso: true, solid: false } });
  face(272, 'Kitchen cupboard', 'cupboard', { tex: ['counter', 'cupboard', P], extra: iso });
  face(276, 'Split-rail fence', 'splitrail', { tex: ['beam', 'beam', 'beam'], extra: { iso: true, fence: true } });
  face(280, 'Pergola rafters', 'pergola', { tex: ['beam', 'beam', 'beam'], extra: iso });
  face(284, 'Arch top', 'arch', { tex: [P, P, P], extra: iso });
  face(288, 'Corner boards', 'cornerboards', { tex: ['planks', 'clapboard', 'planks'], extra: iso });
  face(292, 'Balcony', 'balcony', { tex: ['boardwalk', P, P], extra: iso });
  BC.CARPENTRY = [231, 232, 233, 234, 235, 236, 240, 244, 248, 252, 256, 260, 264, 268, 272, 276, 280, 284, 288, 292];
  BC.METALS = [227, 228, 229, 230];
  // ---------- gems: ore in the bedrock, cut gems, and translucent crystal blocks (ids 400+, clear of leaf ids) ----------
  BC.GEMS = [
    { id: 'diamond', name: 'Diamond', color: '#dff6ff', price: 30, teach: 'Pure carbon squeezed 150 km down and shot to the surface in kimberlite pipes. The hardest natural thing there is. In West Africa the thorny Pandanus candelabrum palm grows only on kimberlite soil, so botanists prospect for diamonds by looking for the plant.' },
    { id: 'sapphire', name: 'Sapphire', color: '#2f5fd8', price: 20, teach: 'Corundum, aluminium oxide, second only to diamond in hardness. Traces of iron and titanium make it blue; the same mineral with chromium is a ruby. Montana\'s Yogo Gulch sapphires are the best in America.' },
    { id: 'onyx', name: 'Black onyx', color: '#1a1520', price: 8, teach: 'Banded chalcedony: quartz grown in layers so fine it looks like black glass. Most black onyx sold today is grey agate soaked in sugar and then acid, a trick the Romans already used.' },
    { id: 'opal', name: 'Opal', color: '#f0e6f4', price: 12, teach: 'Not a crystal at all but hydrated silica spheres stacked like oranges, which split light into flashes of colour. Grasses make opal too: phytoliths, microscopic opal grains in their leaves that blunt grazers\' teeth and last thousands of years in soil, so archaeologists read ancient fields from them.' },
    { id: 'emerald', name: 'Emerald', color: '#1fa85a', price: 24, teach: 'Beryl coloured green by a pinch of chromium or vanadium. Nearly every emerald is flawed inside; jewellers call the inclusions its garden. North Carolina\'s Hiddenite mines are the only US source.' },
    { id: 'amethyst', name: 'Amethyst', color: '#8a4ad8', price: 6, teach: 'Quartz with traces of iron, turned violet by natural radiation underground. Heat it and it becomes yellow citrine. Geodes form when silica-rich water fills a gas bubble in lava and crystals grow inward over millions of years.' },
  ];
  BC.GEM_BY_ID = {}; BC.GEM_ORE = {}; BC.GEM_BLOCK = {};
  BC.GEMS.forEach((gd, i) => {
    BC.GEM_BY_ID[gd.id] = gd; BC.GEM_ORE[gd.id] = 400 + i; BC.GEM_BLOCK[gd.id] = 410 + i;
    def(400 + i, { name: gd.name + ' ore', solid: true, rock: true, ore: true, gem: gd.id, tex: ['ore_' + gd.id, 'ore_' + gd.id, 'ore_' + gd.id] });
    if (gd.id === 'onyx') def(410 + i, { name: gd.name + ' block', solid: true, rock: true, gemBlock: gd.id, tex: ['gem_onyx', 'gem_onyx', 'gem_onyx'] });
    else def(410 + i, { name: gd.name + ' block', solid: true, gemBlock: gd.id, transparent: true, cutout: true, lit: true, shape: [[0, 0, 0, 1, 1, 1, 'gem_' + gd.id]], tex: ['gem_' + gd.id, 'gem_' + gd.id, 'gem_' + gd.id] });
  });
  B[83].special = 'birdhouse'; // the birdhouse now attracts birds too
  B[77].special = 'rain_barrel'; // and rain barrels hold rain for sprinklers and drip lines
  // how tall a block really is for standing on (slabs, boardwalks, tables are not full cubes)
  BC.blockTop = id => { const b = B[id]; if (!b || !b.solid) return 0; if (!b.shape) return 1; let t = 0; for (const bx of b.shape) t = Math.max(t, bx[4]); return Math.min(1, t); };
  BC.SPECIAL_IDS = new Set(Object.keys(B).map(Number).filter(id => B[id] && B[id].special));
  BC.FACING_DIR = [[0, -1], [1, 0], [0, 1], [-1, 0]];
  BC.BLOCKS = B;
  BC.BLOCK = {
    AIR: 0, GRASS_A: 1, ALFISOL: 2, GRASS_M: 3, MOLLISOL: 4, SAND: 5, CALICHE: 6, FLOOR_O: 7, OXISOL: 8, MOSS: 9, PODZOL_E: 10, PODZOL_B: 11,
    PEAT: 12, GLEY: 13, STONE: 14, WATER: 15, GRAVEL: 16, COMPOST: 17, FENCE: 18, PLANKS: 19, GLASS: 154, POND_LINER: 199, SOLAR: 220, SNOW: 222, TUNDRA: 223, PERMAFROST: 224, ICE: 225, GOLD: 227, SILVER: 228, COPPER: 229, VERDIGRIS: 230, SAND_SEA: 5,
  };
  BC.leafIdFor = t => leafIdx(BC.TREES.indexOf(t));
  BC.isSolid = id => !!(B[id] && B[id].solid);
})();
