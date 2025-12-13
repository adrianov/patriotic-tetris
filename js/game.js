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
        this.dropTime = 1000;
        this.lastDrop = 0;
        this.isAnimating = false;
        
        this.init();
    }
    
    init() {
        console.log('Patriotic Tetris initialized');
        this.setupEventListeners();
        this.startNewGame();
        this.gameLoop();
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
        this.dropTime = 1000;
        
        this.currentPiece = this.pieces.getRandomPiece();
        this.nextPiece = this.pieces.getRandomPiece();
        
        this.updateUI();
        this.hideGameOver();
        this.hidePaused();
        
        console.log('New game started');
    }
    
    gameLoop(currentTime = 0) {
        if (!this.gameOver && !this.paused && !this.isAnimating) {
            // Handle automatic piece dropping
            if (currentTime - this.lastDrop > this.dropTime) {
                this.dropPiece();
                this.lastDrop = currentTime;
            }
        }
        
        // Always render game
        this.render();
        
        requestAnimationFrame((time) => this.gameLoop(time));
    }
    
    dropPiece() {
        if (!this.currentPiece || this.gameOver || this.paused || this.isAnimating) return;
        
        if (this.board.canMove(this.currentPiece, 0, 1)) {
            this.currentPiece.y++;
        } else {
            this.lockPiece();
        }
    }
    
    lockPiece() {
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
            this.dropTime = Math.max(100, 1000 - (this.level - 1) * 100);
        }
        
        this.updateUI();
    }
    
    updateUI() {
        document.getElementById('score').textContent = this.score;
        document.getElementById('level').textContent = this.level;
        document.getElementById('lines').textContent = this.lines;
    }
    
    render() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw board
        this.board.render(this.ctx);
        
        // Draw current piece
        if (this.currentPiece && !this.gameOver && !this.paused) {
            this.pieces.renderPiece(this.ctx, this.currentPiece);
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
}

// Initialize game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new Game();
});

export { Game };