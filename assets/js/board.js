// Board Module - Game Board Management
export class Board {
    constructor() {
        this.width = 10;
        this.height = 20;
        this.cellSize = 30;
        this.grid = [];
        this.canvas = null;
        this.ctx = null;
        this.lineClear = null;
        this.bgCanvas = null;
        this.bgCtx = null;
        this.bgDirty = true;
        this.blocksCanvas = null;
        this.blocksCtx = null;
        this.blocksDirty = true;
        this.cssWidth = this.width * this.cellSize;
        this.cssHeight = this.height * this.cellSize;
        this.dpr = 1;
        this.isMobile = false;

        this.theme = this.readTheme();

        this.reset();
    }

    readTheme() {
        const styles = window.getComputedStyle(document.documentElement);
        const getVar = (name, fallback) => {
            const v = styles.getPropertyValue(name);
            return (v && v.trim()) ? v.trim() : fallback;
        };

        return {
            themeName: document.documentElement.getAttribute('data-theme') || 'modern',
            boardBg: getVar('--board-bg', '#A8C5E0'),
            boardGrid: getVar('--board-grid', '#7AA3C0'),
            cellBorder: getVar('--cell-border', '#000000'),
            cellHighlight: getVar('--cell-highlight', 'rgba(255, 255, 255, 0.3)'),
            cellShadow: getVar('--cell-shadow', 'rgba(0, 0, 0, 0.3)'),
            ghostAlpha: Number.parseFloat(getVar('--ghost-alpha', '0.30')) || 0.30,
            ghostAlphaLight: Number.parseFloat(getVar('--ghost-alpha-light', '0.55')) || 0.55,
            gold: getVar('--gold', '#D4AF37'),
            palette: [
                getVar('--piece-1', '#FFFFFF'),
                getVar('--piece-2', '#0039A6'),
                getVar('--piece-3', '#D52B1E'),
                getVar('--piece-4', '#FFFFFF'),
                getVar('--piece-5', '#0039A6'),
                getVar('--piece-6', '#D52B1E'),
                getVar('--piece-7', '#FFFFFF')
            ]
        };
    }

    refreshTheme() {
        // Freeze any legacy numeric cells to their current palette color so they won't
        // recolor on future theme switches.
        if (this.theme?.palette) {
            for (let y = 0; y < this.height; y++) {
                for (let x = 0; x < this.width; x++) {
                    const cell = this.grid?.[y]?.[x];
                    if (typeof cell === 'number' && cell !== 0) {
                        const idx = cell - 1;
                        const color = this.theme.palette[idx] || '#FFFFFF';
                        this.grid[y][x] = color;
                    }
                }
            }
        }

        this.theme = this.readTheme();
        this.bgDirty = true;
        this.blocksDirty = true;
    }

    getRandomPaletteColor() {
        const palette = this.theme?.palette;
        if (!Array.isArray(palette) || palette.length === 0) return '#FFFFFF';
        return palette[Math.floor(Math.random() * palette.length)];
    }

    reset() {
        this.grid = Array(this.height).fill().map(() => Array(this.width).fill(0));
        this.blocksDirty = true;
    }

    setupCanvas(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.bgCanvas = document.createElement('canvas');
        this.bgCtx = this.bgCanvas.getContext('2d');
        this.blocksCanvas = document.createElement('canvas');
        this.blocksCtx = this.blocksCanvas.getContext('2d');
        this.resizeCanvas();

        // Update canvas theme immediately when UI theme changes.
        window.addEventListener('themechange', () => this.refreshTheme());

        // Handle window resize
        window.addEventListener('resize', () => {
            this.resizeCanvas();
        });
    }

