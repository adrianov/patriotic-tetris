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
        } else if (this.isPieceCompletelyStuck()) {
            this.lockPiece();
        } else {
            this.startLockDelay();
        }
    }

    isPieceCompletelyStuck() {
        if (!this.game.currentPiece) return false;

        // Can't move down
        if (this.game.board.canMove(this.game.currentPiece, 0, 1)) return false;

        // Check if moving left would be a better position
        if (this.game.board.canMove(this.game.currentPiece, -1, 0)) {
            const testPiece = { ...this.game.currentPiece, x: this.game.currentPiece.x - 1 };
            if (this.isBetterPosition(this.game.currentPiece, testPiece)) {
                return false; // Position can be improved
            }
        }

        // Check if moving right would be a better position
        if (this.game.board.canMove(this.game.currentPiece, 1, 0)) {
            const testPiece = { ...this.game.currentPiece, x: this.game.currentPiece.x + 1 };
            if (this.isBetterPosition(this.game.currentPiece, testPiece)) {
                return false; // Position can be improved
            }
        }

        // Check if rotating would be a better position
        if (this.game.currentPiece.type !== 'O') {
            const rotatedShape = this.game.pieces.rotatePiece(this.game.currentPiece);
            if (this.game.board.canMove(this.game.currentPiece, 0, 0, rotatedShape)) {
                const testPiece = { ...this.game.currentPiece, shape: rotatedShape };
                if (this.isBetterPosition(this.game.currentPiece, testPiece)) {
                    return false; // Position can be improved
                }
            }
        }

        // If position cannot be improved, piece is stuck
        return true;
    }

    // Count gaps under a piece (simplified version)
    countGapsUnderPiece(piece) {
        let gaps = 0;

        // For each column of the piece, check if there's a gap below
        for (let px = 0; px < piece.shape[0].length; px++) {
            // Find the lowest row of this piece in this column
            let lowestPieceRow = -1;
            for (let py = 0; py < piece.shape.length; py++) {
                if (piece.shape[py][px]) {
                    lowestPieceRow = Math.max(lowestPieceRow, py);
                }
            }

            if (lowestPieceRow < 0) continue; // Skip if no piece in this column

            // Check if there's a gap directly below this column
            const belowY = piece.y + lowestPieceRow + 1;
            const belowX = piece.x + px;

            // If the cell below is empty and within bounds, it's a potential gap
            if (belowY < this.game.board.height &&
                belowX >= 0 && belowX < this.game.board.width &&
                !this.game.board.grid[belowY][belowX]) {
                gaps++;
            }
        }

        return gaps;
    }

    // Simple heuristic to evaluate if a position is better than current
    // Returns true if the new position is better
    isBetterPosition(currentPiece, testPiece) {
        // Rule 1: Prefer positions that create fewer gaps under the piece
        const currentGaps = this.countGapsUnderPiece(currentPiece);
        const testGaps = this.countGapsUnderPiece(testPiece);
        if (testGaps < currentGaps) return true;
        if (testGaps > currentGaps) return false;

        // Rule 2: If gaps are equal, prefer positions that can slide under overhangs
        const currentCanSlide = this.canSlideUnderOverhang(currentPiece);
        const testCanSlide = this.canSlideUnderOverhang(testPiece);
        if (testCanSlide && !currentCanSlide) return true;
        if (!testCanSlide && currentCanSlide) return false;

        // Rule 3: Prefer lower positions (closer to the bottom)
        if (testPiece.y > currentPiece.y) return true;
        if (testPiece.y < currentPiece.y) return false;

        // If all rules are equal, positions are considered equivalent
        return false;
    }

    // Check if the piece can slide under an overhang
    canSlideUnderOverhang(piece) {
        // Check if there's an overhang above the piece that it could slide under
        for (let px = 0; px < piece.shape[0].length; px++) {
            // Find the highest row of this piece in this column
            let highestPieceRow = piece.shape.length;
            for (let py = 0; py < piece.shape.length; py++) {
                if (piece.shape[py][px]) {
                    highestPieceRow = Math.min(highestPieceRow, py);
                }
            }

            if (highestPieceRow >= piece.shape.length) continue; // Skip if no piece in this column

            // Check if there's a block above this column
            const aboveY = piece.y + highestPieceRow - 1;
            if (aboveY >= 0 && this.game.board.grid[aboveY]?.[piece.x + px]) {
                // Check if there's empty space to the side that could allow sliding
                const leftEmpty = piece.x > 0 && this.game.board.isCellFree(piece.x - 1, aboveY);
                const rightEmpty = piece.x + piece.shape[0].length < this.game.board.width &&
                    this.game.board.isCellFree(piece.x + piece.shape[0].length, aboveY);

                if (leftEmpty || rightEmpty) return true;
            }
        }

        return false;
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