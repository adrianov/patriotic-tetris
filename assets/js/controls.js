// Controls Module - Input Handling
export class Controls {
    constructor() {
        this.game = null;
        this.holdTimers = new Map();

        this.setupKeyboardListeners();
    }

    setup(game) {
        this.game = game;
        this.setupTouchControls();
    }

    setupKeyboardListeners() {
        document.addEventListener('keydown', (e) => {
            this.handleKeyPress(e);
        });

        document.addEventListener('keyup', (e) => {
            // no-op: we handle keydown actions immediately (no held-key repeat logic)
        });
    }

    handleKeyPress(e) {
        if (!this.game || this.game.gameOver) return;

        if (e.key === '+' || e.key === '=' || e.code === 'NumpadAdd') {
            e.preventDefault();
            this.game.increaseSpeed();
            this.game.hideCursor();
            return;
        }

        switch (e.key) {
            case 'p':
            case 'P':
                e.preventDefault();
                this.game.pause();
                // Show cursor when pausing, hide when resuming
                if (this.game.paused) this.game.showCursor();
                return;
            case 'ArrowLeft':
                e.preventDefault();
                this.moveSide(-1);
                break;
            case 'ArrowRight':
                e.preventDefault();
                this.moveSide(1);
                break;
            case 'ArrowDown':
                e.preventDefault();
                this.softDrop();
                break;
            case 'ArrowUp':
                e.preventDefault();
                this.rotatePiece();
                break;
            case ' ':
                e.preventDefault();
                this.hardDrop();
                break;
            case 'r':
            case 'R':
                if (!e.ctrlKey && !e.metaKey) {
                    e.preventDefault();
                    this.game.startNewGame();
                }
                break;
            case 'm':
            case 'M':
                e.preventDefault();
                this.game.audio.toggleMute();
                break;
            case 'g':
            case 'G':
                e.preventDefault();
                this.game.toggleGhostPiece();
                break;
            default:
                return; // Don't hide cursor for unrelated keys
        }
        this.game.hideCursor();
    }

    movePiece(dx, dy) {
        if (dy > 0 && dx === 0) {
            this.softDrop();
            return;
        }

        if (dy === 0 && dx !== 0) {
            this.moveSide(dx);
        }
    }

    moveSide(dx) {
        if (this.game.paused || this.game.isAnimating || !this.game.currentPiece) return;

        // Locking rule:
        // - If the piece is already on the ground (can't move down) and the player tries an
        //   impossible horizontal move, lock immediately (especially noticeable after hard drop).
        const onGround = !this.game.board.canMove(this.game.currentPiece, 0, 1);
        const canMoveSide = this.game.board.canMove(this.game.currentPiece, dx, 0);

        if (canMoveSide) {
            this.game.currentPiece.x += dx;
            this.game.lockDelay = 0;
            this.game.audio.playMove();
            this.game.requestRender();
        } else if (onGround) {
            this.game.lockPiece();
        }
    }

    softDrop() {
        if (this.game.paused || this.game.isAnimating || !this.game.currentPiece) return;

        if (this.game.board.canMove(this.game.currentPiece, 0, 1)) {
            this.game.currentPiece.y++;
            this.game.lockDelay = 0;
            this.game.audio.playDrop();
            this.game.addDropPoints(1);
            this.game.requestRender();
            return;
        }

        // If the player asks to move down but it's impossible, lock immediately.
        this.game.lockPiece();
    }

    rotatePiece() {
        if (this.game.paused || this.game.isAnimating || !this.game.currentPiece) return;

        const rotatedShape = this.game.pieces.rotatePiece(this.game.currentPiece);
        const onGround = !this.game.board.canMove(this.game.currentPiece, 0, 1);

        if (this.game.board.canMove(this.game.currentPiece, 0, 0, rotatedShape)) {
            this.game.currentPiece.shape = rotatedShape;
            this.game.lockDelay = 0;
            this.game.audio.playRotate();
            this.game.requestRender();
        } else if (onGround) {
            // Same locking rule as horizontal moves: failed rotation on the ground locks.
            this.game.lockPiece();
        }
    }

    hardDrop() {
        if (this.game.paused || this.game.isAnimating || !this.game.currentPiece) return;
        let dropDistance = 0;
        const startY = this.game.currentPiece.y;

        // Create a temporary piece to calculate final position
        const tempPiece = {
            ...this.game.currentPiece,
            y: startY
        };

        // Calculate final position
        while (this.game.board.canMove(tempPiece, 0, 1)) {
            tempPiece.y++;
            dropDistance++;
        }

        if (dropDistance > 0) {
            this.game.audio.playHardDrop();
            this.game.addDropPoints(dropDistance * 2);
            // Animate the drop
            this.animateHardDrop(startY, tempPiece.y);
            this.game.requestRender();
        } else {
            // Already at bottom and can't move down - lock immediately
            this.game.lockPiece();
        }
    }

