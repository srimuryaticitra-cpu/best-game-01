# Transcript — KURA OPS: Arena Tempurung (best-game-01)

Build log untuk entri bounty make.fun "Make the best game" ($1.000, dibuka
Sen 16 Nov 2026 01:00 WIB, deadline Kam 19 Nov 2026 01:00 WIB). Semua kode
game + main.ts ditulis di sesi ini (dimulai setelah bounty buka, 16 Nov 2026
~01:07 WIB) oleh agen, dalam catatan kerja Bahasa Indonesia; teks game-nya
sendiri Bahasa Indonesia. Tidak ada data pribadi user di file manapun — akun
hanya disebut @sri-muryati.

## Gamenya

**KURA OPS — Arena Tempurung.** Top-down arena shooter 2D canvas, tanpa
library: pemain adalah agen kura-kura; musuhnya kelinci — cepat, tapi
nembaknya ngawur. Bertahan 10 wave di kebun senja. Uang dari kill membelikan
senjata di Toko Tempurung antar wave; tanam Benih di Site Kebun (tahan E
3 detik), 5 detik kemudian pod mekar: +$350 dan semua kelinci di wave itu
tumbang. Space = Perisai Tempurung (tahan 1 hit, cooldown 8 detik).
Kill $100, wave bersih $300 + $50/wave, mekar $150 + bonus $200. Mati =
kembali ke pistol gratis Kura-9. Senjata: Kura-9 gratis, Kilap SMG $900,
Tempurung AR $1.200, Teropong DMR $2.200, Granat Daun $300/butir.
Mulai wave 3 ada Kelinci Jumbo. HUD: HP, ammo, wave, skor, uang, timer,
status perisai, feed event. Suara sintetis WebAudio (tanpa file audio).
RNG mulberry32 deterministik, seed tetap per `?shot=`.

Lelucon yang diminta user ("serius tapi fun/lucu", tenang tapi pasti, beda
dari yang lain): hewan paling lambat di kebun adalah operator pasukan
khusus, dan yang cepat tidak bisa membidik.

## File yang ditulis di sesi ini

- `game/src/rng.js` — mulberry32 + helper, seed tetap untuk capture.
- `game/src/weapons.js` — gudang senjata, harga toko, payout.
- `game/src/audio.js` — synth WebAudio: tembak, kena, koin, mekar, game over.
- `game/src/input.js` — keyboard + mouse, aksi sekali-tekan.
- `game/src/player.js` — kura-kura: gerak, HP, perisai, reload, ganti senjata.
- `game/src/enemies.js` — kelinci: AI kejar-strafe, tembakan ngawur, Jumbo.
- `game/src/waves.js` — komposisi wave, spawn berkelompok, payout wave.
- `game/src/render.js` — gambar arena: kebun, kolam, kura-kura, kelinci.
- `game/src/hud.js` — HUD + title + toko + layar akhir, semua di canvas.
- `game/src/game.js` — match: state, wave, ekonomi, tembak, tanam, mekar.
- `game/src/shots.js` — scene deterministik `?shot=start|play|buy|end`.
- `game/src/main.js` — boot + loop 60 Hz + mode `?shot=` + `__dbg`.
- `game/index.html` — satu canvas, tanpa network request.
- `main.ts` — entrypoint: salin game/ + screenshots/ ke /output, tulis
  dossier.json via `buildDossier`, lalu verifikasi bundle (ukuran dossier,
  teks, screenshot + dimensi + sha256, game/ totals) dan cetak ringkasan.
- `serve.ts` — server statis kecil untuk main lokal.
- `README.md`, `shots.json`, `.makefun/owner.json` (agent wallet),
  `transcript.md` (file ini).

Disalin tanpa diubah (bukan karya sesi ini): `vendor/makefun-game.ts` (dari
kit) dan `LICENSE` (MIT, dari starter).

## Verifikasi

- `node --check` lolos untuk 12 modul `game/src/*.js`.
- Uji logika Node (`/tmp/bg-logic-test.mjs`, 13 checks, semua PASS):
  komposisi wave tumbuh (wave 1 = 6 kelinci, wave 5 = 14 + 2 Jumbo);
  damage/kill kelinci; perisai menahan tepat 1 hit lalu cooldown 8 dtk;
  autopilot membersihkan wave 1 dalam 16,8 dtk (6 kill, $800 → $1.750,
  HP 55); beli Tempurung AR $1.200 berhasil; Benih mekar membersihkan
  wave + membayar.
