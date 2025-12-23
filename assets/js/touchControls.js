// Touch Controls Module - Handles touch input for mobile devices
export class TouchControls {
    constructor(game) {
        this.game = game;
        this.holdTimers = new Map();
    }

    setup() {
        this.setupTouchControls();
    }



    setupTouchControls() {
        // Simple global touchmove prevention in touch controls area
        const touchControls = document.querySelector('.touch-controls');
        if (touchControls) {
            touchControls.addEventListener('touchmove', (e) => {
                e.preventDefault();
                e.stopPropagation();
            }, { passive: false });
        }

        this.bindHoldRepeat(document.getElementById('touch-left'), () => this.movePiece(-1, 0));
        this.bindHoldRepeat(document.getElementById('touch-right'), () => this.movePiece(1, 0));
        this.bindTouchAction('touch-down', () => this.hardDrop());
        this.bindTouchAction('touch-rotate', () => this.rotatePiece());

        this.bindClick('touch-pause', () => this.game.pause());
        this.bindClick('touch-restart', () => this.game.startNewGame());
        this.setupGhostToggle();
        this.setupSoundToggle();
    }

    bindTouchAction(id, action) {
        const btn = document.getElementById(id);
        if (!btn) return;
        
        const handler = (e) => {
            e.preventDefault(); // Prevent scrolling
            btn.classList.add('pressed');
            action();
        };

        const end = (e) => {
            e.preventDefault(); // Prevent scrolling
            btn.classList.remove('pressed');
        };
        
        // Touch events for mobile
        btn.addEventListener('touchstart', handler, { passive: false });
        btn.addEventListener('touchend', end, { passive: false });
        btn.addEventListener('touchcancel', end, { passive: false });
        
        // Keep existing mouse events unchanged
        btn.addEventListener('mousedown', handler, { passive: false });
        btn.addEventListener('mouseup', end, { passive: true });
        btn.addEventListener('mouseleave', () => btn.classList.remove('pressed'), { passive: true });
    }

    bindClick(id, action) {
        const btn = document.getElementById(id);
        if (!btn) return;
        btn.addEventListener('click', action, { passive: true });
    }

    setupGhostToggle() {
        const btn = document.getElementById('touch-ghost');
        if (!btn) return;
        btn.classList.toggle('active', this.game.showGhostPiece);
        btn.addEventListener('click', () => {
            this.game.ui.toggleGhostPiece();
            btn.classList.toggle('active', this.game.showGhostPiece);
        }, { passive: true });
    }

    setupSoundToggle() {
        const btn = document.getElementById('touch-sound');
        if (!btn) return;
        btn.classList.toggle('active', !this.game.audio.isMuted);
        btn.addEventListener('click', () => {
            this.game.audio.toggleMute();
            btn.querySelector('.touch-toggle-icon').textContent = this.game.audio.isMuted ? '🔇' : '🔊';
            btn.classList.toggle('active', !this.game.audio.isMuted);
        }, { passive: true });
    }

    getRepeatDelays() {
        // Adapt repeat speed to game level - faster at higher levels
        const level = this.game?.level || 1;
        // Initial delay: 180ms at level 1, down to 80ms at level 10+
        const initialDelayMs = Math.max(80, 180 - (level - 1) * 12);
        // Repeat interval: 60ms at level 1, down to 35ms at level 10+
        const intervalMs = Math.max(35, 60 - (level - 1) * 3);
        return { initialDelayMs, intervalMs };
    }

    bindHoldRepeat(buttonEl, action) {
        if (!buttonEl) return;
        const key = buttonEl.id || buttonEl;

        const clear = () => {
            this.clearRepeatTimer(key);
            buttonEl.classList.remove('pressed');
        };

        const start = (e) => {
            e.preventDefault(); // Prevent scrolling
            buttonEl.classList.add('pressed');

            // First move immediately on press.
            action();

            // Set up repeat timers using a shared method
            this.setupRepeatTimer(key, action);
        };

        const end = (e) => {
            e.preventDefault(); // Prevent scrolling
            clear();
        };
        
        // Touch events for mobile
        buttonEl.addEventListener('touchstart', start, { passive: false });
        buttonEl.addEventListener('touchend', end, { passive: false });
        buttonEl.addEventListener('touchcancel', end, { passive: false });
        
        // Keep existing mouse events unchanged
        buttonEl.addEventListener('mousedown', start, { passive: false });
        buttonEl.addEventListener('mouseup', end, { passive: true });
        buttonEl.addEventListener('mouseleave', clear, { passive: true });
    }

    clearRepeatTimer(key) {
        const t = this.holdTimers.get(key);
        if (t?.timeoutId) clearTimeout(t.timeoutId);
        if (t?.intervalId) clearInterval(t.intervalId);
        this.holdTimers.delete(key);
    }

    setupRepeatTimer(key, action) {
        // Get delays adapted to current level
        const { initialDelayMs, intervalMs } = this.getRepeatDelays();

        // Set up repeat timers
        const timeoutId = setTimeout(() => {
            const intervalId = setInterval(action, intervalMs);
            const prev = this.holdTimers.get(key) || {};
            this.holdTimers.set(key, { ...prev, intervalId });
        }, initialDelayMs);

        this.holdTimers.set(key, { timeoutId, intervalId: null });
    }

    // Movement methods (delegated to main controls)
    movePiece(dx, dy) {
        if (this.game.controls) {
            this.game.controls.movePiece(dx, dy);
        }
    }

    hardDrop() {
        if (this.game.controls) {
            this.game.controls.hardDrop();
        }
    }

    rotatePiece() {
        if (this.game.controls) {
            // Check if current piece is near right side for position-based rotation
            const piece = this.game.currentPiece;
            if (piece) {
                const pieceWidth = piece.shape[0].length;
                const rightmostX = piece.x + pieceWidth;
                const isNearRightSide = rightmostX >= this.game.board.width - 1;
                
                if (isNearRightSide) {
                    // Use clockwise rotation when piece is near right side
                    if (this.game.controls.rotatePieceClockwise()) return;
                    // If clockwise failed, try counter-clockwise
                    this.game.controls.rotatePiece();
                    return;
                }
            }
            
            // Default behavior: try counter-clockwise first, then clockwise if it fails
            if (this.game.controls.rotatePiece()) return;
            this.game.controls.rotatePieceClockwise();
        }
    }
}