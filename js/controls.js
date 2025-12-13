// Controls Module - Input Handling
export class Controls {
    constructor() {
        this.game = null;
        this.keys = {};
        
        this.setupKeyboardListeners();
    }
    
    setup(game) {
        this.game = game;
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
            case 'p':
            case 'P':
                e.preventDefault();
                this.game.pause();
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
        }
    }
    
    movePiece(dx, dy) {
        if (this.game.board.canMove(this.game.currentPiece, dx, dy)) {
            this.game.currentPiece.x += dx;
            this.game.currentPiece.y += dy;
            
            if (dy > 0) {
                this.game.audio.playDrop();
            } else {
                this.game.audio.playMove();
            }
        }
    }
    
    rotatePiece() {
        const rotatedShape = this.game.pieces.rotatePiece(this.game.currentPiece);
        
        if (this.game.board.canMove(this.game.currentPiece, 0, 0, rotatedShape)) {
            this.game.currentPiece.shape = rotatedShape;
            this.game.audio.playRotate();
        }
    }
    
    hardDrop() {
        let dropDistance = 0;
        const startY = this.game.currentPiece.y;
        
        // Calculate final position
        while (this.game.board.canMove(this.game.currentPiece, 0, 1)) {
            this.game.currentPiece.y++;
            dropDistance++;
        }
        
        if (dropDistance > 0) {
            this.game.audio.playHardDrop();
            // Animate the drop
            this.animateHardDrop(startY, this.game.currentPiece.y);
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
                this.game.lockPiece();
                // Clear animation flag
                this.game.isAnimating = false;
            }
        };
        
        requestAnimationFrame(animate);
    }
}