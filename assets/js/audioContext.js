// Audio Context Manager - Handles Web Audio API context lifecycle and state management
export class AudioContextManager {
    constructor() {
        this.audioContext = null;
        this.didInit = false;
        this.didUnlock = false;
        this.masterGain = null;
        this.resumePromise = null;
    }

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
        } catch (error) {
            console.warn('Web Audio API not supported:', error);
        }
    }

    resumeContext() {
        this.initAudioContext();
        if (!this.audioContext) return null;

        const state = this.audioContext.state;
        if (state === 'closed') {
            this.didInit = false;
            this.initAudioContext();
        }

        if (this.audioContext && this.audioContext.state !== 'running') {
            try {
                this.resumePromise = this.audioContext.resume();
                this.unlockWithSilence();
            } catch {
                this.resumePromise = null;
            }
        } else if (this.audioContext && this.audioContext.state === 'running') {
            this.resumePromise = Promise.resolve();
        }
        return this.resumePromise;
    }

    unlockWithSilence() {
        if (!this.audioContext || this.audioContext.state !== 'running') return;
        const silentBuffer = this.audioContext.createBuffer(1, 1, 22050);
        const source = this.audioContext.createBufferSource();
        source.buffer = silentBuffer;
        source.connect(this.audioContext.destination);
        source.start(0);
        source.stop(0);
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
}