// Audio Lifecycle Manager - Handles audio context state management across page visibility changes
export class AudioLifecycleManager {
    constructor(audioEngine) {
        this.audioEngine = audioEngine;
        this.setupVisibilityHandler();
    }

    setupVisibilityHandler() {
        if (typeof document !== 'undefined') {
            document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
        }
    }

    handleVisibilityChange() {
        if (!document.hidden && this.audioEngine.contextManager.canPlay) {
            // Force context recovery after app switch
            if (!this.audioEngine.contextManager.isRunning) {
                this.audioEngine.contextManager.resumeContext();
            }
            // Rebuild buffers to ensure they work after interruption
            this.audioEngine.buildSfxBuffers();
        }
    }
}