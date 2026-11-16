// main.js — boot and the one loop of KURA OPS: Arena Tempurung.
//
// Input is read every frame, the world advances in fixed 1/60 s steps, and
// the renderer paints what is there. The game moves between six screens:
// title, play, buy, paused, over and won. The arena is letterboxed into the
// window, so the game looks the same at any size.
//
// ?seed=N fixes the run's randomness. ?shot=start|play|buy|end (with &seed=N)
// stages that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot. window.__dbg exposes the live state
// for play-tests.
import { STEP, BEST_KEY, createGame, resetGame, startMatch, stepGame, stepBuyPhase, beginNextWave, buyItem } from './game.js';
import { createSeededRandom } from './rng.js';
import { createSoundBank } from './audio.js';
import { createInput, ACTION_START, ACTION_RELOAD, ACTION_SHIELD, ACTION_GRENADE, ACTION_BUY_MENU, ACTION_PAUSE, ACTION_MUTE, ACTION_RESTART } from './input.js';
import { drawHud, drawTitle, drawBuyMenu, drawEndScreen, drawPaused } from './hud.js';
import { stageShot } from './shots.js';
import { drawWorld, arenaTransform, screenToArena, ARENA } from './render.js';
import { BUY_MENU } from './weapons.js';

const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const game = createGame(seed);
const sound = createSoundBank();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score lasts this visit only.
  }
}

game.best = readBest();

// Resize the canvas to the window (CSS pixels; the arena letterboxes inside).
function fitCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', fitCanvas);
fitCanvas();

const ctx = canvas.getContext('2d');

function paint(screen) {
  ctx.fillStyle = '#0a1e10';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const t = arenaTransform(canvas);
  ctx.save();
  ctx.translate(t.offsetX, t.offsetY);
  ctx.scale(t.scale, t.scale);
  drawWorld(ctx, game, game.time);
  if (screen === 'title') drawTitle(ctx, game, game.time);
  else if (screen === 'buy') {
    drawHud(ctx, game);
    drawBuyMenu(ctx, game);
  } else if (screen === 'over') drawEndScreen(ctx, game, false);
  else if (screen === 'won') drawEndScreen(ctx, game, true);
  else if (screen === 'paused') {
    drawHud(ctx, game);
    drawPaused(ctx);
  } else {
    drawHud(ctx, game);
  }
  ctx.restore();
}

function runShot(name) {
  const scene = stageShot(name, game);
  let painted = 0;
  function paintFrame() {
    paint(scene.screen);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paintFrame);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paintFrame);
}

