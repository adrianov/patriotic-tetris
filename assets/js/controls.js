// Controls Module - Input Handling
export class Controls {
    constructor() {
        this.game = null;
        this.holdTimers = new Map();
        this.keyMap = {};
        this.setupKeyboardListeners();
    }

    setup(game) {
        this.game = game;
        this.keyMap = this.buildKeyMap();
        this.setupTouchControls();
    }

    setupKeyboardListeners() {
        document.addEventListener('keydown', (e) => {
            this.handleKeyDown(e);
        });

        document.addEventListener('keyup', (e) => {
            this.handleKeyUp(e);
        });
    }

    handleKeyDown(e) {
        if (!this.game || this.game.gameOver) return;

        const key = e.key.toLowerCase();
        const action = this.keyMap[key] || this.keyMap[e.key] || this.keyMap[e.code];
        if (!action) return;

        // R key: ignore if ctrl/cmd held (browser refresh)
        if (key === 'r' && (e.ctrlKey || e.metaKey)) return;

        e.preventDefault();

        // For movement arrow keys (left, right, down), use repeat logic
        if (key === 'arrowleft' || key === 'arrowright' || key === 'arrowdown') {
            this.handleArrowKeyRepeat(key, action);
        } else {
            // For rotation and other keys, execute immediately
            action();
            this.game.hideCursor();
        }
    }

    handleKeyUp(e) {
        const key = e.key.toLowerCase();
        // Only clear timers for movement arrow keys (left, right, down)
        if (key === 'arrowleft' || key === 'arrowright' || key === 'arrowdown') {
            this.clearRepeatTimer(key);
        }
    }

    handleArrowKeyRepeat(key, action) {
        // Clear any existing timer for this key
        this.clearRepeatTimer(key);

        // Execute action immediately on first press
        action();
        this.game.hideCursor();

        // Set up repeat timers using the same logic as touch controls
        this.setupRepeatTimer(key, () => {
            action();
            this.game.hideCursor();
        });
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

    buildKeyMap() {
        return {
            '+': () => this.game.increaseSpeed(),
            '=': () => this.game.increaseSpeed(),
            'NumpadAdd': () => this.game.increaseSpeed(),
            'p': () => { this.game.pause(); if (this.game.paused) this.game.showCursor(); },
            'arrowleft': () => this.moveSide(-1),
            'arrowright': () => this.moveSide(1),
            'arrowdown': () => this.softDrop(),
            'arrowup': () => this.rotatePiece(),
            ' ': () => this.hardDrop(),
            'r': () => this.game.startNewGame(),
            'm': () => this.game.audio.toggleMute(),
            'g': () => this.game.toggleGhostPiece(),
        };
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
                (this.game.isPieceCompletelyStuck() || this.game.board.shouldLockClean(piece))
                    ? this.game.lockPiece() : this.game.startLockDelay();
                this.game.isAnimating = false;
            }
        };

        requestAnimationFrame(animate);
    }

    setupTouchControls() {
        document.querySelectorAll('.touch-dpad-btn, .touch-toggle-btn').forEach(btn => {
            btn.addEventListener('contextmenu', e => e.preventDefault());
        });

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
        btn.addEventListener('pointerdown', (e) => {
            e?.preventDefault?.();
            e?.stopPropagation?.();
            action();
        }, { passive: false });
        btn.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); }, { capture: true });
    }

    bindClick(id, action) {
        document.getElementById(id)?.addEventListener('click', action);
    }

    setupGhostToggle() {
        const btn = document.getElementById('touch-ghost');
        if (!btn) return;
        btn.classList.toggle('active', this.game.showGhostPiece);
        btn.addEventListener('click', () => {
            this.game.toggleGhostPiece();
            btn.classList.toggle('active', this.game.showGhostPiece);
        });
    }

    setupSoundToggle() {
        const btn = document.getElementById('touch-sound');
        if (!btn) return;
        btn.classList.toggle('active', !this.game.audio.isMuted);
        btn.addEventListener('click', () => {
            this.game.audio.toggleMute();
            btn.querySelector('.touch-toggle-icon').textContent = this.game.audio.isMuted ? '🔇' : '🔊';
            btn.classList.toggle('active', !this.game.audio.isMuted);
        });
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
        };

        const start = (e) => {
            if (e?.cancelable) e.preventDefault();
            e?.stopPropagation?.();
            clear();

            // First move immediately on press.
            action();

            // Set up repeat timers using the shared method
            this.setupRepeatTimer(key, action);
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