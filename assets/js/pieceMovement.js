// Piece Movement Module - Patriotic Tetris
export class PieceMovement {
    constructor(game) {
        this.game = game;
    }

    calcDropTime() {
        const base = Math.max(100, 1000 - (this.game.level - 1) * 100);
        const factor = 1 + this.game.speedBoost * 0.2; // +20% faster per press
        return Math.max(50, Math.round(base / factor));
    }

    applyDropTime() {
        this.game.dropTime = this.calcDropTime();
    }

    increaseSpeed() {
        if (this.game.gameOver) return;
        this.game.speedBoost = Math.min(30, this.game.speedBoost + 1);
        this.applyDropTime();
        this.game.lastDrop = performance.now() - this.game.dropTime;
        this.game.ui.updateUI();
    }

    dropPiece() {
        if (!this.game.currentPiece || this.game.gameOver || this.game.paused || this.game.isAnimating) return;

        if (this.game.board.canMove(this.game.currentPiece, 0, 1)) {
            this.game.currentPiece.y++;
            this.game.lockDelay = 0;
            this.game.requestRender();
        } else if (this.hasNoPossibleMoves()) {
            this.lockPiece();
        } else {
            this.startLockDelay();
        }
    }

    hasNoPossibleMoves() {
        if (!this.game.currentPiece) return false;

        // Can't move down (already checked before calling this function)
        
        // Check if piece can move left at all
        if (this.game.board.canMove(this.game.currentPiece, -1, 0)) {
            return false; // Can move left
        }

        // Check if piece can move right at all
        if (this.game.board.canMove(this.game.currentPiece, 1, 0)) {
            return false; // Can move right
        }

        // Check if piece can rotate at all
        if (this.game.currentPiece.type !== 'O') {
            const rotatedShape = this.game.pieces.rotatePiece(this.game.currentPiece);
            if (this.game.board.canMove(this.game.currentPiece, 0, 0, rotatedShape)) {
                return false; // Can rotate
            }
        }

        // No possible moves exist
        return true;
    }

    hasMoreFilledBlocksAboveAfterMove() {
        return this.hasMoreFilledBlocksAboveAfterMoveForPiece(this.game.currentPiece);
    }

    hasMoreFilledBlocksAboveAfterMoveForPiece(piece) {
        if (!piece) return false;

        const currentAboveCount = this.countFilledBlocksAbove(piece);

        // Check if moving left would result in more filled blocks above
        if (this.game.board.canMove(piece, -1, 0)) {
            const testPiece = { ...piece, x: piece.x - 1 };
            const leftAboveCount = this.countFilledBlocksAbove(testPiece);
            if (leftAboveCount > currentAboveCount) {
                return true;
            }
        }

        // Check if moving right would result in more filled blocks above
        if (this.game.board.canMove(piece, 1, 0)) {
            const testPiece = { ...piece, x: piece.x + 1 };
            const rightAboveCount = this.countFilledBlocksAbove(testPiece);
            if (rightAboveCount > currentAboveCount) {
                return true;
            }
        }

        // Check if rotating would result in more filled blocks above
        if (piece.type !== 'O') {
            const rotatedShape = this.game.pieces.rotatePiece(piece);
            if (this.game.board.canMove(piece, 0, 0, rotatedShape)) {
                const testPiece = { ...piece, shape: rotatedShape };
                const rotatedAboveCount = this.countFilledBlocksAbove(testPiece);
                if (rotatedAboveCount > currentAboveCount) {
                    return true;
                }
            }
        }

        return false;
    }

    countFilledBlocksAbove(piece) {
        let filledCount = 0;
        const { shape, x, y } = piece;
        const { grid, width } = this.game.board;

        for (let py = 0; py < shape.length; py++) {
            for (let px = 0; px < shape[py].length; px++) {
                if (shape[py][px]) {
                    filledCount += this.checkBlockAbove(x + px, y + py, grid, width);
                }
            }
        }

        return filledCount;
    }

    checkBlockAbove(boardX, boardY, grid, width) {
        const aboveY = boardY - 1;
        if (aboveY < 0 || boardX < 0 || boardX >= width) {
            return 0;
        }
        return grid[aboveY][boardX] ? 1 : 0;
    }

    startLockDelay() {
        if (this.game.lockDelay === 0) {
            this.game.lockDelay = performance.now();
        }
    }

    lockPiece() {
        // Prevent double-locking and ensure piece can't move down
        if (!this.game.currentPiece || this.game.gameOver) return;

        // Only lock if piece can't move down
        if (this.game.board.canMove(this.game.currentPiece, 0, 1)) return;

        // Lock current piece into grid
        this.game.board.lockPiece(this.game.currentPiece);
        this.game.currentPiece = null;
        this.game.lockDelay = 0;
        this.game.requestRender();

        const lines = this.game.board.getFullLines();
        if (lines.length > 0) {
            this.game.audio.playLineClear(lines.length);
            
            // Skip animation if animations are disabled
            if (!this.game.animationsEnabled) {
                this.game.board.clearLines(lines);
                this.game.scoreManager.updateScore(lines.length);
                this.spawnNextPiece();
                this.game.requestRender();
                return;
            }
            
            // Animate line clear before removing rows & spawning next piece.
            this.game.isAnimating = true;
            this.game.board.startLineClear(lines);
            this.game.animationManager.animateLineClear(lines);
            return;
        }

        this.spawnNextPiece();
    }

    spawnNextPiece() {
        this.game.currentPiece = this.game.nextPiece;
        this.game.nextPiece = this.game.pieces.getRandomPiece();
        this.game.requestRender();

        if (this.game.board.checkGameOver(this.game.currentPiece)) {
            this.game.endGame();
        }
    }





    findOptimalDropPosition() {
        const startY = this.game.currentPiece.y;
        let currentY = startY;
        while (this.game.board.canMove(this.game.currentPiece, 0, currentY - startY + 1)) {
            currentY++;
            const testPiece = { ...this.game.currentPiece, y: currentY };
            if (this.hasMoreFilledBlocksAboveAfterMoveForPiece(testPiece)) break;
        }
        return currentY;
    }
}