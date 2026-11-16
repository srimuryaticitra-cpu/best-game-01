// audio.js — every sound in KURA OPS is synthesized with WebAudio.
//
// No audio files ship with the game: each effect is a short oscillator (or a
// filtered noise burst) shaped by a gain envelope. The synth is created lazily
// on the first user gesture, so browsers never complain, and every call is a
// no-op until then — the deterministic ?shot= captures run silent.
export function createSoundBank() {
  let context = null;
  let master = null;
  let muted = false;

  function ensure() {
    if (context) {
      if (context.state === 'suspended') context.resume();
      return true;
    }
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return false;
      context = new AudioContext();
      master = context.createGain();
      master.gain.value = 0.35;
      master.connect(context.destination);
      return true;
    } catch {
      return false;
    }
  }

  // One oscillator note: frequency slides from `from` to `to` over `seconds`.
  function tone(from, to, seconds, type, volume, delay = 0) {
    if (!ensure() || muted) return;
    const start = context.currentTime + delay;
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, start);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), start + seconds);
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + seconds);
    osc.connect(gain);
    gain.connect(master);
    osc.start(start);
    osc.stop(start + seconds + 0.02);
  }

  // A burst of filtered noise: the thud behind shots, hits and explosions.
  function noise(seconds, volume, lowpassHz, delay = 0) {
    if (!ensure() || muted) return;
    const start = context.currentTime + delay;
    const length = Math.max(1, Math.floor(context.sampleRate * seconds));
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = context.createBufferSource();
    source.buffer = buffer;
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = lowpassHz;
    const gain = context.createGain();
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + seconds);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    source.start(start);
  }

  return {
    // Call from any real key/click handler so the browser unlocks audio.
    unlock() {
      ensure();
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    isMuted() {
      return muted;
    },
    // Pistol crack; pitch follows the weapon kind.
    shoot(kind) {
      if (kind === 'dmr') {
        tone(220, 55, 0.22, 'sawtooth', 0.5);
        noise(0.12, 0.4, 1800);
      } else if (kind === 'smg') {
        tone(520, 180, 0.07, 'square', 0.22);
        noise(0.05, 0.18, 3200);
      } else if (kind === 'grenade') {
        tone(300, 520, 0.12, 'sine', 0.25);
      } else {
        tone(420, 140, 0.09, 'square', 0.3);
        noise(0.06, 0.22, 2600);
      }
    },
    // A hare's wild shot: thinner and higher, so the player hears whose it is.
    enemyShoot() {
      tone(700, 320, 0.06, 'square', 0.12);
    },
    // The player takes a hit: a low thud plus a descending groan.
    hurt() {
      tone(180, 60, 0.25, 'sawtooth', 0.45);
      noise(0.15, 0.3, 900);
    },
    // A hare goes down: a short pop.
    kill() {
      tone(340, 90, 0.16, 'triangle', 0.35);
      noise(0.08, 0.2, 1400);
    },
    // A coin lands: two bright notes, the garden paying out.
    coin() {
      tone(880, 880, 0.07, 'sine', 0.25);
      tone(1318, 1318, 0.12, 'sine', 0.25, 0.07);
    },
    // The Benih blooms: a rising arpeggio, the garden saying thank you.
    bloom() {
      tone(523, 523, 0.1, 'sine', 0.3);
      tone(659, 659, 0.1, 'sine', 0.3, 0.09);
      tone(784, 784, 0.16, 'sine', 0.3, 0.18);
      tone(1046, 1046, 0.3, 'sine', 0.3, 0.27);
    },
    // Planting ticks while E is held in the Kebun.
    plantTick() {
      tone(600, 600, 0.05, 'sine', 0.15);
    },
    // The shell shield soaks a hit: a hollow wooden knock.
    shieldBlock() {
      tone(240, 120, 0.18, 'triangle', 0.5);
      noise(0.1, 0.25, 700);
    },
    // Shield ready again after its cooldown.
    shieldReady() {
      tone(392, 523, 0.12, 'sine', 0.25);
    },
    // Dry click: the magazine is empty, reload with R.
    emptyClick() {
      tone(1200, 900, 0.04, 'square', 0.15);
    },
    // Reload: two clicks, open and shut.
    reload() {
      tone(500, 300, 0.05, 'square', 0.2);
      tone(700, 500, 0.05, 'square', 0.2, 0.12);
    },
    // Wave cleared: a small fanfare, three notes up.
    waveClear() {
      tone(523, 523, 0.12, 'triangle', 0.3);
      tone(659, 659, 0.12, 'triangle', 0.3, 0.11);
      tone(784, 784, 0.22, 'triangle', 0.35, 0.22);
    },
    // Grenade bloom: a deep boom.
    explosion() {
      noise(0.5, 0.6, 500);
      tone(120, 30, 0.45, 'sine', 0.55);
    },
    // Game over: four slow notes down, the tortoise retreats into its shell.
    gameOver() {
      tone(392, 392, 0.25, 'triangle', 0.3);
      tone(330, 330, 0.25, 'triangle', 0.3, 0.24);
      tone(262, 262, 0.25, 'triangle', 0.3, 0.48);
      tone(196, 130, 0.6, 'triangle', 0.35, 0.72);
    },
    // Victory: the tortoise wins the garden, slowly and surely.
    victory() {
      const notes = [523, 659, 784, 1046, 784, 1046];
      notes.forEach((note, i) => tone(note, note, 0.18, 'triangle', 0.3, i * 0.14));
    },
  };
}
