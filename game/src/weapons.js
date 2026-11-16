// weapons.js — the armoury of KURA OPS: Arena Tempurung.
//
// Five tools, one joke running through them: the tortoise brings a whole
// gun shop to a garden fight, and the hares bring speed and nothing else.
// Prices are in garden coins ($). The Kura-9 pistol is free forever; dying
// drops the bought gun back to the Kura-9, so every wave is a fresh decision
// about what the money is for.
export const WEAPON_IDS = ['kura9', 'kilap', 'tempurung', 'teropong', 'granat'];

export const WEAPONS = {
  kura9: {
    id: 'kura9',
    name: 'Kura-9',
    kind: 'pistol',
    price: 0,
    damage: 26,
    fireInterval: 0.26,
    magazine: 12,
    reserve: Infinity,
    reloadSeconds: 0.9,
    bulletSpeed: 720,
    spread: 0.045,
    range: 620,
    auto: false,
    blurb: 'Pistol dinas kura-kura. Gratis, setia, pelan tapi pasti.',
  },
  kilap: {
    id: 'kilap',
    name: 'Kilap SMG',
    kind: 'smg',
    price: 900,
    damage: 14,
    fireInterval: 0.085,
    magazine: 30,
    reserve: 120,
    reloadSeconds: 1.2,
    bulletSpeed: 680,
    spread: 0.09,
    range: 520,
    auto: true,
    blurb: 'Semprot kilat. Banyak peluru, sedikit kesabaran.',
  },
  tempurung: {
    id: 'tempurung',
    name: 'Tempurung AR',
    kind: 'rifle',
    price: 1200,
    damage: 34,
    fireInterval: 0.13,
    magazine: 25,
    reserve: 100,
    reloadSeconds: 1.4,
    bulletSpeed: 820,
    spread: 0.05,
    range: 700,
    auto: true,
    blurb: 'Senapan andalan operasi tempurung. Seimbang di semua jarak.',
  },
  teropong: {
    id: 'teropong',
    name: 'Teropong DMR',
    kind: 'dmr',
    price: 2200,
    damage: 85,
    fireInterval: 0.75,
    magazine: 5,
    reserve: 25,
    reloadSeconds: 1.8,
    bulletSpeed: 1100,
    spread: 0.008,
    range: 900,
    auto: false,
    blurb: 'Satu tembakan, satu kelinci pulang. Jangan sampai meleset.',
  },
  granat: {
    id: 'granat',
    name: 'Granat Daun',
    kind: 'grenade',
    price: 300,
    damage: 95,
    fireInterval: 0.6,
    magazine: 1,
    reserve: 0,
    reloadSeconds: 0,
    bulletSpeed: 420,
    spread: 0,
    range: 380,
    blastRadius: 120,
    auto: false,
    blurb: 'Daun yang meledak. Beli per butir, lempar ke kerumunan.',
  },
};

// The buy menu, in the order the keys 1-5 buy them.
export const BUY_MENU = [
  { key: '1', weapon: 'kura9', note: 'Sudah dimiliki' },
  { key: '2', weapon: 'kilap', note: 'SMG cepat' },
  { key: '3', weapon: 'tempurung', note: 'AR serba bisa' },
  { key: '4', weapon: 'teropong', note: 'DMR satu tembakan' },
  { key: '5', weapon: 'granat', note: 'Per butir, bisa beli banyak' },
];

// Money the garden pays out, so the player can plan a build.
export const PAYOUT = {
  kill: 100,
  waveClear: 300,
  waveBonusPerWave: 50,
  plant: 150,
  bloomClearBonus: 200,
};

// Fresh ammo state for a weapon id (magazine full, reserve as listed).
export function freshAmmo(weaponId) {
  const def = WEAPONS[weaponId];
  return { inMag: def.magazine, reserve: def.reserve };
}

// Price of buying (or re-buying) a weapon; grenades stack instead of replacing.
export function buyPrice(weaponId, ownedCount) {
  if (weaponId === 'granat') return WEAPONS.granat.price;
  return WEAPONS[weaponId].price;
}

export function weaponName(weaponId) {
  return WEAPONS[weaponId] ? WEAPONS[weaponId].name : weaponId;
}
