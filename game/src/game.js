// game.js — the match itself: KURA OPS: Arena Tempurung.
//
// One state object holds everything: the player, the hares, the bullets, the
// coins, the particles, the planted pod, the wave machine, the money and the
// feed. step() advances it in fixed 1/60 s slices; the screens are
// 'title' | 'play' | 'buy' | 'paused' | 'over' | 'won'. The rules in one
// breath: hares spawn in groups, shoot wide, and pay $100 when they fall;
// clearing a wave pays a purse and opens the shop; planting a Benih in Site
// Kebun and letting it bloom pays $150 and clears the wave; the shell shield
// soaks one hit per 8 seconds; wave 10 cleared wins the garden.
import { createSeededRandom } from './rng.js';
import { WEAPONS, PAYOUT, freshAmmo } from './weapons.js';
import {
  createPlayer,
  resetPlayer,
  aimPlayerAt,
  movePlayer,
  damagePlayer,
  tickShield,
  tickReload,
  startReload,
  equipWeapon,
  dropToPistol,
  tryRaiseShield,
  PLANT_SECONDS,
  POD_BLOOM_SECONDS,
} from './player.js';
import { stepHare, damageHare, createDummyHare } from './enemies.js';
import {
  createWaveState,
  startWave,
  stepSpawning,
  waveClearPayout,
  waveIsCleared,
  isFinalWave,
  BETWEEN_WAVE_SECONDS,
  MAX_WAVE,
} from './waves.js';
import { ARENA, KEBUN } from './render.js';

export const STEP = 1 / 60;
export const SCORE_PER_KILL = 100;
export const SCORE_PER_WAVE = 250;
export const BEST_KEY = 'kuraops-arena-best';

export function createGame(seed) {
  const rng = createSeededRandom(seed);
  const game = {
    rng,
    seed,
    arena: ARENA,
    player: createPlayer(ARENA),
    hares: [],
    bullets: [],
    coins: [],
    particles: [],
    pod: null,
    waves: createWaveState(),
    money: 800,
    score: 0,
    best: 0,
    elapsed: 0,
    time: 0,
    bannerText: '',
    bannerSub: '',
    bannerTimer: 0,
    feed: [],
    blooms: 0,
    plants: 0,
    screen: 'title',
    // Counts for the ?shot= autopilot and the debug handle.
    shotsFired: 0,
    shotsHit: 0,
  };
  return game;
}

export function resetGame(game) {
  const seed = game.seed;
  const best = game.best;
  const fresh = createGame(seed);
  fresh.best = best;
  Object.assign(game, fresh);
  resetPlayer(game.player, ARENA);
}

// A line in the feed (max 4 kept).
export function pushFeed(game, line) {
  game.feed.push(line);
  while (game.feed.length > 4) game.feed.shift();
}

function burst(game, x, y, color, count, speed) {
  for (let i = 0; i < count; i += 1) {
    const angle = game.rng.range(0, Math.PI * 2);
    const velocity = game.rng.range(speed * 0.3, speed);
    game.particles.push({
      x,
      y,
      vx: Math.cos(angle) * velocity,
      vy: Math.sin(angle) * velocity,
      life: game.rng.range(0.3, 0.7),
      maxLife: 0.7,
      size: game.rng.range(2, 5),
      color,
    });
  }
}

function dropCoin(game, x, y) {
  game.coins.push({ x: x + game.rng.range(-14, 14), y: y + game.rng.range(-14, 14), phase: game.rng.range(0, Math.PI * 2) });
}

function showBanner(game, text, sub, seconds = 2.4) {
  game.bannerText = text;
  game.bannerSub = sub;
  game.bannerTimer = seconds;
}

// Open the shop between waves.
export function openBuyPhase(game) {
  game.screen = 'buy';
  game.waves.phase = 'buy';
  game.waves.betweenTimer = BETWEEN_WAVE_SECONDS;
}

