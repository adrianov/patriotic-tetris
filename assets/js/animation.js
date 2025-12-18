// Animation Module - Patriotic Tetris
export class AnimationManager {
    constructor(game) {
        this.game = game;
    }

    animateHardDrop(startY, endY) {
        const piece = this.game.currentPiece;
        
        // Skip animation if animations are disabled
        if (!this.game.animationsEnabled) {
            piece.y = endY;
            if (this.game.pieceMovement.hasMoreFilledBlocksAboveAfterMove()) {
                this.game.pieceMovement.startLockDelay();
            } else {
                this.game.pieceMovement.lockPiece();
            }
            return;
        }
        
        const distance = endY - startY;
        
        // Constant gravity acceleration (cells/s²): a = 2*d/t² = 1000 for 20 cells in 200ms
        const GRAVITY_ACCELERATION = 1000;
        
        // Calculate time needed for this distance: t = sqrt(2 * d / a)
        const duration = Math.sqrt(2 * distance / GRAVITY_ACCELERATION) * 1000;
        const startTime = performance.now();
        
        // Store animation offset for smooth rendering
        this.game.hardDropAnimation = {
            startY,
            endY,
            startTime,
            duration,
            GRAVITY_ACCELERATION
        };
        
        // Set piece to final position immediately for logic correctness
        piece.y = endY;
        
        this.game.isAnimating = true;
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // Animation complete
                delete this.game.hardDropAnimation;
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

    animateLineClear(lines) {
        const start = performance.now();
        const duration = this.game.board.lineClear?.duration || 260;
        const step = (now) => {
            if (now - start >= duration) {
                this.game.board.clearLines(lines);
                this.game.board.stopLineClear();
                this.game.scoreManager.updateScore(lines.length);
                this.game.pieceMovement.spawnNextPiece();
                this.game.isAnimating = false;
                this.game.requestRender();
                return;
            }
            requestAnimationFrame(step);
        };

        requestAnimationFrame(step);
    }
}