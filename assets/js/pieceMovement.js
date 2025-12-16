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
        if (!this.game.currentPiece) return false;

        // Can't be on the ground for this check
        if (this.game.board.canMove(this.game.currentPiece, 0, 1)) return false;

        const currentAboveCount = this.countFilledBlocksAbove(this.game.currentPiece);

        // Check if moving left would result in more filled blocks above
        if (this.game.board.canMove(this.game.currentPiece, -1, 0)) {
            const testPiece = { ...this.game.currentPiece, x: this.game.currentPiece.x - 1 };
            const leftAboveCount = this.countFilledBlocksAbove(testPiece);
            if (leftAboveCount > currentAboveCount) {
                return true;
            }
        }

        // Check if moving right would result in more filled blocks above
        if (this.game.board.canMove(this.game.currentPiece, 1, 0)) {
            const testPiece = { ...this.game.currentPiece, x: this.game.currentPiece.x + 1 };
            const rightAboveCount = this.countFilledBlocksAbove(testPiece);
            if (rightAboveCount > currentAboveCount) {
                return true;
            }
        }

        // Check if rotating would result in more filled blocks above
        if (this.game.currentPiece.type !== 'O') {
            const rotatedShape = this.game.pieces.rotatePiece(this.game.currentPiece);
            if (this.game.board.canMove(this.game.currentPiece, 0, 0, rotatedShape)) {
                const testPiece = { ...this.game.currentPiece, shape: rotatedShape };
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

        // Lock current piece into the grid
        this.game.board.lockPiece(this.game.currentPiece);
        this.game.currentPiece = null;
        this.game.lockDelay = 0;
        this.game.requestRender();

        const lines = this.game.board.getFullLines();
        if (lines.length > 0) {
            // Animate line clear before removing rows & spawning the next piece.
            this.game.isAnimating = true;
            this.game.audio.playLineClear(lines.length);
            this.game.board.startLineClear(lines);

            const start = performance.now();
            const duration = this.game.board.lineClear?.duration || 260;
            const step = (now) => {
                if (now - start >= duration) {
                    this.game.board.clearLines(lines);
                    this.game.board.stopLineClear();
                    this.updateScore(lines.length);
                    this.spawnNextPiece();
                    this.game.isAnimating = false;
                    this.game.requestRender();
                    return;
                }
                requestAnimationFrame(step);
            };

            requestAnimationFrame(step);
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

    updateScore(clearedLines) {
        const points = [0, 100, 300, 500, 800];
        this.addPoints(points[clearedLines] * this.game.level);
        this.game.lines += clearedLines;

        // Level up every 10 lines
        const newLevel = Math.floor(this.game.lines / 10) + 1;
        if (newLevel > this.game.level) {
            this.game.level = newLevel;
            this.applyDropTime();
        }

        this.game.ui.updateUI();
    }

    addPoints(points) {
        const p = Math.floor(Number(points));
        if (!Number.isFinite(p) || p <= 0) return;
        this.game.score += p;
        if (this.game.score > this.game.highScore) {
            this.game.highScore = this.game.score;
            this.game.isNewHighScore = true;
            this.game.saveHighScore();
            this.game.ui.updateHighScoreUI();
        }
    }

    addDropPoints(points) {
        if (this.game.gameOver || this.game.paused) return;
        this.addPoints(points);
        this.game.ui.updateUI();
    }
}