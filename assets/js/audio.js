// Audio Engine - Synthesized Sound Effects
export class AudioEngine {
    constructor() {
        this.audioContext = null;
        this.didInit = false;
        this.masterVolume = 0.5;
        this.isMuted = false;
        this.masterGain = null;
        this.resumePromise = null;
        this.sfxBuffers = new Map();
        this.isBuildingSfx = false;
        this.pendingPlays = [];
        this.flushHooked = false;
    }

    // Tiny ramps prevent audible "clicks" caused by discontinuities at start/stop.
    static RAMP_ATTACK_S = 0.004;
    static RAMP_RELEASE_S = 0.012;
    
    initAudioContext() {
        if (this.audioContext && this.audioContext.state !== 'closed') {
            this.didInit = true;
            return;
        }
        try {
            window.AudioContext = window.AudioContext || window.webkitAudioContext;
            this.audioContext = new AudioContext();
            this.masterGain = this.audioContext.createGain();
            this.masterGain.gain.value = 1;
            this.masterGain.connect(this.audioContext.destination);
            this.didInit = true;
            this.sfxBuffers.clear();
            this.pendingPlays = [];
            this.flushHooked = false;
        } catch (error) {
            console.warn('Web Audio API not supported:', error);
        }
    }
    
    // Resume audio context on user interaction (required by some browsers)
    resumeContext() {
        this.initAudioContext();
        if (!this.audioContext) return null;

        // Some mobile browsers report "interrupted" (WebKit) when audio is paused by the OS.
        const state = this.audioContext.state;
        if (state === 'closed') {
            this.didInit = false;
            this.initAudioContext();
        }

        if (this.audioContext && this.audioContext.state !== 'running') {
            try {
                this.resumePromise = this.audioContext.resume();
            } catch {
                this.resumePromise = null;
            }
        }
        this.hookFlushAfterResume();
        this.buildSfxBuffers();
        return this.resumePromise;
    }

    hookFlushAfterResume() {
        if (this.flushHooked || !this.audioContext) return;
        this.flushHooked = true;

        const flush = () => {
            if (!this.audioContext || this.audioContext.state !== 'running' || this.isMuted) return;
            const queue = this.pendingPlays;
            this.pendingPlays = [];
            queue.forEach((fn) => {
                try { fn(); } catch { /* ignore */ }
            });
        };

        // Flush once audio becomes running again (helps on Mobile Chrome auto-suspend).
        this.audioContext.onstatechange = () => {
            if (this.audioContext?.state === 'running') flush();
        };

        // If we already resumed, flush immediately.
        if (this.audioContext.state === 'running') flush();
        else if (this.resumePromise && typeof this.resumePromise.then === 'function') {
            this.resumePromise.then(flush).catch(() => {});
        }
    }

    enqueuePlay(fn) {
        if (!this.audioContext || this.isMuted) return;
        if (this.audioContext.state === 'running') {
            fn();
            return;
        }

        // Keep queue bounded to avoid unbounded growth if resume is blocked.
        if (this.pendingPlays.length > 30) this.pendingPlays.shift();
        this.pendingPlays.push(fn);
        this.hookFlushAfterResume();
    }

