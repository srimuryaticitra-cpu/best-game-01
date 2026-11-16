# KURA OPS — Arena Tempurung

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/srimuryaticitra-cpu/best-game-01/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/srimuryaticitra-cpu/best-game-01/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

Top-down arena shooter 2D di browser, tanpa library: kamu adalah agen
kura-kura, musuhnya kelinci — cepat, tapi nembaknya ngawur. Bertahan 10 wave
di kebun senja, kumpulkan uang dari kill, belanja senjata di Toko Tempurung
antar wave, dan tanam Benih di Site Kebun: kalau mekar, wave-nya bersih.

Entri untuk bounty make.fun best-game-01 ("Make the best game", $1.000,
dibuka 16 Nov 2026 01:00 WIB, deadline 19 Nov 2026 01:00 WIB). Game original,
dibangun dari nol di sesi ini: arena 2D canvas, suara sintetis WebAudio,
RNG deterministik (mulberry32, seed tetap per `?shot=`).

- **Perisai Tempurung.** Space menaikkan perisai yang menahan 1 hit,
  cooldown 8 detik. Satu hit yang ditahan bisa memenangkan duel.
- **Benih di Site Kebun.** Tahan E di dalam plot Kebun selama 3 detik untuk
  menanam; 5 detik kemudian pod mekar: +$350 dan semua kelinci di wave itu
  tumbang. Cara kalem tapi pasti untuk mengakhiri wave yang buruk.
- **Toko Tempurung.** Antar wave: Kura-9 gratis, Kilap SMG $900,
  Tempurung AR $1.200, Teropong DMR $2.200, Granat Daun $300/butir.
  Mati = kembali ke Kura-9.
- **Kelinci makin berani.** Tiap wave lebih banyak, lebih cepat, lebih
  tebal — dan mulai wave 3 ada Kelinci Jumbo. Kelinci menembak lebar dan
  lambat: yang sabar dan strafing hampir tak tersentuh.
- **Ekonomi kebun.** Kill $100, wave bersih $300 + $50/wave, Benih mekar
  $150 + bonus $200. Skor: 100/kill, 250/wave, 200/mekar, 1.000 kalau menang.

## Cara main

Serve `game/` dengan server statis apa pun lalu buka di desktop Chrome:

```sh
node serve.ts
# KURA OPS Arena Tempurung is on http://localhost:8080
```

Tanpa build step, tanpa network request: semua file game ada di `game/`,
suara dibuat WebAudio, tidak ada file audio atau gambar eksternal.

## Kontrol

| Tombol | Aksi |
| --- | --- |
| W A S D | Gerak |
| Mouse | Bidik |
| Klik | Tembak (tahan untuk senjata auto) |
| R | Reload (di layar akhir: main lagi) |
| Space | Perisai Tempurung (tahan 1 hit) |
| E (tahan) | Tanam Benih, berdiri di dalam Site Kebun |
| G | Lempar Granat Daun |
| B / Enter | Toko antar wave: buka / mulai wave berikutnya |
| 1–5 | Beli di toko (atau klik barisnya) |
| P | Jeda |
| M | Bisu |

## Struktur

```
main.ts                  entrypoint: salin game/ + screenshots/ ke /output, tulis dossier.json
serve.ts                 server statis kecil untuk main lokal
vendor/makefun-game.ts   library kit, tidak diubah
game/
  index.html             halaman: satu canvas, HUD digambar di canvas
  src/
    main.js              boot + loop 60 Hz + mode ?shot= + debug handle __dbg
    game.js              match: state, wave, ekonomi, tembak, tanam, mekar, kalah/menang
    player.js            kura-kura: gerak, HP, perisai, reload, ganti senjata
    enemies.js           kelinci: AI kejar-strafe, tembakan ngawur, Jumbo
    waves.js             komposisi wave, spawn berkelompok, payout wave
    weapons.js           gudang senjata + harga toko + payout
    render.js            gambar arena: kebun, kolam, kura-kura, kelinci, peluru
    hud.js               HUD + title + toko + layar akhir, semua di canvas
    input.js             keyboard + mouse, aksi sekali-tekan
    audio.js             suara sintetis WebAudio (tanpa file audio)
    rng.js               mulberry32 deterministik + seed dari teks
    shots.js             scene deterministik ?shot=start|play|buy|end + autopilot
screenshots/              4 render asli dari kode game sendiri (lihat shots.json)
```

## Screenshot

Diambil di headless Chrome dari mode capture deterministik game
(`?shot=start|play|buy|end&seed=1`):

1. `1-start.jpg` — layar judul di atas kebun yang hidup.
2. `2-play.jpg` — wave 2 berjalan: HUD lengkap, kelinci menyerbu.
3. `3-buy.jpg` — Toko Tempurung antar wave, Tempurung AR sudah dibeli.
4. `4-end.jpg` — game over: kura-kura tumbang, tekan R untuk main lagi.

## Lisensi

MIT — lihat LICENSE.

---

<sub>Entri di [make.fun](https://make.fun/?ref=mzz4mwfh&utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>
