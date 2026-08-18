// Audio synthesizer using Web Audio API to create background music tracks
// as well as processing uploaded audio files.

export interface AudioPreset {
  id: string;
  name: string;
  description: string;
  bpm: number;
}

export const PRESET_AUDIO_TRACKS: AudioPreset[] = [
  {
    id: 'upbeat',
    name: 'Upbeat SaaS Vibe',
    description: 'Energetic electronic synth chord progression, ideal for feature walk-throughs',
    bpm: 110,
  },
  {
    id: 'ambient',
    name: 'Gentle Tech Ambient',
    description: 'Soft pad drone with light melodic chime accents, non-intrusive and clean',
    bpm: 85,
  },
  {
    id: 'lofi',
    name: 'Lo-Fi Focus',
    description: 'Warm chill chord loops with light vinyl warmth, perfect for tutorials',
    bpm: 90,
  },
];

/**
 * Renders synthesized background music of specified duration into an AudioBuffer / Blob URL
 */
export async function generateSynthesizedAudio(
  presetId: string,
  durationSeconds: number
): Promise<{ blob: Blob; url: string }> {
  const sampleRate = 44100;
  const numSamples = Math.ceil(sampleRate * durationSeconds);
  const offlineCtx = new OfflineAudioContext(2, numSamples, sampleRate);

  const now = 0;

  if (presetId === 'upbeat') {
    // Upbeat chords: Cmaj7 -> Am7 -> Fmaj7 -> G7
    const chordFreqs = [
      [261.63, 329.63, 392.00, 493.88], // Cmaj7
      [220.00, 261.63, 329.63, 392.00], // Am7
      [174.61, 220.00, 261.63, 329.63], // Fmaj7
      [196.00, 246.94, 293.66, 349.23], // G7
    ];
    const measureDuration = 2.0;

    for (let t = now; t < durationSeconds; t += measureDuration) {
      const chordIndex = Math.floor(t / measureDuration) % chordFreqs.length;
      const freqs = chordFreqs[chordIndex];

      freqs.forEach((freq, idx) => {
        const osc = offlineCtx.createOscillator();
        const gain = offlineCtx.createGain();

        osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq, t);

        gain.gain.setValueAtTime(0.04, t);
        gain.gain.exponentialRampToValueAtTime(0.02, t + measureDuration - 0.1);
        gain.gain.setValueAtTime(0.001, t + measureDuration);

        osc.connect(gain);
        gain.connect(offlineCtx.destination);

        osc.start(t);
        osc.stop(t + measureDuration);
      });

      // Add a subtle beat pulse every 0.5s
      for (let b = 0; b < measureDuration; b += 0.5) {
        if (t + b < durationSeconds) {
          const kickOsc = offlineCtx.createOscillator();
          const kickGain = offlineCtx.createGain();
          kickOsc.frequency.setValueAtTime(110, t + b);
          kickOsc.frequency.exponentialRampToValueAtTime(40, t + b + 0.1);
          kickGain.gain.setValueAtTime(0.08, t + b);
          kickGain.gain.exponentialRampToValueAtTime(0.001, t + b + 0.1);

          kickOsc.connect(kickGain);
          kickGain.connect(offlineCtx.destination);
          kickOsc.start(t + b);
          kickOsc.stop(t + b + 0.1);
        }
      }
    }
  } else if (presetId === 'ambient') {
    // Gentle Ambient: Ethereal pads
    const padFreqs = [220, 277.18, 329.63, 440];
    const cycleDuration = 4.0;

    for (let t = now; t < durationSeconds; t += cycleDuration) {
      padFreqs.forEach((freq) => {
        const osc = offlineCtx.createOscillator();
        const gain = offlineCtx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);

        gain.gain.setValueAtTime(0.001, t);
        gain.gain.linearRampToValueAtTime(0.025, t + 1.5);
        gain.gain.linearRampToValueAtTime(0.001, t + cycleDuration);

        osc.connect(gain);
        gain.connect(offlineCtx.destination);

        osc.start(t);
        osc.stop(t + cycleDuration);
      });
    }
  } else {
    // Lo-Fi Focus: Warm acoustic-like sine pairs
    const notes = [196.00, 246.94, 293.66, 369.99, 440.00];
    const step = 0.8;

    for (let t = now; t < durationSeconds; t += step) {
      const freq = notes[Math.floor(t / step) % notes.length];
      const osc = offlineCtx.createOscillator();
      const gain = offlineCtx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.03, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + step - 0.05);

      osc.connect(gain);
      gain.connect(offlineCtx.destination);

      osc.start(t);
      osc.stop(t + step);
    }
  }

  const renderedBuffer = await offlineCtx.startRendering();
  return audioBufferToWavBlob(renderedBuffer);
}

/**
 * Encodes AudioBuffer into a standard WAV Blob
 */
function audioBufferToWavBlob(buffer: AudioBuffer): { blob: Blob; url: string } {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44;
  const outBuffer = new ArrayBuffer(length);
  const view = new DataView(outBuffer);
  const channels: Float32Array[] = [];
  let sample = 0;
  let offset = 0;
  let pos = 0;

  function setUint16(data: number) {
    view.setUint16(pos, data, true);
    pos += 2;
  }

  function setUint32(data: number) {
    view.setUint32(pos, data, true);
    pos += 4;
  }

  // WAV header
  setUint32(0x46464952); // "RIFF"
  setUint32(length - 8); // file length - 8
  setUint32(0x45564157); // "WAVE"
  setUint32(0x20746d66); // "fmt " chunk
  setUint32(16); // length = 16
  setUint16(1); // PCM
  setUint16(numOfChan);
  setUint32(buffer.sampleRate);
  setUint32(buffer.sampleRate * 2 * numOfChan); // byte rate
  setUint16(numOfChan * 2); // block align
  setUint16(16); // bits per sample
  setUint32(0x61746164); // "data" chunk
  setUint32(length - pos - 4);

  for (let i = 0; i < buffer.numberOfChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }

  while (offset < buffer.length) {
    for (let i = 0; i < numOfChan; i++) {
      sample = Math.max(-1, Math.min(1, channels[i][offset]));
      sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
      view.setInt16(pos, sample, true);
      pos += 2;
    }
    offset++;
  }

  const blob = new Blob([outBuffer], { type: 'audio/wav' });
  const url = URL.createObjectURL(blob);
  return { blob, url };
}

/**
 * Creates a click audio tone (short 800Hz beep) for playSound feedback
 */
export function playClickSoundEffect() {
  try {
    const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, audioCtx.currentTime + 0.05);

    gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.05);
  } catch (e) {
    console.warn('AudioContext not supported or allowed yet', e);
  }
}
