// UI Management Module - Patriotic Tetris
import { isMobileDevice } from './utils/device.js';
export class UIManager {
    constructor(game) {
        this.game = game;
        this.lastNextKey = '';
        this.onLaunchScreenComplete = null;
    }

    hideLaunchScreen(callback) {
        const launchScreen = document.getElementById('launch-screen');
        const gameContainer = document.querySelector('.game-container');

        if (launchScreen) {
            launchScreen.classList.add('fade-out');

            setTimeout(() => {
                launchScreen.style.display = 'none';
                if (gameContainer) {
                    gameContainer.classList.remove('hidden');
                }
                if (callback) callback();
            }, 600);
        } else if (gameContainer) {
            gameContainer.classList.remove('hidden');
            if (callback) callback();
        }
    }

    setupEventListeners() {
        // UI controls
        document.getElementById('restart-btn').addEventListener('click', () => {
            this.game.startNewGame();
        });

        document.getElementById('mute-btn').addEventListener('click', () => {
            this.game.audio.toggleMute();
        });

        document.getElementById('volume-slider').addEventListener('input', (e) => {
            const value = Number(e.target.value);
            this.game.audio.setVolume(Number.isFinite(value) ? value / 100 : 0.5);
        });

        const resetHighBtn = document.getElementById('reset-high-btn');
        if (resetHighBtn) {
            resetHighBtn.addEventListener('click', () => this.game.resetHighScore());
        }

        // Resize handler
        const handleResize = () => {
            this.game.resizeBoard();
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



        // Hide cursor on game board during active gameplay (desktop only)
        this.game.canvas.addEventListener('mousemove', () => this.showCursor());

        // Control panel click handlers
        this.setupControlPanelClickHandlers();

        // Mobile browsers can suspend WebAudio after interruptions; re-resume on visibility change
        // Note: audioLifecycle.js also handles this, but this provides additional redundancy
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.game.audio.shouldHaveContext()) {
                this.game.audio.contextManager.ensureRunning();
            }
        });
    }

    setupControlPanelClickHandlers() {
        // Get all control items that should be clickable
        const controlItems = document.querySelectorAll('.control-item');

        controlItems.forEach(item => {
            const textContent = item.textContent;

            // Skip "Move" as it has ambiguous arrows
            if (textContent.includes('Move')) return;

            // Add click handler based on the control text
            const action = this.getControlAction(textContent);
            if (action) {
                item.addEventListener('click', action);
            }
        });
    }

    getControlAction(textContent) {
        const actions = {
            'Ghost Piece': () => this.game.ui.toggleGhostPiece(),
            'Animations': () => this.game.toggleAnimations(),
            'Speed Up': () => this.game.pieceMovement.increaseSpeed(),
            'Mute': () => this.game.audio.toggleMute(),
            'Restart': () => this.game.startNewGame(),
            'Pause': () => {
                this.game.pause();
                if (this.game.paused) this.game.ui.showCursor();
            },
            'Drop': () => this.game.controls.hardDrop(),
            'Clockwise': () => this.game.controls.rotatePieceClockwise(),
            'Rotate': () => this.game.controls.rotatePiece(),
            'Reset High': () => this.game.resetHighScore()
        };

        for (const [key, action] of Object.entries(actions)) {
            if (textContent.includes(key)) return action;
        }
        return null;
    }

    updateUI() {
        document.getElementById('score').textContent = this.game.score;
        const boostPct = this.game.speedBoost * 20;
        document.getElementById('level').textContent = boostPct > 0 ? `${this.game.level} (+${boostPct}%)` : `${this.game.level}`;
        document.getElementById('lines').textContent = this.game.lines;

        const mScore = document.getElementById('m-score');
        if (mScore) mScore.textContent = this.game.score;
        const mLevel = document.getElementById('m-level');
        if (mLevel) mLevel.textContent = boostPct > 0 ? `${this.game.level}+${boostPct}%` : `${this.game.level}`;
        const mLines = document.getElementById('m-lines');
        if (mLines) mLines.textContent = this.game.lines;
    }

    updateHighScoreUI() {
        const el = document.getElementById('high-score');
        if (el) el.textContent = this.game.highScore;
        const mHigh = document.getElementById('m-high');
        if (mHigh) mHigh.textContent = this.game.highScore;
    }

    updateTimeUI() {
        const totalSeconds = Math.floor(this.game.elapsedMs / 1000);
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

    renderNextPieceIfChanged() {
        const nextKey = this.game.nextPiece
            ? `${this.game.nextCanvas.width}x${this.game.nextCanvas.height}:${this.game.nextPiece.type}`
            : `${this.game.nextCanvas.width}x${this.game.nextCanvas.height}:none`;

        if (nextKey === this.lastNextKey) return;
        this.lastNextKey = nextKey;

        this.renderNextToCanvas(this.game.nextCtx, this.game.nextCanvas);
        const mobileNext = document.getElementById('mobile-next-piece');
        if (mobileNext) this.renderNextToCanvas(mobileNext.getContext('2d'), mobileNext);
    }

    renderNextToCanvas(ctx, canvas) {
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (this.game.nextPiece) this.game.pieces.renderNextPiece(ctx, this.game.nextPiece, this.game.board);
    }

    showPaused() {
        document.getElementById('paused').classList.remove('hidden');
    }

    hidePaused() {
        document.getElementById('paused').classList.add('hidden');
    }

    showGameOver() {
        document.getElementById('final-score').textContent = this.game.score;
        document.getElementById('game-over').classList.remove('hidden');

        const banner = document.getElementById('new-high-score');
        if (banner) {
            banner.classList.toggle('hidden', !this.game.isNewHighScore);
        }

        if (this.game.isNewHighScore) {
            this.game.audio.playHighScore();
        }
    }

    hideGameOver() {
        document.getElementById('game-over').classList.add('hidden');
    }

    toggleGhostPiece() {
        this.game.showGhostPiece = !this.game.showGhostPiece;
        const statusElement = document.getElementById('ghost-toggle');
        if (statusElement) {
            statusElement.textContent = this.game.showGhostPiece ? 'ON' : 'OFF';
        }
        this.game.updateGhostCache();
        this.game.requestRender();
    }

    hideCursor() {
        if (this.game.gameOver || this.game.paused) return;
        this.game.canvas.classList.add('cursor-hidden');
    }

    showCursor() {
        this.game.canvas.classList.remove('cursor-hidden');
    }

    setScrollLock() {
        const isMobile = isMobileDevice();
        const shouldLock = isMobile && !this.game.paused && !this.game.gameOver;
        document.body.classList.toggle('no-scroll', shouldLock);
    }
}
