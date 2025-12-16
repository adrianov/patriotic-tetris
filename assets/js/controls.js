// Controls Module - Input Handling v2
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
        const action = this.getActionForKey(key, e);
        if (!action) return;

        e.preventDefault();

        this.executeKeyAction(key, action);
    }

    getActionForKey(key, e) {
        const action = this.keyMap[key] || this.keyMap[e.key] || this.keyMap[e.code];
        if (!action) return null;

        // R key: ignore if ctrl/cmd held (browser refresh)
        if (key === 'r' && (e.ctrlKey || e.metaKey)) return null;

        return action;
    }

    executeKeyAction(key, action) {
        // For movement arrow keys (left, right, down), use repeat logic
        if (this.isMovementKey(key)) {
            this.handleArrowKeyRepeat(key, action);
        } else {
            // For rotation and other keys, execute immediately
            action();
            this.game.ui.hideCursor();
        }
    }

    isMovementKey(key) {
        return key === 'arrowleft' || key === 'arrowright';
    }

    handleKeyUp(e) {
        const key = e.key.toLowerCase();
        // Only clear timers for movement arrow keys (left, right)
        if (key === 'arrowleft' || key === 'arrowright') {
            this.clearRepeatTimer(key);
        }
    }

    handleArrowKeyRepeat(key, action) {
        // Clear any existing timer for this key
        this.clearRepeatTimer(key);

        // Execute action immediately on first press
        action();
        this.game.ui.hideCursor();

        // Set up repeat timers using the same logic as touch controls
        this.setupRepeatTimer(key, () => {
            action();
            this.game.ui.hideCursor();
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
            '+': () => this.game.pieceMovement.increaseSpeed(),
            '=': () => this.game.pieceMovement.increaseSpeed(),
            'NumpadAdd': () => this.game.pieceMovement.increaseSpeed(),
            'p': () => { this.game.pause(); if (this.game.paused) this.game.ui.showCursor(); },
            'з': () => { this.game.pause(); if (this.game.paused) this.game.ui.showCursor(); }, // Russian з for pause
            'arrowleft': () => this.moveSide(-1),
            'arrowright': () => this.moveSide(1),
            'arrowdown': () => this.rotatePieceClockwise(),
            'arrowup': () => this.rotatePiece(),
            ' ': () => this.hardDrop(),
            'r': () => this.game.startNewGame(),
            'к': () => this.game.startNewGame(), // Russian к for restart
            'm': () => this.game.audio.toggleMute(),
            'ь': () => this.game.audio.toggleMute(), // Russian ь for mute
            'g': () => this.game.ui.toggleGhostPiece(),
            'п': () => this.game.ui.toggleGhostPiece(), // Russian п for ghost piece
        };
    }

    movePiece(dx, dy) {
        // Down arrow is now used for clockwise rotation, not soft drop
        if (dy === 0 && dx !== 0) {
            this.moveSide(dx);
        }
    }

    moveSide(dx) {
        if (this.game.paused || this.game.isAnimating || !this.game.currentPiece) return;

        const canMoveSide = this.game.board.canMove(this.game.currentPiece, dx, 0);

        if (canMoveSide) {
            this.game.currentPiece.x += dx;
            this.game.lockDelay = 0;
            this.game.audio.playMove();
            this.game.requestRender();
        }
        // Removed: immediate locking on failed horizontal moves - now only applies to hard drops
    }

    softDrop() {
        if (this.game.paused || this.game.isAnimating || !this.game.currentPiece) return;

        if (this.game.board.canMove(this.game.currentPiece, 0, 1)) {
            this.game.currentPiece.y++;
            this.game.lockDelay = 0;
            this.game.audio.playDrop();
            this.game.pieceMovement.addDropPoints(1);
            this.game.requestRender();
            return;
        }

        // If the player asks to move down but it's impossible, lock immediately.
        this.game.pieceMovement.lockPiece();
    }

    rotatePiece() {
        if (this.game.paused || this.game.isAnimating || !this.game.currentPiece) return;

        // Use counter-clockwise rotation
        const rotatedShape = this.game.pieces.rotatePieceCounterClockwise(this.game.currentPiece);
        const onGround = !this.game.board.canMove(this.game.currentPiece, 0, 1);

        if (this.game.board.canMove(this.game.currentPiece, 0, 0, rotatedShape)) {
            // Normal rotation succeeds
            this.game.currentPiece.shape = rotatedShape;
            this.game.lockDelay = 0;
            this.game.audio.playRotate();
            this.game.requestRender();
            return;
        }

        // Try wall kicks if normal rotation fails
        const kickTests = this.getWallKickTests(this.game.currentPiece.type, this.game.currentPiece.shape);
        let kicked = false;

        for (const [dx, dy] of kickTests) {
            if (this.game.board.canMove(this.game.currentPiece, dx, dy, rotatedShape)) {
                // Apply wall kick
                this.game.currentPiece.x += dx;
                this.game.currentPiece.y += dy;
                this.game.currentPiece.shape = rotatedShape;
                this.game.lockDelay = 0;
                this.game.audio.playRotate();
                this.game.requestRender();
                kicked = true;
                break;
            }
        }

        // Removed: immediate locking on failed rotations - now only applies to hard drops
    }
     
    rotatePieceClockwise() {
        if (this.game.paused || this.game.isAnimating || !this.game.currentPiece) return;

        // Use clockwise rotation (original rotatePiece function)
        const rotatedShape = this.game.pieces.rotatePiece(this.game.currentPiece);
        const onGround = !this.game.board.canMove(this.game.currentPiece, 0, 1);

        if (this.game.board.canMove(this.game.currentPiece, 0, 0, rotatedShape)) {
            // Normal rotation succeeds
            this.game.currentPiece.shape = rotatedShape;
            this.game.lockDelay = 0;
            this.game.audio.playRotate();
            this.game.requestRender();
            return;
        }

        // Try wall kicks if normal rotation fails
        const kickTests = this.getWallKickTests(this.game.currentPiece.type, this.game.currentPiece.shape);
        let kicked = false;

        for (const [dx, dy] of kickTests) {
            if (this.game.board.canMove(this.game.currentPiece, dx, dy, rotatedShape)) {
                // Apply wall kick
                this.game.currentPiece.x += dx;
                this.game.currentPiece.y += dy;
                this.game.currentPiece.shape = rotatedShape;
                this.game.lockDelay = 0;
                this.game.audio.playRotate();
                this.game.requestRender();
                kicked = true;
                break;
            }
        }

        // Removed: immediate locking on failed rotations - now only applies to hard drops
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
            this.game.pieceMovement.addDropPoints(dropDistance * 2);
            // Animate the drop
            this.animateHardDrop(startY, tempPiece.y);
            this.game.requestRender();
        } else {
            // Already at bottom and can't move down - lock immediately
            this.game.pieceMovement.lockPiece();
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
                // Hard drop locks immediately unless moving left, right, or rotating
                // would result in more filled blocks right above it
                if (this.game.pieceMovement.hasMoreFilledBlocksAboveAfterMove()) {
                    this.game.pieceMovement.startLockDelay();
                } else {
                    this.game.pieceMovement.lockPiece();
                }
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
            this.game.ui.toggleGhostPiece();
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

    getWallKickTests(pieceType, currentShape) {
        // Standard wall kick patterns for different piece types
        // Based on SRS (Super Rotation System) with simplified patterns
        switch (pieceType) {
            case 'I':
                // I-piece has special extended kicks based on current orientation
                // Check if piece is horizontal (1 row, 4 columns) or vertical (4 rows, 1 column)
                const isHorizontal = currentShape.length === 1;
                
                if (isHorizontal) {
                    // Horizontal to vertical rotation needs more extensive kicks
                    return [
                        [-1, 0], [1, 0],   // Left/right kicks
                        [-2, 0], [2, 0],   // Extended left/right kicks
                        [0, -1],          // Up kick
                        [-1, -1], [1, -1] // Diagonal kicks
                    ];
                } else {
                    // Vertical to horizontal rotation
                    // Prioritize left kicks when near right wall
                    return [
                        [-1, 0], [-2, 0], [-3, 0],   // Left kicks (prioritized)
                        [1, 0], [2, 0],               // Right kicks
                        [0, -1],                      // Up kick
                        [-1, -1], [1, -1]             // Diagonal kicks
                    ];
                }
            case 'O':
                // O-piece doesn't rotate, but include for completeness
                return [];
            default:
                // Standard kicks for J, L, S, T, Z pieces
                return [
                    [-1, 0], [1, 0],   // Left/right kicks
                    [0, -1],          // Up kick
                    [-1, -1], [1, -1] // Diagonal kicks
                ];
        }
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