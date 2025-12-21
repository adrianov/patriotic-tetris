// Audio Context Manager - Handles Web Audio API context lifecycle and state management
export class AudioContextManager {
    constructor() {
        this.audioContext = null;
        this.masterGain = null;
        this.resumePromise = null;
    }

    initAudioContext() {
        if (this.audioContext && this.audioContext.state !== 'closed') {
            return;
        }
        try {
            window.AudioContext = window.AudioContext || window.webkitAudioContext;
            this.audioContext = new AudioContext();
            this.masterGain = this.audioContext.createGain();
            this.masterGain.gain.value = 1;
            this.masterGain.connect(this.audioContext.destination);
        } catch (error) {
            console.warn('Web Audio API not supported:', error);
        }
    }

    createAudioContext() {
        if (this.audioContext?.state === 'running') return;
        this.initAudioContext();
    }

    resumeContext() {
        this.initAudioContext();
        if (!this.audioContext) return null;

        if (this.audioContext.state === 'closed') {
            this.initAudioContext();
            if (!this.audioContext) return null;
        }

        if (this.audioContext.state === 'running') {
            this.resumePromise = Promise.resolve();
            return this.resumePromise;
        }

        try {
            this.resumePromise = this.audioContext.resume();
            if (this.resumePromise?.then) {
                this.resumePromise.catch(() => { });
            }
        } catch (error) {
            this.resumePromise = null;
        }
        return this.resumePromise;
    }

    get canPlay() {
        return this.audioContext;
    }

    get isRunning() {
        return this.audioContext?.state === 'running';
    }

    get currentTime() {
        return this.audioContext?.currentTime || 0;
    }

    get sampleRate() {
        return this.audioContext?.sampleRate || 44100;
    }

    destroyAudioContext() {
        if (this.audioContext?.state !== 'closed') {
            try {
                this.audioContext.close();
            } catch (error) {
                console.warn('Error closing audio context:', error);
            }
        }
        this.audioContext = null;
        this.masterGain = null;
        this.resumePromise = null;
    }
}
