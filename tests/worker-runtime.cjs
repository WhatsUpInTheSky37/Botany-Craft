// Browser worker bridge for deterministic tests without a browser or network.
const { parentPort } = require('node:worker_threads');
const fs = require('node:fs'), vm = require('node:vm'), path = require('node:path');
global.self = global;
global.importScripts = (...names) => names.forEach(name => vm.runInThisContext(fs.readFileSync(path.join(__dirname, '../js', name), 'utf8'), { filename: name }));
global.postMessage = (m, transfer) => parentPort.postMessage(m, transfer);
importScripts('world-worker.js');
parentPort.on('message', data => global.onmessage({ data }));
