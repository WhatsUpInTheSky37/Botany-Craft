window.BC = window.BC || {};
// Keep the preceding successful save in the same transaction as its replacement.
BC.Storage = {
  open() {
    if (!this.db) this.db = new Promise((resolve, reject) => {
      const r = indexedDB.open('botany-world', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('saves');
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => { this.db = null; reject(r.error); };
      r.onblocked = () => { this.db = null; reject(new Error('Close other game tabs to enable saving.')); };
    });
    return this.db;
  },
  async read(key) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const r = db.transaction('saves').objectStore('saves').get(key);
      r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error);
    });
  },
  async write(key, data) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('saves', 'readwrite'), s = tx.objectStore('saves');
      const old = s.get(key);
      old.onsuccess = () => { if (old.result) s.put(old.result, key + ':backup'); s.put(data, key); };
      tx.oncomplete = () => resolve(); tx.onabort = tx.onerror = () => reject(tx.error || new Error('Save transaction failed.'));
    });
  },
  async remove(key) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('saves', 'readwrite'), s = tx.objectStore('saves');
      s.delete(key); s.delete(key + ':backup');
      tx.oncomplete = () => resolve(); tx.onabort = tx.onerror = () => reject(tx.error);
    });
  }
};
