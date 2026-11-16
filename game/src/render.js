// render.js — drawing the garden of KURA OPS: Arena Tempurung.
//
// Everything is drawn on one 2D canvas with flat shapes: no images, no
// fonts from the network, no library. The palette is a dusk garden — deep
// green ground, amber paths, the tortoise in shell-green with a cream belly,
// the hares in pale grey-brown with long ears. The camera is a fixed
// letterboxed view of the 1280x720 arena, so a screenshot at any window size
// shows the whole field.
export const ARENA = { width: 1280, height: 720 };

// Site Kebun, the garden plot where the Benih is planted (hold E inside).
export const KEBUN = { x: 90, y: 90, w: 240, h: 170 };

// Where the tortoise spawns, and the fountain at mid that breaks sightlines.
export const FOUNTAIN = { x: 640, y: 330, radius: 46 };

const PALETTE = {
  ground: '#1e4d2b',
  groundLight: '#276038',
  path: '#3a6b35',
  edge: '#12351d',
  kebun: '#7a5a2e',
  kebunSoil: '#5d4423',
  water: '#2e6f8e',
  tortoiseShell: '#3f7d3a',
  tortoiseDark: '#2c5a28',
  tortoiseBelly: '#e8dcc0',
  hare: '#cfc4b4',
  hareDark: '#a89a86',
  jumbo: '#b09a7a',
  bullet: '#ffd94d',
  enemyBullet: '#ff7a6b',
  pod: '#9be15d',
};

// Fit the arena into the canvas, letterboxed; returns the transform.
export function arenaTransform(canvas) {
  const scale = Math.min(canvas.width / ARENA.width, canvas.height / ARENA.height);
  const offsetX = (canvas.width - ARENA.width * scale) / 2;
  const offsetY = (canvas.height - ARENA.height * scale) / 2;
  return { scale, offsetX, offsetY };
}

// Convert a canvas pixel (the mouse) into arena coordinates.
export function screenToArena(canvas, px, py) {
  const t = arenaTransform(canvas);
  return { x: (px - t.offsetX) / t.scale, y: (py - t.offsetY) / t.scale };
}

function circle(ctx, x, y, radius, fill) {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
}

function drawGround(ctx) {
  ctx.fillStyle = PALETTE.ground;
  ctx.fillRect(0, 0, ARENA.width, ARENA.height);
  // Mown stripes, like a garden that takes itself seriously.
  ctx.fillStyle = PALETTE.groundLight;
  for (let i = 0; i < 9; i += 1) {
    if (i % 2 === 0) ctx.fillRect(0, i * 80, ARENA.width, 40);
  }
  // The amber cross-paths.
  ctx.fillStyle = PALETTE.path;
  ctx.fillRect(0, 340, ARENA.width, 60);
  ctx.fillRect(610, 0, 60, ARENA.height);
  // Arena border: a hedge wall.
  ctx.strokeStyle = PALETTE.edge;
  ctx.lineWidth = 10;
  ctx.strokeRect(5, 5, ARENA.width - 10, ARENA.height - 10);
}

