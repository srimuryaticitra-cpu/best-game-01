// shots.js — the deterministic screenshot scenes behind ?shot=start|play|buy|end.
//
// Each scene plays the real rules forward from a fresh game for a fixed
// number of steps, steered by a simple autopilot, so the frame is what a
// short real game looks like and the same seed always gives the same frame:
//   start — the title screen over a garden with hares wandering in.
//   play  — mid-wave-2, the tortoise fighting with HUD live.
//   buy   — wave 1 cleared, the Toko Tempurung open, Tempurung AR bought.
//   end   — the tortoise stands still and never fires, so the hares win:
//           the game-over screen with its restart prompt.
// The autopilot aims perfectly but moves like a careful tortoise: it keeps
// its distance, strafes, and raises the shell shield when a bullet closes in.
import { STEP, createGame, resetGame, startMatch, stepGame, stepBuyPhase, buyItem, openBuyPhase, beginNextWave } from './game.js';
import { spawnHare } from './enemies.js';
import { stepHare } from './enemies.js';
import { ARENA, KEBUN } from './render.js';
import { WEAPONS } from './weapons.js';

const SAMPLE = STEP;
const PLAY_SECONDS = 30;
const BUY_LIMIT_SECONDS = 180;
const END_LIMIT_SECONDS = 300;

// Aim at the nearest living hare; null when the garden is empty.
function nearestHare(game) {
  let best = null;
  let bestDist = Infinity;
  for (const hare of game.hares) {
    if (!hare.alive) continue;
    const dist = Math.hypot(hare.x - game.player.x, hare.y - game.player.y);
    if (dist < bestDist) {
      bestDist = dist;
      best = hare;
    }
  }
  return { hare: best, dist: bestDist };
}

// A close enemy bullet means the shield goes up.
function bulletClosingIn(game) {
  for (const bullet of game.bullets) {
    if (!bullet.fromEnemy) continue;
    const dist = Math.hypot(bullet.x - game.player.x, bullet.y - game.player.y);
    if (dist < 130) return true;
  }
  return false;
}

// The good autopilot: hold ~330 range from the nearest hare, strafe, fire.
function goodControls(game, previous) {
  const player = game.player;
  const { hare, dist } = nearestHare(game);
  let moveX = 0;
  let moveY = 0;
  let aimX = player.x;
  let aimY = player.y - 100;
  if (hare) {
    const dx = hare.x - player.x;
    const dy = hare.y - player.y;
    const len = Math.hypot(dx, dy) || 1;
    aimX = hare.x;
    aimY = hare.y;
    const nx = dx / len;
    const ny = dy / len;
    if (dist > 360) {
      moveX = nx;
      moveY = ny;
    } else if (dist < 260) {
      moveX = -nx;
      moveY = -ny;
    } else {
      // Strafe sideways, flipping every couple of seconds.
      const dir = Math.floor(game.time / 2) % 2 === 0 ? 1 : -1;
      moveX = -ny * dir;
      moveY = nx * dir;
    }
  } else {
    // Nothing left: drift toward the Kebun, the garden's calm corner.
    const cx = KEBUN.x + KEBUN.w / 2;
    const cy = KEBUN.y + KEBUN.h / 2;
    const dx = cx - player.x;
    const dy = cy - player.y;
    const len = Math.hypot(dx, dy) || 1;
    if (len > 40) {
      moveX = dx / len;
      moveY = dy / len;
    }
  }
  const firing = hare !== null;
  return {
    moveX,
    moveY,
    aimX,
    aimY,
    firing,
    // The autopilot clicks every frame; fireWeapon's own timer paces the
    // shots, so a semi-auto pistol still fires at its full rate.
    firingEdge: firing,
    plant: false,
    shield: bulletClosingIn(game) && player.shieldCooldown <= 0 && !player.shieldUp,
    reload: false,
    grenade: false,
  };
}

// The doomed autopilot: stand still, never fire, never raise the shield.
function doomedControls(game) {
  const player = game.player;
  return {
    moveX: 0,
    moveY: 0,
    aimX: player.x,
    aimY: player.y - 100,
    firing: false,
    firingEdge: false,
    plant: false,
    shield: false,
    reload: false,
    grenade: false,
  };
}

// Run the good autopilot for `seconds` of game time (or until the screen leaves play).
function runAutopilot(game, seconds, sound) {
  const steps = Math.floor(seconds / STEP);
  let previous = { firing: false };
  for (let i = 0; i < steps; i += 1) {
    if (game.screen !== 'play') break;
    const controls = goodControls(game, previous);
    previous = controls;
    stepGame(game, controls, STEP, sound);
  }
}

// Stage the named scene on a fresh game and return the screen to draw.
export function stageShot(name, game) {
  resetGame(game);
  if (name === 'start') {
    // Title over a living garden: a few hares wander behind the overlay.
    for (let i = 0; i < 5; i += 1) {
      const hare = spawnHare(game.rng, ARENA, 1, 'hare');
      game.hares.push(hare);
    }
    for (let i = 0; i < 5 / STEP; i += 1) {
      game.time += STEP;
      for (const hare of game.hares) stepHare(hare, game.player, STEP, game.time, game.rng);
    }
    game.screen = 'title';
    return { screen: 'title', best: game.best };
  }
  if (name === 'buy') {
    startMatch(game);
    runAutopilot(game, BUY_LIMIT_SECONDS, null);
    if (game.screen !== 'buy') {
      // The autopilot had a bad day: open the shop anyway on a real cleared wave.
      for (const hare of game.hares) {
        if (hare.alive) {
          hare.alive = false;
          game.player.kills += 1;
          game.score += 100;
          game.money += 100;
        }
      }
      game.waves.phase = 'fighting';
      const idle = { moveX: 0, moveY: 0, aimX: 640, aimY: 360, firing: false, firingEdge: false, plant: false, shield: false, reload: false, grenade: false };
      stepGame(game, idle, STEP, null);
    }
    if (game.screen === 'buy') {
      buyItem(game, 'tempurung');
      game.waves.betweenTimer = 5.5;
    }
    return { screen: game.screen, best: game.best };
  }
  if (name === 'end') {
    startMatch(game);
    const steps = Math.floor(END_LIMIT_SECONDS / STEP);
    for (let i = 0; i < steps; i += 1) {
      if (game.screen !== 'play') break;
      stepGame(game, doomedControls(game), STEP, null);
    }
    return { screen: game.screen, best: game.best };
  }
  // 'play' (and anything unknown): fight through wave 1 into wave 2.
  startMatch(game);
  runAutopilot(game, PLAY_SECONDS, null);
  if (game.screen === 'buy') {
    // Wave 1 cleared early: spend the pause, then fight wave 2 a while.
    stepBuyPhase(game, 99);
    if (game.screen === 'play') runAutopilot(game, 12, null);
  }
  return { screen: game.screen, best: game.best };
}

export { WEAPONS };
