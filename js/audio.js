'use strict';
// ---------------------------------------------------------------------------
// Ses: Web Audio ile sentezlenen efektler, taiko ritimli müzik ve
// speechSynthesis ile Japonca replikler (Japonca ses yoksa romaji okunur).
// ---------------------------------------------------------------------------

const Snd = (() => {
  let ac = null, master, sfxBus, musicBus, revIn, noiseBuf;
  let muted = false, voiceOn = true;
  let jaVoice = null;

  function init() {
    if (ac) {
      if (ac.state === 'suspended') ac.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      ac = new AC();
    } catch (e) {
      ac = null;
      return;
    }
    master = ac.createGain();
    master.gain.value = muted ? 0 : 0.8;
    const comp = ac.createDynamicsCompressor();
    comp.threshold.value = -12;
    comp.ratio.value = 5;
    master.connect(comp);
    comp.connect(ac.destination);
    sfxBus = ac.createGain();
    sfxBus.gain.value = 0.9;
    sfxBus.connect(master);
    musicBus = ac.createGain();
    musicBus.gain.value = 0.32;
    musicBus.connect(master);

    const len = ac.sampleRate * 2;
    noiseBuf = ac.createBuffer(1, len, ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;

    const conv = ac.createConvolver();
    const il = Math.floor(ac.sampleRate * 2.4);
    const ib = ac.createBuffer(2, il, ac.sampleRate);
    for (let c = 0; c < 2; c++) {
      const ch = ib.getChannelData(c);
      for (let i = 0; i < il; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / il, 2.6);
    }
    conv.buffer = ib;
    revIn = ac.createGain();
    revIn.gain.value = 0.3;
    revIn.connect(conv);
    conv.connect(master);
  }

  function env(g, t, a, peak, d) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }

  function noise(o = {}) {
    if (!ac) return;
    const { dur = 0.3, type = 'bandpass', f0 = 1000, f1 = 0, q = 1, gain = 0.5, attack = 0.004, rev = 0, when = 0, at = 0, bus = sfxBus } = o;
    const t = at || ac.currentTime + when;
    const src = ac.createBufferSource();
    src.buffer = noiseBuf;
    src.loop = true;
    const f = ac.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(f0, t);
    if (f1) f.frequency.exponentialRampToValueAtTime(f1, t + attack + dur);
    f.Q.value = q;
    const g = ac.createGain();
    env(g, t, attack, gain, dur);
    src.connect(f);
    f.connect(g);
    g.connect(bus);
    if (rev) {
      const rg = ac.createGain();
      rg.gain.value = rev;
      g.connect(rg);
      rg.connect(revIn);
    }
    src.start(t, Math.random() * 1.5);
    src.stop(t + attack + dur + 0.05);
  }

  function tone(o = {}) {
    if (!ac) return;
    const { type = 'sine', f0 = 440, f1 = 0, dur = 0.3, gain = 0.4, attack = 0.004, rev = 0, when = 0, at = 0, detune = 0, bus = sfxBus } = o;
    const t = at || ac.currentTime + when;
    const osc = ac.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, t);
    if (f1) osc.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + attack + dur);
    osc.detune.value = detune;
    const g = ac.createGain();
    env(g, t, attack, gain, dur);
    osc.connect(g);
    g.connect(bus);
    if (rev) {
      const rg = ac.createGain();
      rg.gain.value = rev;
      g.connect(rg);
      rg.connect(revIn);
    }
    osc.start(t);
    osc.stop(t + attack + dur + 0.05);
  }

  // --- Efekt tarifleri -------------------------------------------------------
  const sfx = {
    click() { tone({ f0: 900, f1: 1300, dur: 0.06, gain: 0.08 }); },
    whoosh() { noise({ type: 'bandpass', f0: 400, f1: 2600, q: 1.8, dur: 0.22, gain: 0.28 }); },
    dash() { noise({ type: 'bandpass', f0: 1800, f1: 500, q: 1.2, dur: 0.18, gain: 0.25 }); },
    jump() { noise({ type: 'bandpass', f0: 300, f1: 900, q: 1, dur: 0.12, gain: 0.12 }); },
    land() { tone({ f0: 110, f1: 50, dur: 0.12, gain: 0.25 }); noise({ type: 'lowpass', f0: 600, dur: 0.1, gain: 0.15 }); },
    punch() { noise({ type: 'lowpass', f0: 1800, f1: 400, dur: 0.07, gain: 0.45 }); tone({ f0: 190, f1: 70, dur: 0.1, gain: 0.45 }); },
    hit() { noise({ type: 'lowpass', f0: 2400, f1: 500, dur: 0.09, gain: 0.55 }); tone({ f0: 160, f1: 55, dur: 0.14, gain: 0.55 }); },
    heavy() {
      tone({ f0: 130, f1: 32, dur: 0.45, gain: 0.95 });
      noise({ type: 'lowpass', f0: 1400, f1: 90, dur: 0.4, gain: 0.8, rev: 0.25 });
    },
    block() { tone({ type: 'triangle', f0: 1200, f1: 700, dur: 0.07, gain: 0.18 }); noise({ type: 'highpass', f0: 3000, dur: 0.05, gain: 0.2 }); },
    slash() {
      noise({ type: 'highpass', f0: 2600, f1: 6500, dur: 0.11, gain: 0.32 });
      tone({ type: 'square', f0: 2200, f1: 700, dur: 0.07, gain: 0.04 });
    },
    bigSlash() {
      noise({ type: 'bandpass', f0: 3200, f1: 420, q: 0.9, dur: 0.36, gain: 0.7, rev: 0.3 });
      tone({ type: 'sawtooth', f0: 1100, f1: 110, dur: 0.3, gain: 0.1 });
    },
    kai() {
      noise({ type: 'highpass', f0: 5000, dur: 0.06, gain: 0.8 });
      tone({ type: 'sine', f0: 3400, f1: 2600, dur: 0.7, gain: 0.08, rev: 0.4 });
      noise({ type: 'bandpass', f0: 2500, f1: 300, q: 0.7, dur: 0.5, gain: 0.6, rev: 0.3 });
    },
    web() {
      noise({ type: 'bandpass', f0: 600, f1: 3500, q: 0.8, dur: 0.3, gain: 0.6 });
      tone({ f0: 90, f1: 40, dur: 0.5, gain: 0.7 });
      for (let i = 0; i < 6; i++) noise({ type: 'highpass', f0: 3000 + i * 400, dur: 0.05, gain: 0.25, when: 0.04 * i });
    },
    crush() {
      tone({ f0: 90, f1: 22, dur: 0.8, gain: 1 });
      noise({ type: 'lowpass', f0: 1200, f1: 60, dur: 0.9, gain: 0.9, rev: 0.4 });
    },
    charge() { noise({ type: 'bandpass', f0: 200, f1: 1800, q: 3, dur: 0.3, gain: 0.25 }); },
    blackFlash() {
      noise({ type: 'highpass', f0: 4500, dur: 0.05, gain: 1 });
      tone({ type: 'square', f0: 2600, f1: 70, dur: 0.28, gain: 0.25 });
      tone({ f0: 150, f1: 28, dur: 0.6, gain: 1 });
      noise({ type: 'lowpass', f0: 2000, f1: 80, dur: 0.6, gain: 0.9, rev: 0.5 });
    },
    heal() {
      [660, 880, 1175, 1568].forEach((f, i) => tone({ f0: f, dur: 0.6, gain: 0.12, when: i * 0.09, rev: 0.6 }));
      noise({ type: 'bandpass', f0: 2500, q: 4, dur: 0.9, gain: 0.08, rev: 0.5 });
    },
    transform() {
      tone({ type: 'sawtooth', f0: 48, f1: 30, dur: 1.8, gain: 0.35, rev: 0.5 });
      tone({ type: 'sawtooth', f0: 120, f1: 60, dur: 1.2, gain: 0.15, detune: 12 });
      noise({ type: 'lowpass', f0: 600, f1: 2400, dur: 1.4, gain: 0.5, rev: 0.4 });
    },
    roar() {
      tone({ type: 'sawtooth', f0: 95, f1: 70, dur: 1.1, gain: 0.3, rev: 0.4 });
      noise({ type: 'bandpass', f0: 500, f1: 250, q: 1.5, dur: 1.1, gain: 0.6, rev: 0.4 });
    },
    worldCut() {
      noise({ type: 'highpass', f0: 6000, dur: 0.08, gain: 0.9 });
      tone({ f0: 4200, f1: 3000, dur: 1.2, gain: 0.08, rev: 0.6 });
      tone({ f0: 70, f1: 30, dur: 0.7, gain: 0.8 });
      for (let i = 0; i < 8; i++) tone({ f0: rand(2200, 6000), dur: 0.25, gain: 0.04, when: 0.03 + i * 0.025 });
    },
    domain() {
      tone({ type: 'sawtooth', f0: 55, dur: 3.2, gain: 0.22, attack: 0.4, rev: 0.7 });
      tone({ type: 'sawtooth', f0: 55, dur: 3.2, gain: 0.22, attack: 0.4, detune: 14 });
      tone({ f0: 27.5, dur: 3.2, gain: 0.5, attack: 0.3 });
      tone({ f0: 880, dur: 2.6, gain: 0.07, rev: 0.8, when: 0.2 });
      tone({ f0: 1318, dur: 2.6, gain: 0.05, rev: 0.8, when: 0.35 });
      noise({ type: 'lowpass', f0: 300, f1: 900, dur: 3, gain: 0.35, attack: 0.5 });
    },
    voidOpen() {
      tone({ f0: 220, f1: 1760, dur: 1.4, gain: 0.12, rev: 0.8 });
      tone({ f0: 330, f1: 2640, dur: 1.4, gain: 0.08, rev: 0.8 });
      noise({ type: 'highpass', f0: 2000, f1: 9000, dur: 1.3, gain: 0.2, rev: 0.6 });
      tone({ f0: 40, dur: 1.6, gain: 0.5 });
    },
    shatter() {
      for (let i = 0; i < 14; i++) tone({ f0: rand(1800, 7000), dur: rand(0.1, 0.4), gain: 0.05, when: i * 0.018, rev: 0.4 });
      noise({ type: 'highpass', f0: 3500, dur: 0.35, gain: 0.5, rev: 0.4 });
    },
    blue() {
      tone({ f0: 70, f1: 260, dur: 0.65, gain: 0.45 });
      tone({ type: 'triangle', f0: 140, f1: 520, dur: 0.6, gain: 0.12 });
      noise({ type: 'bandpass', f0: 2400, f1: 300, q: 1.4, dur: 0.6, gain: 0.3, rev: 0.3 });
    },
    redCharge() {
      tone({ type: 'sawtooth', f0: 180, f1: 1400, dur: 0.42, gain: 0.1 });
      tone({ f0: 420, f1: 2600, dur: 0.42, gain: 0.09 });
    },
    redFire() {
      noise({ type: 'bandpass', f0: 1800, f1: 200, q: 0.8, dur: 0.5, gain: 0.85, rev: 0.3 });
      tone({ type: 'square', f0: 320, f1: 55, dur: 0.32, gain: 0.18 });
    },
    explode() {
      noise({ type: 'lowpass', f0: 1600, f1: 50, dur: 1.2, gain: 1, rev: 0.5 });
      tone({ f0: 85, f1: 24, dur: 1.0, gain: 1 });
    },
    teleport() {
      tone({ f0: 1900, f1: 240, dur: 0.12, gain: 0.18 });
      noise({ type: 'highpass', f0: 6000, dur: 0.07, gain: 0.2 });
    },
    counter() {
      tone({ type: 'triangle', f0: 1500, f1: 3000, dur: 0.18, gain: 0.15, rev: 0.5 });
      tone({ f0: 760, dur: 0.5, gain: 0.08, rev: 0.6 });
    },
    purpleCharge() {
      tone({ type: 'sawtooth', f0: 55, dur: 2.2, gain: 0.25, attack: 0.3, rev: 0.6 });
      tone({ type: 'sawtooth', f0: 82.4, dur: 2.2, gain: 0.18, attack: 0.3, detune: 9 });
      tone({ f0: 330, f1: 1320, dur: 2.0, gain: 0.08, rev: 0.6 });
      noise({ type: 'bandpass', f0: 300, f1: 4000, q: 1, dur: 2, gain: 0.25 });
    },
    purpleFire() {
      noise({ type: 'lowpass', f0: 4000, f1: 60, dur: 2.6, gain: 1, rev: 0.7 });
      tone({ f0: 110, f1: 30, dur: 2.2, gain: 1 });
      tone({ type: 'sawtooth', f0: 220, f1: 55, dur: 1.4, gain: 0.25 });
    },
    fireCharge() { noise({ type: 'bandpass', f0: 300, f1: 1500, q: 0.6, dur: 1.0, gain: 0.45, rev: 0.3 }); },
    fire() {
      noise({ type: 'lowpass', f0: 2600, f1: 120, dur: 1.8, gain: 1, rev: 0.5 });
      tone({ f0: 70, f1: 25, dur: 1.4, gain: 0.9 });
      for (let i = 0; i < 10; i++) noise({ type: 'highpass', f0: 2500, dur: 0.03, gain: 0.25, when: 0.1 + i * 0.09 });
    },
    ko() {
      tone({ f0: 70, f1: 20, dur: 1.6, gain: 1, rev: 0.6 });
      noise({ type: 'lowpass', f0: 1000, f1: 40, dur: 1.6, gain: 0.8, rev: 0.6 });
    },
    gong() {
      tone({ f0: 98, dur: 2.5, gain: 0.35, rev: 0.7 });
      tone({ f0: 196.5, dur: 2.0, gain: 0.15, rev: 0.7 });
      tone({ f0: 293, dur: 1.5, gain: 0.08, rev: 0.7 });
    },
  };

  // --- Müzik: taiko + bas + pentatonik koto -----------------------------------
  let musicOn = false, nextT = 0, step = 0, timer = null, intensity = 1;
  const BPM = 128;
  const ROOTS = [73.42, 73.42, 65.41, 58.27]; // D2 D2 C2 A#1
  const SCALE = [293.66, 311.13, 392.0, 440.0, 523.25, 587.33, 622.25, 783.99];
  const MEL = [0, -1, 2, -1, 3, 2, -1, 1, 4, -1, 3, -1, 2, 0, -1, -1];

  function playStep(s, t) {
    const bar = Math.floor(s / 16) % 4, i = s % 16;
    const kick = [0, 3, 6, 8, 10, 11, 14];
    if (kick.includes(i)) {
      tone({ f0: 95, f1: 42, dur: 0.32, gain: i === 0 ? 0.9 : 0.6, at: t, bus: musicBus });
      noise({ type: 'lowpass', f0: 500, dur: 0.12, gain: 0.35, at: t, bus: musicBus });
    }
    if (intensity > 0.5 && i % 2 === 1) noise({ type: 'bandpass', f0: 3200, q: 3, dur: 0.04, gain: i % 4 === 3 ? 0.22 : 0.1, at: t, bus: musicBus });
    if (i === 0) {
      tone({ type: 'sawtooth', f0: ROOTS[bar], dur: 1.7, gain: 0.12, attack: 0.05, at: t, bus: musicBus });
      tone({ type: 'sawtooth', f0: ROOTS[bar], dur: 1.7, gain: 0.1, attack: 0.05, detune: 10, at: t, bus: musicBus });
    }
    if (intensity > 0.5) {
      const m = MEL[(i + bar * 5) % 16];
      if (m >= 0 && (s % 64 >= 16)) {
        const f = SCALE[(m + bar) % SCALE.length];
        tone({ type: 'triangle', f0: f, dur: 0.35, gain: 0.07, at: t, bus: musicBus });
        tone({ f0: f * 2, dur: 0.18, gain: 0.025, at: t, bus: musicBus });
      }
    }
  }

  function sched() {
    if (!ac || !musicOn) return;
    while (nextT < ac.currentTime + 0.15) {
      playStep(step, nextT);
      nextT += 60 / BPM / 4;
      step = (step + 1) % 256;
    }
  }

  function startMusic(level = 1) {
    intensity = level;
    if (!ac || musicOn) return;
    musicOn = true;
    nextT = ac.currentTime + 0.1;
    step = 0;
    timer = setInterval(sched, 30);
  }
  function stopMusic() {
    musicOn = false;
    if (timer) clearInterval(timer);
    timer = null;
  }

  // --- Seslendirme -------------------------------------------------------------
  function loadVoices() {
    try {
      const vs = window.speechSynthesis.getVoices();
      jaVoice = vs.find((v) => /^ja/i.test(v.lang)) || null;
    } catch (e) {
      jaVoice = null;
    }
  }
  if ('speechSynthesis' in window) {
    loadVoices();
    try {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    } catch (e) { /* bazı tarayıcılarda salt okunur */ }
  }

  function say(ja, romaji, o = {}) {
    if (!voiceOn || muted || !('speechSynthesis' in window)) return;
    try {
      const ss = window.speechSynthesis;
      ss.cancel();
      const u = new SpeechSynthesisUtterance(jaVoice ? ja : romaji);
      if (jaVoice) {
        u.voice = jaVoice;
        u.lang = jaVoice.lang;
      } else u.lang = 'en-US';
      u.pitch = o.pitch ?? 1;
      u.rate = o.rate ?? 1;
      u.volume = 1;
      ss.speak(u);
    } catch (e) { /* seslendirme yoksa sessiz geç */ }
  }

  return {
    init,
    sfx: new Proxy(sfx, { get: (o, k) => (ac && !muted && o[k] ? o[k] : () => {}) }),
    say,
    startMusic,
    stopMusic,
    setIntensity(v) { intensity = v; },
    get muted() { return muted; },
    setMuted(m) {
      muted = m;
      if (master) master.gain.value = m ? 0 : 0.8;
      if (m && 'speechSynthesis' in window) window.speechSynthesis.cancel();
    },
    get voiceOn() { return voiceOn; },
    setVoice(v) { voiceOn = v; },
    hasJaVoice: () => !!jaVoice,
  };
})();