// Start the next wave from the buy phase (or from the title screen).
export function beginNextWave(game) {
  const next = game.waves.wave + 1;
  if (next > MAX_WAVE) {
    winGame(game);
    return;
  }
  startWave(game.waves, next);
  game.screen = 'play';
  game.pod = null;
  game.player.plantProgress = 0;
  game.player.planting = false;
  showBanner(game, `WAVE ${next}`, next === 1 ? 'Kelinci datang. Tenang… bidik… tembak.' : `${4 + next * 2} kelinci, makin cepat. Sabar, kura-kura.`);
}

export function startMatch(game) {
  resetGame(game);
  game.money = 800;
  game.screen = 'play';
  beginNextWave(game);
  pushFeed(game, 'Operasi Tempurung dimulai. Wave 1.');
}

export function winGame(game) {
  game.screen = 'won';
  game.waves.phase = 'won';
  game.score += 1000;
  pushFeed(game, 'KEBUN MENANG! Sepuluh wave bersih.');
}

export function loseGame(game) {
  game.screen = 'over';
  game.waves.phase = 'idle';
  pushFeed(game, 'Kura tumbang. Kelinci menang ronde ini.');
}

// Buy a weapon or a grenade; returns a message for the feed, or null.
export function buyItem(game, weaponId) {
  const def = WEAPONS[weaponId];
  if (!def) return null;
  if (weaponId === 'kura9') {
    equipWeapon(game.player, 'kura9');
    return 'Kura-9 dipakai lagi. Gratis, seperti biasa.';
  }
  if (game.money < def.price) return `Uang kurang untuk ${def.name} ($${def.price}).`;
  game.money -= def.price;
  if (weaponId === 'granat') {
    game.player.grenades += 1;
    return `Granat Daun dibeli. Punya ${game.player.grenades}.`;
  }
  equipWeapon(game.player, weaponId);
  return `${def.name} dibeli — $${def.price}.`;
}

// Fire the current weapon toward the player's aim.
export function fireWeapon(game, sound) {
  const player = game.player;
  if (!player.alive || player.reloading || player.fireTimer > 0) return false;
  const def = WEAPONS[player.weapon];
  if (player.ammo.inMag <= 0) {
    if (sound) sound.emptyClick();
    startReload(player);
    if (sound) sound.reload();
    return false;
  }
  player.ammo.inMag -= 1;
  player.fireTimer = def.fireInterval;
  game.shotsFired += 1;
  const spread = (game.rng.next() - 0.5) * 2 * def.spread;
  const angle = player.angle + spread;
  game.bullets.push({
    x: player.x + Math.cos(player.angle) * 26,
    y: player.y + Math.sin(player.angle) * 26,
    vx: Math.cos(angle) * def.bulletSpeed,
    vy: Math.sin(angle) * def.bulletSpeed,
    damage: def.damage,
    fromEnemy: false,
    life: def.range / def.bulletSpeed,
  });
  burst(game, player.x + Math.cos(player.angle) * 30, player.y + Math.sin(player.angle) * 30, '#ffd94d', 3, 60);
  if (sound) sound.shoot(def.kind);
  return true;
}

// Lob a leaf grenade toward the aim; it bursts on impact with a hare or a wall.
export function throwGrenade(game, sound) {
  const player = game.player;
  if (!player.alive || player.grenades <= 0 || player.fireTimer > 0) return false;
  player.grenades -= 1;
  player.fireTimer = 0.6;
  game.bullets.push({
    x: player.x + Math.cos(player.angle) * 26,
    y: player.y + Math.sin(player.angle) * 26,
    vx: Math.cos(player.angle) * 420,
    vy: Math.sin(player.angle) * 420,
    damage: WEAPONS.granat.damage,
    fromEnemy: false,
    life: 0.9,
    grenade: true,
    blastRadius: WEAPONS.granat.blastRadius,
  });
  if (sound) sound.shoot('grenade');
  return true;
}