    resizeCanvas() {
        if (!this.canvas) return;

        const container = this.canvas.parentElement;
        const containerStyle = window.getComputedStyle(container);
        const containerWidth = container.clientWidth; // includes padding, excludes border
        const containerHeight = container.clientHeight; // includes padding, excludes border

        // Account for container padding (clientWidth/clientHeight already exclude border)
        const paddingH = parseInt(containerStyle.paddingLeft) + parseInt(containerStyle.paddingRight);
        const paddingV = parseInt(containerStyle.paddingTop) + parseInt(containerStyle.paddingBottom);

        // Available space for canvas
        const availableWidth = containerWidth - paddingH;
        const availableHeight = containerHeight - paddingV;
        if (availableWidth <= 0 || availableHeight <= 0) return;

        // Calculate cell size based on both width and height constraints
        const maxCellSizeFromWidth = Math.floor(availableWidth / this.width);
        const maxCellSizeFromHeight = Math.floor(availableHeight / this.height);
        this.cellSize = Math.min(maxCellSizeFromWidth, maxCellSizeFromHeight);
        if (this.cellSize <= 0) return;

        // Calculate canvas dimensions using the determined cell size
        const canvasWidth = this.cellSize * this.width;
        const canvasHeight = this.cellSize * this.height;

        // Handle Retina displays
        const isMobile = window.matchMedia && window.matchMedia('(max-width: 768px)').matches;
        this.isMobile = isMobile;
        const maxDpr = isMobile ? 2 : 3;
        const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
        this.dpr = dpr;
        this.cssWidth = canvasWidth;
        this.cssHeight = canvasHeight;

        // Set canvas actual size (for Retina)
        this.canvas.width = canvasWidth * dpr;
        this.canvas.height = canvasHeight * dpr;

        // Scale context for Retina
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        // Keep a cached background (grid + watermark) to avoid re-drawing it every frame.
        if (this.bgCanvas && this.bgCtx) {
            this.bgCanvas.width = canvasWidth * dpr;
            this.bgCanvas.height = canvasHeight * dpr;
            this.bgCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
            this.bgDirty = true;
        }
        // Cache placed blocks separately so we don't re-draw them every frame.
        if (this.blocksCanvas && this.blocksCtx) {
            this.blocksCanvas.width = canvasWidth * dpr;
            this.blocksCanvas.height = canvasHeight * dpr;
            this.blocksCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
            this.blocksDirty = true;
        }

        // Set CSS size to match board exactly
        this.canvas.style.width = canvasWidth + 'px';
        this.canvas.style.height = canvasHeight + 'px';

        // Expose board size for UI overlays (game over / paused) so they can match the canvas
        // instead of filling the whole center column on desktop.
        document.documentElement.style.setProperty('--board-w', `${canvasWidth}px`);
        document.documentElement.style.setProperty('--board-h', `${canvasHeight}px`);

        // Let CSS (flex/grid) define the container size on all breakpoints.
        // If we set inline width/height here, we "lock" the container to the previous canvas size,
        // preventing it from expanding to use available viewport space (notably on desktop).
        container.style.width = '';
        container.style.height = '';
    }

    buildBackground() {
        if (!this.bgCtx) return;
        const ctx = this.bgCtx;
        const boardWidth = this.cssWidth;
        const boardHeight = this.cssHeight;

        // Background fill
        ctx.clearRect(0, 0, boardWidth, boardHeight);
        ctx.fillStyle = this.theme.boardBg;
        ctx.fillRect(0, 0, boardWidth, boardHeight);

        // Soviet theme: subtle gold ☭ watermark (requested accent)
        if (this.theme.themeName === 'soviet') {
            ctx.save();
            ctx.globalAlpha = 0.08;
            ctx.fillStyle = this.theme.gold;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = `bold ${Math.floor(this.cellSize * 5)}px ${getComputedStyle(document.body).fontFamily}`;
            ctx.fillText('☭', boardWidth / 2, boardHeight * 0.35);
            ctx.restore();
        }

        // Grid lines
        ctx.strokeStyle = this.theme.boardGrid;
        ctx.lineWidth = 1;
        for (let x = 0; x <= this.width; x++) {
            ctx.beginPath();
            ctx.moveTo(x * this.cellSize, 0);
            ctx.lineTo(x * this.cellSize, boardHeight);
            ctx.stroke();
        }
        for (let y = 0; y <= this.height; y++) {
            ctx.beginPath();
            ctx.moveTo(0, y * this.cellSize);
            ctx.lineTo(boardWidth, y * this.cellSize);
            ctx.stroke();
        }

        this.bgDirty = false;
    }

