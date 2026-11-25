// Tiny WebAudio blips: no assets, no network, silent until the first tap.

let ctx = null;

function audio() {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    try { ctx = new Ctor(); } catch (err) { return null; }
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

function tone({ freq = 440, dur = 0.12, type = 'square', gain = 0.05, slide = 0 }) {
  const ac = audio();
  if (!ac) return;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ac.currentTime);
  if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), ac.currentTime + dur);
  g.gain.setValueAtTime(gain, ac.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0008, ac.currentTime + dur);
  osc.connect(g).connect(ac.destination);
  osc.start();
  osc.stop(ac.currentTime + dur + 0.02);
}

export const Sfx = {
  unlock() { audio(); },
  fire() {
    tone({ freq: 160, dur: 0.28, type: 'sawtooth', gain: 0.09, slide: -110 });
    tone({ freq: 90, dur: 0.4, type: 'square', gain: 0.05, slide: -40 });
  },
  land() { tone({ freq: 110, dur: 0.16, type: 'triangle', gain: 0.08, slide: -50 }); },
  tame() { tone({ freq: 520, dur: 0.1, type: 'square', gain: 0.05 }); tone({ freq: 780, dur: 0.12, type: 'square', gain: 0.045 }); },
  fail() { tone({ freq: 220, dur: 0.18, type: 'sawtooth', gain: 0.05, slide: -90 }); },
  dice() { tone({ freq: 320, dur: 0.07, type: 'square', gain: 0.05 }); },
  reward() { tone({ freq: 660, dur: 0.1, type: 'triangle', gain: 0.06 }); tone({ freq: 880, dur: 0.14, type: 'triangle', gain: 0.05 }); },
  hurt() { tone({ freq: 140, dur: 0.22, type: 'square', gain: 0.07, slide: -60 }); },
  egg() { tone({ freq: 440, dur: 0.1, type: 'triangle', gain: 0.05 }); tone({ freq: 660, dur: 0.1, type: 'triangle', gain: 0.05 }); tone({ freq: 990, dur: 0.18, type: 'triangle', gain: 0.05 }); },
};
