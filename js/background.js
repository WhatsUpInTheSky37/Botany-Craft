window.BC = window.BC || {};
BC.Background = {
  next: 0, jobs: new Map(), worker: null,
  run(kind, args) {
    return new Promise((resolve, reject) => {
      try {
        if (!this.worker) {
          this.worker = new Worker('js/world-worker.js?v=performance-1');
          this.worker.onmessage = ({ data: m }) => {
            const job = this.jobs.get(m.id); if (!job) return;
            this.jobs.delete(m.id); m.error ? job.reject(new Error(m.error)) : job.resolve(m.result);
          };
          this.worker.onerror = e => {
            this.jobs.forEach(j => j.reject(new Error(e.message || 'Background task failed.')));
            this.jobs.clear(); this.worker.terminate(); this.worker = null;
          };
        }
        const id = ++this.next; this.jobs.set(id, { resolve, reject });
        try { this.worker.postMessage({ id, kind, ...args }); }
        catch (e) { this.jobs.delete(id); reject(e); }
      } catch (e) { reject(e); }
    });
  },
  async generate(seed, W, D, H) {
    if (typeof Worker === 'undefined' || location.protocol === 'file:') {
      await new Promise(r => setTimeout(r, 0));
      const w = new BC.World(seed, W, D, H); w.generate(); return w;
    }
    const state = await this.run('generate', { seed, W, D, H });
    const w = Object.assign(Object.create(BC.World.prototype), state);
    w.rand = BC.util.rng(seed); w.rand.restore(state.randomState); w.noise = BC.util.noise2(seed); return w;
  },
  async serialize(w) {
    if (typeof Worker === 'undefined' || location.protocol === 'file:') return w.serialize();
    const state = {};
    for (const k of ['W', 'D', 'H', 'diffs', 'plants', 'genPlantKeys', 'treeAt', 'genTreeKeys', 'moisture', 'biome', 'wetBonus', 'nutrBase', 'nutr', 'omBase', 'om', 'phShift', 'mulch', 'hives', 'chests', 'meta']) state[k] = w[k];
    // Only flowing, edited water levels are needed by serialize().
    state.wlvl = {}; w.diffs.forEach((v, k) => { if (v === 15 && w.wlvl[k]) state.wlvl[k] = w.wlvl[k]; });
    return this.run('serialize', { state });
  }
};