function runGame() {
  const input = createInput(canvas);
  let screen = 'title';
  let accumulator = 0;
  let last = performance.now();
  let firingEdge = false;
  let wasFiring = false;
  // One-shot combat actions are queued here by handleActions() (which runs
  // first each frame) and consumed by step(), so a keypress is never lost
  // between the two — takeActions() can only be read once per frame.
  let pendingReload = false;
  let pendingGrenade = false;

  function announce(message) {
    status.textContent = message;
  }

  function refreshBest() {
    if (game.score > game.best) {
      game.best = game.score;
      saveBest(game.best);
    }
  }

  function startPlaying() {
    sound.unlock();
    startMatch(game);
    screen = 'play';
    announce('Bermain. Wave 1. Kelinci datang.');
  }

  function endToTitle() {
    refreshBest();
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_RELOAD) pendingReload = true;
    if (actions & ACTION_GRENADE) pendingGrenade = true;
    if (actions & ACTION_MUTE) {
      const muted = sound.toggleMute();
      announce(muted ? 'Suara mati.' : 'Suara hidup.');
    }
    if (actions & ACTION_PAUSE) {
      if (screen === 'play') {
        screen = 'paused';
        announce('Jeda.');
      } else if (screen === 'paused') {
        screen = 'play';
        announce('Bermain.');
      }
      return;
    }
    if (screen === 'title' && actions & ACTION_START) {
      startPlaying();
      return;
    }
    if (screen === 'buy') {
      if (actions & ACTION_START) {
        beginNextWave(game);
        screen = 'play';
        return;
      }
      if (actions & ACTION_BUY_MENU) {
        beginNextWave(game);
        screen = 'play';
        return;
      }
    }
    if ((screen === 'over' || screen === 'won') && (actions & ACTION_RESTART || actions & ACTION_START)) {
      startPlaying();
      return;
    }
    if (screen === 'buy') {
      const key = input.takeBuyKey();
      if (key) {
        const entry = BUY_MENU.find((row) => row.key === key);
        if (entry) {
          const message = buyItem(game, entry.weapon);
          if (message) announce(message);
          if (message && message.includes('dibeli')) sound.coin();
        }
      }
    }
  }

  function handleBuyClick() {
    if (!input.takeClick()) return;
    const mouse = input.mouse();
    const arena = screenToArena(canvas, mouse.x, mouse.y);
    let y = 200;
    for (const entry of BUY_MENU) {
      if (arena.x > ARENA.width / 2 - 330 && arena.x < ARENA.width / 2 + 330 && arena.y > y && arena.y < y + 56) {
        const message = buyItem(game, entry.weapon);
        if (message) announce(message);
        if (message && message.includes('dibeli')) sound.coin();
        return;
      }
      y += 68;
    }
  }

  function step() {
    if (screen === 'title') {
      game.time += STEP;
      return;
    }
    if (screen === 'buy') {
      stepBuyPhase(game, STEP);
      if (game.screen === 'play') screen = 'play';
      return;
    }
    const mouse = input.mouse();
    const arena = screenToArena(canvas, mouse.x, mouse.y);
    const move = input.moveVector();
    const firing = mouse.down;
    const controls = {
      moveX: move.x,
      moveY: move.y,
      aimX: arena.x,
      aimY: arena.y,
      firing,
      firingEdge: firing && !wasFiring,
      plant: input.plantHeld(),
      shield: input.shieldHeld(),
      reload: pendingReload,
      grenade: pendingGrenade,
    };
    pendingReload = false;
    pendingGrenade = false;
    wasFiring = firing;
    // Space doubles as the shield while playing (and as start on the title).
    if (input.shieldHeld()) controls.shield = true;
    stepGame(game, controls, STEP, sound);
    if (game.screen === 'over' || game.screen === 'won') {
      screen = game.screen;
      endToTitle();
      announce(game.screen === 'won' ? `Menang! Skor ${game.score}.` : `Game over. Skor ${game.score}.`);
    } else if (game.screen === 'buy') {
      screen = 'buy';
      announce(`Wave bersih! Toko Tempurung buka.`);
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === 'buy') handleBuyClick();
    if (screen === 'title' || screen === 'play' || screen === 'buy') {
      let guard = 0;
      while (accumulator >= STEP && guard < 12 && (screen === 'title' || screen === 'play' || screen === 'buy')) {
        step();
        accumulator -= STEP;
        guard += 1;
      }
      if (guard >= 12) accumulator = 0;
    } else {
      accumulator = 0;
    }
    paint(screen);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === 'play') {
      screen = 'paused';
      announce('Jeda.');
    }
  });

  // Debug handle for headless play-tests: live state, no secrets.
  window.__dbg = {
    get screen() {
      return screen;
    },
    get state() {
      return {
        hp: game.player.hp,
        money: game.money,
        score: game.score,
        wave: game.waves.wave,
        wavePhase: game.waves.phase,
        haresAlive: game.hares.filter((h) => h.alive).length,
        ammo: game.player.ammo.inMag,
        weapon: game.player.weapon,
        kills: game.player.kills,
        grenades: game.player.grenades,
        shieldUp: game.player.shieldUp,
        shieldCooldown: game.player.shieldCooldown,
        pod: game.pod ? { bloom: game.pod.bloom } : null,
        elapsed: game.elapsed,
      };
    },
  };

  announce('KURA OPS: Arena Tempurung. Tekan Enter atau Space untuk mulai.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
