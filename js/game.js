// Main Game Module - Patriotic Tetris
import { Board } from './board.js';
import { Pieces } from './pieces.js';
import { Controls } from './controls.js';
import { AudioEngine } from '../assets/js/audio.js';

class Game {
    constructor() {
        this.canvas = document.getElementById('game-board');
        this.ctx = this.canvas.getContext('2d');
        this.nextCanvas = document.getElementById('next-piece');
        this.nextCtx = this.nextCanvas.getContext('2d');
        
        this.board = new Board();
        this.pieces = new Pieces();
        this.controls = new Controls();
        this.audio = new AudioEngine();
        
        this.score = 0;
        this.level = 1;
        this.lines = 0;
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
    }
    
    startNewGame() {
        this.board.reset();
        this.score = 0;
        this.level = 1;
        this.lines = 0;
        this.gameOver = false;
        this.paused = false;
        this.isAnimating = false;
        this.speedBoost = 0;
        this.dropTime = this.calcDropTime();
        this.lockDelay = 0;
        this.hardDropGrace = false;
        
        this.currentPiece = this.pieces.getRandomPiece();
        this.nextPiece = this.pieces.getRandomPiece();
        
        this.updateUI();
        this.hideGameOver();
        this.hidePaused();
        
        // Initialize ghost piece status
        const ghostStatus = document.getElementById('ghost-toggle');
        if (ghostStatus) {
            ghostStatus.textContent = this.showGhostPiece ? 'ON' : 'OFF';
        }
        
        console.log('New game started');
    }
    
    gameLoop(currentTime = 0) {
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
        
        this.board.lockPiece(this.currentPiece);
        
        // Check for completed lines
        const clearedLines = this.board.checkLines();
        if (clearedLines > 0) {
            this.updateScore(clearedLines);
            this.audio.playLineClear(clearedLines);
        }
        
        // Get next piece
        this.currentPiece = this.nextPiece;
        this.nextPiece = this.pieces.getRandomPiece();
        
        // Check game over
        if (this.board.checkGameOver(this.currentPiece)) {
            this.endGame();
        }
    }
    
    updateScore(clearedLines) {
        const points = [0, 100, 300, 500, 800];
        this.score += points[clearedLines] * this.level;
        this.lines += clearedLines;
        
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
            this.pieces.renderNextPiece(this.nextCtx, this.nextPiece);
        }
    }
    
    pause() {
        this.paused = !this.paused;
        
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
    new Game();
});

export { Game };