- Play-test live headless (CDP, input keyboard/mouse sungguhan, ~16 dtk):
  Enter mulai game; 10 klik → ammo 12 → 2; Space menaikkan perisai
  (sempat menahan 1 hit, cooldown jalan); jalan ke Site Kebun (WASD) lalu
  tahan E → Benih tertanam, bloom 0,12 → 0,22; HP turun karena ditembak
  kelinci saat berdiri diam. Nol console error, nol failed request.
- Screenshot 4x, masing-masing 3 run (`?shot=start|play|buy|end&seed=1`,
  1280x480 JPEG q85): semua IDENTIK antar run (sha256 sama persis):
  1-start 51.206 byte, 2-play 39.090 byte, 3-buy 59.043 byte,
  4-end 33.450 byte — masing-masing ≤256 KiB, dan sudah dilihat isinya:
  title, gameplay + HUD lengkap (HP 46, Skor 1050, Wave 2/10, $1950,
  feed "PERISAI PECAH!"), toko (Tempurung AR DIPAKAI, $550), game over
  ("KURA TUMBANG", tekan R untuk main lagi).
- `main.ts` dua run: lihat laporan akhir (diff -r harus identik).
- Tidak ada referensi eksternal: grep `http` di game/ + main.ts (lihat
  laporan akhir; badge hanya di README, bukan di game/).

## Bug yang ditemukan dan diperbaiki di sesi ini

- `shots.js` — autopilot pistol hanya menembak sekali: `firingEdge` dihitung
  dari perubahan `firing`, padahal autopilot menahan tembak terus. Uji
  logika menunjukkan 0 kill dalam 24 dtk dan pemain mati. Diperbaiki:
  autopilot "mengeklik" tiap frame; `fireWeapon` sendiri yang membatasi
  laju via `fireTimer`. Sesudahnya wave 1 bersih dalam 16,8 dtk.
- `input.js` — `Enter`/`Escape`/panah tidak dikenali: `keyName` hanya
  me-lowercase tombol 1 huruf, jadi `'Enter' !== 'enter'`. Live test
  pertama: Enter tidak memulai game (baru Space yang memulai). Diperbaiki:
  lowercase semua nama tombol. Sesudahnya Enter memulai game.
- `main.js` — aksi reload/grenade bisa hilang: `takeActions()` dipanggil
  di `handleActions()` lalu lagi di `step()`, dan panggilan kedua selalu
  kosong. Diperbaiki: aksi sekali-tekan dititipkan ke `pendingReload` /
  `pendingGrenade` dan dikonsumsi `step()`.
- Chrome VM ini memblokir navigasi ke server localhost
  (`ERR_BLOCKED_BY_LOCAL_NETWORK_ACCESS_CHECKS`) dan menolak start tanpa
  kebijakan WebGL. Screenshot + play-test diambil via `file://` dengan
  `--allow-file-access-from-files` dan flag kebijakan WebGL
  (`--hatch-webgl-allowed-domains-file` + sha256). Game tidak melakukan
  network request, jadi `file://` setara dengan HTTP statis.
- Driver screenshot pertama memakai `--screenshot` polos: tidak ada file
  yang dihasilkan (tanpa pesan error jelas). Diganti ke CDP
  (`Page.captureScreenshot` setelah `window.__shotReady`).

## Revisi setelah verifikasi pertama (thinking_revised)

- `main.ts`: ditulis dulu versi dasar (salin + dossier), lalu direvisi
  setelah build pertama: ditambah `verifyBundle` — dossier ≤1,5 MiB,
  teks ≤163.840 byte, screenshot 3–4 file + dimensi riil dari header
  JPEG/PNG + sha256 dossier vs file, `game/index.html` ≤1 MiB, game/
  ≤993 file / 48 MiB — plus ringkasan bundle satu baris.
- `game.js` / `shots.js`: perbaikan autopilot + fallback `buy` (kalau
  autopilot gagal membersihkan wave 1 dalam batas waktu, wave tetap
  dibuka sebagai toko dengan state nyata).

## Belum / catatan

- Tidak ada repo GitHub dibuat, tidak ada push, tidak ada submit
  (sesuai tugas: repo creation/push/submit diurus parent).
- End screen capture menunjukkan Skor 0 / Kill 0 (autopilot yang
  berdiri diam dan tidak menembak memang mati dalam 20 dtk tanpa kill)
  — jujur sebagai layar kalah, bukan kekurangan.
- Keseimbangan: pemain yang berdiri diam di tempat terbuka akan tumbang
  dalam ~15–25 dtk; yang strafing dan memakai perisai membersihkan
  wave 1 dengan HP 55 tersisa. Terasa adil untuk arena shooter.
