// Pieces Module - Tetromino Definitions and Rendering
export class Pieces {
    constructor() {
        this.patrioticColors = ['#FFFFFF', '#0039A6', '#D52B1E']; // White, Blue, Red
        
        this.pieceTypes = {
            I: {
                shape: [
                    [1, 1, 1, 1]
                ]
            },
            O: {
                shape: [
                    [1, 1],
                    [1, 1]
                ]
            },
            T: {
                shape: [
                    [0, 1, 0],
                    [1, 1, 1]
                ]
            },
            S: {
                shape: [
                    [0, 1, 1],
                    [1, 1, 0]
                ]
            },
            Z: {
                shape: [
                    [1, 1, 0],
                    [0, 1, 1]
                ]
            },
            J: {
                shape: [
                    [1, 0, 0],
                    [1, 1, 1]
                ]
            },
            L: {
                shape: [
                    [0, 0, 1],
                    [1, 1, 1]
                ]
            }
        };
    }
    
    getRandomPiece() {
        const types = Object.keys(this.pieceTypes);
        const randomType = types[Math.floor(Math.random() * types.length)];
        const pieceData = this.pieceTypes[randomType];
        const randomColor = this.patrioticColors[Math.floor(Math.random() * this.patrioticColors.length)];
        
        return {
            type: randomType,
            shape: pieceData.shape,
            color: randomColor,
            x: Math.floor(10 / 2) - Math.floor(pieceData.shape[0].length / 2),
            y: 0
        };
    }
    
    rotatePiece(piece) {
        const rotated = [];
        const rows = piece.shape.length;
        const cols = piece.shape[0].length;
        
        for (let x = 0; x < cols; x++) {
            rotated[x] = [];
            for (let y = rows - 1; y >= 0; y--) {
                rotated[x][rows - 1 - y] = piece.shape[y][x];
            }
        }
        
        return rotated;
    }
    
    renderPiece(ctx, piece) {
        for (let y = 0; y < piece.shape.length; y++) {
            for (let x = 0; x < piece.shape[y].length; x++) {
                if (piece.shape[y][x]) {
                    this.drawCell(ctx, piece.x + x, piece.y + y, piece.color);
                }
            }
        }
    }
    
    renderNextPiece(ctx, piece) {
        const cellSize = 20;
        const offsetX = (ctx.canvas.width - piece.shape[0].length * cellSize) / 2;
        const offsetY = (ctx.canvas.height - piece.shape.length * cellSize) / 2;
        
        for (let y = 0; y < piece.shape.length; y++) {
            for (let x = 0; x < piece.shape[y].length; x++) {
                if (piece.shape[y][x]) {
                    this.drawCellScaled(ctx, offsetX + x * cellSize, offsetY + y * cellSize, cellSize, piece.color);
                }
            }
        }
    }
    
    drawCell(ctx, x, y, color) {
        const cellSize = 30;
        const pixelX = x * cellSize;
        const pixelY = y * cellSize;
        
        this.drawCellScaled(ctx, pixelX, pixelY, cellSize, color);
    }
    
    drawCellScaled(ctx, x, y, size, color) {
        // Main cell color
        ctx.fillStyle = color;
        ctx.fillRect(x, y, size, size);
        
        // Cell border
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, size, size);
        
        // Highlight effect
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillRect(x + 2, y + 2, size - 4, 2);
        ctx.fillRect(x + 2, y + 2, 2, size - 4);
        
        // Shadow effect
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(x + size - 4, y + 2, 2, size - 4);
        ctx.fillRect(x + 2, y + size - 4, size - 4, 2);
    }
}