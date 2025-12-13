// Board Module - Game Board Management
export class Board {
    constructor() {
        this.width = 10;
        this.height = 20;
        this.cellSize = 30;
        this.grid = [];
        this.canvas = null;
        this.ctx = null;
        this.colors = {
            I: '#FFFFFF', // Default fallback
            O: '#0039A6', // Default fallback
            T: '#D52B1E', // Default fallback
            S: '#FFFFFF', // Default fallback
            Z: '#0039A6', // Default fallback
            J: '#D52B1E', // Default fallback
            L: '#FFFFFF'  // Default fallback
        };
        
        this.reset();
    }
    
    reset() {
        this.grid = Array(this.height).fill().map(() => Array(this.width).fill(0));
    }
    
    setupCanvas(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.resizeCanvas();
        
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
        
        // Make container wrap canvas exactly (no extra space around it)
        const borderH = parseInt(containerStyle.borderLeftWidth) + parseInt(containerStyle.borderRightWidth);
        const borderV = parseInt(containerStyle.borderTopWidth) + parseInt(containerStyle.borderBottomWidth);
        container.style.width = (canvasWidth + paddingH + borderH) + 'px';
        container.style.height = (canvasHeight + paddingV + borderV) + 'px';
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
                        // Store the color directly, not the piece type
                        this.grid[boardY][boardX] = piece.color;
                    }
                }
            }
        }
    }
    
    checkLines() {
        let linesCleared = 0;
        
        for (let y = this.height - 1; y >= 0; y--) {
            if (this.grid[y].every(cell => cell !== 0)) {
                // Remove the line
                this.grid.splice(y, 1);
                // Add empty line at top
                this.grid.unshift(Array(this.width).fill(0));
                linesCleared++;
                y++; // Check the same line again
            }
        }
        
        return linesCleared;
    }
    
    checkGameOver(piece) {
        // Check if piece can be placed at starting position
        return !this.canMove(piece, 0, 0);
    }
    
    render(ctx) {
        const boardWidth = this.width * this.cellSize;
        const boardHeight = this.height * this.cellSize;
        
        // Clear canvas
        ctx.clearRect(0, 0, boardWidth, boardHeight);
        
        // Draw grid background
        ctx.fillStyle = '#F0F0F0';
        ctx.fillRect(0, 0, boardWidth, boardHeight);
        
        // Draw grid lines
        ctx.strokeStyle = '#D0D0D0';
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
                    this.drawCell(ctx, x, y, this.grid[y][x]);
                }
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
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.strokeRect(pixelX, pixelY, size, size);
        
        // Highlight effect
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillRect(pixelX + 2, pixelY + 2, size - 4, 2);
        ctx.fillRect(pixelX + 2, pixelY + 2, 2, size - 4);
        
        // Shadow effect
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(pixelX + size - 4, pixelY + 2, 2, size - 4);
        ctx.fillRect(pixelX + 2, pixelY + size - 4, size - 4, 2);
    }
}