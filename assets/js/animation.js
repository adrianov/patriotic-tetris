// Animation Module - Patriotic Tetris
export class AnimationManager {
    constructor(game) {
        this.game = game;
    }

    applyHardDropLockLogic(piece) {
        if (this.game.board.canMove(piece, 0, 1)) {
            this.game.lockDelay = 0;
        } else if (this.game.pieceMovement.canSlideUnderHangingBlocks(piece)) {
            this.game.pieceMovement.startLockDelay();
        } else {
            this.game.pieceMovement.lockPiece();
        }
    }

    animateHardDrop(startY) {
        const piece = this.game.currentPiece;
        if (!piece) return;

        const initialY = piece.y;

        if (!this.game.animationsEnabled) {
            const finalY = this.findOptimalDropPosition(piece);
            piece.y = finalY;
            this.game.requestRender();
            this.applyHardDropLockLogic(piece);
            return;
        }

        // Set animation flag
        this.game.isAnimating = true;

        const GRAVITY = 1500;
        const maxTime = Math.sqrt(2 * 20 / GRAVITY) * 1000;
        const startTime = performance.now();

        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / maxTime, 1);

            // Calculate next position using gravity formula
            const nextY = initialY + 0.5 * GRAVITY * (elapsed / 1000) * (elapsed / 1000);

            // Recalculate target Y every frame (handles movement/rotation)
            // Use floor for canSlide detection (current cell position)
            const currentY = Math.floor(piece.y);
            let targetY = currentY;

            // Create test piece with integer Y for collision checking
            const testPiece = { ...piece, y: targetY };
            while (this.game.board.canMove(testPiece, 0, 1)) {
                targetY++;
                testPiece.y = targetY;
                // Stop at first position where piece can slide under hanging blocks
                if (this.game.pieceMovement.canSlideUnderHangingBlocks(testPiece)) {
                    break;
                }
            }

            // Cap to target Y
            piece.y = Math.min(nextY, targetY);
            this.game.requestRender();

            if (piece.y >= targetY || progress >= 1) {
                piece.y = targetY;
                this.game.isAnimating = false;
                this.applyHardDropLockLogic(piece);
            } else {
                requestAnimationFrame(animate);
            }
        };
        requestAnimationFrame(animate);
    }

    findOptimalDropPosition(piece) {
        const startY = piece.y;
        let currentY = startY;
        while (this.game.board.canMove(piece, 0, currentY - startY + 1)) {
            currentY++;
            const testPiece = { ...piece, y: currentY };
            if (this.game.pieceMovement.canSlideUnderHangingBlocks(testPiece)) break;
        }
        return currentY;
    }

    animateLineClear(lines) {
        this.game.isAnimating = true;
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