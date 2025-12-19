// Board Module - Game Board Management
import { BoardRenderer } from './boardRenderer.js';

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
        
        // Color generation state
        this.currentGenerationColor = null;
        this.currentTheme = null;
        
        // Initialize renderer
        this.renderer = new BoardRenderer(this);

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
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'modern';
        
        // Initialize if theme changed or first time
        if (this.currentTheme !== currentTheme || !this.currentGenerationColor) {
            this.currentTheme = currentTheme;
            this.currentGenerationColor = this.getDefaultColorForTheme(currentTheme);
            return this.currentGenerationColor;
        }
        
        return this.currentGenerationColor;
    }
    
    cycleGenerationColor() {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'modern';
        if (this.currentGenerationColor) {
            const themeColors = this.getThemeColors(currentTheme);
            const currentIndex = themeColors.indexOf(this.currentGenerationColor);
            const nextIndex = (currentIndex + 1) % themeColors.length;
            this.currentGenerationColor = themeColors[nextIndex];
        }
    }
    

    
    getThemeColors(theme) {
        switch (theme) {
            case 'modern':
                return ['#D52B1E', '#0039A6', '#FFFFFF'];
            case 'imperial':
                return ['#FFFFFF', '#B58E24', '#0B0B0B'];
            case 'soviet':
                return ['#B64F4F', '#C85A5A', '#E53935', '#D32F2F', '#C62828', '#B71C1C', '#8A0303'];
            default:
                return ['#D52B1E', '#0039A6', '#FFFFFF'];
        }
    }
    
    getDefaultColorForTheme(theme) {
        switch (theme) {
            case 'modern':
                return '#D52B1E';
            case 'imperial':
                return '#FFFFFF';
            case 'soviet':
                return '#B64F4F';
            default:
                return '#D52B1E';
        }
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
    }

    resizeCanvas() {
        if (!this.canvas) return false;
        if (!this.calcCellSize()) return false;

        this.setupDpr();
        this.applyCanvasSize(this.canvas, this.ctx);
        this.resizeCachedCanvas(this.bgCanvas, this.bgCtx, 'bgDirty');
        this.resizeCachedCanvas(this.blocksCanvas, this.blocksCtx, 'blocksDirty');
        this.updateCssProperties();
        return true;
    }

    calcCellSize() {
        const container = this.canvas.parentElement;
        const style = window.getComputedStyle(container);
        const padH = parseInt(style.paddingLeft) + parseInt(style.paddingRight);
        const padV = parseInt(style.paddingTop) + parseInt(style.paddingBottom);
        const availW = container.clientWidth - padH;
        const availH = container.clientHeight - padV;
        if (availW <= 0 || availH <= 0) return false;

        this.cellSize = Math.min(Math.floor(availW / this.width), Math.floor(availH / this.height));
        return this.cellSize > 0;
    }

    setupDpr() {
        this.isMobile = window.matchMedia?.('(max-width: 768px)').matches || false;
        this.dpr = Math.min(window.devicePixelRatio || 1, this.isMobile ? 2 : 3);
        this.cssWidth = this.cellSize * this.width;
        this.cssHeight = this.cellSize * this.height;
    }

    applyCanvasSize(canvas, ctx) {
        canvas.width = this.cssWidth * this.dpr;
        canvas.height = this.cssHeight * this.dpr;
        ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    }

    resizeCachedCanvas(canvas, ctx, dirtyFlag) {
        if (!canvas || !ctx) return;
        this.applyCanvasSize(canvas, ctx);
        this[dirtyFlag] = true;
    }

    updateCssProperties() {
        this.canvas.style.width = this.cssWidth + 'px';
        this.canvas.style.height = this.cssHeight + 'px';
        document.documentElement.style.setProperty('--board-w', `${this.cssWidth}px`);
        document.documentElement.style.setProperty('--board-h', `${this.cssHeight}px`);
        const container = this.canvas.parentElement;
        container.style.width = '';
        container.style.height = '';
    }

    canMove(piece, dx, dy, newRotation = null) {
        const shape = newRotation || piece.shape;
        const baseX = piece.x + dx;
        const baseY = piece.y + dy;

        for (let y = 0; y < shape.length; y++) {
            for (let x = 0; x < shape[y].length; x++) {
                if (shape[y][x] && !this.isCellFree(baseX + x, baseY + y)) return false;
            }
        }
        return true;
    }

    isCellFree(x, y) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) return false;
        return !this.grid[y]?.[x];
    }

    lockPiece(piece) {
        for (let y = 0; y < piece.shape.length; y++) {
            for (let x = 0; x < piece.shape[y].length; x++) {
                if (piece.shape[y][x]) {
                    const boardY = piece.y + y;
                    const boardX = piece.x + x;

                    // Only lock if within board bounds
                    if (boardY >= 0 && boardY < this.height && boardX >= 0 && boardX < this.width && this.grid[boardY]) {
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

    // Returns true if piece should lock immediately: clean landing AND no fillable gap
    shouldLockClean(piece) {
        return this.isCleanLanding(piece) && !this.hasFillableGap(piece);
    }

    // Check if every bottom-edge cell has support (block below or at board bottom)
    isCleanLanding(piece) {
        for (let py = 0; py < piece.shape.length; py++) {
            for (let px = 0; px < piece.shape[py].length; px++) {
                if (!piece.shape[py][px]) continue;
                const hasShapeCellBelow = (py + 1 < piece.shape.length) && piece.shape[py + 1][px];
                if (hasShapeCellBelow) continue;

                const belowY = piece.y + py + 1;
                if (belowY < this.height && !this.grid[belowY]?.[piece.x + px]) return false;
            }
        }
        return true;
    }

    // Check if there's a fillable gap (empty cell with block above + block further along row)
    hasFillableGap(piece) {
        const bounds = this.getPieceBoundsPerRow(piece);
        for (const { row, left, right } of bounds) {
            if (this.hasGapOnSide(piece, row, left, -1)) return true;
            if (this.hasGapOnSide(piece, row, right, 1)) return true;
        }
        return false;
    }

    getPieceBoundsPerRow(piece) {
        const result = [];
        for (let py = 0; py < piece.shape.length; py++) {
            const row = piece.y + py;
            if (row < 0 || row >= this.height) continue;
            const bounds = this.getRowBounds(piece.shape[py], piece.x);
            if (bounds) result.push({ row, ...bounds });
        }
        return result;
    }

    getRowBounds(shapeRow, baseX) {
        let left = null, right = null;
        for (let px = 0; px < shapeRow.length; px++) {
            if (!shapeRow[px]) continue;
            const bx = baseX + px;
            left = left === null ? bx : Math.min(left, bx);
            right = right === null ? bx : Math.max(right, bx);
        }
        return left !== null ? { left, right } : null;
    }

    hasGapOnSide(piece, row, edge, dir) {
        const adjX = edge + dir;
        if (!this.isValidGapPosition(piece, row, adjX, dir)) return false;
        return this.hasBlockFurther(row, adjX, dir);
    }

    isValidGapPosition(piece, row, adjX, dir) {
        if (adjX < 0 || adjX >= this.width) return false;
        if (!this.canMove(piece, dir, 0)) return false;
        if (this.grid[row][adjX]) return false;
        return row > 0 && this.grid[row - 1]?.[adjX];
    }

    hasBlockFurther(row, startX, dir) {
        for (let x = startX + dir; x >= 0 && x < this.width; x += dir) {
            if (this.grid[row][x]) return true;
        }
        return false;
    }

    render(ctx) {
        this.renderer.render(ctx);
    }
}