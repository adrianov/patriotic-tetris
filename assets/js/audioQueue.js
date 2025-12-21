// Audio Queue Manager - Handles sound queuing and flushing for mobile browser compatibility
export class AudioQueueManager {
    constructor(contextManager) {
        this.contextManager = contextManager;
        this.pendingPlays = [];
        this.flushHooked = false;
    }

    enqueuePlay(fn, isMuted) {
        if (!this.contextManager.canPlay || isMuted) return;
        if (this.contextManager.isRunning) {
            fn();
            return;
        }

        // Keep queue bounded to avoid unbounded growth if resume is blocked.
        if (this.pendingPlays.length > 30) this.pendingPlays.shift();
        this.pendingPlays.push(fn);
        this.hookFlushAfterResume(isMuted);
    }

    hookFlushAfterResume(isMuted) {
        if (this.flushHooked || !this.contextManager.audioContext) return;
        this.flushHooked = true;

        const flush = () => {
            if (!this.contextManager.isRunning || isMuted) return;
            const queue = this.pendingPlays;
            this.pendingPlays = [];
            queue.forEach((fn) => {
                try { fn(); } catch { /* ignore */ }
            });
        };

        // Flush once audio becomes running again (helps on Mobile Chrome auto-suspend).
        this.contextManager.audioContext.onstatechange = () => {
            if (this.contextManager.isRunning) flush();
        };

        // If we already resumed, flush immediately.
        if (this.contextManager.isRunning) flush();
        else if (this.contextManager.resumePromise && typeof this.contextManager.resumePromise.then === 'function') {
            this.contextManager.resumePromise.then(flush).catch(() => {});
            // iOS sometimes needs a slight delay after resume resolves
            this.contextManager.resumePromise.then(() => setTimeout(flush, 50)).catch(() => {});
        }
    }

    shouldQueue(fromQueue) {
        if (fromQueue) return false;
        if (!this.contextManager.isRunning) {
            return true;
        }
        return false;
    }

    clear() {
        this.pendingPlays = [];
        this.flushHooked = false;
    }
}