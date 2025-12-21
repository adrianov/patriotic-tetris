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
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (!AudioContextClass) {
                throw new Error('Web Audio API not supported');
            }
            this.audioContext = new AudioContextClass();
            this.masterGain = this.audioContext.createGain();
            this.masterGain.gain.value = 1;
            this.masterGain.connect(this.audioContext.destination);
        } catch (error) {
            console.warn('Web Audio API not supported:', error);
        }
    }

    ensureRunning() {
        if (this.isRunning) return Promise.resolve();

        this.initAudioContext();
        if (!this.audioContext) return Promise.reject(new Error('Audio context unavailable'));

        if (this.audioContext.state === 'running') {
            return Promise.resolve();
        }

        try {
            this.resumePromise = this.audioContext.resume();
            if (this.resumePromise?.then) {
                this.resumePromise.catch(() => { });
            }
            return this.resumePromise || Promise.resolve();
        } catch (error) {
            this.resumePromise = null;
            return Promise.reject(error);
        }
    }

    get canPlay() {
        return this.audioContext && this.audioContext.state !== 'closed';
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
        if (this.audioContext && this.audioContext.state !== 'closed') {
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

    createAudioContext() {
        this.ensureRunning();
    }

    resumeContext() {
        return this.ensureRunning();
    }
}
