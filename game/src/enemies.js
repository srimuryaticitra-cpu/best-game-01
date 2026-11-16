// enemies.js — the hares of KURA OPS: Arena Tempurung.
//
// Fast, nervous, and terrible shots: a hare sprints at the tortoise, stops at
// medium range, and sprays wide. The joke is the balance — speed against
// accuracy — and the wave system turns the dial: later waves bring more hares,
// faster hares, tougher hares, and a few big "Kelinci Jumbo" bruisers.
// Hares never aim perfectly: every shot carries a wide random spread, and
// their reaction time is slow on purpose. A tortoise who stands still still
// gets hit eventually; a tortoise who strafes barely gets touched.
import { createSeededRandom } from './rng.js';

export const HARE_RADIUS = 15;
export const JUMBO_RADIUS = 24;

// One hare: kind 'hare' or 'jumbo', hp scaled by wave, a wobble phase so no
// two hares strafe in lockstep.
export function spawnHare(rng, arena, wave, kind) {
  const edge = rng.int(0, 3);
  let x;
  let y;
  if (edge === 0) {
    x = rng.range(40, arena.width - 40);
    y = 40;
  } else if (edge === 1) {
    x = rng.range(40, arena.width - 40);
    y = arena.height - 40;
  } else if (edge === 2) {
    x = 40;
    y = rng.range(40, arena.height - 40);
  } else {
    x = arena.width - 40;
    y = rng.range(40, arena.height - 40);
  }
  const jumbo = kind === 'jumbo';
  const hpBase = jumbo ? 160 : 40;
  return {
    kind,
    x,
    y,
    radius: jumbo ? JUMBO_RADIUS : HARE_RADIUS,
    hp: hpBase + (wave - 1) * (jumbo ? 25 : 8),
    maxHp: hpBase + (wave - 1) * (jumbo ? 25 : 8),
    speed: (jumbo ? 85 : 135) + wave * 6 + rng.range(0, 25),
    // Hares shoot badly on purpose: wide spread, slow trigger.
    shootCooldown: rng.range(0.6, 1.6),
    shootInterval: Math.max(0.9, 1.7 - wave * 0.05),
    spread: jumbo ? 0.22 : 0.34,
    damage: jumbo ? 14 : 9,
    bulletSpeed: 380,
    wobblePhase: rng.range(0, Math.PI * 2),
    wobbleSpeed: rng.range(1.2, 2.4),
    strafeDir: rng.chance(0.5) ? 1 : -1,
    strafeTimer: rng.range(0.8, 2.0),
    alive: true,
    flash: 0,
    // Coin the hare drops when it falls (visual only; money is instant).
    coins: jumbo ? 3 : 1,
  };
}

// How many hares a wave brings, and how many of them are jumbos.
export function waveComposition(wave) {
  const count = 4 + wave * 2;
  const jumbos = wave >= 3 ? Math.min(3, Math.floor((wave - 1) / 2)) : 0;
  return { count, jumbos };
}

// Steer one hare for a step: chase until shooting range, strafe sideways with
// a sine wobble, and fire wild shots on its own slow timer.
export function stepHare(hare, player, dt, time, rng) {
  if (!hare.alive) return null;
  const dx = player.x - hare.x;
  const dy = player.y - hare.y;
  const dist = Math.hypot(dx, dy) || 1;
  const nx = dx / dist;
  const ny = dy / dist;
  const wantRange = hare.kind === 'jumbo' ? 260 : 300;
  let mx = 0;
  let my = 0;
  if (dist > wantRange + 30) {
    mx = nx;
    my = ny;
  } else if (dist < wantRange - 60) {
    mx = -nx;
    my = -ny;
  } else {
    // In range: strafe, flipping direction every second or two.
    hare.strafeTimer -= dt;
    if (hare.strafeTimer <= 0) {
      hare.strafeDir *= -1;
      hare.strafeTimer = 1 + rng.next() * 1.2;
    }
    const wobble = Math.sin(time * hare.wobbleSpeed + hare.wobblePhase) * 0.6;
    mx = -ny * hare.strafeDir + nx * wobble * 0.3;
    my = nx * hare.strafeDir + ny * wobble * 0.3;
  }
  const len = Math.hypot(mx, my) || 1;
  hare.x += (mx / len) * hare.speed * dt;
  hare.y += (my / len) * hare.speed * dt;
  hare.x = Math.min(1240, Math.max(40, hare.x));
  hare.y = Math.min(680, Math.max(40, hare.y));
  if (hare.flash > 0) hare.flash -= dt;

  // Fire a wild shot when the timer runs out and the player is in range.
  hare.shootCooldown -= dt;
  if (hare.shootCooldown <= 0 && dist < 560 && player.alive) {
    hare.shootCooldown = hare.shootInterval + rng.range(0, 0.5);
    const baseAngle = Math.atan2(dy, dx);
    const angle = baseAngle + (rng.next() - 0.5) * 2 * hare.spread;
    return {
      x: hare.x,
      y: hare.y,
      vx: Math.cos(angle) * hare.bulletSpeed,
      vy: Math.sin(angle) * hare.bulletSpeed,
      damage: hare.damage,
      fromEnemy: true,
      life: 1.6,
    };
  }
  return null;
}

// Damage a hare; returns true when this hit kills it.
export function damageHare(hare, amount) {
  if (!hare.alive) return false;
  hare.hp -= amount;
  hare.flash = 0.12;
  if (hare.hp <= 0) {
    hare.alive = false;
    return true;
  }
  return false;
}

// A small helper for the test driver: a hare that never moves or shoots.
export function createDummyHare(x, y) {
  return {
    kind: 'hare',
    x,
    y,
    radius: HARE_RADIUS,
    hp: 40,
    maxHp: 40,
    speed: 0,
    shootCooldown: 999,
    shootInterval: 999,
    spread: 0.34,
    damage: 9,
    bulletSpeed: 380,
    wobblePhase: 0,
    wobbleSpeed: 0,
    strafeDir: 1,
    strafeTimer: 1,
    alive: true,
    flash: 0,
    coins: 1,
  };
}

export { createSeededRandom };
