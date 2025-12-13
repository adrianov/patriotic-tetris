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
        
        switch(e.key) {
            case 'p':
            case 'P':
                e.preventDefault();
                this.game.pause();
                break;
            case 'ArrowLeft':
                e.preventDefault();
                this.movePiece(-1, 0);
                break;
            case 'ArrowRight':
                e.preventDefault();
                this.movePiece(1, 0);
                break;
            case 'ArrowDown':
                e.preventDefault();
                this.movePiece(0, 1);
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
        if (this.game.paused || this.game.isAnimating) return;
        
        if (this.game.board.canMove(this.game.currentPiece, dx, dy)) {
            this.game.currentPiece.x += dx;
            this.game.currentPiece.y += dy;
            
            if (dy > 0) {
                this.game.audio.playDrop();
            } else {
                this.game.audio.playMove();
            }
        } else if (dy > 0) {
            // Trying to move down but can't - try to lock
            this.game.lockPiece();
        }
    }
    
    rotatePiece() {
        if (this.game.paused || this.game.isAnimating) return;
        const rotatedShape = this.game.pieces.rotatePiece(this.game.currentPiece);
        
        if (this.game.board.canMove(this.game.currentPiece, 0, 0, rotatedShape)) {
            this.game.currentPiece.shape = rotatedShape;
            this.game.audio.playRotate();
        }
    }
    
    hardDrop() {
        if (this.game.paused || this.game.isAnimating) return;
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
        }
        // If dropDistance is 0, piece can't move down at all - do nothing
        // Let normal game flow handle locking
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
                // After hard drop, check if piece is completely stuck
                if (this.game.isPieceCompletelyStuck()) {
                    this.game.lockPiece();
                } else {
                    // Start lock delay if not stuck
                    if (this.game.lockDelay === 0) {
                        this.game.lockDelay = performance.now();
                    }
                }
                // Clear animation flag
                this.game.isAnimating = false;
            }
        };
        
        requestAnimationFrame(animate);
    }
    
    setupTouchControls() {
        // Movement controls
        document.getElementById('touch-left').addEventListener('click', () => {
            this.movePiece(-1, 0);
        });
        
        document.getElementById('touch-right').addEventListener('click', () => {
            this.movePiece(1, 0);
        });
        
        document.getElementById('touch-down').addEventListener('click', () => {
            this.movePiece(0, 1);
        });
        
        document.getElementById('touch-rotate').addEventListener('click', () => {
            this.rotatePiece();
        });
        
        document.getElementById('touch-drop').addEventListener('click', () => {
            this.hardDrop();
        });
        
        // Toggle controls
        const ghostBtn = document.getElementById('touch-ghost');
        const pauseBtn = document.getElementById('touch-pause');
        const restartBtn = document.getElementById('touch-restart');
        const soundBtn = document.getElementById('touch-sound');
        
        ghostBtn.addEventListener('click', () => {
            this.game.toggleGhostPiece();
            ghostBtn.classList.toggle('active', this.game.showGhostPiece);
        });
        
        pauseBtn.addEventListener('click', () => {
            this.game.pause();
        });
        
        restartBtn.addEventListener('click', () => {
            this.game.startNewGame();
        });
        
        soundBtn.addEventListener('click', () => {
            this.game.audio.toggleMute();
            const isMuted = this.game.audio.isMuted;
            soundBtn.querySelector('.touch-toggle-icon').textContent = isMuted ? '🔇' : '🔊';
            soundBtn.classList.toggle('active', !isMuted);
        });
        
        // Initialize toggle states
        ghostBtn.classList.toggle('active', this.game.showGhostPiece);
        soundBtn.classList.toggle('active', !this.game.audio.isMuted);
    }
}