// The Benih blooms: bonus money, the wave's remaining hares fall, confetti.
export function bloomPod(game, sound) {
  const pod = game.pod;
  if (!pod) return;
  game.pod = null;
  game.blooms += 1;
  game.money += PAYOUT.plant + PAYOUT.bloomClearBonus;
  game.score += 200;
  burst(game, pod.x, pod.y, '#9be15d', 40, 260);
  burst(game, pod.x, pod.y, '#ffd94d', 24, 200);
  for (const hare of game.hares) {
    if (hare.alive) {
      damageHare(hare, 9999);
      game.player.kills += 1;
      game.score += SCORE_PER_KILL;
      game.money += PAYOUT.kill;
      dropCoin(game, hare.x, hare.y);
    }
  }
  pushFeed(game, `Benih mekar! +$${PAYOUT.plant + PAYOUT.bloomClearBonus}, wave bersih.`);
  if (sound) sound.bloom();
  if (sound) sound.coin();
}

// A hare falls: money, score, a coin on the ground, a feed line.
export function killHare(game, hare, sound) {
  game.player.kills += 1;
  game.waves.killsThisWave += 1;
  game.score += SCORE_PER_KILL;
  game.money += PAYOUT.kill;
  dropCoin(game, hare.x, hare.y);
  burst(game, hare.x, hare.y, '#cfc4b4', 14, 180);
  pushFeed(game, `Kelinci tumbang +$${PAYOUT.kill} (kill ${game.player.kills})`);
  if (sound) sound.kill();
  if (sound) sound.coin();
}

function insideKebun(player) {
  return player.x > KEBUN.x && player.x < KEBUN.x + KEBUN.w && player.y > KEBUN.y && player.y < KEBUN.y + KEBUN.h;
}