    animateHardDrop(startY, endY) {
        const duration = 200; // ms
        const startTime = performance.now();
        const piece = this.game.currentPiece;

        // Set animation flag
        this.game.isAnimating = true;

        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Easing function for smooth animation
            const easeProgress = 1 - Math.pow(1 - progress, 3);

            piece.y = startY + (endY - startY) * easeProgress;

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // Lock immediately if completely stuck, or clean landing with no fillable gaps
                const dominated = this.game.isPieceCompletelyStuck();
                const clean = this.game.board.isCleanLanding(piece);
                const hasGap = this.game.board.canFillAdjacentGap(piece);

                if (dominated || (clean && !hasGap)) {
                    this.game.lockPiece();
                } else {
                    this.game.startLockDelay();
                }
                // Clear animation flag
                this.game.isAnimating = false;
            }
        };

        requestAnimationFrame(animate);
    }

    setupTouchControls() {
        // Movement controls
        const leftBtn = document.getElementById('touch-left');
        const rightBtn = document.getElementById('touch-right');
        const downBtn = document.getElementById('touch-down');
        const rotateBtn = document.getElementById('touch-rotate');

        // Press-and-hold repeat on mobile (no need for many taps).
        if (leftBtn) this.bindHoldRepeat(leftBtn, () => this.movePiece(-1, 0));
        if (rightBtn) this.bindHoldRepeat(rightBtn, () => this.movePiece(1, 0));

        // Mobile: use ↓ as hard drop (no separate DROP button).
        if (downBtn) {
            downBtn.addEventListener('pointerdown', (e) => {
                if (e?.cancelable) e.preventDefault();
                e?.stopPropagation?.();
                this.hardDrop();
            }, { passive: false });
            // Prevent "ghost click" on some mobile browsers after rapid taps.
            downBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
            }, { capture: true });
        }

        if (rotateBtn) {
            rotateBtn.addEventListener('pointerdown', (e) => {
                if (e?.cancelable) e.preventDefault();
                e?.stopPropagation?.();
                this.rotatePiece();
            }, { passive: false });
            rotateBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
            }, { capture: true });
        }

        // Toggle controls
        const ghostBtn = document.getElementById('touch-ghost');
        const pauseBtn = document.getElementById('touch-pause');
        const restartBtn = document.getElementById('touch-restart');
        const soundBtn = document.getElementById('touch-sound');

        if (ghostBtn) {
            ghostBtn.addEventListener('click', () => {
                this.game.toggleGhostPiece();
                ghostBtn.classList.toggle('active', this.game.showGhostPiece);
            });
        }

        if (pauseBtn) pauseBtn.addEventListener('click', () => this.game.pause());

        if (restartBtn) restartBtn.addEventListener('click', () => this.game.startNewGame());

        if (soundBtn) {
            soundBtn.addEventListener('click', () => {
                this.game.audio.toggleMute();
                const isMuted = this.game.audio.isMuted;
                soundBtn.querySelector('.touch-toggle-icon').textContent = isMuted ? '🔇' : '🔊';
                soundBtn.classList.toggle('active', !isMuted);
            });
        }

        // Initialize toggle states
        if (ghostBtn) ghostBtn.classList.toggle('active', this.game.showGhostPiece);
        if (soundBtn) soundBtn.classList.toggle('active', !this.game.audio.isMuted);
    }

    bindHoldRepeat(buttonEl, action) {
        const initialDelayMs = 180;
        const intervalMs = 60;
        const key = buttonEl.id || buttonEl;

        const clear = () => {
            const t = this.holdTimers.get(key);
            if (t?.timeoutId) clearTimeout(t.timeoutId);
            if (t?.intervalId) clearInterval(t.intervalId);
            this.holdTimers.delete(key);
        };

        const start = (e) => {
            if (e?.cancelable) e.preventDefault();
            e?.stopPropagation?.();
            clear();

            // First move immediately on press.
            action();

            const timeoutId = setTimeout(() => {
                const intervalId = setInterval(action, intervalMs);
                const prev = this.holdTimers.get(key) || {};
                this.holdTimers.set(key, { ...prev, intervalId });
            }, initialDelayMs);

            this.holdTimers.set(key, { timeoutId, intervalId: null });
        };

        buttonEl.addEventListener('pointerdown', start, { passive: false });
        buttonEl.addEventListener('pointerup', clear, { passive: true });
        buttonEl.addEventListener('pointercancel', clear, { passive: true });
        buttonEl.addEventListener('pointerleave', clear, { passive: true });

        // Some browsers synthesize a click after pointer events; swallow it so rapid taps
        // can't accidentally activate adjacent UI (e.g. restart).
        buttonEl.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
        }, { capture: true });
    }
}