    buildSfxBuffers() {
        if (this.isBuildingSfx || !this.audioContext || this.isMuted) return;
        if (this.sfxBuffers.size > 0) return;

        this.isBuildingSfx = true;

        const sampleRate = this.audioContext.sampleRate;
        const tones = [
            ['move', { freq: 1046.50, type: 'sine', dur: 0.02 }],
            ['rotate', { freq: 1318.51, type: 'sine', dur: 0.018 }],
            ['drop', { freq: 783.99, type: 'sine', dur: 0.04 }],
            ['hardDrop', { freq: 523.25, type: 'sine', dur: 0.06 }]
        ];

        Promise.all(tones.map(([key, t]) => this.renderToneBuffer(sampleRate, t).then((b) => [key, b])))
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
            gain.gain.setValueAtTime(0, 0);
            gain.gain.linearRampToValueAtTime(0.3, AudioEngine.RAMP_ATTACK_S);
            gain.gain.exponentialRampToValueAtTime(0.1, 0.02);
            const end = Math.max(0.02, dur);
            const stopAt = Math.min(lengthSec, end + tail);
            gain.gain.exponentialRampToValueAtTime(0.0001, end);
            gain.gain.linearRampToValueAtTime(0, stopAt);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(0);
            osc.stop(Math.min(lengthSec, Math.max(0.02, dur) + tail));

            return await ctx.startRendering();
        } catch {
            return null;
        }
    }

    playBuffer(key, volume = 0.5, fromQueue = false) {
        if (!this.audioContext || this.isMuted) return false;
        const buffer = this.sfxBuffers.get(key);
        if (!buffer) return false;

        if (this.audioContext.state !== 'running' && !fromQueue) {
            this.resumeContext();
            this.enqueuePlay(() => this.playBuffer(key, volume, true));
            return true;
        }

        const src = this.audioContext.createBufferSource();
        const gain = this.audioContext.createGain();
        src.buffer = buffer;

        // Avoid start/end clicks on browsers/devices that are sensitive to discontinuities.
        const now = this.audioContext.currentTime;
        const target = this.masterVolume * volume;
        const attack = AudioEngine.RAMP_ATTACK_S;
        const release = AudioEngine.RAMP_RELEASE_S;
        const end = now + Math.max(0, buffer.duration);
        const releaseStart = Math.max(now, end - release);

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(target, now + attack);
        gain.gain.setValueAtTime(target, releaseStart);
        gain.gain.linearRampToValueAtTime(0, end);
        src.connect(gain);
        if (this.masterGain) gain.connect(this.masterGain);
        else gain.connect(this.audioContext.destination);

        src.start(this.audioContext.currentTime);
        return true;
    }
    
    createOscillator(frequency, type = 'sine', startTime = 0, duration = 0.1, volume = 0.1, fromQueue = false) {
        this.resumeContext();
        if (!this.audioContext || this.isMuted) return null;

        if (this.audioContext.state !== 'running' && !fromQueue) {
            this.enqueuePlay(() => this.createOscillator(frequency, type, startTime, duration, volume, true));
            return null;
        }
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime + startTime);
        
        // Professional ADSR Envelope - smooth and pleasant
        const softVolume = this.masterVolume * volume;
        const now = this.audioContext.currentTime + startTime;
        const attack = AudioEngine.RAMP_ATTACK_S;
        const release = AudioEngine.RAMP_RELEASE_S;
        const end = now + Math.max(0.01, duration);
        
        // Very smooth attack to avoid harshness
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(softVolume * 0.3, now + attack); // Gentle attack
        gainNode.gain.exponentialRampToValueAtTime(softVolume * 0.1, now + 0.02); // Quick decay
        gainNode.gain.exponentialRampToValueAtTime(0.0001, end); // Smooth release
        gainNode.gain.linearRampToValueAtTime(0, end + release);
        
        oscillator.connect(gainNode);
        if (this.masterGain) {
            gainNode.connect(this.masterGain);
        } else {
            gainNode.connect(this.audioContext.destination);
        }
        
        oscillator.start(now);
        oscillator.stop(end + release);
        
        return oscillator;
    }
    
    playMove() {
        this.resumeContext();
        // Professional click - higher frequency, smooth envelope
        if (this.playBuffer('move', 0.4)) return;
        this.createOscillator(1046.50, 'sine', 0, 0.02, 0.4); // C6 - octave higher
    }
    
    playRotate() {
        this.resumeContext();
        // Professional click - crisp but smooth
        if (this.playBuffer('rotate', 0.5)) return;
        this.createOscillator(1318.51, 'sine', 0, 0.018, 0.5); // E6 - octave higher
    }
    
    playDrop() {
        this.resumeContext();
        // Professional tap - pleasant mid-range
        if (this.playBuffer('drop', 0.6)) return;
        this.createOscillator(783.99, 'sine', 0, 0.04, 0.6); // G5 - octave higher
    }
    
    playHardDrop() {
        this.resumeContext();
        // Professional impact - solid but not harsh
        if (this.playBuffer('hardDrop', 0.7)) return;
        this.createOscillator(523.25, 'sine', 0, 0.06, 0.7); // C5 - original root
    }
    

    
    playLineClear(lines) {
        this.resumeContext();
        
        // Jazzy chord progression - C major with swing timing
        const chords = [
            [523.25, 659.25, 783.99], // C major
            [587.33, 739.99, 880.00], // D major
            [659.25, 830.61, 987.77], // E minor
            [783.99, 987.77, 1174.66] // G major
        ];
        
        for (let i = 0; i < lines; i++) {
            const chord = chords[i % chords.length];
            setTimeout(() => {
                chord.forEach((freq, index) => {
                    setTimeout(() => {
                        this.createOscillator(freq, 'triangle', 0, 0.4, 0.7);
                        // Add jazzy seventh
                        this.createOscillator(freq * 0.89, 'sine', 0, 0.3, 0.4);
                    }, index * 30);
                });
            }, i * 150);
        }
    }
    
    playGameOver() {
        this.resumeContext();
        
        // Jazzy descending line with blue notes
        const melody = [
            {freq: 1046.50, duration: 0.3}, // C6
            {freq: 880.00, duration: 0.2},  // A5 (blue note)
            {freq: 783.99, duration: 0.4},  // G5
            {freq: 622.25, duration: 0.2},  // D#5 (blue note)
            {freq: 523.25, duration: 0.5},  // C5
            {freq: 392.00, duration: 0.3},  // G4
            {freq: 349.23, duration: 0.4},  // F4 (blue note)
            {freq: 261.63, duration: 0.8},  // C4
        ];
        
        let timeOffset = 0;
        melody.forEach((note, index) => {
            setTimeout(() => {
                this.createOscillator(note.freq, index % 2 === 0 ? 'triangle' : 'sine', 0, note.duration, 0.7);
                // Add jazzy harmony
                if (index % 2 === 0) {
                    this.createOscillator(note.freq * 0.75, 'sine', 0, note.duration * 0.8, 0.4);
                }
            }, timeOffset * 1000);
            timeOffset += note.duration * 0.8; // Swing timing
        });
    }

    playHighScore() {
        this.resumeContext();

        // Short jubilant fanfare (major arpeggio + bright accent)
        const notes = [
            { freq: 523.25, dur: 0.12 },  // C5
            { freq: 659.25, dur: 0.12 },  // E5
            { freq: 783.99, dur: 0.14 },  // G5
            { freq: 1046.50, dur: 0.20 }, // C6
            { freq: 987.77, dur: 0.14 },  // B5
            { freq: 1046.50, dur: 0.28 }  // C6
        ];

        let t = 0;
        notes.forEach((n, i) => {
            setTimeout(() => {
                this.createOscillator(n.freq, 'triangle', 0, n.dur, 0.7);
                // sparkle layer
                if (i >= 2) {
                    this.createOscillator(n.freq * 2, 'sine', 0, Math.max(0.08, n.dur * 0.8), 0.25);
                }
                // simple harmony on the last two notes
                if (i >= notes.length - 2) {
                    this.createOscillator(n.freq * 0.75, 'sine', 0, n.dur * 0.9, 0.25);
                }
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
        
        return this.isMuted;
    }
    
    // Optional: Background music generator
    playBackgroundMusic() {
        this.resumeContext();
        if (!this.audioContext || this.isMuted) return;
        
        // Jazzy patriotic melody with swing and blue notes
        const melody = [
            {freq: 261.63, duration: 0.4}, // C4
            {freq: 311.13, duration: 0.2}, // D#4 (blue note)
            {freq: 329.63, duration: 0.3}, // E4
            {freq: 392.00, duration: 0.2}, // G4
            {freq: 466.16, duration: 0.3}, // A#4 (blue note)
            {freq: 523.25, duration: 0.8}, // C5
            {freq: 392.00, duration: 0.3}, // G4
            {freq: 349.23, duration: 0.2}, // F4 (blue note)
            {freq: 329.63, duration: 0.3}, // E4
            {freq: 261.63, duration: 0.6}, // C4
        ];
        
        let timeOffset = 0.05;
        melody.forEach(note => {
            this.createOscillator(note.freq, 'triangle', timeOffset, note.duration);
            timeOffset += note.duration;
        });
    }
}