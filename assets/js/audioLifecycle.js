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
        if (document.hidden || !this.audioEngine.shouldHaveContext()) return;

        if (!this.audioEngine.contextManager.canPlay || this.audioEngine.contextManager.isRunning) return;

        this.audioEngine.contextManager.ensureRunning().catch(() => {
            setTimeout(() => {
                if (!this.audioEngine.contextManager.isRunning) {
                    this.audioEngine.contextManager.ensureRunning();
                }
            }, 100);
        });
    }
}
