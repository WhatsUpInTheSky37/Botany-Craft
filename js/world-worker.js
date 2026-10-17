// CPU-heavy generation and save packing run outside the render thread.
self.window = self;
importScripts('util.js', 'data/soils.js', 'data/biomes.js', 'data/plants.js', 'data/trees.js', 'data/animals.js', 'data/npcs.js', 'blocks.js', 'world.js', 'wonders.js', 'roads.js');
self.onmessage = ({ data: m }) => {
  try {
    if (m.kind === 'generate') {
      const w = new BC.World(m.seed, m.W, m.D, m.H); w.generate();
      const state = Object.fromEntries(Object.entries(w).filter(([, v]) => typeof v !== 'function'));
      state.randomState = w.rand.state();
      const buffers = [...new Set(Object.values(state).filter(ArrayBuffer.isView).map(v => v.buffer))];
      self.postMessage({ id: m.id, result: state }, buffers);
    } else if (m.kind === 'serialize') {
      const w = Object.assign(Object.create(BC.World.prototype), m.state);
      self.postMessage({ id: m.id, result: w.serialize() });
    }
  } catch (e) { self.postMessage({ id: m.id, error: e.message }); }
};
