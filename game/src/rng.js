// rng.js — deterministic randomness for KURA OPS: Arena Tempurung.
//
// One mulberry32 stream, seeded from the URL (?seed=N) or from the clock for a
// casual game. Every spawn position, hare wobble and coin scatter draws from
// this stream and nothing else, so the same seed replays the same arena:
// the ?shot= captures depend on it, and a player who shares a seed shares a run.
export function createSeededRandom(seed) {
  let state = (seed >>> 0) || 0x9e3779b9;
  function next() {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  return {
    // Next float in [0, 1).
    next,
    // Next float in [min, max).
    range(min, max) {
      return min + next() * (max - min);
    },
    // Next integer in [min, max] inclusive.
    int(min, max) {
      return min + Math.floor(next() * (max - min + 1));
    },
    // Pick one element of a non-empty array.
    pick(list) {
      return list[Math.floor(next() * list.length)];
    },
    // True with probability p (0..1).
    chance(p) {
      return next() < p;
    },
  };
}

// A fixed seed for the screenshot captures, so every capture run agrees.
export const CAPTURE_SEED = 1;

// Hash a short string into a 32-bit seed (for naming a run after a player).
export function seedFromText(text) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