// One fixed step of the live game. `controls` carries the frame's input:
// { moveX, moveY, aimX, aimY, firing, plant, shield, reload, grenade }.
export function stepGame(game, controls, dt, sound) {
  const player = game.player;
  if (game.screen !== 'play') return;
  game.time += dt;
  game.elapsed += dt;
  if (game.bannerTimer > 0) game.bannerTimer -= dt;

  // Player movement + aim.
  if (player.alive) {
    movePlayer(player, controls.moveX, controls.moveY, dt, ARENA);
    aimPlayerAt(player, controls.aimX, controls.aimY);
    if (player.fireTimer > 0) player.fireTimer -= dt;
    if (tickReload(player, dt) && sound) sound.reload();
    if (controls.reload) {
      if (startReload(player) && sound) sound.reload();
    }
    if (controls.shield && tryRaiseShield(player)) {
      pushFeed(game, 'Perisai Tempurung naik!');
    }
    if (tickShield(player, dt) && sound) sound.shieldReady();
    if (controls.grenade) throwGrenade(game, sound);
    if (controls.firing) {
      const def = WEAPONS[player.weapon];
      if (def.auto || controls.firingEdge) fireWeapon(game, sound);
    }
    // Planting: hold E inside the Kebun, unplanted, one pod per wave.
    const canPlant = insideKebun(player) && !game.pod && game.plants < game.waves.wave;
    if (controls.plant && canPlant) {
      if (!player.planting) pushFeed(game, 'Menanam Benih… tahan E.');
      player.planting = true;
      player.plantProgress += dt / PLANT_SECONDS;
      if (Math.floor(player.plantProgress * 10) !== Math.floor((player.plantProgress - dt / PLANT_SECONDS) * 10) && sound) sound.plantTick();
      if (player.plantProgress >= 1) {
        player.planting = false;
        player.plantProgress = 0;
        game.plants += 1;
        game.pod = { x: player.x, y: player.y - 30, bloom: 0, timer: POD_BLOOM_SECONDS };
        pushFeed(game, 'Benih ditanam! Jaga sampai mekar.');
        if (sound) sound.plantTick();
      }
    } else {
      player.planting = false;
      if (!canPlant) player.plantProgress = Math.max(0, player.plantProgress - dt * 2);
    }
  }

  // The pod grows toward its bloom.
  if (game.pod) {
    game.pod.timer -= dt;
    game.pod.bloom = 1 - Math.max(0, game.pod.timer / POD_BLOOM_SECONDS);
    if (game.pod.timer <= 0) bloomPod(game, sound);
  }

  // Spawn the wave's hares in groups.
  const born = stepSpawning(game.waves, game.rng, ARENA, dt);
  game.hares.push(...born);

  // Hares move, strafe and shoot wild.
  for (const hare of game.hares) {
    if (!hare.alive) continue;
    const shot = stepHare(hare, player, dt, game.time, game.rng);
    if (shot) {
      game.bullets.push(shot);
      if (sound) sound.enemyShoot();
    }
  }

  // Bullets fly; grenades burst on impact.
  for (const bullet of game.bullets) {
    bullet.x += bullet.vx * dt;
    bullet.y += bullet.vy * dt;
    bullet.life -= dt;
    if (bullet.grenade) {
      let burstNow = bullet.life <= 0;
      for (const hare of game.hares) {
        if (hare.alive && Math.hypot(hare.x - bullet.x, hare.y - bullet.y) < hare.radius + 8) burstNow = true;
      }
      if (burstNow) {
        bullet.life = 0;
        burst(game, bullet.x, bullet.y, '#ff9a6b', 26, 300);
        if (sound) sound.explosion();
        for (const hare of game.hares) {
          if (!hare.alive) continue;
          const dist = Math.hypot(hare.x - bullet.x, hare.y - bullet.y);
          if (dist < bullet.blastRadius) {
            const dealt = Math.round(bullet.damage * (1 - (dist / bullet.blastRadius) * 0.5));
            if (damageHare(hare, dealt)) killHare(game, hare, sound);
          }
        }
      }
      continue;
    }
    if (bullet.fromEnemy) {
      if (player.alive && Math.hypot(player.x - bullet.x, player.y - bullet.y) < player.radius + 4) {
        bullet.life = 0;
        const result = damagePlayer(player, bullet.damage);
        if (result === 'blocked') {
          pushFeed(game, 'PERISAI PECAH! Satu hit ditahan.');
          burst(game, player.x, player.y, '#7fd4ff', 12, 160);
          if (sound) sound.shieldBlock();
        } else if (result === 'hurt') {
          burst(game, player.x, player.y, '#ff7a6b', 10, 140);
          if (sound) sound.hurt();
        } else if (result === 'dead') {
          dropToPistol(player);
          loseGame(game);
          if (sound) sound.gameOver();
        }
      }
    } else {
      for (const hare of game.hares) {
        if (!hare.alive) continue;
        if (Math.hypot(hare.x - bullet.x, hare.y - bullet.y) < hare.radius + 5) {
          bullet.life = 0;
          game.shotsHit += 1;
          burst(game, bullet.x, bullet.y, '#ffd94d', 6, 120);
          if (damageHare(hare, bullet.damage)) killHare(game, hare, sound);
          break;
        }
      }
    }
    if (bullet.x < 0 || bullet.x > ARENA.width || bullet.y < 0 || bullet.y > ARENA.height) bullet.life = 0;
  }
  game.bullets = game.bullets.filter((b) => b.life > 0);

  // Coins drift up and fade; particles fade.
  game.coins = game.coins.filter((coin) => {
    coin.y -= 12 * dt;
    return true;
  });
  if (game.coins.length > 40) game.coins.splice(0, game.coins.length - 40);
  for (const particle of game.particles) {
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.life -= dt;
  }
  game.particles = game.particles.filter((p) => p.life > 0);

  // Wave cleared: purse, score, and either the shop or the victory.
  const aliveHares = game.hares.filter((h) => h.alive).length;
  if (waveIsCleared(game.waves, aliveHares)) {
    const purse = waveClearPayout(game.waves.wave);
    game.money += purse;
    game.score += SCORE_PER_WAVE;
    pushFeed(game, `Wave ${game.waves.wave} bersih! +$${purse}.`);
    if (sound) sound.waveClear();
    if (isFinalWave(game.waves)) {
      winGame(game);
      if (sound) sound.victory();
    } else {
      openBuyPhase(game);
    }
  }
}

// Buy-phase countdown: when it runs out, the next wave starts itself.
export function stepBuyPhase(game, dt) {
  if (game.screen !== 'buy') return;
  game.waves.betweenTimer -= dt;
  if (game.waves.betweenTimer <= 0) beginNextWave(game);
}

// Exposed for the node logic test: a hare that stands still.
export { createDummyHare };
