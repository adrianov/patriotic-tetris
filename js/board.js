// Board Module - Game Board Management
export class Board {
    constructor() {
        this.width = 10;
        this.height = 20;
        this.cellSize = 30;
        this.grid = [];
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
                    if (boardX < 0 || boardX >= this.width || boardY >= this.height) {
                        return false;
                    }
                    
                    // Check collision with existing pieces
                    if (boardY >= 0 && this.grid[boardY][boardX]) {
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
        // Draw grid background
        ctx.fillStyle = '#F0F0F0';
        ctx.fillRect(0, 0, this.width * this.cellSize, this.height * this.cellSize);
        
        // Draw grid lines
        ctx.strokeStyle = '#D0D0D0';
        ctx.lineWidth = 1;
        
        for (let x = 0; x <= this.width; x++) {
            ctx.beginPath();
            ctx.moveTo(x * this.cellSize, 0);
            ctx.lineTo(x * this.cellSize, this.height * this.cellSize);
            ctx.stroke();
        }
        
        for (let y = 0; y <= this.height; y++) {
            ctx.beginPath();
            ctx.moveTo(0, y * this.cellSize);
            ctx.lineTo(this.width * this.cellSize, y * this.cellSize);
            ctx.stroke();
        }
        
        // Draw placed pieces
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.grid[y][x]) {
                    // grid stores the color directly now, not the piece type
                    this.drawCell(ctx, x, y, this.grid[y][x]);
                }
            }
        }
    }
    
    drawCell(ctx, x, y, color) {
        const cellSize = 30;
        const pixelX = x * cellSize;
        const pixelY = y * cellSize;
        
        // Main cell color
        ctx.fillStyle = color;
        ctx.fillRect(pixelX, pixelY, cellSize, cellSize);
        
        // Cell border
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.strokeRect(pixelX, pixelY, cellSize, cellSize);
        
        // Highlight effect
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillRect(pixelX + 2, pixelY + 2, cellSize - 4, 2);
        ctx.fillRect(pixelX + 2, pixelY + 2, 2, cellSize - 4);
        
        // Shadow effect
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(pixelX + cellSize - 4, pixelY + 2, 2, cellSize - 4);
        ctx.fillRect(pixelX + 2, pixelY + cellSize - 4, cellSize - 4, 2);
    }
}