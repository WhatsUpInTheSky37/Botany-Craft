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
  BC.LEAF_BASE = 30;
  BC.TREES.forEach((t, i) => { if (t.leaf) def(30 + i, { name: 'Leaves', leaves: true, tree: t.id, tex: ['leaves_' + t.id, 'leaves_' + t.id, 'leaves_' + t.id], solid: true }); });
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
  def(146, { name: 'Beehive', wood: true, solid: true, hive: true, tex: ['beehive_top', 'beehive', 'planks'] });
  BC.FACING_DIR = [[0, -1], [1, 0], [0, 1], [-1, 0]];
  BC.BLOCKS = B;
  BC.BLOCK = {
    AIR: 0, GRASS_A: 1, ALFISOL: 2, GRASS_M: 3, MOLLISOL: 4, SAND: 5, CALICHE: 6, FLOOR_O: 7, OXISOL: 8, MOSS: 9, PODZOL_E: 10, PODZOL_B: 11,
    PEAT: 12, GLEY: 13, STONE: 14, WATER: 15, GRAVEL: 16, COMPOST: 17, FENCE: 18, PLANKS: 19,
  };
  BC.leafIdFor = t => 30 + BC.TREES.indexOf(t);
  BC.isSolid = id => !!(B[id] && B[id].solid);
})();
