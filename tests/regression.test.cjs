const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), path = require('node:path');
const { Worker } = require('node:worker_threads');
const root = path.join(__dirname, '..');
function context(files = []) {
  const c = vm.createContext({ console, performance, setTimeout, clearTimeout, structuredClone, location: { protocol: 'https:' } });
  c.window = c; c.addEventListener = () => {};
  for (const f of files) vm.runInContext(fs.readFileSync(path.join(root, 'js', f + '.js'), 'utf8'), c, { filename: f });
  return c;
}
const worldFiles = ['util', 'data/soils', 'data/biomes', 'data/plants', 'data/trees', 'data/animals', 'data/npcs', 'blocks', 'world', 'wonders', 'roads'];
function workerCall(worker, m) {
  return new Promise((resolve, reject) => {
    worker.once('error', reject);
    worker.once('message', result => result.error ? reject(new Error(result.error)) : resolve(result.result));
    worker.postMessage(m);
  });
}
test('all shipped JS parses', () => {
  function walk(dir) { for (const e of fs.readdirSync(dir, { withFileTypes: true })) { const p = path.join(dir, e.name); if (e.isDirectory()) walk(p); else if (p.endsWith('.js')) new vm.Script(fs.readFileSync(p, 'utf8'), { filename: p }); } }
  walk(path.join(root, 'js'));
});
test('disconnected guests and unsynchronized hosts cannot write shared worlds', async () => {
  const c = context(['main', 'net']);
  for (const [live, isHost, syncing, expected] of [[false,false,false,false],[false,true,false,false],[true,false,false,false],[true,true,true,false],[true,true,false,true]]) {
    const game = { mode: 'shared', net: { live, isHost }, syncRequested: syncing };
    assert.equal(c.BC.Game.prototype.isAuthority.call(game), expected);
  }
  const net = new c.BC.Net({ isAuthority: () => false }); let calls = 0; net.rpc = () => { calls++; };
  await assert.rejects(net.saveWorld({}), /connected/); assert.equal(calls, 0);
});
test('blur and pointer unlock reset keys, and Shift can dive', () => {
  const c = context(['util']); const handlers = {}, doc = {};
  c.addEventListener = (ev, fn) => handlers[ev] = fn;
  c.document = { addEventListener: (ev, fn) => doc[ev] = fn };
  c.THREE = { Vector3: class {} }; c.BC.util.isTouch = () => false;
  vm.runInContext(fs.readFileSync(path.join(root, 'js/player.js'), 'utf8'), c);
  const p = new c.BC.Player({ onKey() {}, ui: { setLockHint() {} } });
  p.bindDesktop({ addEventListener() {} });
  handlers.keydown({ code: 'KeyW' }); handlers.keydown({ code: 'ShiftLeft' }); handlers.blur();
  assert.equal(Object.keys(p.keys).length, 0); assert.equal(p.sprint, false);
  handlers.keydown({ code: 'KeyW' }); doc.pointerlockchange(); assert.equal(Object.keys(p.keys).length, 0);
  assert.match(fs.readFileSync(path.join(root, 'js/player.js'), 'utf8'), /const down = k.ShiftLeft;/);
});
test('snapshot replacement removes stale saplings and maintains chunk index', () => {
  const c = context(worldFiles), w = new c.BC.World(42,32,32);
  const p = { id:'tree:oak', x:2,y:20,z:2,wild:false,progress:0.5,health:1 };
  w.addPlant(p); assert.equal(w.plantsByChunk.get(0).size,1);
  w.restore({v:2,diffs:[],plants:[],removed:[],trees:[],moist:[],soil:[],chests:[],hives:[],meta:[]});
  assert.equal(w.plants.size,0); assert.equal(w.plantsByChunk.size,0);
  w.addPlant(p); w.removePlant(p); assert.equal(w.plantsByChunk.size,0);
});
test('worker generation matches direct generation, and packing preserves edited state', async () => {
  const c = context(worldFiles), w = new c.BC.World(42,224,224); w.generate();
  const worker = new Worker(path.join(__dirname, 'worker-runtime.cjs'));
  try {
    const state = await workerCall(worker,{id:1,kind:'generate',seed:42,W:224,D:224});
    assert.deepEqual(Buffer.from(state.blocks),Buffer.from(w.blocks));
    assert.equal(state.randomState,w.rand.state());
    assert.equal([...state.plantsByChunk.values()].reduce((n,b)=>n+b.size,0),state.plants.size);
    w.set(4,30,4,2); w.addPlant({id:'tree:oak',x:4,y:31,z:4,wild:false,progress:0.5,health:1});
    // Exercise the actual Background serializer's field selection using a Worker adapter.
    c.Worker = class { constructor() { this.w = worker; this.w.on('message',data=>this.onmessage({data})); } postMessage(m) { this.w.postMessage(m); } terminate() { this.w.terminate(); } };
    vm.runInContext(fs.readFileSync(path.join(root,'js/background.js'),'utf8'),c);
    const packed = await c.BC.Background.serialize(w);
    assert.equal(JSON.stringify(packed),JSON.stringify(w.serialize()));
    const fresh = new c.BC.World(42,224,224); fresh.generate(); fresh.restore(packed);
    assert.equal(fresh.get(4,30,4),2); assert.equal(fresh.plantAt(4,31,4).id,'tree:oak');
  } finally { await worker.terminate(); }
});
test('plant mesh rebuild only visits the requested bucket', () => {
  const c=context(['mesher']); let visits=0;
  // Empty local bucket must not inspect the global plant collection.
  const w={CX:2,plants:{forEach(){throw new Error('global scan');}},plantsByChunk:new Map([[0,{forEach(){visits++;}}]])};
  assert.equal(c.BC.Mesher.buildPlants(w,0,0),null); assert.equal(visits,1);
});
test('animal LOD releases owned geometry and textures, preserves shared material', () => {
  const c=context(['animals']); let geo=0,tex=0,mat=0,removed=0;
  const e={rig:{root:{traverse(fn){fn({geometry:{dispose(){geo++;}},material:{dispose(){throw new Error('shared material disposed');}}});fn({geometry:{dispose(){geo++;}},material:{map:{dispose(){tex++;}},dispose(){mat++;}}});}}}};
  c.BC.Animals.prototype.releaseRig.call({game:{scene:{remove(){removed++;}}}},e);
  assert.deepEqual([geo,tex,mat,removed],[2,1,1,1]); assert.equal(e.rig,null);
});
test('save failures reject, block exit, and the next save can succeed', async () => {
  const c=context(['main']); const proto=c.BC.Game.prototype;
  let fail=true,reloads=0,writes=0;
  c.document={}; c.location.reload=()=>reloads++;
  c.BC.Background={serialize:async()=>({v:2})};c.BC.Storage={write:async()=>{writes++;if(fail)throw new Error('quota');}};
  const game=Object.assign(Object.create(proto),{world:{},mode:'solo',seed:42,time:{},weather:{},animals:{serialize:()=>[]},boats:{serialize:()=>[]},wagons:{serialize:()=>[]},playerState:()=>({inventory:[]}),setSaveStatus(){},toast(){},ui:{showMenu(){}},running:true});
  await game.exitToTitle();assert.equal(reloads,0);assert.equal(game.running,true);
  fail=false;await game.save();assert.equal(writes,2);
});
test('soil scheduling eventually updates every stripe and respects pause', () => {
  const c=context([...worldFiles,'sim']);const w=new c.BC.World(42,32,32);w.moisture.fill(0.9);w.nutr.fill(0.1);
  const game={world:w,weather:{raining:false}};
  c.BC.Sim.updateSoil(game,0);assert.equal(w.soilSchedule,undefined);
  for(let i=0;i<180;i++)c.BC.Sim.updateSoil(game,1/60);
  assert.ok([...w.soilSchedule.last].every(t=>t>0));assert.ok([...w.moisture].every(m=>Number.isFinite(m)&&m<0.9));
});
test('overlapping saves commit in order', async () => {
  const c=context(['main']);let unlock, writes=[];
  c.BC.Background={serialize:async()=>({v:2})};
  c.BC.Storage={write:async(k,data)=>{writes.push(data.player.n);if(data.player.n===1)await new Promise(r=>unlock=r);}};
  let n=0;
  const g=Object.assign(Object.create(c.BC.Game.prototype),{world:{},mode:'solo',time:{},weather:{},animals:{serialize:()=>[]},boats:{serialize:()=>[]},wagons:{serialize:()=>[]},playerState:()=>({n:++n}),setSaveStatus(){},toast(){}});
  const a=g.save(),b=g.save();await new Promise(r=>setTimeout(r,10));assert.deepEqual(writes,[1]);unlock();await Promise.all([a,b]);assert.deepEqual(writes,[1,2]);
});
test('legacy localStorage saves are still loadable', async () => {
  const c=context(['main']);const data={v:1,seed:42,region:'temperate',time:{},world:{W:224,D:224}};
  c.BC.Storage={read:async()=>undefined};c.localStorage={getItem:()=>JSON.stringify(data)};
  let called=false;const g=Object.assign(Object.create(c.BC.Game.prototype),{rain:{},weather:{raining:false},startWorld(){called=true;}});
  assert.equal(await g.load(),true);assert.equal(called,true);assert.equal(g.seed,42);assert.equal(g.worldW,224);
});
test('shared reconnect failure leaves the session paused', async () => {
  const c=context(['main']);let left=false;
  const g=Object.assign(Object.create(c.BC.Game.prototype),{mode:'shared',net:{live:true,creds:{},loadWorld:async()=>{throw new Error('offline');},leave:async()=>{left=true;g.net.live=false;}},replaySync(){},toast(){}});
  await assert.rejects(g.recoverShared(),/offline/);assert.equal(left,true);assert.equal(g.sharedPaused(),true);
});
