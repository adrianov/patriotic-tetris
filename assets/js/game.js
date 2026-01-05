// Main Game Module - Patriotic Tetris
import { Board } from './board.js';
import { Pieces } from './pieces.js';
import { Controls } from './controls.js';
import { AudioEngine } from './audio.js';
import { initTheme } from './theme.js';
import { UIManager } from './ui.js';
import { PieceMovement } from './pieceMovement.js';
import { AnimationManager } from './animation.js';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(registration => console.log('SW registered:', registration.scope))
      .catch(error => console.log('SW registration failed:', error));
  });
}

class Game {
    constructor() {
        this.canvas = document.getElementById('game-board');
        this.ctx = this.canvas.getContext('2d');
        this.nextCanvas = document.getElementById('next-piece');
        this.nextCtx = this.nextCanvas.getContext('2d');

        this.board = new Board();
        this.board.game = this;
        this.pieces = new Pieces();
        this.pieces.board = this.board;
        this.controls = new Controls();
        this.audio = new AudioEngine();

        // Initialize managers
        this.ui = new UIManager(this);
        this.pieceMovement = new PieceMovement(this);
        this.animationManager = new AnimationManager(this);

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
        this.animationsEnabled = true;
        this.lockDelay = 0;

        // Time tracking (mm:ss) - counts only while playing (not paused / not game over)
        this.elapsedMs = 0;
        this.lastFrameTime = 0;
        this.lastTimeUiUpdate = 0;
        this.needsRender = true;
        this.cachedGhost = null;
        this.pieceCacheCanvas = null;
        this.pieceCacheCtx = null;
        this.pieceCacheDirty = true;

        this.init();
    }

    resizeBoard() {
        if (!this.board || typeof this.board.resizeCanvas !== 'function') return;
        this.board.resizeCanvas();
        this.resizePieceCache();
        this.updateGhostCache();
        this.pieceCacheDirty = true;
        this.requestRender();
    }

    requestRender() {
        this.needsRender = true;
    }

    updateGhostCache() {
        if (!this.currentPiece) {
            this.cachedGhost = null;
            return;
        }
        this.cachedGhost = this.pieces.getGhostPiece(this.currentPiece, this.board);
    }

    updatePieceCache() {
        if (!this.currentPiece) {
            this.pieceCacheDirty = false;
            return;
        }
        this.pieces.buildPieceCache(this.pieceCacheCanvas, this.pieceCacheCtx, this.currentPiece, this.board);
        this.pieceCacheDirty = false;
    }

    init() {
        this.controls.setup(this);

        // Setup UI event listeners
        this.ui.setupEventListeners();

        this.setupPieceCache();

        this.startNewGame();

        // Hide launch screen after initialization
        this.ui.hideLaunchScreen(() => this.finalizeInitialization());
    }

    finalizeInitialization() {
        // Setup canvas now that container is visible
        this.board.setupCanvas(this.canvas);

        // Mark canvas ready to show (CSS hides it until this point)
        this.canvas.setAttribute('data-ready', '');

        // Mobile browsers may need a delayed resize after layout settles
        setTimeout(() => this.resizeBoard(), 150);

        // Start game loop
        this.gameLoop();
    }

    setupPieceCache() {
        this.pieceCacheCanvas = document.createElement('canvas');
        this.pieceCacheCtx = this.pieceCacheCanvas.getContext('2d');
    }

    resizePieceCache() {
        if (!this.pieceCacheCanvas || !this.pieceCacheCtx) return;
        const maxDim = Math.max(4, 4);
        this.pieceCacheCanvas.width = maxDim * this.board.cellSize * this.board.dpr;
        this.pieceCacheCanvas.height = maxDim * this.board.cellSize * this.board.dpr;
        this.pieceCacheCtx.setTransform(this.board.dpr, 0, 0, this.board.dpr, 0, 0);
        this.pieceCacheDirty = true;
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
        this.animationsEnabled = true;
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
        
        // Initialize animation status
        const animationStatus = document.getElementById('animation-toggle');
        if (animationStatus) {
            animationStatus.textContent = this.animationsEnabled ? 'ON' : 'OFF';
        }
        
        // Initialize CSS animation class
        document.body.classList.toggle('no-animations', !this.animationsEnabled);
        this.requestRender();
        this.updateGhostCache();
        this.pieceCacheDirty = true;
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
        if (this.gameOver) return;

        this.paused = !this.paused;

        // Prevent a large delta on resume.
        this.lastFrameTime = performance.now();

        if (this.paused) {
            this.ui.showPaused();
        } else {
            this.ui.hidePaused();
            this.updateGhostCache();
            this.pieceCacheDirty = true;
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

    toggleAnimations() {
        this.animationsEnabled = !this.animationsEnabled;
        const statusElement = document.getElementById('animation-toggle');
        if (statusElement) {
            statusElement.textContent = this.animationsEnabled ? 'ON' : 'OFF';
        }
        
        // Add/remove CSS class to disable visual animations
        document.body.classList.toggle('no-animations', !this.animationsEnabled);
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
            this.pieces.renderCachedGhost(this.ctx, this.cachedGhost, this.board);
        }
        if (canRender) {
            if (this.pieceCacheDirty) this.updatePieceCache();
            this.pieces.renderPieceCached(this.ctx, this.currentPiece, this.pieceCacheCanvas, this.board);
        }

        this.ui.renderNextPieceIfChanged();
    }

    getRepeatDelays() {
        const level = this.level || 1;
        const initialDelayMs = Math.max(80, 180 - (level - 1) * 12);
        const intervalMs = Math.max(35, 60 - (level - 1) * 3);
        return { initialDelayMs, intervalMs };
    }

    updateScore(clearedLines) {
        const points = [0, 100, 300, 500, 800];
        this.addPoints(points[clearedLines] * this.level);
        this.lines += clearedLines;

        const newLevel = Math.floor(this.lines / 10) + 1;
        if (newLevel > this.level) {
            this.level = newLevel;
            this.board.cycleGenerationColor();
            this.pieceMovement.applyDropTime();
        }

        this.ui.updateUI();
    }

    addPoints(points) {
        const p = Math.floor(Number(points));
        if (!Number.isFinite(p) || p <= 0) return;
        this.score += p;
        if (this.score > this.highScore) {
            this.highScore = this.score;
            this.isNewHighScore = true;
            this.saveHighScore();
            this.ui.updateHighScoreUI();
        }
    }

    addDropPoints(points) {
        if (this.gameOver || this.paused) return;
        this.addPoints(points);
        this.ui.updateUI();
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