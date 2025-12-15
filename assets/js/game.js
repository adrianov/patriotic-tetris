// Main Game Module - Patriotic Tetris
import { Board } from './board.js';
import { Pieces } from './pieces.js';
import { Controls } from './controls.js';
import { AudioEngine } from './audio.js';
import { initTheme } from './theme.js';
import { UIManager } from './ui.js';
import { PieceMovement } from './pieceMovement.js';

class Game {
    constructor() {
        this.canvas = document.getElementById('game-board');
        this.ctx = this.canvas.getContext('2d');
        this.nextCanvas = document.getElementById('next-piece');
        this.nextCtx = this.nextCanvas.getContext('2d');

        this.board = new Board();
        this.pieces = new Pieces();
        this.pieces.board = this.board;
        this.controls = new Controls();
        this.audio = new AudioEngine();

        // Initialize UI and PieceMovement managers
        this.ui = new UIManager(this);
        this.pieceMovement = new PieceMovement(this);

        this.score = 0;
        this.level = 1;
        this.lines = 0;
        this.highScore = 0;
        this.isNewHighScore = false;
        this.gameOver = false;
        this.paused = false;
        this.currentPiece = null;
        this.nextPiece = null;
        this.speedBoost = 0;
        this.dropTime = 1000;
        this.lastDrop = 0;
        this.isAnimating = false;
        this.showGhostPiece = true;
        this.lockDelay = 0;

        // Time tracking (mm:ss) - counts only while playing (not paused / not game over)
        this.elapsedMs = 0;
        this.lastFrameTime = 0;
        this.lastTimeUiUpdate = 0;
        this.needsRender = true;

        this.init();
    }

    resizeBoard() {
        if (!this.board || typeof this.board.resizeCanvas !== 'function') return;
        this.board.resizeCanvas();
        this.requestRender();
    }

    requestRender() {
        this.needsRender = true;
    }

    init() {
        this.board.setupCanvas(this.canvas);
        this.controls.setup(this);

        // Setup UI event listeners
        this.ui.setupEventListeners();

        this.startNewGame();

        // Mark canvas ready to show (CSS hides it until this point)
        this.canvas.setAttribute('data-ready', '');

        // Mobile browsers may need a delayed resize after layout settles
        setTimeout(() => this.resizeBoard(), 150);

        this.gameLoop();
    }

    startNewGame() {
        this.board.reset();
        this.score = 0;
        this.level = 1;
        this.lines = 0;
        this.isNewHighScore = false;
        this.gameOver = false;
        this.paused = false;
        this.isAnimating = false;
        this.speedBoost = 0;
        this.dropTime = this.pieceMovement.calcDropTime();
        this.lockDelay = 0;

        this.elapsedMs = 0;
        this.lastFrameTime = 0;
        this.lastTimeUiUpdate = 0;

        this.currentPiece = this.pieces.getRandomPiece();
        this.nextPiece = this.pieces.getRandomPiece();

        this.ui.updateUI();
        this.ui.updateTimeUI();
        this.ui.updateHighScoreUI();
        this.ui.setScrollLock();
        this.ui.hideGameOver();
        this.ui.hidePaused();
        this.ui.showCursor();

        // Initialize ghost piece status
        const ghostStatus = document.getElementById('ghost-toggle');
        if (ghostStatus) {
            ghostStatus.textContent = this.showGhostPiece ? 'ON' : 'OFF';
        }
        this.requestRender();
    }

    loadHighScore() {
        try {
            const v = localStorage.getItem('patriotic_tetris_high_score');
            const n = Number(v);
            this.highScore = Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
        } catch {
            this.highScore = 0;
        }
    }

    saveHighScore() {
        try {
            localStorage.setItem('patriotic_tetris_high_score', String(this.highScore));
        } catch {
            // ignore
        }
    }

    resetHighScore() {
        this.highScore = 0;
        this.isNewHighScore = false;
        try {
            localStorage.removeItem('patriotic_tetris_high_score');
        } catch {
            // ignore
        }
        this.ui.updateHighScoreUI();
    }

    gameLoop(currentTime = 0) {
        if (this.lastFrameTime === 0) this.lastFrameTime = currentTime;

        if (this.isPlaying()) {
            this.updateElapsedTime(currentTime);
            if (!this.isAnimating) this.updateGameState(currentTime);
        }

        if (this.isAnimating || this.needsRender) {
            this.render();
            this.needsRender = false;
        }

        this.lastFrameTime = currentTime;
        requestAnimationFrame((time) => this.gameLoop(time));
    }

    isPlaying() {
        return !this.gameOver && !this.paused;
    }

    updateElapsedTime(currentTime) {
        this.elapsedMs += Math.max(0, currentTime - this.lastFrameTime);
        if (currentTime - this.lastTimeUiUpdate > 250) {
            this.lastTimeUiUpdate = currentTime;
            this.ui.updateTimeUI();
        }
    }

    updateGameState(currentTime) {
        if (currentTime - this.lastDrop > this.dropTime) {
            this.pieceMovement.dropPiece();
            this.lastDrop = currentTime;
        }
        if (this.lockDelay > 0 && currentTime - this.lockDelay > this.dropTime) {
            this.pieceMovement.lockPiece();
            this.lockDelay = 0;
        }
    }

    increaseSpeed() {
        this.pieceMovement.increaseSpeed();
    }

    dropPiece() {
        this.pieceMovement.dropPiece();
    }

    pause() {
        this.paused = !this.paused;

        // Prevent a large delta on resume.
        this.lastFrameTime = performance.now();

        if (this.paused) {
            this.ui.showPaused();
        } else {
            this.ui.hidePaused();
        }

        this.ui.setScrollLock();
        this.requestRender();
    }

    endGame() {
        this.gameOver = true;
        this.ui.setScrollLock();
        this.ui.showCursor();
        this.audio.playGameOver();
        this.ui.showGameOver();
        this.requestRender();
    }

    toggleGhostPiece() {
        this.ui.toggleGhostPiece();
    }

    setScrollLock() {
        this.ui.setScrollLock();
    }

    showCursor() {
        this.ui.showCursor();
    }

    hideCursor() {
        this.ui.hideCursor();
    }

    render() {
        this.board.render(this.ctx);

        const canRender = this.currentPiece && !this.gameOver && !this.paused;
        if (canRender && this.showGhostPiece && !this.isAnimating) {
            this.pieces.renderGhostPiece(this.ctx, this.currentPiece, this.board);
        }
        if (canRender) {
            this.pieces.renderPiece(this.ctx, this.currentPiece, this.board);
        }

        this.ui.renderNextPieceIfChanged();
    }
}

// Initialize game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    const game = new Game();
    game.loadHighScore();
    game.ui.updateHighScoreUI();
});

export { Game };