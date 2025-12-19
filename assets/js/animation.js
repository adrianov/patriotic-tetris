// Animation Module - Patriotic Tetris
export class AnimationManager {
    constructor(game) {
        this.game = game;
    }

    animateHardDrop(startY) {
        const piece = this.game.currentPiece;
        if (!piece) return;
        
        // Calculate target position exactly like controls.js does (with hanging detection)
        let targetY = piece.y;
        while (this.game.board.canMove(piece, 0, targetY - piece.y + 1)) {
            targetY++;
            const testPiece = { ...piece, y: targetY };
            if (this.game.pieceMovement.canSlideUnderHangingBlocks(testPiece)) break;
        }
        
        // Skip animation if disabled
        if (!this.game.animationsEnabled) {
            piece.y = targetY;
            this.game.pieceMovement.lockPiece();
            return;
        }
        
        // Set hard drop animation flag
        this.game.hardDropAnimation = true;
        
        const distance = targetY - startY;
        if (distance <= 0) {
            this.game.pieceMovement.lockPiece();
            return;
        }
        
        const initialY = piece.y;
        const GRAVITY = 1500; // cells/s² - for natural acceleration
        const maxTime = Math.sqrt(2 * distance / GRAVITY) * 1000; // time to fall distance
        const startTime = performance.now();
        
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / maxTime, 1);
            
            // Apply gravity acceleration formula: d = 0.5 * a * t²
            const dropDistance = 0.5 * GRAVITY * (elapsed / 1000) * (elapsed / 1000);
            piece.y = initialY + dropDistance;
            
            this.game.requestRender();
            
            if (progress >= 1) {
                piece.y = targetY;
                this.game.hardDropAnimation = false;
                
                // Check if piece can move further down - if not, handle locking
                if (this.game.board.canMove(piece, 0, 1)) {
                    // Piece can still move down, let normal game logic handle it
                    this.game.lockDelay = 0;
                } else if (this.game.pieceMovement.canSlideUnderHangingBlocks(piece)) {
                    // Piece can move under hanging blocks to go deeper, start lock delay
                    this.game.pieceMovement.startLockDelay();
                } else {
                    // Piece cannot go deeper, lock it immediately
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