// Main Game Module - Patriotic Tetris
import { Board } from './board.js';
import { Pieces } from './pieces.js';
import { Controls } from './controls.js';
import { AudioEngine } from './audio.js';
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
        this.lastNextKey = '';
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
        this.setupEventListeners();
        this.startNewGame();

        // Mark canvas ready to show (CSS hides it until this point)
        this.canvas.setAttribute('data-ready', '');

        // Mobile browsers may need a delayed resize after layout settles
        setTimeout(() => this.resizeBoard(), 150);

        this.gameLoop();
    }

    setupEventListeners() {
        // Game controls will be handled by Controls module
        this.controls.setup(this);

        // Hide cursor on game board during active gameplay (desktop only)
        this.canvas.addEventListener('mousemove', () => this.showCursor());

        // Mobile browsers can suspend WebAudio after interruptions; re-resume on any gesture.
        const resumeAudio = () => this.audio.resumeContext();
        document.addEventListener('pointerdown', resumeAudio, { passive: true });
        document.addEventListener('touchstart', resumeAudio, { passive: true });
        document.addEventListener('keydown', resumeAudio);

        // UI controls
        document.getElementById('restart-btn').addEventListener('click', () => {
            this.startNewGame();
        });

        document.getElementById('mute-btn').addEventListener('click', () => {
            this.audio.toggleMute();
        });

        document.getElementById('volume-slider').addEventListener('input', (e) => {
            const value = Number(e.target.value);
            this.audio.setVolume(Number.isFinite(value) ? value / 100 : 0.5);
        });

        const resetHighBtn = document.getElementById('reset-high-btn');
        if (resetHighBtn) {
            resetHighBtn.addEventListener('click', () => this.resetHighScore());
        }

        // Resize handler
        const handleResize = () => {
            this.resizeBoard();
            this.setScrollLock();
        };

        window.addEventListener('resize', handleResize);

        // iOS Safari/Chrome: visual viewport changes when browser bars show/hide.
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', handleResize);
        }

        window.addEventListener('orientationchange', () => {
            // Safari needs a moment to settle the new dimensions
            setTimeout(handleResize, 50);
        });

        // BFCache restore (mobile Safari back/forward navigation)
        window.addEventListener('pageshow', (e) => {
            if (e.persisted) handleResize();
        });

        // Prevent accidental scroll gestures during play on mobile.
        document.addEventListener('touchmove', (e) => {
            if (!document.body.classList.contains('no-scroll')) return;
            if (e.target && e.target.closest && e.target.closest('.game-container')) {
                e.preventDefault();
            }
        }, { passive: false });

        // Start audio after first user gesture (required by browsers).
        this.bindFirstAudioGesture();

        // If the browser suspends audio (tab switch / interruption), the next user gesture
        // will re-arm it via bindFirstAudioGesture listeners; this makes resume quicker.
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) this.audio.resumeContext();
        });
    }

    bindFirstAudioGesture() {
        if (this.didBindAudio) return;
        this.didBindAudio = true;

        const start = () => {
            this.audio.resumeContext();
            this.audio.playBackgroundMusic();
        };

        const onFirst = () => {
            document.removeEventListener('pointerdown', onFirst);
            document.removeEventListener('keydown', onFirst);
            document.removeEventListener('touchstart', onFirst);
            start();
        };

        document.addEventListener('pointerdown', onFirst, { passive: true });
        document.addEventListener('keydown', onFirst);
        document.addEventListener('touchstart', onFirst, { passive: true });
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

        this.elapsedMs = 0;
        this.lastFrameTime = 0;
        this.lastTimeUiUpdate = 0;
        this.lastNextKey = '';

        this.currentPiece = this.pieces.getRandomPiece();
        this.nextPiece = this.pieces.getRandomPiece();

        this.updateUI();
        this.updateTimeUI();
        this.updateHighScoreUI();
        this.setScrollLock();
        this.hideGameOver();
        this.hidePaused();
        this.showCursor();

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
        this.updateHighScoreUI();
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
            this.updateTimeUI();
        }
    }

    updateGameState(currentTime) {
        if (currentTime - this.lastDrop > this.dropTime) {
            this.dropPiece();
            this.lastDrop = currentTime;
        }
        if (this.lockDelay > 0 && currentTime - this.lockDelay > this.dropTime) {
            this.lockPiece();
            this.lockDelay = 0;
        }
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
            this.requestRender();
        } else if (this.isPieceCompletelyStuck()) {
            this.lockPiece();
        } else {
            this.startLockDelay();
        }
    }

    isPieceCompletelyStuck() {
        if (!this.currentPiece) return false;

        // Can't move down
        if (this.board.canMove(this.currentPiece, 0, 1)) return false;

        // Check if movement or rotation would close gaps
        if (this.canCloseGapsWithMovement()) return false;
        if (this.canCloseGapsWithRotation()) return false;

        // If no movement or rotation can close gaps, piece is stuck
        return !this.board.canMove(this.currentPiece, -1, 0) &&
            !this.board.canMove(this.currentPiece, 1, 0) &&
            (this.currentPiece.type === 'O' || !this.board.canMove(this.currentPiece, 0, 0, this.pieces.rotatePiece(this.currentPiece)));
    }

    // Check if moving left or right would close gaps
    canCloseGapsWithMovement() {
        if (!this.currentPiece) return false;

        // Check if moving left would close gaps
        if (this.board.canMove(this.currentPiece, -1, 0)) {
            const testPiece = { ...this.currentPiece, x: this.currentPiece.x - 1 };
            if (this.wouldCloseGaps(testPiece)) return true;
        }

        // Check if moving right would close gaps
        if (this.board.canMove(this.currentPiece, 1, 0)) {
            const testPiece = { ...this.currentPiece, x: this.currentPiece.x + 1 };
            if (this.wouldCloseGaps(testPiece)) return true;
        }

        return false;
    }

    // Check if rotating would close gaps
    canCloseGapsWithRotation() {
        if (!this.currentPiece || this.currentPiece.type === 'O') return false;

        const rotatedShape = this.pieces.rotatePiece(this.currentPiece);
        if (this.board.canMove(this.currentPiece, 0, 0, rotatedShape)) {
            const testPiece = { ...this.currentPiece, shape: rotatedShape };
            if (this.wouldCloseGaps(testPiece)) return true;
        }

        return false;
    }

    // Check if a piece position would close gaps compared to current position
    wouldCloseGaps(testPiece) {
        // Get gaps in current position
        const currentGaps = this.getGapsUnderPiece(this.currentPiece);
        
        // Get gaps in test position
        const testGaps = this.getGapsUnderPiece(testPiece);
        
        // If test position has fewer gaps, it would close gaps
        return testGaps.length < currentGaps.length;
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
                if (boardY < this.board.height && 
                    boardX >= 0 && boardX < this.board.width &&
                    !this.board.grid[boardY][boardX]) {
                    gaps.push({ x: boardX, y: boardY });
                }
            }
        }
        
        return gaps;
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
        this.requestRender();

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
                    this.requestRender();
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
        this.requestRender();

        if (this.board.checkGameOver(this.currentPiece)) {
            this.endGame();
        }
    }

    updateScore(clearedLines) {
        const points = [0, 100, 300, 500, 800];
        this.addPoints(points[clearedLines] * this.level);
        this.lines += clearedLines;

        // Level up every 10 lines
        const newLevel = Math.floor(this.lines / 10) + 1;
        if (newLevel > this.level) {
            this.level = newLevel;
            this.applyDropTime();
        }

        this.updateUI();
    }

    addPoints(points) {
        const p = Math.floor(Number(points));
        if (!Number.isFinite(p) || p <= 0) return;
        this.score += p;
        if (this.score > this.highScore) {
            this.highScore = this.score;
            this.isNewHighScore = true;
            this.saveHighScore();
            this.updateHighScoreUI();
        }
    }

    addDropPoints(points) {
        if (this.gameOver || this.paused) return;
        this.addPoints(points);
        this.updateUI();
    }

    updateUI() {
        document.getElementById('score').textContent = this.score;
        const boostPct = this.speedBoost * 20;
        document.getElementById('level').textContent = boostPct > 0 ? `${this.level} (+${boostPct}%)` : `${this.level}`;
        document.getElementById('lines').textContent = this.lines;

        const mScore = document.getElementById('m-score');
        if (mScore) mScore.textContent = this.score;
        const mLevel = document.getElementById('m-level');
        if (mLevel) mLevel.textContent = boostPct > 0 ? `${this.level}+${boostPct}%` : `${this.level}`;
        const mLines = document.getElementById('m-lines');
        if (mLines) mLines.textContent = this.lines;
    }

    updateHighScoreUI() {
        const el = document.getElementById('high-score');
        if (el) el.textContent = this.highScore;
        const mHigh = document.getElementById('m-high');
        if (mHigh) mHigh.textContent = this.highScore;
    }

    updateTimeUI() {
        const totalSeconds = Math.floor(this.elapsedMs / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        const timeEl = document.getElementById('time');
        if (timeEl) {
            timeEl.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        }
        const mTime = document.getElementById('m-time');
        if (mTime) {
            mTime.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        }
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

        this.renderNextPieceIfChanged();
    }

    renderNextPieceIfChanged() {
        const nextKey = this.nextPiece
            ? `${this.nextCanvas.width}x${this.nextCanvas.height}:${this.nextPiece.type}`
            : `${this.nextCanvas.width}x${this.nextCanvas.height}:none`;

        if (nextKey === this.lastNextKey) return;
        this.lastNextKey = nextKey;

        this.renderNextToCanvas(this.nextCtx, this.nextCanvas);
        const mobileNext = document.getElementById('mobile-next-piece');
        if (mobileNext) this.renderNextToCanvas(mobileNext.getContext('2d'), mobileNext);
    }

    renderNextToCanvas(ctx, canvas) {
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (this.nextPiece) this.pieces.renderNextPiece(ctx, this.nextPiece, this.board);
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

        this.setScrollLock();
        this.requestRender();
    }

    showPaused() {
        document.getElementById('paused').classList.remove('hidden');
    }

    hidePaused() {
        document.getElementById('paused').classList.add('hidden');
    }

    endGame() {
        this.gameOver = true;
        this.setScrollLock();
        this.showCursor();
        this.audio.playGameOver();
        this.showGameOver();
        this.requestRender();
    }

    setScrollLock() {
        const isMobile = window.matchMedia && window.matchMedia('(max-width: 768px)').matches;
        const shouldLock = isMobile && !this.paused && !this.gameOver;
        document.body.classList.toggle('no-scroll', shouldLock);
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
        this.requestRender();
    }

    hideCursor() {
        if (this.gameOver || this.paused) return;
        this.canvas.classList.add('cursor-hidden');
    }

    showCursor() {
        this.canvas.classList.remove('cursor-hidden');
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