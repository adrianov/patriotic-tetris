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
        if (!document.hidden && this.audioEngine.shouldHaveContext()) {
            // Only create/resume context if sound is enabled
            if (!this.audioEngine.contextManager.audioContext) {
                this.audioEngine.contextManager.createAudioContext();
            }
            
            if (this.audioEngine.contextManager.canPlay) {
                const state = this.audioEngine.contextManager.audioContext?.state;
                // Handle suspended or interrupted states (common on iOS after app switch)
                if (state === 'suspended' || state === 'interrupted' || !this.audioEngine.contextManager.isRunning) {
                    const resumePromise = this.audioEngine.contextManager.resumeContext();
                    if (resumePromise) {
                        resumePromise.then(() => {
                            // Clear any queued plays that might have been muted
                            this.audioEngine.queueManager.clear();
                        }).catch(() => {
                            // If resume fails, try again after a short delay
                            setTimeout(() => {
                                if (this.audioEngine.contextManager.audioContext?.state !== 'running') {
                                    this.audioEngine.contextManager.resumeContext();
                                }
                            }, 100);
                        });
                    }
                }
            }
        }
    }
}