    buildBlocks() {
        if (!this.blocksCtx) return;
        const ctx = this.blocksCtx;
        const boardWidth = this.cssWidth;
        const boardHeight = this.cssHeight;

        ctx.clearRect(0, 0, boardWidth, boardHeight);

        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const cell = this.grid?.[y]?.[x];
                if (!cell) continue;

                // Back-compat: if a numeric index sneaks in, resolve once using current palette.
                if (typeof cell === 'number') {
                    const idx = cell - 1;
                    const resolved = this.theme.palette?.[idx] || '#FFFFFF';
                    this.grid[y][x] = resolved;
                    this.drawCell(ctx, x, y, resolved);
                } else {
                    this.drawCell(ctx, x, y, cell);
                }
            }
        }

        this.blocksDirty = false;
    }

    canMove(piece, dx, dy, newRotation = null) {
        const testPiece = {
            x: piece.x + dx,
            y: piece.y + dy,
            shape: newRotation || piece.shape,
            type: piece.type
        };

        for (let y = 0; y < testPiece.shape.length; y++) {
            for (let x = 0; x < testPiece.shape[y].length; x++) {
                if (testPiece.shape[y][x]) {
                    const boardX = testPiece.x + x;
                    const boardY = testPiece.y + y;

                    // Check boundaries
                    if (boardX < 0 || boardX >= this.width || boardY < 0 || boardY >= this.height) {
                        return false;
                    }

                    // Check collision with existing pieces
                    if (this.grid[boardY] && this.grid[boardY][boardX]) {
                        return false;
                    }
                }
            }
        }

        return true;
    }

    lockPiece(piece) {
        for (let y = 0; y < piece.shape.length; y++) {
            for (let x = 0; x < piece.shape[y].length; x++) {
                if (piece.shape[y][x]) {
                    const boardY = piece.y + y;
                    const boardX = piece.x + x;

                    if (boardY >= 0) {
                        // Store actual color so already-placed blocks do NOT change on theme switch.
                        this.grid[boardY][boardX] = piece.color;
                    }
                }
            }
        }
        this.blocksDirty = true;
    }

    getFullLines() {
        const lines = [];
        for (let y = this.height - 1; y >= 0; y--) {
            if (this.grid[y].every((cell) => cell !== 0)) lines.push(y);
        }
        return lines;
    }

    startLineClear(lines) {
        if (!Array.isArray(lines) || lines.length === 0) return;
        this.lineClear = {
            start: performance.now(),
            duration: 260,
            lines: new Set(lines)
        };
    }

    stopLineClear() {
        this.lineClear = null;
    }

    clearLines(lines) {
        if (!Array.isArray(lines) || lines.length === 0) return 0;
        // IMPORTANT:
        // Do a single compaction pass. Repeated splice+unshift shifts indices and can clear
        // the wrong rows when multiple lines are removed at once.
        const lineSet = new Set(lines);
        const remaining = [];
        for (let y = 0; y < this.height; y++) {
            if (!lineSet.has(y)) remaining.push(this.grid[y]);
        }

        const cleared = this.height - remaining.length;
        for (let i = 0; i < cleared; i++) {
            remaining.unshift(Array(this.width).fill(0));
        }

        this.grid = remaining;
        this.blocksDirty = true;
        return cleared;
    }

    checkGameOver(piece) {
        // Simple game over: if new piece can't be placed at spawn position
        return !this.canMove(piece, 0, 0);
    }

    // Check if piece has clean support below (no air gaps)
    // Returns true if every bottom edge cell is at board bottom or has a block below
    isCleanLanding(piece) {
        for (let y = 0; y < piece.shape.length; y++) {
            for (let x = 0; x < piece.shape[y].length; x++) {
                if (!piece.shape[y][x]) continue;

                // Check if this cell is at bottom edge of piece shape
                const hasShapeCellBelow = (y + 1 < piece.shape.length) && piece.shape[y + 1][x];
                if (hasShapeCellBelow) continue;

                const boardX = piece.x + x;
                const boardY = piece.y + y;
                const belowY = boardY + 1;

                // At board bottom - clean
                if (belowY >= this.height) continue;

                // Has block below - clean
                if (this.grid[belowY]?.[boardX]) continue;

                // Empty space below - not clean
                return false;
            }
        }
        return true;
    }

    // Check if there's a fillable gap: empty cell with block above AND block on same row
    canFillAdjacentGap(piece) {
        for (let py = 0; py < piece.shape.length; py++) {
            const boardY = piece.y + py;
            if (boardY < 0 || boardY >= this.height) continue;

            // Find piece bounds on this row
            let left = null, right = null;
            for (let px = 0; px < piece.shape[py].length; px++) {
                if (piece.shape[py][px]) {
                    const bx = piece.x + px;
                    if (left === null || bx < left) left = bx;
                    if (right === null || bx > right) right = bx;
                }
            }
            if (left === null) continue;

            // Gap on left: empty cell with block above + block further left on same row
            if (this.canMove(piece, -1, 0) && left > 0 && !this.grid[boardY][left - 1]) {
                const hasBlockAbove = boardY > 0 && this.grid[boardY - 1]?.[left - 1];
                if (hasBlockAbove) {
                    for (let x = left - 2; x >= 0; x--) {
                        if (this.grid[boardY][x]) return true;
                    }
                }
            }

            // Gap on right: empty cell with block above + block further right on same row
            if (this.canMove(piece, 1, 0) && right < this.width - 1 && !this.grid[boardY][right + 1]) {
                const hasBlockAbove = boardY > 0 && this.grid[boardY - 1]?.[right + 1];
                if (hasBlockAbove) {
                    for (let x = right + 2; x < this.width; x++) {
                        if (this.grid[boardY][x]) return true;
                    }
                }
            }
        }
        return false;
    }

    render(ctx) {
        const boardWidth = this.cssWidth;
        const boardHeight = this.cssHeight;

        // Draw cached background (grid + watermark) for better mobile performance.
        if (this.bgCanvas && this.bgDirty) this.buildBackground();
        if (this.bgCanvas) {
            ctx.drawImage(this.bgCanvas, 0, 0, boardWidth, boardHeight);
        } else {
            ctx.clearRect(0, 0, boardWidth, boardHeight);
        }

        // Draw cached placed blocks.
        if (this.blocksCanvas && this.blocksDirty) this.buildBlocks();
        if (this.blocksCanvas) {
            ctx.drawImage(this.blocksCanvas, 0, 0, boardWidth, boardHeight);
        } else {
            // Fallback: draw placed pieces directly (shouldn't happen in normal flow).
            for (let y = 0; y < this.height; y++) {
                for (let x = 0; x < this.width; x++) {
                    const cell = this.grid?.[y]?.[x];
                    if (!cell) continue;
                    this.drawCell(ctx, x, y, cell);
                }
            }
        }

        // Line clear effect: flash + fade on full rows before removing them.
        if (this.lineClear) {
            const now = performance.now();
            const t = Math.min((now - this.lineClear.start) / this.lineClear.duration, 1);
            const pulse = 0.35 + 0.65 * Math.sin(t * Math.PI * 3) * Math.sin(t * Math.PI * 3);
            const alpha = (1 - t) * 0.6 * pulse;

            if (alpha > 0.01) {
                ctx.save();
                ctx.globalAlpha = alpha;
                ctx.fillStyle = this.theme.gold;
                for (const y of this.lineClear.lines) {
                    ctx.fillRect(0, y * this.cellSize, boardWidth, this.cellSize);
                }
                ctx.restore();
            }
        }
    }

    drawCell(ctx, x, y, color) {
        const pixelX = x * this.cellSize;
        const pixelY = y * this.cellSize;
        const size = this.cellSize;

        // Main cell color
        ctx.fillStyle = color;
        ctx.fillRect(pixelX, pixelY, size, size);

        // Cell border
        ctx.strokeStyle = this.theme.cellBorder;
        ctx.lineWidth = 1;
        ctx.strokeRect(pixelX, pixelY, size, size);

        // Highlight effect
        ctx.fillStyle = this.theme.cellHighlight;
        ctx.fillRect(pixelX + 2, pixelY + 2, size - 4, 2);
        ctx.fillRect(pixelX + 2, pixelY + 2, 2, size - 4);

        // Shadow effect
        ctx.fillStyle = this.theme.cellShadow;
        ctx.fillRect(pixelX + size - 4, pixelY + 2, 2, size - 4);
        ctx.fillRect(pixelX + 2, pixelY + size - 4, size - 4, 2);
    }
}