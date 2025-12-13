// Audio Engine - Synthesized Sound Effects
export class AudioEngine {
    constructor() {
        this.audioContext = null;
        this.masterVolume = 0.5;
        this.isMuted = false;
        
        this.initAudioContext();
    }
    
    initAudioContext() {
        try {
            window.AudioContext = window.AudioContext || window.webkitAudioContext;
            this.audioContext = new AudioContext();
            console.log('Audio context initialized');
        } catch (error) {
            console.warn('Web Audio API not supported:', error);
        }
    }
    
    // Resume audio context on user interaction (required by some browsers)
    resumeContext() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }
    
    createOscillator(frequency, type = 'sine', startTime = 0, duration = 0.1, volume = 0.1) {
        if (!this.audioContext || this.isMuted) return null;
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime + startTime);
        
        // Softer ADSR Envelope with logarithmic scaling
        const softVolume = this.masterVolume * volume;
        gainNode.gain.setValueAtTime(0, this.audioContext.currentTime + startTime);
        gainNode.gain.linearRampToValueAtTime(softVolume * 0.5, this.audioContext.currentTime + startTime + 0.01); // Quick attack
        gainNode.gain.exponentialRampToValueAtTime(softVolume * 0.2, this.audioContext.currentTime + startTime + 0.03); // Quick decay
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + startTime + duration); // Smooth release
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.start(this.audioContext.currentTime + startTime);
        oscillator.stop(this.audioContext.currentTime + startTime + duration);
        
        return oscillator;
    }
    
    playMove() {
        this.resumeContext();
        // Jazzy staccato - C5 with quick decay
        this.createOscillator(523.25, 'sine', 0, 0.015, 0.2);
    }
    
    playRotate() {
        this.resumeContext();
        // Jazzy grace note - E5 with syncopated feel
        this.createOscillator(659.25, 'triangle', 0, 0.035, 0.25);
        setTimeout(() => this.createOscillator(523.25, 'sine', 0, 0.02, 0.15), 15);
    }
    
    playDrop() {
        this.resumeContext();
        // Jazzy brush - G4 with swing feel
        this.createOscillator(392, 'triangle', 0, 0.08, 0.6);
        setTimeout(() => this.createOscillator(329.63, 'sine', 0, 0.04, 0.3), 25);
    }
    
    playHardDrop() {
        this.resumeContext();
        // Jazzy accent - C4 with rhythmic punch
        this.createOscillator(261.63, 'triangle', 0, 0.12, 0.8);
        setTimeout(() => this.createOscillator(392, 'sine', 0, 0.06, 0.4), 40);
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
    
    setVolume(volume) {
        this.masterVolume = Math.max(0, Math.min(1, volume));
    }
    
    toggleMute() {
        this.isMuted = !this.isMuted;
        const muteBtn = document.getElementById('mute-btn');
        muteBtn.textContent = this.isMuted ? '🔇 Sound Off' : '🔊 Sound On';
        muteBtn.style.background = this.isMuted ? '#999' : '';
        
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