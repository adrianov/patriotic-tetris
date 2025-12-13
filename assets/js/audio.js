// Audio Engine - Synthesized Sound Effects
export class AudioEngine {
    constructor() {
        this.audioContext = null;
        this.didInit = false;
        this.masterVolume = 0.5;
        this.isMuted = false;
    }
    
    initAudioContext() {
        if (this.didInit) return;
        try {
            window.AudioContext = window.AudioContext || window.webkitAudioContext;
            this.audioContext = new AudioContext();
            this.didInit = true;
            console.log('Audio context initialized');
        } catch (error) {
            console.warn('Web Audio API not supported:', error);
        }
    }
    
    // Resume audio context on user interaction (required by some browsers)
    resumeContext() {
        this.initAudioContext();
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }
    
    createOscillator(frequency, type = 'sine', startTime = 0, duration = 0.1, volume = 0.1) {
        this.initAudioContext();
        if (!this.audioContext || this.isMuted) return null;
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime + startTime);
        
        // Professional ADSR Envelope - smooth and pleasant
        const softVolume = this.masterVolume * volume;
        const now = this.audioContext.currentTime + startTime;
        
        // Very smooth attack to avoid harshness
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(softVolume * 0.3, now + 0.005); // Gentle attack
        gainNode.gain.exponentialRampToValueAtTime(softVolume * 0.1, now + 0.02); // Quick decay
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration); // Smooth release
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.start(now);
        oscillator.stop(now + duration);
        
        return oscillator;
    }
    
    playMove() {
        this.resumeContext();
        // Professional click - higher frequency, smooth envelope
        this.createOscillator(1046.50, 'sine', 0, 0.02, 0.4); // C6 - octave higher
    }
    
    playRotate() {
        this.resumeContext();
        // Professional click - crisp but smooth
        this.createOscillator(1318.51, 'sine', 0, 0.018, 0.5); // E6 - octave higher
    }
    
    playDrop() {
        this.resumeContext();
        // Professional tap - pleasant mid-range
        this.createOscillator(783.99, 'sine', 0, 0.04, 0.6); // G5 - octave higher
    }
    
    playHardDrop() {
        this.resumeContext();
        // Professional impact - solid but not harsh
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
        
        let timeOffset = 0;
        melody.forEach(note => {
            this.createOscillator(note.freq, 'triangle', timeOffset, note.duration);
            timeOffset += note.duration;
        });
    }
}