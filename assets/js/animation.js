// Animation Module - Patriotic Tetris
export class AnimationManager {
    constructor(game) {
        this.game = game;
    }

    animateHardDrop(startY) {
        const piece = this.game.currentPiece;
        if (!piece) return;

        const initialY = piece.y;

        // Skip animation if disabled
        if (!this.game.animationsEnabled) {
            this.game.pieceMovement.lockPiece();
            return;
        }

        // Set animation flag
        this.game.isAnimating = true;

        const GRAVITY = 15;
        const maxTime = Math.sqrt(2 * 20 / GRAVITY) * 1000;
        const startTime = performance.now();

        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / maxTime, 1);

            // Calculate next position using gravity formula
            const nextY = initialY + 0.5 * GRAVITY * (elapsed / 1000) * (elapsed / 1000);

            // Recalculate target Y every frame (handles movement/rotation)
            // Use integer positions for accurate collision detection
            const currentY = Math.round(piece.y);
            let targetY = currentY;

            // Create test piece with integer Y for collision checking
            const testPiece = { ...piece, y: currentY };
            while (this.game.board.canMove(testPiece, 0, targetY - currentY + 1)) {
                targetY++;
                testPiece.y = targetY;
                if (this.game.pieceMovement.canSlideUnderHangingBlocks(testPiece)) break;
            }

            // Cap to target Y
            piece.y = Math.min(nextY, targetY);
            this.game.requestRender();

            if (progress >= 1) {
                // Animation completed - apply normal lock logic
                piece.y = targetY;
                this.game.isAnimating = false;

                if (this.game.board.canMove(piece, 0, 1)) {
                    this.game.lockDelay = 0;
                } else if (this.game.pieceMovement.canSlideUnderHangingBlocks(piece)) {
                    this.game.pieceMovement.startLockDelay();
                } else {
                    this.game.pieceMovement.lockPiece();
                }
            } else {
                requestAnimationFrame(animate);
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
            this.game.updateScore(lines.length);
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