window.BC = window.BC || {};
// Shared worlds: cloud save (Supabase RPC) and live multiplayer (Supabase Realtime broadcast + presence).
BC.Net = class Net {
  constructor(game) {
    this.game = game; this.sb = null; this.creds = null; this.channel = null; this.peers = new Map(); this.me = null; this.isHost = false; this.hostKey = null;
    this.myKey = Math.random().toString(36).slice(2, 10); this.handlers = {}; this.joinedAt = 0; this.outbox = 0; this.live = false; this.status = 'off'; this.lastError = null;
  }
  client() { if (!this.sb) { if (!window.supabase) throw new Error('Multiplayer library did not load. Check your internet connection.'); this.sb = window.supabase.createClient(BC.CONFIG.supabaseUrl, BC.CONFIG.supabaseKey, { realtime: { params: { eventsPerSecond: 40 } }, auth: { persistSession: false } }); } return this.sb; }
  static slug(p) { return String(p || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); }
  friendly(e) { const m = (e && e.message) || String(e); if (m.includes('WORLD_NOT_FOUND')) return 'No shared world has that name.'; if (m.includes('BAD_PIN')) return 'Wrong PIN for that world.'; if (m.includes('WORLD_EXISTS')) return 'A world with that name already exists. Join it, or pick another name.'; if (m.includes('NAME_TOO_SHORT')) return 'World name needs at least 3 letters or numbers.'; if (m.includes('PIN_TOO_SHORT')) return 'PIN needs at least 4 characters.'; if (m.includes('Failed to fetch')) return 'Could not reach the server. Check your connection.'; return m; }
  async rpc(fn, args) { const { data, error } = await this.client().rpc(fn, args); if (error) throw new Error(this.friendly(error)); return data; }
  // ---- cloud save ----
  createWorld(name, pin, seed, region, state) { return this.rpc('bc_world_create', { p_name: name, p_pin: pin, p_seed: seed, p_region: region, p_state: state }); }
  loadWorld(name, pin) { return this.rpc('bc_world_load', { p_name: name, p_pin: pin }); }
  saveWorld(state) { return this.rpc('bc_world_save', { p_name: this.creds.world, p_pin: this.creds.pin, p_state: state }); }
  worldVersion() { return this.rpc('bc_world_version', { p_name: this.creds.world, p_pin: this.creds.pin }); }
  loadPlayer() { return this.rpc('bc_player_load', { p_world: this.creds.world, p_pin: this.creds.pin, p_player: this.creds.player }); }
  savePlayer(state) { return this.rpc('bc_player_save', { p_world: this.creds.world, p_pin: this.creds.pin, p_player: this.creds.player, p_state: state }); }
  listWorlds() { return this.rpc('bc_world_list', {}); }
  listPlayers() { return this.rpc('bc_world_players', { p_world: this.creds.world, p_pin: this.creds.pin }); }
  // ---- realtime ----
  on(event, fn) { this.handlers[event] = fn; }
  join(worldId, playerName, color) {
    return new Promise((resolve, reject) => {
      const sb = this.client(); this.joinedAt = Date.now(); this.me = playerName; this.myColor = color || '#4f7a3a'; this.lastError = null; this.status = 'connecting'; let settled = false;
      const ch = sb.channel('bc:' + worldId, { config: { presence: { key: this.myKey }, broadcast: { self: false, ack: false } } });
      this.channel = ch;
      ch.on('presence', { event: 'sync' }, () => this.syncPresence());
      ch.on('presence', { event: 'join' }, () => this.syncPresence());
      ch.on('presence', { event: 'leave' }, () => this.syncPresence());
      ch.on('broadcast', { event: '*' }, msg => { const h = this.handlers[msg.event]; if (h && msg.payload && msg.payload.from !== this.myKey) h(msg.payload, msg.payload.from); });
      const fail = msg => { this.lastError = msg; this.status = 'failed'; this.live = false; if (!settled) { settled = true; clearTimeout(timer); reject(new Error(msg)); } this.game.onLiveChange(); };
      const timer = setTimeout(() => fail('Timed out connecting to the live session (no reply from the server in 20 s).'), 20000);
      ch.subscribe(async (status, err) => {
        if (status === 'SUBSCRIBED') { try { await ch.track({ name: playerName, joined: this.joinedAt, color: this.myColor }); } catch (e) { } this.live = true; this.status = 'live'; this.lastError = null; this.game.onLiveChange(); if (!settled) { settled = true; clearTimeout(timer); resolve(); } }
        else if (status === 'CHANNEL_ERROR') fail('Live session refused: ' + (err && err.message ? err.message : 'channel error'));
        else if (status === 'TIMED_OUT') fail('Live session timed out.');
        else if (status === 'CLOSED') { if (settled) { this.live = false; this.status = 'closed'; this.lastError = 'Live connection closed.'; this.game.onLiveChange(); } }
      });
    });
  }
  syncPresence() {
    const state = this.channel.presenceState(); const list = [];
    Object.keys(state).forEach(key => { const p = state[key][0]; if (p) list.push({ key, name: p.name, joined: p.joined, color: p.color }); });
    this.applyPresence(list);
  }
  applyPresence(list) {
    list.sort((a, b) => a.joined - b.joined || (a.key < b.key ? -1 : 1));
    const wasHost = this.isHost; this.hostKey = list.length ? list[0].key : this.myKey; this.isHost = this.hostKey === this.myKey;
    const seen = new Set(list.map(p => p.key)); this.peers.forEach((v, k) => { if (!seen.has(k)) { this.peers.delete(k); this.game.onPeerLeft(k); } });
    list.forEach(p => { if (p.key !== this.myKey && !this.peers.has(p.key)) { this.peers.set(p.key, { name: p.name, color: p.color }); this.game.onPeerJoined(p.key, p.name, p.color); } });
    this.online = list; this.game.onPresence(list, this.isHost, wasHost);
  }
  send(event, payload) { if (!this.channel) return; payload = payload || {}; payload.from = this.myKey; this.outbox++; this.channel.send({ type: 'broadcast', event, payload }).catch(() => { }); }
  async leave() { this.live = false; this.status = 'off'; if (this.channel) { try { await this.channel.untrack(); await this.client().removeChannel(this.channel); } catch (e) { } this.channel = null; } this.peers.clear(); this.isHost = false; }
};
