// player.js — the tortoise agent of KURA OPS: Arena Tempurung.
//
// Slow, steady, and armoured: 100 HP, a shell shield that soaks one hit on
// an 8-second cooldown, and a Benih pod he can plant in Site Kebun. He loses
// his bought gun when he falls — the garden is fair like that — but never his
// Kura-9. All movement is per-second and frame-rate independent.
import { WEAPONS, freshAmmo } from './weapons.js';

export const PLAYER_RADIUS = 18;
export const PLAYER_MAX_HP = 100;
export const PLAYER_SPEED = 175;
export const SHIELD_COOLDOWN = 8;
export const PLANT_SECONDS = 3;
export const POD_BLOOM_SECONDS = 5;

export function createPlayer(arena) {
  return {
    x: arena.width / 2,
    y: arena.height - 90,
    radius: PLAYER_RADIUS,
    hp: PLAYER_MAX_HP,
    maxHp: PLAYER_MAX_HP,
    angle: -Math.PI / 2,
    speed: PLAYER_SPEED,
    weapon: 'kura9',
    ammo: freshAmmo('kura9'),
    grenades: 0,
    fireTimer: 0,
    reloadTimer: 0,
    reloading: false,
    // Shell shield: true while the shield is up and ready to soak a hit.
    shieldUp: false,
    shieldCooldown: 0,
    shieldBlocks: 0,
    // Planting the Benih: 0..1 progress, only while standing in the Kebun.
    plantProgress: 0,
    planting: false,
    alive: true,
    kills: 0,
  };
}

export function resetPlayer(player, arena) {
  const fresh = createPlayer(arena);
  Object.assign(player, fresh);
}

// Aim the tortoise at a world point (the mouse, converted by the caller).
export function aimPlayerAt(player, worldX, worldY) {
  player.angle = Math.atan2(worldY - player.y, worldX - player.x);
}

// Walk, clamped inside the arena walls with a shell's width to spare.
export function movePlayer(player, dx, dy, dt, arena) {
  player.x = Math.min(arena.width - player.radius, Math.max(player.radius, player.x + dx * player.speed * dt));
  player.y = Math.min(arena.height - player.radius, Math.max(player.radius, player.y + dy * player.speed * dt));
}

// Raise the shell shield: soaks exactly one hit, then needs its cooldown.
export function tryRaiseShield(player) {
  if (!player.alive || player.shieldCooldown > 0 || player.shieldUp) return false;
  player.shieldUp = true;
  return true;
}

export function dropShield(player) {
  player.shieldUp = false;
}

// One hit lands on the player. Returns 'blocked' | 'hurt' | 'dead'.
export function damagePlayer(player, amount) {
  if (!player.alive) return 'dead';
  if (player.shieldUp) {
    player.shieldUp = false;
    player.shieldCooldown = SHIELD_COOLDOWN;
    player.shieldBlocks += 1;
    return 'blocked';
  }
  player.hp -= amount;
  if (player.hp <= 0) {
    player.hp = 0;
    player.alive = false;
    return 'dead';
  }
  return 'hurt';
}

export function healPlayer(player, amount) {
  player.hp = Math.min(player.maxHp, player.hp + amount);
}

// Cool the shield down; returns true on the exact frame it becomes ready.
export function tickShield(player, dt) {
  if (player.shieldCooldown > 0) {
    player.shieldCooldown -= dt;
    if (player.shieldCooldown <= 0) {
      player.shieldCooldown = 0;
      return true;
    }
  }
  return false;
}

// Reload bookkeeping: returns true when a reload finishes this frame.
export function tickReload(player, dt) {
  if (!player.reloading) return false;
  player.reloadTimer -= dt;
  if (player.reloadTimer > 0) return false;
  player.reloading = false;
  const def = WEAPONS[player.weapon];
  const need = def.magazine - player.ammo.inMag;
  if (def.reserve === Infinity) {
    player.ammo.inMag = def.magazine;
  } else {
    const taken = Math.min(need, player.ammo.reserve);
    player.ammo.inMag += taken;
    player.ammo.reserve -= taken;
  }
  return true;
}

export function startReload(player) {
  const def = WEAPONS[player.weapon];
  if (player.reloading || player.ammo.inMag >= def.magazine) return false;
  if (def.reserve !== Infinity && player.ammo.reserve <= 0) return false;
  player.reloading = true;
  player.reloadTimer = def.reloadSeconds;
  return true;
}

// Switch guns; grenades are a consumable, not a gun.
export function equipWeapon(player, weaponId) {
  if (weaponId === 'granat') {
    player.grenades += 1;
    return;
  }
  player.weapon = weaponId;
  player.ammo = freshAmmo(weaponId);
  player.reloading = false;
  player.reloadTimer = 0;
}

// Drop back to the free pistol after a death or a wave loss.
export function dropToPistol(player) {
  equipWeapon(player, 'kura9');
}
