// Audio Engine - Synthesized Sound Effects
import { AudioContextManager } from './audioContext.js';
import { AudioQueueManager } from './audioQueue.js';
import { AudioLifecycleManager } from './audioLifecycle.js';

export class AudioEngine {
    constructor() {
        this.masterVolume = 0.5;
        this.isMuted = false;
        this.sfxBuffers = new Map();
        this.isBuildingSfx = false;
        
        // Composition instead of inheritance - delegate responsibilities
        this.contextManager = new AudioContextManager();
        this.queueManager = new AudioQueueManager(this.contextManager);
        this.lifecycleManager = new AudioLifecycleManager(this);
    }

    static RAMP_ATTACK_S = 0.004;
    static RAMP_RELEASE_S = 0.012;
    static START_LOOKAHEAD_S = 0.002;

    scheduleOneShotGain(gainParam, now, duration, level) {
        const dur = Math.max(0.001, Number(duration) || 0);
        const end = now + dur;

        const attack = Math.min(AudioEngine.RAMP_ATTACK_S, dur * 0.35);
        const release = Math.min(AudioEngine.RAMP_RELEASE_S, dur * 0.45);
        const sustainAt = Math.max(now + attack, end - release);

        // Keep it robust across browsers: avoid exponential ramps for ultra-short sounds.
        const useExpo = dur >= 0.03;
        const peak = Math.max(0, level);
        const mid = peak * 0.35;

        try { gainParam.cancelScheduledValues(now); } catch { /* ignore */ }
        gainParam.setValueAtTime(0, now);
        gainParam.linearRampToValueAtTime(peak, now + attack);

        if (useExpo && sustainAt > now + attack + 0.003) {
            gainParam.exponentialRampToValueAtTime(Math.max(0.0001, mid), sustainAt);
        } else {
            gainParam.setValueAtTime(peak, sustainAt);
        }

        // Always end at exactly 0 (some devices click if left at tiny epsilon).
        gainParam.linearRampToValueAtTime(0, end + release);
        return { end: end + release };
    }
    
    resumeContext() {
        const promise = this.contextManager.resumeContext();
        if (promise) {
            this.contextManager.resumePromise?.then(() => {
                this.buildSfxBuffers();
            });
        }
        return promise;
    }

    buildSfxBuffers() {
        if (this.isBuildingSfx || !this.contextManager.canPlay) return Promise.resolve();
        if (this.sfxBuffers.size > 0) return Promise.resolve();

        this.isBuildingSfx = true;

        const sampleRate = this.contextManager.sampleRate;
        const tones = [
            ['move', { freq: 1046.50, type: 'sine', dur: 0.02 }],
            ['rotate', { freq: 1318.51, type: 'sine', dur: 0.018 }],
            ['drop', { freq: 783.99, type: 'sine', dur: 0.04 }],
            ['hardDrop', { freq: 523.25, type: 'sine', dur: 0.06 }]
        ];

        return Promise.all(tones.map(([key, t]) => this.renderToneBuffer(sampleRate, t).then((b) => [key, b])))
            .then((pairs) => {
                pairs.forEach(([key, buffer]) => {
                    if (buffer) this.sfxBuffers.set(key, buffer);
                });
            })
            .finally(() => {
                this.isBuildingSfx = false;
            });
    }

    async renderToneBuffer(sampleRate, { freq, type, dur }) {
        // Pre-render a short tone with an envelope into an AudioBuffer.
        try {
            const tail = 0.03;
            const lengthSec = Math.max(0.02, dur + tail);
            const ctx = new OfflineAudioContext(1, Math.ceil(sampleRate * lengthSec), sampleRate);
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = type || 'sine';
            osc.frequency.setValueAtTime(freq, 0);

            // Match our live ADSR-ish shape but with normalized amplitude.
            const end = Math.max(0.008, Number(dur) || 0);
            const stopAt = Math.min(lengthSec, end + tail);
            this.scheduleOneShotGain(gain.gain, 0, end, 0.3);
            gain.gain.setValueAtTime(0, stopAt);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(0);
            osc.stop(stopAt);

            return await ctx.startRendering();
        } catch {
            return null;
        }
    }

    playBuffer(key, volume = 0.5, fromQueue = false) {
        if (!this.canPlay()) return false;
        const buffer = this.sfxBuffers.get(key);
        if (!buffer) return false;

        if (this.queueManager.shouldQueue(fromQueue)) {
            this.queueManager.enqueuePlay(() => this.playBuffer(key, volume, true), this.isMuted);
            return true;
        }

        const src = this.contextManager.audioContext.createBufferSource();
        src.buffer = buffer;
        const now = this.contextManager.currentTime + AudioEngine.START_LOOKAHEAD_S;
        const env = this.setupGainEnvelope(src, now, buffer.duration || 0.001, volume);
        src.start(now);
        try { src.stop(env.end); } catch { /* ignore */ }
        return true;
    }

    createOscillator(freq, opts = {}) {
        const { type = 'sine', start = 0, dur = 0.1, vol = 0.1, fromQueue = false } = opts;
        if (!this.canPlay()) return null;

        if (this.queueManager.shouldQueue(fromQueue)) {
            this.queueManager.enqueuePlay(() => this.createOscillator(freq, { ...opts, fromQueue: true }), this.isMuted);
            return null;
        }

        const osc = this.contextManager.audioContext.createOscillator();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.contextManager.currentTime + start);

