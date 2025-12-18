// UI Management Module - Patriotic Tetris
export class UIManager {
    constructor(game) {
        this.game = game;
        this.lastNextKey = '';
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
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) this.game.audio.resumeContext();
        });

        this.bindFirstAudioGesture();
    }

    setupControlPanelClickHandlers() {
        // Get all control items that should be clickable
        const controlItems = document.querySelectorAll('.control-item');
        
        controlItems.forEach(item => {
            const textContent = item.textContent;
            
            // Add click handler based on the control text
            if (textContent.includes('Ghost Piece')) {
                item.addEventListener('click', () => {
                    this.game.ui.toggleGhostPiece();
                });
            } else if (textContent.includes('Animations')) {
                item.addEventListener('click', () => {
                    this.game.toggleAnimations();
                });
            } else if (textContent.includes('Speed Up')) {
                item.addEventListener('click', () => {
                    this.game.pieceMovement.increaseSpeed();
                });
            } else if (textContent.includes('Mute')) {
                item.addEventListener('click', () => {
                    this.game.audio.toggleMute();
                });
            } else if (textContent.includes('Restart')) {
                item.addEventListener('click', () => {
                    this.game.startNewGame();
                });
            } else if (textContent.includes('Pause')) {
                item.addEventListener('click', () => {
                    this.game.pause();
                    if (this.game.paused) this.game.ui.showCursor();
                });
            } else if (textContent.includes('Drop')) {
                item.addEventListener('click', () => {
                    this.game.controls.hardDrop();
                });
            } else if (textContent.includes('Clockwise')) {
                item.addEventListener('click', () => {
                    this.game.controls.rotatePieceClockwise();
                });
            } else if (textContent.includes('Rotate')) {
                item.addEventListener('click', () => {
                    this.game.controls.rotatePiece();
                });
            }
            // Skip "Move" as it has ambiguous arrows
        });
    }

    bindFirstAudioGesture() {
        if (this.game.didBindAudio) return;
        this.game.didBindAudio = true;

        const start = () => {
            this.game.audio.resumeContext();
            this.game.audio.playBackgroundMusic();
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
        const isMobile = window.matchMedia && window.matchMedia('(max-width: 768px)').matches;
        const shouldLock = isMobile && !this.game.paused && !this.game.gameOver;
        document.body.classList.toggle('no-scroll', shouldLock);
    }
}
