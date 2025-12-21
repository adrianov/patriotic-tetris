// Audio Engine - Synthesized Sound Effects
import { AudioContextManager } from './audioContext.js';
import { AudioQueueManager } from './audioQueue.js';
import { AudioLifecycleManager } from './audioLifecycle.js';
import { SoundFactory } from './soundFactory.js';

export class AudioEngine {
    constructor() {
        this.masterVolume = 0.5;
        this.isMuted = false;
        this.initialized = false;

        // Composition instead of inheritance - delegate responsibilities
        this.contextManager = new AudioContextManager();
        this.queueManager = new AudioQueueManager(this.contextManager);
        this.lifecycleManager = new AudioLifecycleManager(this);
        this.soundFactory = new SoundFactory(this.contextManager, this);
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
        return promise;
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

    shouldHaveContext() {
        return !this.isMuted;
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

    ensureContextReady() {
        if (!this.contextManager.audioContext) {
            this.contextManager.createAudioContext();
        }
        if (this.contextManager.audioContext && this.contextManager.audioContext.state !== 'running') {
            this.resumeContext();
        }
    }

    playMove() {
        this.ensureContextReady();
        this.soundFactory.playSound('move');
    }

    playRotate() {
        this.ensureContextReady();
        this.soundFactory.playSound('rotate');
    }

    playDrop() {
        this.ensureContextReady();
        this.soundFactory.playSound('drop');
    }

    playHardDrop() {
        this.ensureContextReady();
        this.soundFactory.playSound('hardDrop');
    }

    playLineClear(lines) {
        this.ensureContextReady();
        this.soundFactory.playSound('lineClear', lines);
    }

    playGameOver() {
        this.ensureContextReady();
        this.soundFactory.playSound('gameOver');
    }

    playHighScore() {
        this.ensureContextReady();
        this.soundFactory.playSound('highScore');
    }

    playBackgroundMusic() {
        this.ensureContextReady();
        this.soundFactory.playSound('backgroundMusic');
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

        if (this.isMuted) {
            // Destroy audio context when muting
            this.contextManager.destroyAudioContext();
        } else {
            // Create audio context when unmuting (user interaction event)
            this.contextManager.createAudioContext();
            this.contextManager.resumeContext();
            // Clear queue when unmuting
            this.queueManager.clear();
        }

        return this.isMuted;
    }
}
