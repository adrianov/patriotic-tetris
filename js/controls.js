// Controls Module - Input Handling
export class Controls {
    constructor() {
        this.game = null;
        this.keys = {};

        this.setupKeyboardListeners();
    }

    setup(game) {
        this.game = game;
        this.setupTouchControls();
    }

    setupKeyboardListeners() {
        document.addEventListener('keydown', (e) => {
            this.keys[e.key] = true;
            this.handleKeyPress(e);
        });

        document.addEventListener('keyup', (e) => {
            this.keys[e.key] = false;
        });
    }

    handleKeyPress(e) {
        if (!this.game || this.game.gameOver) return;

        if (e.key === '+' || e.key === '=' || e.code === 'NumpadAdd') {
            e.preventDefault();
            this.game.increaseSpeed();
            return;
        }

        switch (e.key) {
            case 'p':
            case 'P':
                e.preventDefault();
                this.game.pause();
                break;
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
        }
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
            // Animate the drop
            this.animateHardDrop(startY, tempPiece.y);
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
                // After hard drop - check if completely stuck
                if (this.game.isPieceCompletelyStuck()) {
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

        if (leftBtn) leftBtn.addEventListener('click', () => this.movePiece(-1, 0));
        if (rightBtn) rightBtn.addEventListener('click', () => this.movePiece(1, 0));

        // Mobile: use ↓ as hard drop (no separate DROP button).
        if (downBtn) downBtn.addEventListener('click', () => this.hardDrop());
        if (rotateBtn) rotateBtn.addEventListener('click', () => this.rotatePiece());

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
}