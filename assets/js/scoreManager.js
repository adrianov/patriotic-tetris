// Score Management Module - Patriotic Tetris
export class ScoreManager {
    constructor(game) {
        this.game = game;
    }

    updateScore(clearedLines) {
        const points = [0, 100, 300, 500, 800];
        this.addPoints(points[clearedLines] * this.game.level);
        this.game.lines += clearedLines;

        // Level up every 10 lines
        const newLevel = Math.floor(this.game.lines / 10) + 1;
        if (newLevel > this.game.level) {
            this.game.level = newLevel;
            this.game.board.cycleGenerationColor();
            this.game.pieceMovement.applyDropTime();
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