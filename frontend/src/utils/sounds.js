/**
 * Procedural mechanical sound effects using the browser's Web Audio API.
 * This does not require any external audio assets or network requests, and is extremely lightweight.
 */
export function playLockSound(isUnlock = true) {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const now = ctx.currentTime;

    if (isUnlock) {
      // UNLOCK SOUND (metallic double click + sliding bolt thud)
      
      // 1. First quick click (key insertion/turn starts)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(1100, now);
      osc1.frequency.exponentialRampToValueAtTime(120, now + 0.04);
      gain1.gain.setValueAtTime(0.12, now);
      gain1.gain.exponentialRampToValueAtTime(0.005, now + 0.04);
      
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.05);

      // 2. Second click (pins aligning/snap) - slightly delayed
      const delay1 = 0.07;
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(950, now + delay1);
      osc2.frequency.exponentialRampToValueAtTime(250, now + delay1 + 0.06);
      gain2.gain.setValueAtTime(0.1, now + delay1);
      gain2.gain.exponentialRampToValueAtTime(0.005, now + delay1 + 0.06);

      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + delay1);
      osc2.stop(now + delay1 + 0.07);

      // 3. Heavy bolt sliding open (low-pass filtered thump) - further delayed
      const delay2 = 0.13;
      const osc3 = ctx.createOscillator();
      const gain3 = ctx.createGain();
      osc3.type = 'sawtooth';
      
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(180, now + delay2);
      filter.frequency.exponentialRampToValueAtTime(45, now + delay2 + 0.15);

      osc3.frequency.setValueAtTime(95, now + delay2);
      osc3.frequency.exponentialRampToValueAtTime(35, now + delay2 + 0.15);
      
      gain3.gain.setValueAtTime(0.2, now + delay2);
      gain3.gain.exponentialRampToValueAtTime(0.005, now + delay2 + 0.15);

      osc3.connect(filter);
      filter.connect(gain3);
      gain3.connect(ctx.destination);
      osc3.start(now + delay2);
      osc3.stop(now + delay2 + 0.18);

    } else {
      // LOCK SOUND (heavy slam and secure latch click)
      
      // 1. Heavy latch slam (low thud)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sawtooth';
      
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(190, now);
      filter.frequency.exponentialRampToValueAtTime(30, now + 0.14);

      osc1.frequency.setValueAtTime(110, now);
      osc1.frequency.exponentialRampToValueAtTime(25, now + 0.14);
      
      gain1.gain.setValueAtTime(0.25, now);
      gain1.gain.exponentialRampToValueAtTime(0.005, now + 0.14);

      osc1.connect(filter);
      filter.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.15);

      // 2. High-pitch metallic strike bounce click (spring snap)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(1400, now);
      osc2.frequency.exponentialRampToValueAtTime(750, now + 0.035);
      gain2.gain.setValueAtTime(0.12, now);
      gain2.gain.exponentialRampToValueAtTime(0.005, now + 0.035);

      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now);
      osc2.stop(now + 0.04);
    }
  } catch (error) {
    console.error('[Web Audio API] Failed to play lock/unlock sound:', error);
  }
}
