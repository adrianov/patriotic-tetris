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
    }

    getRandomPaletteColor() {
        const palette = this.theme?.palette;
        if (!Array.isArray(palette) || palette.length === 0) return '#FFFFFF';
        return palette[Math.floor(Math.random() * palette.length)];
    }
    
    reset() {
        this.grid = Array(this.height).fill().map(() => Array(this.width).fill(0));
    }
    
    setupCanvas(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
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
        const dpr = window.devicePixelRatio || 1;
        
        // Set canvas actual size (for Retina)
        this.canvas.width = canvasWidth * dpr;
        this.canvas.height = canvasHeight * dpr;
        
        // Scale context for Retina
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        
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
        return cleared;
    }
    
    checkGameOver(piece) {
        // Simple game over: if new piece can't be placed at spawn position
        return !this.canMove(piece, 0, 0);
    }
    
    render(ctx) {
        const boardWidth = this.width * this.cellSize;
        const boardHeight = this.height * this.cellSize;
        
        // Clear canvas
        ctx.clearRect(0, 0, boardWidth, boardHeight);
        
        // Draw grid background
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
        
        // Draw grid lines
        ctx.strokeStyle = this.theme.boardGrid;
        ctx.lineWidth = 1;
        
        // Vertical lines
        for (let x = 0; x <= this.width; x++) {
            ctx.beginPath();
            ctx.moveTo(x * this.cellSize, 0);
            ctx.lineTo(x * this.cellSize, boardHeight);
            ctx.stroke();
        }
        
        // Horizontal lines
        for (let y = 0; y <= this.height; y++) {
            ctx.beginPath();
            ctx.moveTo(0, y * this.cellSize);
            ctx.lineTo(boardWidth, y * this.cellSize);
            ctx.stroke();
        }
        
        // Draw placed pieces
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.grid[y][x]) {
                    const color = this.grid[y][x];
                    // Back-compat: if a numeric index sneaks in, resolve once using current palette.
                    if (typeof color === 'number') {
                        const idx = color - 1;
                        const resolved = this.theme.palette?.[idx] || '#FFFFFF';
                        this.grid[y][x] = resolved;
                        this.drawCell(ctx, x, y, resolved);
                    } else {
                        this.drawCell(ctx, x, y, color);
                    }
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