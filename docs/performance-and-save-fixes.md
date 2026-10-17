# Performance and save reliability

## What changed

- Disconnected or unsynchronized clients cannot publish shared-world snapshots. Gameplay pauses until reconnect/synchronization completes, including dialog actions.
- Reconnects rebuild authoritative snapshots against generated terrain; stale planted plants are removed. Entity events arriving during replacement are buffered.
- Save requests run in order. Failed saves stay visible and prevent Save and exit from closing the game. Direct tab closure shows the browser's unsaved-progress prompt; use Save and exit to wait for completion.
- Solo saves use IndexedDB with the previous successful version retained transactionally. Existing `botanycraft_save_v1` localStorage saves remain readable and are not deleted during migration. Shared sessions retain a local recovery copy, which is never automatically uploaded over a newer cloud world.
- World generation and save packing use a worker. Opening `index.html` directly or using a browser without workers falls back to synchronous generation/packing; serve the game over HTTP(S) for background processing.
- Plant meshes use a per-chunk index and plant-only dirty flags. Terrain rebuilding shares a time budget (a single chunk may exceed it).
- Soil updates are distributed across bounded batches, accounting for elapsed time and rainfall for each batch. Plant growth still runs on the existing half-second schedule.
- Animal detail transitions dispose owned geometry/textures, preserve shared materials, and use distance hysteresis.
- Movement resets on blur/unlock, underwater Shift diving works, and a sapling is retained if it cannot grow within the world's height.
- Low / Medium / High graphics presets control resolution, render distance, shadows, and animal detail distance.

## Backend work still required

The repository contains a Supabase client, but not the schema or definitions of `bc_world_save` and its companion functions. This change does **not** claim server-enforced locking or atomic conflict prevention. Existing RPC signatures remain compatible.

A database owner should export the current functions and policies, then implement and test:

1. An authenticated, expiring host lease per world, checked inside the save transaction.
2. An `expected_version` input checked atomically with the update; reject stale writes and return the new version.
3. Revocation/expiry during host changes, plus authorization of Realtime membership and world mutations.
4. Two-client tests for concurrent saves, connection partitions, lease expiry, host transfer and retry after conflict.

Client-side host checks close the observed disconnected-guest write path, but cannot enforce these rules against another tab with conflicting presence, an older client, or a malicious caller. Do not deploy guessed SQL without checking the actual schema.

## Verification

Run `node --test tests/regression.test.cjs` (Node 22 or newer). Tests require no network or npm dependencies and include actual generation/serialization in a worker thread, migration reads, ordered saves, failure handling, plant indexing, resource ownership and reconnect behavior.

Before merging, browser-test new/continued solo worlds, graphics presets, quota failures, save-and-exit/reload, and two-player reconnect/host transfer. Browser automation could not launch in the development environment, so these browser/GPU and live-backend checks remain outstanding.
