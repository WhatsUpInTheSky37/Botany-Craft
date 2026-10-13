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
  const logs = { oak: 20, birch: 21, spruce: 22, tropical: 23, cypress: 24, cactus: 25, mesquite: 26, paloverde: 27 };
  Object.keys(logs).forEach(k => def(logs[k], { name: k === 'cactus' ? 'Saguaro trunk' : { oak: 'Oak log', birch: 'Birch log', spruce: 'Spruce log', tropical: 'Hardwood log', cypress: 'Cypress log', mesquite: 'Mesquite log', paloverde: 'Palo verde log' }[k], log: k, tex: [k === 'cactus' ? 'cactus_top' : 'log_top_' + k, k === 'cactus' ? 'cactus' : 'log_' + k, k === 'cactus' ? 'cactus_top' : 'log_top_' + k], solid: true }));
  BC.LOG_IDS = logs;
  BC.LEAF_BASE = 30;
  BC.TREES.forEach((t, i) => { if (t.leaf) def(30 + i, { name: 'Leaves', leaves: true, tree: t.id, tex: ['leaves_' + t.id, 'leaves_' + t.id, 'leaves_' + t.id], solid: true }); });
  BC.BLOCKS = B;
  BC.BLOCK = {
    AIR: 0, GRASS_A: 1, ALFISOL: 2, GRASS_M: 3, MOLLISOL: 4, SAND: 5, CALICHE: 6, FLOOR_O: 7, OXISOL: 8, MOSS: 9, PODZOL_E: 10, PODZOL_B: 11,
    PEAT: 12, GLEY: 13, STONE: 14, WATER: 15, GRAVEL: 16, COMPOST: 17, FENCE: 18, PLANKS: 19,
  };
  BC.leafIdFor = t => 30 + BC.TREES.indexOf(t);
  BC.isSolid = id => !!(B[id] && B[id].solid);
})();
