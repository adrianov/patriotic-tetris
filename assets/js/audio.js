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
        // Soft, subtle click sound
        this.createOscillator(600, 'sine', 0, 0.05, 0.6);
    }
    
    playRotate() {
        this.resumeContext();
        // Gentle whoosh with lower volume
        this.createOscillator(400, 'triangle', 0, 0.1, 0.8);
        setTimeout(() => this.createOscillator(500, 'triangle', 0.03, 0.07, 0.6), 30);
    }
    
    playDrop() {
        this.resumeContext();
        // Soft thud
        this.createOscillator(200, 'sine', 0, 0.06, 0.8);
    }
    
    playHardDrop() {
        this.resumeContext();
        // Slightly louder but still soft impact
        this.createOscillator(150, 'triangle', 0, 0.1, 1.0);
    }
    
    playLineClear(lines) {
        this.resumeContext();
        
        const baseFrequency = 523.25; // C5
        const frequencies = [baseFrequency, baseFrequency * 1.25, baseFrequency * 1.5, baseFrequency * 2];
        
        for (let i = 0; i < lines; i++) {
            setTimeout(() => {
                this.createOscillator(frequencies[i], 'sine', 0, 0.3, 0.8);
                // Add harmony
                this.createOscillator(frequencies[i] * 1.5, 'sine', 0, 0.3, 0.6);
            }, i * 100);
        }
    }
    
    playGameOver() {
        this.resumeContext();
        
        // Descending notes
        const notes = [523.25, 440, 349.23, 261.63]; // C5, A4, F4, C4
        
        notes.forEach((frequency, index) => {
            setTimeout(() => {
                this.createOscillator(frequency, 'sawtooth', 0, 0.5, 0.8);
            }, index * 200);
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
        
        // Simple patriotic-sounding melody
        const melody = [
            {freq: 392, duration: 0.5}, // G4
            {freq: 392, duration: 0.5}, // G4
            {freq: 440, duration: 0.5}, // A4
            {freq: 494, duration: 0.5}, // B4
            {freq: 523, duration: 1},  // C5
            {freq: 494, duration: 0.5}, // B4
            {freq: 440, duration: 0.5}, // A4
            {freq: 392, duration: 1},  // G4
        ];
        
        let timeOffset = 0;
        melody.forEach(note => {
            this.createOscillator(note.freq, 'triangle', timeOffset, note.duration);
            timeOffset += note.duration;
        });
    }
}