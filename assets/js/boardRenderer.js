// Board Rendering Module - Patriotic Tetris
export class BoardRenderer {
    constructor(board) {
        this.board = board;
    }

    buildBackground() {
        if (!this.board.bgCtx) return;
        const ctx = this.board.bgCtx;
        const boardWidth = this.board.cssWidth;
        const boardHeight = this.board.cssHeight;

        // Background fill
        ctx.clearRect(0, 0, boardWidth, boardHeight);
        ctx.fillStyle = this.board.theme.boardBg;
        ctx.fillRect(0, 0, boardWidth, boardHeight);

        // Soviet theme: subtle gold ☭ watermark (requested accent)
        if (this.board.theme.themeName === 'soviet') {
            ctx.save();
            ctx.globalAlpha = 0.08;
            ctx.fillStyle = this.board.theme.gold;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = `bold ${Math.floor(this.board.cellSize * 5)}px ${getComputedStyle(document.body).fontFamily}`;
            ctx.fillText('☭', boardWidth / 2, boardHeight * 0.35);
            ctx.restore();
        }

        // Grid lines
        ctx.strokeStyle = this.board.theme.boardGrid;
        ctx.lineWidth = 1;
        for (let x = 0; x <= this.board.width; x++) {
            ctx.beginPath();
            ctx.moveTo(x * this.board.cellSize, 0);
            ctx.lineTo(x * this.board.cellSize, boardHeight);
            ctx.stroke();
        }
        for (let y = 0; y <= this.board.height; y++) {
            ctx.beginPath();
            ctx.moveTo(0, y * this.board.cellSize);
            ctx.lineTo(boardWidth, y * this.board.cellSize);
            ctx.stroke();
        }

        this.board.bgDirty = false;
    }

    buildBlocks() {
        if (!this.board.blocksCtx) return;
        const ctx = this.board.blocksCtx;
        const boardWidth = this.board.cssWidth;
        const boardHeight = this.board.cssHeight;

        ctx.clearRect(0, 0, boardWidth, boardHeight);

        for (let y = 0; y < this.board.height; y++) {
            for (let x = 0; x < this.board.width; x++) {
                const cell = this.board.grid?.[y]?.[x];
                if (!cell) continue;

                // Back-compat: if a numeric index sneaks in, resolve once using current palette.
                if (typeof cell === 'number') {
                    const idx = cell - 1;
                    const resolved = this.board.theme.palette?.[idx] || '#FFFFFF';
                    this.board.grid[y][x] = resolved;
                    this.drawCell(ctx, x, y, resolved);
                } else {
                    this.drawCell(ctx, x, y, cell);
                }
            }
        }

        this.board.blocksDirty = false;
    }

    render(ctx) {
        this.renderBackground(ctx);
        this.renderBlocks(ctx);
        this.renderLineClearEffect(ctx);
    }

    renderBackground(ctx) {
        if (this.board.bgCanvas && this.board.bgDirty) this.buildBackground();
        if (this.board.bgCanvas) {
            ctx.drawImage(this.board.bgCanvas, 0, 0, this.board.cssWidth, this.board.cssHeight);
        } else {
            ctx.clearRect(0, 0, this.board.cssWidth, this.board.cssHeight);
        }
    }

    renderBlocks(ctx) {
        if (this.board.blocksCanvas && this.board.blocksDirty) this.buildBlocks();
        if (this.board.blocksCanvas) {
            ctx.drawImage(this.board.blocksCanvas, 0, 0, this.board.cssWidth, this.board.cssHeight);
        } else {
            this.renderBlocksFallback(ctx);
        }
    }

    renderBlocksFallback(ctx) {
        for (let y = 0; y < this.board.height; y++) {
            for (let x = 0; x < this.board.width; x++) {
                const cell = this.board.grid?.[y]?.[x];
                if (cell) this.drawCell(ctx, x, y, cell);
            }
        }
    }

    renderLineClearEffect(ctx) {
        if (!this.board.lineClear) return;
        const t = Math.min((performance.now() - this.board.lineClear.start) / this.board.lineClear.duration, 1);
        const pulse = 0.35 + 0.65 * Math.pow(Math.sin(t * Math.PI * 3), 2);
        const alpha = (1 - t) * 0.6 * pulse;
        if (alpha <= 0.01) return;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = this.board.theme.gold;
        for (const y of this.board.lineClear.lines) {
            ctx.fillRect(0, y * this.board.cellSize, this.board.cssWidth, this.board.cellSize);
        }
        ctx.restore();
    }

    drawCell(ctx, x, y, color) {
        const pixelX = x * this.board.cellSize;
        const pixelY = y * this.board.cellSize;
        const size = this.board.cellSize;

        // Main cell color
        ctx.fillStyle = color;
        ctx.fillRect(pixelX, pixelY, size, size);

        // Cell border
        ctx.strokeStyle = this.board.theme.cellBorder;
        ctx.lineWidth = 1;
        ctx.strokeRect(pixelX, pixelY, size, size);

        // Highlight effect
        ctx.fillStyle = this.board.theme.cellHighlight;
        ctx.fillRect(pixelX + 2, pixelY + 2, size - 4, 2);
        ctx.fillRect(pixelX + 2, pixelY + 2, 2, size - 4);

        // Shadow effect
        ctx.fillStyle = this.board.theme.cellShadow;
        ctx.fillRect(pixelX + size - 4, pixelY + 2, 2, size - 4);
        ctx.fillRect(pixelX + 2, pixelY + size - 4, size - 4, 2);
    }
}
