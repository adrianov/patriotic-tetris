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

    hasNoEscapeMoves() {
        if (!this.game.currentPiece) return false;

        // Can't move down
        if (this.game.board.canMove(this.game.currentPiece, 0, 1)) return false;

        // Check if moving left would allow continued falling (better position doesn't matter for horizontal moves)
        if (this.game.board.canMove(this.game.currentPiece, -1, 0)) {
            const testPiece = { ...this.game.currentPiece, x: this.game.currentPiece.x - 1 };
            // Only check if moving left allows continued falling
            if (this.game.board.canMove(testPiece, 0, 1)) {
                return false; // Can continue falling after moving left
            }
        }

        // Check if moving right would allow continued falling (better position doesn't matter for horizontal moves)
        if (this.game.board.canMove(this.game.currentPiece, 1, 0)) {
            const testPiece = { ...this.game.currentPiece, x: this.game.currentPiece.x + 1 };
            // Only check if moving right allows continued falling
            if (this.game.board.canMove(testPiece, 0, 1)) {
                return false; // Can continue falling after moving right
            }
        }

        // Check if rotating would give a better position (continued falling doesn't matter for rotation)
        if (this.game.currentPiece.type !== 'O') {
            const rotatedShape = this.game.pieces.rotatePiece(this.game.currentPiece);
            if (this.game.board.canMove(this.game.currentPiece, 0, 0, rotatedShape)) {
                const testPiece = { ...this.game.currentPiece, shape: rotatedShape };
                // Only check if rotating gives a better position - continued falling is ignored
                if (this.isBetterPosition(this.game.currentPiece, testPiece)) {
                    return false; // Better position achieved through rotation
                }
            }
        }

        // If no escape moves exist, piece has no way out
        return true;
    }

    hasBetterHorizontalMoves() {
        if (!this.game.currentPiece) return false;

        // Can't be on the ground for this check
        if (this.game.board.canMove(this.game.currentPiece, 0, 1)) return false;

        // Check if moving left would give a better position
        if (this.game.board.canMove(this.game.currentPiece, -1, 0)) {
            const testPiece = { ...this.game.currentPiece, x: this.game.currentPiece.x - 1 };
            if (this.isBetterPosition(this.game.currentPiece, testPiece)) {
                return true; // Better position achieved by moving left
            }
        }

        // Check if moving right would give a better position
        if (this.game.board.canMove(this.game.currentPiece, 1, 0)) {
            const testPiece = { ...this.game.currentPiece, x: this.game.currentPiece.x + 1 };
            if (this.isBetterPosition(this.game.currentPiece, testPiece)) {
                return true; // Better position achieved by moving right
            }
        }

        // No better horizontal moves available
        return false;
    }

    // Count gaps under a piece
    countGapsUnderPiece(piece) {
        let gaps = 0;
        const { shape, x, y } = piece;
        const { grid, height, width } = this.game.board;

        for (let px = 0; px < shape[0].length; px++) {
            // Find the lowest row with a block in this column
            let lowestRow = -1;
            for (let py = 0; py < shape.length; py++) {
                if (shape[py][px]) lowestRow = Math.max(lowestRow, py);
            }

            if (lowestRow < 0) continue;

            // Check if there's an empty cell below
            const belowY = y + lowestRow + 1;
            const belowX = x + px;

            if (belowY < height && belowX >= 0 && belowX < width && !grid[belowY][belowX]) {
                gaps++;
            }
        }

        return gaps;
    }

    // Count gaps to the left or right of the piece (higher priority than gaps down)
    countSideGaps(piece) {
        let gaps = 0;
        const bounds = this.game.board.getPieceBoundsPerRow(piece);

        for (const { row, left, right } of bounds) {
            // Check for gaps on both sides
            if (this.game.board.hasGapOnSide(piece, row, left, -1)) gaps++;
            if (this.game.board.hasGapOnSide(piece, row, right, 1)) gaps++;
        }

        return gaps;
    }

    // Evaluate if a position is better than current (prioritizes side gaps over down gaps)
    isBetterPosition(currentPiece, testPiece) {
        // Calculate scores for both positions (lower is better)
        const currentScore = this.calculatePositionScore(currentPiece);
        const testScore = this.calculatePositionScore(testPiece);

        return testScore < currentScore;
    }

    // Calculate a score for a piece position (lower is better)
    calculatePositionScore(piece) {
        // Side gaps have highest weight (10x), down gaps have medium weight (1x)
        const sideGaps = this.countSideGaps(piece);
        const downGaps = this.countGapsUnderPiece(piece);
        const canSlide = this.canSlideUnderOverhang(piece) ? 0 : 1;
        const height = -piece.y; // Negative because lower is better

        return sideGaps * 10 + downGaps + canSlide * 0.5 + height * 0.1;
    }

    // Check if the piece can slide under an overhang
    canSlideUnderOverhang(piece) {
        const { shape, x, y } = piece;
        const { grid, width } = this.game.board;

        for (let px = 0; px < shape[0].length; px++) {
            // Find the highest row with a block in this column
            let highestRow = shape.length;
            for (let py = 0; py < shape.length; py++) {
                if (shape[py][px]) highestRow = Math.min(highestRow, py);
            }

            if (highestRow >= shape.length) continue;

            // Check if there's a block above and space to slide
            const aboveY = y + highestRow - 1;
            if (aboveY >= 0 && grid[aboveY]?.[x + px]) {
                const leftEmpty = x > 0 && this.game.board.isCellFree(x - 1, aboveY);
                const rightEmpty = x + shape[0].length < width &&
                    this.game.board.isCellFree(x + shape[0].length, aboveY);

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