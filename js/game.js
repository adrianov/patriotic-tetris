// Main Game Module - Patriotic Tetris
import { Board } from './board.js';
import { Pieces } from './pieces.js';
import { Controls } from './controls.js';
import { AudioEngine } from '../assets/js/audio.js';
import { initTheme } from './theme.js';

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
        
        this.init();
    }
    
    init() {
        console.log('Patriotic Tetris initialized');
        this.setupEventListeners();
        this.board.setupCanvas(this.canvas);
        this.startNewGame();
        this.gameLoop();
        
        // Start background music after a short delay
        setTimeout(() => {
            this.audio.playBackgroundMusic();
        }, 1000);
    }
    
    setupEventListeners() {
        // Game controls will be handled by Controls module
        this.controls.setup(this);
        
        // UI controls
        document.getElementById('restart-btn').addEventListener('click', () => {
            this.startNewGame();
        });
        
        document.getElementById('mute-btn').addEventListener('click', () => {
            this.audio.toggleMute();
        });
        
        document.getElementById('volume-slider').addEventListener('input', (e) => {
            this.audio.setVolume(e.target.value / 100);
        });

        const resetHighBtn = document.getElementById('reset-high-btn');
        if (resetHighBtn) {
            resetHighBtn.addEventListener('click', () => this.resetHighScore());
        }
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
        this.dropTime = this.calcDropTime();
        this.lockDelay = 0;
        this.hardDropGrace = false;

        this.elapsedMs = 0;
        this.lastFrameTime = 0;
        this.lastTimeUiUpdate = 0;
        
        this.currentPiece = this.pieces.getRandomPiece();
        this.nextPiece = this.pieces.getRandomPiece();
        
        this.updateUI();
        this.updateTimeUI();
        this.updateHighScoreUI();
        this.hideGameOver();
        this.hidePaused();
        
        // Initialize ghost piece status
        const ghostStatus = document.getElementById('ghost-toggle');
        if (ghostStatus) {
            ghostStatus.textContent = this.showGhostPiece ? 'ON' : 'OFF';
        }
        
        console.log('New game started');
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
        this.updateHighScoreUI();
    }
    
    gameLoop(currentTime = 0) {
        if (this.lastFrameTime === 0) this.lastFrameTime = currentTime;

        if (!this.gameOver && !this.paused) {
            this.elapsedMs += Math.max(0, currentTime - this.lastFrameTime);
            if (currentTime - this.lastTimeUiUpdate > 250) {
                this.lastTimeUiUpdate = currentTime;
                this.updateTimeUI();
            }
        }

        if (!this.gameOver && !this.paused && !this.isAnimating) {
            // Handle automatic piece dropping
            if (currentTime - this.lastDrop > this.dropTime) {
                this.dropPiece();
                this.lastDrop = currentTime;
            }
            
            // Handle lock delay - use same timing as drop speed
            if (this.lockDelay > 0 && currentTime - this.lockDelay > this.dropTime) {
                this.lockPiece();
                this.lockDelay = 0;
            }
        }
        
        // Always render game
        this.render();

        this.lastFrameTime = currentTime;
        
        requestAnimationFrame((time) => this.gameLoop(time));
    }

    calcDropTime() {
        const base = Math.max(100, 1000 - (this.level - 1) * 100);
        const factor = 1 + this.speedBoost * 0.2; // +20% faster per press
        return Math.max(50, Math.round(base / factor));
    }

    applyDropTime() {
        this.dropTime = this.calcDropTime();
    }

    increaseSpeed() {
        if (this.gameOver) return;
        this.speedBoost = Math.min(30, this.speedBoost + 1);
        this.applyDropTime();
        this.lastDrop = performance.now() - this.dropTime;
        this.updateUI();
    }

    dropPiece() {
        if (!this.currentPiece || this.gameOver || this.paused || this.isAnimating) return;
        
        if (this.board.canMove(this.currentPiece, 0, 1)) {
            this.currentPiece.y++;
            this.lockDelay = 0;
        } else if (this.isPieceCompletelyStuck()) {
            this.lockPiece();
        } else {
            this.startLockDelay();
        }
    }
    
    isPieceCompletelyStuck() {
        if (!this.currentPiece) return false;
        
        // Can't move down, left, right, or rotate
        return !this.board.canMove(this.currentPiece, 0, 1) &&
               !this.board.canMove(this.currentPiece, -1, 0) &&
               !this.board.canMove(this.currentPiece, 1, 0) &&
               (this.currentPiece.type === 'O' || !this.board.canMove(this.currentPiece, 0, 0, this.pieces.rotatePiece(this.currentPiece)));
    }
    
    startLockDelay() {
        if (this.lockDelay === 0) {
            this.lockDelay = performance.now();
        }
    }
    
    lockPiece() {
        // Prevent double-locking and ensure piece can't move down
        if (!this.currentPiece || this.gameOver) return;
        
        // Only lock if piece can't move down
        if (this.board.canMove(this.currentPiece, 0, 1)) return;
        
        // Lock current piece into the grid
        this.board.lockPiece(this.currentPiece);
        this.currentPiece = null;
        this.lockDelay = 0;

        const lines = this.board.getFullLines();
        if (lines.length > 0) {
            // Animate line clear before removing rows & spawning the next piece.
            this.isAnimating = true;
            this.audio.playLineClear(lines.length);
            this.board.startLineClear(lines);

            const start = performance.now();
            const duration = this.board.lineClear?.duration || 260;
            const step = (now) => {
                if (now - start >= duration) {
                    this.board.clearLines(lines);
                    this.board.stopLineClear();
                    this.updateScore(lines.length);
                    this.spawnNextPiece();
                    this.isAnimating = false;
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
        this.currentPiece = this.nextPiece;
        this.nextPiece = this.pieces.getRandomPiece();

        if (this.board.checkGameOver(this.currentPiece)) {
            this.endGame();
        }
    }
    
    updateScore(clearedLines) {
        const points = [0, 100, 300, 500, 800];
        this.score += points[clearedLines] * this.level;
        this.lines += clearedLines;

        if (this.score > this.highScore) {
            this.highScore = this.score;
            this.isNewHighScore = true;
            this.saveHighScore();
            this.updateHighScoreUI();
        }
        
        // Level up every 10 lines
        const newLevel = Math.floor(this.lines / 10) + 1;
        if (newLevel > this.level) {
            this.level = newLevel;
            this.applyDropTime();
        }
        
        this.updateUI();
    }
    
    updateUI() {
        document.getElementById('score').textContent = this.score;
        const boostPct = this.speedBoost * 20;
        document.getElementById('level').textContent = boostPct > 0 ? `${this.level} (+${boostPct}%)` : `${this.level}`;
        document.getElementById('lines').textContent = this.lines;
    }

    updateHighScoreUI() {
        const el = document.getElementById('high-score');
        if (el) el.textContent = this.highScore;
    }

    updateTimeUI() {
        const totalSeconds = Math.floor(this.elapsedMs / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        const timeEl = document.getElementById('time');
        if (timeEl) {
            timeEl.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        }
    }
    
    render() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw board
        this.board.render(this.ctx);
        
        // Draw ghost piece
        if (this.showGhostPiece && this.currentPiece && !this.gameOver && !this.paused && !this.isAnimating && this.currentPiece.shape) {
            this.pieces.renderGhostPiece(this.ctx, this.currentPiece, this.board);
        }
        
        // Draw current piece
        if (this.currentPiece && !this.gameOver && !this.paused) {
            this.pieces.renderPiece(this.ctx, this.currentPiece, this.board);
        }
        
        // Draw next piece
        this.nextCtx.clearRect(0, 0, this.nextCanvas.width, this.nextCanvas.height);
        if (this.nextPiece) {
            this.pieces.renderNextPiece(this.nextCtx, this.nextPiece, this.board);
        }
    }
    
    pause() {
        this.paused = !this.paused;

        // Prevent a large delta on resume.
        this.lastFrameTime = performance.now();
        
        if (this.paused) {
            this.showPaused();
        } else {
            this.hidePaused();
        }
        
        console.log(this.paused ? 'Game paused' : 'Game resumed');
    }
    
    showPaused() {
        document.getElementById('paused').classList.remove('hidden');
    }
    
    hidePaused() {
        document.getElementById('paused').classList.add('hidden');
    }
    
    endGame() {
        this.gameOver = true;
        this.audio.playGameOver();
        this.showGameOver();
        console.log('Game Over - Final Score:', this.score);
    }
    
    showGameOver() {
        document.getElementById('final-score').textContent = this.score;
        document.getElementById('game-over').classList.remove('hidden');

        const banner = document.getElementById('new-high-score');
        if (banner) {
            banner.classList.toggle('hidden', !this.isNewHighScore);
        }

        if (this.isNewHighScore) {
            this.audio.playHighScore();
        }
    }
    
    hideGameOver() {
        document.getElementById('game-over').classList.add('hidden');
    }
    
    toggleGhostPiece() {
        this.showGhostPiece = !this.showGhostPiece;
        const statusElement = document.getElementById('ghost-toggle');
        if (statusElement) {
            statusElement.textContent = this.showGhostPiece ? 'ON' : 'OFF';
        }
        console.log(this.showGhostPiece ? 'Ghost piece enabled' : 'Ghost piece disabled');
    }
}

// Initialize game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    const game = new Game();
    game.loadHighScore();
    game.updateHighScoreUI();
});

export { Game };