function drawKebun(ctx, pod, plantProgress) {
  ctx.fillStyle = PALETTE.kebun;
  ctx.fillRect(KEBUN.x, KEBUN.y, KEBUN.w, KEBUN.h);
  ctx.fillStyle = PALETTE.kebunSoil;
  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < 4; col += 1) {
      ctx.beginPath();
      ctx.arc(KEBUN.x + 35 + col * 55, KEBUN.y + 35 + row * 55, 12, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.strokeStyle = '#e8dcc0';
  ctx.lineWidth = 3;
  ctx.strokeRect(KEBUN.x, KEBUN.y, KEBUN.w, KEBUN.h);
  ctx.fillStyle = '#fff6d8';
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('SITE KEBUN', KEBUN.x + KEBUN.w / 2, KEBUN.y - 10);
  ctx.font = '15px sans-serif';
  ctx.fillStyle = '#ffe9a8';
  ctx.fillText('tahan E di sini untuk tanam Benih', KEBUN.x + KEBUN.w / 2, KEBUN.y + KEBUN.h + 22);
  if (pod) {
    // The planted pod: a glowing sprout that grows until it blooms.
    const grow = 0.6 + 0.4 * pod.bloom;
    circle(ctx, pod.x, pod.y, 26 * grow, 'rgba(155, 225, 93, 0.35)');
    circle(ctx, pod.x, pod.y, 12 * grow, PALETTE.pod);
    ctx.fillStyle = '#12351d';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText('BENIH', pod.x, pod.y - 30);
    if (plantProgress > 0 && plantProgress < 1) {
      ctx.fillStyle = '#12351d';
      ctx.fillRect(pod.x - 30, pod.y + 24, 60, 8);
      ctx.fillStyle = PALETTE.pod;
      ctx.fillRect(pod.x - 30, pod.y + 24, 60 * plantProgress, 8);
    }
  }
}

function drawFountain(ctx) {
  circle(ctx, FOUNTAIN.x, FOUNTAIN.y, FOUNTAIN.radius + 10, '#7a5a2e');
  circle(ctx, FOUNTAIN.x, FOUNTAIN.y, FOUNTAIN.radius, PALETTE.water);
  circle(ctx, FOUNTAIN.x, FOUNTAIN.y, FOUNTAIN.radius - 14, '#7fc4dd');
  ctx.fillStyle = '#e8f6ff';
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('KOLAM', FOUNTAIN.x, FOUNTAIN.y + 4);
}

function drawTortoise(ctx, player, time) {
  const bob = Math.sin(time * 6) * 1.5;
  ctx.save();
  ctx.translate(player.x, player.y + bob * 0.3);
  ctx.rotate(player.angle);
  // Shell: a green dome with a cream belly peeking out.
  ctx.beginPath();
  ctx.ellipse(0, 0, 22, 17, 0, 0, Math.PI * 2);
  ctx.fillStyle = player.shieldUp ? '#7fd4ff' : PALETTE.tortoiseShell;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = PALETTE.tortoiseDark;
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(0, 0, 13, 9, 0, 0, Math.PI * 2);
  ctx.fillStyle = PALETTE.tortoiseBelly;
  ctx.fill();
  // Head pokes out toward the aim.
  circle(ctx, 24, 0, 8, PALETTE.tortoiseBelly);
  circle(ctx, 27, -3, 2, '#12351d');
  circle(ctx, 27, 3, 2, '#12351d');
  // The gun barrel: short and honest.
  ctx.fillStyle = '#2b2b2b';
  ctx.fillRect(20, -3, 18, 6);
  ctx.restore();
  // Shield ring while the shell shield is up.
  if (player.shieldUp) {
    ctx.beginPath();
    ctx.arc(player.x, player.y, 30 + Math.sin(time * 8) * 2, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(127, 212, 255, 0.9)';
    ctx.lineWidth = 3;
    ctx.stroke();
  }
  // HP bar over the tortoise.
  ctx.fillStyle = '#12351d';
  ctx.fillRect(player.x - 22, player.y - 34, 44, 6);
  ctx.fillStyle = player.hp > 30 ? '#7fd47f' : '#ff7a6b';
  ctx.fillRect(player.x - 22, player.y - 34, 44 * Math.max(0, player.hp / player.maxHp), 6);
}

function drawHare(ctx, hare, time) {
  ctx.save();
  ctx.translate(hare.x, hare.y);
  const angle = Math.atan2(hare.y - 360, hare.x - 640);
  ctx.rotate(angle);
  const flash = hare.flash > 0 ? '#ffffff' : null;
  const body = hare.kind === 'jumbo' ? PALETTE.jumbo : PALETTE.hare;
  // Long ears, the giveaway.
  ctx.fillStyle = flash || PALETTE.hareDark;
  ctx.beginPath();
  ctx.ellipse(8, -9, 4, 13, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(8, 9, 4, 13, 0.3, 0, Math.PI * 2);
  ctx.fill();
  circle(ctx, 0, 0, hare.radius, flash || body);
  ctx.lineWidth = 2;
  ctx.strokeStyle = PALETTE.hareDark;
  ctx.beginPath();
  ctx.arc(0, 0, hare.radius, 0, Math.PI * 2);
  ctx.stroke();
  circle(ctx, hare.radius - 2, -4, 2.5, '#12351d');
  circle(ctx, hare.radius - 2, 4, 2.5, '#12351d');
  ctx.restore();
  // HP bar for wounded hares.
  if (hare.hp < hare.maxHp) {
    ctx.fillStyle = '#12351d';
    ctx.fillRect(hare.x - 18, hare.y - hare.radius - 12, 36, 5);
    ctx.fillStyle = '#ff9a6b';
    ctx.fillRect(hare.x - 18, hare.y - hare.radius - 12, 36 * Math.max(0, hare.hp / hare.maxHp), 5);
  }
  if (hare.kind === 'jumbo') {
    ctx.fillStyle = '#ffe9a8';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('JUMBO', hare.x, hare.y - hare.radius - 18);
  }
}

function drawBullets(ctx, bullets) {
  for (const bullet of bullets) {
    ctx.beginPath();
    ctx.arc(bullet.x, bullet.y, bullet.fromEnemy ? 4 : 5, 0, Math.PI * 2);
    ctx.fillStyle = bullet.fromEnemy ? PALETTE.enemyBullet : PALETTE.bullet;
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(bullet.x, bullet.y);
    ctx.lineTo(bullet.x - bullet.vx * 0.03, bullet.y - bullet.vy * 0.03);
    ctx.strokeStyle = bullet.fromEnemy ? 'rgba(255, 122, 107, 0.7)' : 'rgba(255, 217, 77, 0.8)';
    ctx.lineWidth = 3;
    ctx.stroke();
  }
}

function drawCoins(ctx, coins, time) {
  for (const coin of coins) {
    const bob = Math.sin(time * 5 + coin.phase) * 3;
    circle(ctx, coin.x, coin.y + bob, 8, '#ffd94d');
    ctx.strokeStyle = '#a87f00';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(coin.x, coin.y + bob, 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#a87f00';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('$', coin.x, coin.y + bob + 4);
  }
}

function drawParticles(ctx, particles) {
  for (const particle of particles) {
    ctx.globalAlpha = Math.max(0, particle.life / particle.maxLife);
    circle(ctx, particle.x, particle.y, particle.size, particle.color);
  }
  ctx.globalAlpha = 1;
}

function drawPlantProgress(ctx, player) {
  if (!player.planting || player.plantProgress <= 0) return;
  const width = 260;
  const x = ARENA.width / 2 - width / 2;
  const y = ARENA.height - 120;
  ctx.fillStyle = 'rgba(18, 53, 29, 0.85)';
  ctx.fillRect(x - 10, y - 10, width + 20, 52);
  ctx.fillStyle = '#fff6d8';
  ctx.font = 'bold 18px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('MENANAM BENIH…', ARENA.width / 2, y + 12);
  ctx.fillStyle = '#12351d';
  ctx.fillRect(x, y + 20, width, 10);
  ctx.fillStyle = PALETTE.pod;
  ctx.fillRect(x, y + 20, width * player.plantProgress, 10);
}

// Paint one frame of the live arena (no menus, no HUD — hud.js owns those).
export function drawWorld(ctx, state, time) {
  drawGround(ctx);
  drawKebun(ctx, state.pod, state.player.plantProgress);
  drawFountain(ctx);
  drawCoins(ctx, state.coins, time);
  drawBullets(ctx, state.bullets);
  for (const hare of state.hares) {
    if (hare.alive) drawHare(ctx, hare, time);
  }
  if (state.player.alive) drawTortoise(ctx, state.player, time);
  drawParticles(ctx, state.particles);
  drawPlantProgress(ctx, state.player);
}
