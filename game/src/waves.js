// waves.js — the wave loop of KURA OPS: Arena Tempurung.
//
// Ten waves, then the garden is won. Each wave spawns its hares in small
// groups a second apart (never all at once, so the player is never
// surrounded on the first frame), pays out when the last hare falls, and
// opens the Toko Tempurung buy menu before the next wave. The Benih pod,
// once it blooms, clears whatever is left of the current wave — the calm,
// sure way to end a bad wave.
import { spawnHare, waveComposition } from './enemies.js';
import { PAYOUT } from './weapons.js';

export const MAX_WAVE = 10;
export const SPAWN_GAP = 0.9;
export const SPAWN_GROUP = 3;
export const BETWEEN_WAVE_SECONDS = 6;

export function createWaveState() {
  return {
    wave: 0,
    spawned: 0,
    toSpawn: 0,
    jumbosLeft: 0,
    spawnTimer: 0,
    betweenTimer: 0,
    // 'idle' | 'spawning' | 'fighting' | 'buy' | 'won'
    phase: 'idle',
    killsThisWave: 0,
  };
}

// Start wave N: queue its hares, reset the spawn clock.
export function startWave(waves, waveNumber) {
  const comp = waveComposition(waveNumber);
  waves.wave = waveNumber;
  waves.toSpawn = comp.count;
  waves.jumbosLeft = comp.jumbos;
  waves.spawned = 0;
  waves.spawnTimer = 0;
  waves.killsThisWave = 0;
  waves.phase = 'spawning';
}

// Drip-feed the queued hares into the world; returns newly spawned hares.
export function stepSpawning(waves, rng, arena, dt) {
  const born = [];
  if (waves.phase !== 'spawning') return born;
  waves.spawnTimer -= dt;
  while (waves.spawned < waves.toSpawn && waves.spawnTimer <= 0) {
    const group = Math.min(SPAWN_GROUP, waves.toSpawn - waves.spawned);
    for (let i = 0; i < group; i += 1) {
      const kind = waves.jumbosLeft > 0 ? 'jumbo' : 'hare';
      if (kind === 'jumbo') waves.jumbosLeft -= 1;
      born.push(spawnHare(rng, arena, waves.wave, kind));
      waves.spawned += 1;
    }
    waves.spawnTimer += SPAWN_GAP;
  }
  if (waves.spawned >= waves.toSpawn) waves.phase = 'fighting';
  return born;
}

// Money for clearing a wave: a flat purse plus a per-wave bonus.
export function waveClearPayout(waveNumber) {
  return PAYOUT.waveClear + PAYOUT.waveBonusPerWave * waveNumber;
}

// The wave is over when nothing is left to spawn and no hare is alive.
export function waveIsCleared(waves, aliveHares) {
  return waves.phase === 'fighting' && aliveHares === 0;
}

// After the last wave, the garden is the tortoise's.
export function isFinalWave(waves) {
  return waves.wave >= MAX_WAVE;
}