        const now = this.contextManager.currentTime + start + AudioEngine.START_LOOKAHEAD_S;
        const env = this.setupGainEnvelope(osc, now, dur, vol * 0.3);
        osc.start(now);
        osc.stop(env.end);
        return osc;
    }

    canPlay() {
        return this.contextManager.canPlay && !this.isMuted;
    }

    setupGainEnvelope(source, startTime, duration, volume) {
        const gain = this.contextManager.audioContext.createGain();
        const env = this.scheduleOneShotGain(gain.gain, startTime, Math.max(0.001, duration), this.masterVolume * volume);
        source.connect(gain);
        this.connectToOutput(gain);
        return env;
    }

    connectToOutput(node) {
        node.connect(this.contextManager.masterGain || this.contextManager.audioContext.destination);
    }
    
    playMove() {
        if (!this.contextManager.isRunning) {
            this.resumeContext();
        }
        if (this.playBuffer('move', 0.4)) return;
        this.createOscillator(1046.50, { dur: 0.02, vol: 0.4 }); // C6
    }

    playRotate() {
        if (!this.contextManager.isRunning) {
            this.resumeContext();
        }
        if (this.playBuffer('rotate', 0.5)) return;
        this.createOscillator(1318.51, { dur: 0.018, vol: 0.5 }); // E6
    }

    playDrop() {
        if (!this.contextManager.isRunning) {
            this.resumeContext();
        }
        if (this.playBuffer('drop', 0.6)) return;
        this.createOscillator(783.99, { dur: 0.04, vol: 0.6 }); // G5
    }

    playHardDrop() {
        if (!this.contextManager.isRunning) {
            this.resumeContext();
        }
        if (this.playBuffer('hardDrop', 0.7)) return;
        this.createOscillator(523.25, { dur: 0.06, vol: 0.7 }); // C5
    }
    

    
    playLineClear(lines) {
        this.resumeContext();
        const chords = [
            [523.25, 659.25, 783.99], [587.33, 739.99, 880.00],
            [659.25, 830.61, 987.77], [783.99, 987.77, 1174.66]
        ];

        for (let i = 0; i < lines; i++) {
            const chord = chords[i % chords.length];
            setTimeout(() => {
                chord.forEach((freq, idx) => {
                    setTimeout(() => {
                        this.createOscillator(freq, { type: 'triangle', dur: 0.4, vol: 0.7 });
                        this.createOscillator(freq * 0.89, { dur: 0.3, vol: 0.4 });
                    }, idx * 30);
                });
            }, i * 150);
        }
    }
    
    playGameOver() {
        this.resumeContext();
        const melody = [
            { freq: 1046.50, dur: 0.3 }, { freq: 880.00, dur: 0.2 }, { freq: 783.99, dur: 0.4 },
            { freq: 622.25, dur: 0.2 }, { freq: 523.25, dur: 0.5 }, { freq: 392.00, dur: 0.3 },
            { freq: 349.23, dur: 0.4 }, { freq: 261.63, dur: 0.8 }
        ];

        let t = 0;
        melody.forEach((n, i) => {
            setTimeout(() => {
                this.createOscillator(n.freq, { type: i % 2 === 0 ? 'triangle' : 'sine', dur: n.dur, vol: 0.7 });
                if (i % 2 === 0) this.createOscillator(n.freq * 0.75, { dur: n.dur * 0.8, vol: 0.4 });
            }, t * 1000);
            t += n.dur * 0.8;
        });
    }

    playHighScore() {
        this.resumeContext();
        const notes = [
            { freq: 523.25, dur: 0.12 }, { freq: 659.25, dur: 0.12 }, { freq: 783.99, dur: 0.14 },
            { freq: 1046.50, dur: 0.20 }, { freq: 987.77, dur: 0.14 }, { freq: 1046.50, dur: 0.28 }
        ];

        let t = 0;
        notes.forEach((n, i) => {
            setTimeout(() => {
                this.createOscillator(n.freq, { type: 'triangle', dur: n.dur, vol: 0.7 });
                if (i >= 2) this.createOscillator(n.freq * 2, { dur: Math.max(0.08, n.dur * 0.8), vol: 0.25 });
                if (i >= notes.length - 2) this.createOscillator(n.freq * 0.75, { dur: n.dur * 0.9, vol: 0.25 });
            }, t * 1000);
            t += n.dur * 0.9;
        });
    }
    
    setVolume(volume) {
        this.masterVolume = Math.max(0, Math.min(1, volume));
    }
    
    toggleMute() {
        this.isMuted = !this.isMuted;
        const muteBtn = document.getElementById('mute-btn');
        if (muteBtn) {
            muteBtn.textContent = this.isMuted ? '🔇 Sound Off' : '🔊 Sound On';
            muteBtn.style.background = this.isMuted ? '#999' : '';
        }
        
        // Clear queue when unmuting
        if (!this.isMuted) {
            this.buildSfxBuffers();
            this.queueManager.clear();
        }
        
        return this.isMuted;
    }

    playBackgroundMusic() {
        this.resumeContext();
        if (!this.canPlay()) return;

        const melody = [
            { freq: 261.63, dur: 0.4 }, { freq: 311.13, dur: 0.2 }, { freq: 329.63, dur: 0.3 },
            { freq: 392.00, dur: 0.2 }, { freq: 466.16, dur: 0.3 }, { freq: 523.25, dur: 0.8 },
            { freq: 392.00, dur: 0.3 }, { freq: 349.23, dur: 0.2 }, { freq: 329.63, dur: 0.3 },
            { freq: 261.63, dur: 0.6 }
        ];

        let t = 0.05;
        melody.forEach(n => {
            this.createOscillator(n.freq, { type: 'triangle', start: t, dur: n.dur });
            t += n.dur;
        });
    }


}