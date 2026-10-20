window.BC = window.BC || {};
// Cache-bust the worker with the same version stamp as this script so a rebuilt world.js is never paired with a stale worker.
const BG_VER = (typeof document !== 'undefined' && document.currentScript && document.currentScript.src.split('?v=')[1]) || 'dev';
BC.Background = {
  next: 0, jobs: new Map(), worker: null, broken: false, // broken: the worker could not load (single-file build, blocked workers); fall back to the main thread
  run(kind, args) {
    return new Promise((resolve, reject) => {
      try {
        if (!this.worker) {
          this.worker = new Worker('js/world-worker.js?v=' + BG_VER);
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
  async syncGenerate(seed, W, D, H) { await new Promise(r => setTimeout(r, 0)); const w = new BC.World(seed, W, D, H); w.generate(); return w; },
  async generate(seed, W, D, H) {
    if (typeof Worker === 'undefined' || location.protocol === 'file:' || this.broken) return this.syncGenerate(seed, W, D, H);
    let state;
    try { state = await this.run('generate', { seed, W, D, H }); }
    catch (e) { console.warn('World worker unavailable (' + e.message + '); generating on the main thread.'); this.broken = true; return this.syncGenerate(seed, W, D, H); }
    const w = Object.assign(Object.create(BC.World.prototype), state);
    w.rand = BC.util.rng(seed); w.rand.restore(state.randomState); w.noise = BC.util.noise2(seed); return w;
  },
  async serialize(w) {
    if (typeof Worker === 'undefined' || location.protocol === 'file:' || this.broken) return w.serialize();
    const state = {};
    for (const k of ['W', 'D', 'H', 'diffs', 'plants', 'genPlantKeys', 'treeAt', 'genTreeKeys', 'moisture', 'biome', 'wetBonus', 'nutrBase', 'nutr', 'omBase', 'om', 'phShift', 'mulch', 'hives', 'chests', 'meta']) state[k] = w[k];
    // Only flowing, edited water levels are needed by serialize().
    state.wlvl = {}; w.diffs.forEach((v, k) => { if (v === 15 && w.wlvl[k]) state.wlvl[k] = w.wlvl[k]; });
    try { return await this.run('serialize', { state }); }
    catch (e) { console.warn('World worker unavailable (' + e.message + '); packing the save on the main thread.'); this.broken = true; return w.serialize(); }
  }
};
