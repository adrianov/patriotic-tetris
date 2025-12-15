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

        // Check if there are any gaps under the piece
        const currentGaps = this.getGapsUnderPiece(this.game.currentPiece);
        
        // If there are no gaps, check if piece can move or rotate
        if (currentGaps.length === 0) {
            return !this.game.board.canMove(this.game.currentPiece, -1, 0) &&
                !this.game.board.canMove(this.game.currentPiece, 1, 0) &&
                (this.game.currentPiece.type === 'O' || !this.game.board.canMove(this.game.currentPiece, 0, 0, this.game.pieces.rotatePiece(this.game.currentPiece)));
        }
        
        // If there are gaps, check if movement or rotation would close them
        if (this.canCloseGapsWithMovement()) return false;
        if (this.canCloseGapsWithRotation()) return false;
        
        // If there are gaps and no movement or rotation can close them, piece is stuck
        return true;
    }

    // Check if moving left or right would close gaps
    canCloseGapsWithMovement() {
        if (!this.game.currentPiece) return false;

        // Check if moving left would close gaps
        if (this.game.board.canMove(this.game.currentPiece, -1, 0)) {
            const testPiece = { ...this.game.currentPiece, x: this.game.currentPiece.x - 1 };
            if (this.wouldCloseGaps(testPiece)) return true;
        }

        // Check if moving right would close gaps
        if (this.game.board.canMove(this.game.currentPiece, 1, 0)) {
            const testPiece = { ...this.game.currentPiece, x: this.game.currentPiece.x + 1 };
            if (this.wouldCloseGaps(testPiece)) return true;
        }

        return false;
    }

    // Check if rotating would close gaps or enable further movement
    canCloseGapsWithRotation() {
        if (!this.game.currentPiece || this.game.currentPiece.type === 'O') return false;

        const rotatedShape = this.game.pieces.rotatePiece(this.game.currentPiece);
        if (this.game.board.canMove(this.game.currentPiece, 0, 0, rotatedShape)) {
            const testPiece = { ...this.game.currentPiece, shape: rotatedShape };
            
            // Check if rotation would eliminate all gaps
            if (this.wouldCloseGaps(testPiece)) return true;
            
            // Check if rotation would allow the piece to move down further
            if (this.game.board.canMove(testPiece, 0, 1)) return true;
        }

        return false;
    }

    // Check if a piece position would close gaps compared to current position
    wouldCloseGaps(testPiece) {
        // Get gaps in current position
        const currentGaps = this.getGapsUnderPiece(this.game.currentPiece);
        
        // Get gaps in test position
        const testGaps = this.getGapsUnderPiece(testPiece);
        
        // Only return true if test position has no gaps (eliminates all gaps)
        // If it still has gaps, even if fewer, we should lock immediately
        return testGaps.length === 0;
    }

    // Get gaps under a piece (empty cells with piece cells above them)
    getGapsUnderPiece(piece) {
        const gaps = [];
        
        for (let py = 0; py < piece.shape.length; py++) {
            for (let px = 0; px < piece.shape[py].length; px++) {
                if (!piece.shape[py][px]) continue;
                
                const boardX = piece.x + px;
                const boardY = piece.y + py + 1; // Cell below this piece cell
                
                // Check if there's a gap (empty cell with piece cell above)
                if (boardY < this.game.board.height && 
                    boardX >= 0 && boardX < this.game.board.width &&
                    !this.game.board.grid[boardY][boardX]) {
                    
                    // Check if this gap is "problematic" - i.e., it would create a hole
                    // A gap is problematic if there's a block adjacent to it on the same row
                    // or if there's a block above it that would make it hard to fill
                    if (this.isProblematicGap(boardX, boardY, piece)) {
                        gaps.push({ x: boardX, y: boardY });
                    }
                }
            }
        }
        
        return gaps;
    }
    
    // Check if a gap is problematic (would create a hard-to-fill hole)
    isProblematicGap(x, y, piece) {
        // If at the bottom of the board, it's not a problematic gap
        if (y >= this.game.board.height - 1) return false;
        
        // Check if there's a block directly below the gap
        if (y + 1 < this.game.board.height && this.game.board.grid[y + 1][x]) {
            return true; // This would create a hole
        }
        
        // Check if there's a block adjacent to the gap on the same row
        // that would make it hard to fill
        const hasLeftBlock = x > 0 && this.game.board.grid[y][x - 1];
        const hasRightBlock = x < this.game.board.width - 1 && this.game.board.grid[y][x + 1];
        
        // If there are blocks on both sides, it's a problematic gap
        if (hasLeftBlock && hasRightBlock) return true;
        
        // Check if there's a block above the gap that would make it hard to fill
        if (y > 0 && this.game.board.grid[y - 1][x]) return true;
        
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
