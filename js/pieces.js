// Pieces Module - Tetromino Definitions and Rendering
export class Pieces {
    constructor() {
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
        const color = this.board?.getRandomPaletteColor?.() || '#FFFFFF';
        
        return {
            type: randomType,
            shape: pieceData.shape,
            color,
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
    
    renderPiece(ctx, piece, board) {
        const color = piece.color || '#FFFFFF';
        for (let y = 0; y < piece.shape.length; y++) {
            for (let x = 0; x < piece.shape[y].length; x++) {
                if (piece.shape[y][x]) {
                    this.drawCell(ctx, piece.x + x, piece.y + y, color, board);
                }
            }
        }
    }
    
    renderNextPiece(ctx, piece, board) {
        const cellSize = 20;
        const offsetX = (ctx.canvas.width - piece.shape[0].length * cellSize) / 2;
        const offsetY = (ctx.canvas.height - piece.shape.length * cellSize) / 2;
        const color = piece.color || '#FFFFFF';
        
        for (let y = 0; y < piece.shape.length; y++) {
            for (let x = 0; x < piece.shape[y].length; x++) {
                if (piece.shape[y][x]) {
                    this.drawCellScaled(ctx, offsetX + x * cellSize, offsetY + y * cellSize, cellSize, color, board);
                }
            }
        }
    }
    
    drawCell(ctx, x, y, color, board) {
        const pixelX = x * board.cellSize;
        const pixelY = y * board.cellSize;
        
        this.drawCellScaled(ctx, pixelX, pixelY, board.cellSize, color, board);
    }
    
    drawCellScaled(ctx, x, y, size, color, board) {
        // Glow effect - outer glow
        ctx.shadowColor = color;
        ctx.shadowBlur = 6;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        
        // Main cell color
        ctx.fillStyle = color;
        ctx.fillRect(x, y, size, size);
        
        // Reset shadow for border
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        
        // Cell border
        ctx.strokeStyle = board.theme.cellBorder;
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, size, size);
        
        // Inner highlight
        ctx.fillStyle = board.theme.cellHighlight;
        ctx.fillRect(x + 2, y + 2, size - 4, 2);
        ctx.fillRect(x + 2, y + 2, 2, size - 4);
        
        // Inner shadow
        ctx.fillStyle = board.theme.cellShadow;
        ctx.fillRect(x + size - 3, y + 2, 1, size - 4);
        ctx.fillRect(x + 2, y + size - 3, size - 4, 1);
    }
    
    getGhostPiece(piece, board) {
        if (!piece || !piece.shape || !board || !board.canMove) return null;
        
        // Check if current piece position is valid
        if (!board.canMove(piece, 0, 0)) return null;
        
        // Ensure piece has valid coordinates
        if (typeof piece.x !== 'number' || typeof piece.y !== 'number') return null;
        
        const ghostPiece = {
            ...piece,
            y: piece.y
        };
        
        // Move ghost piece down until it can't move further
        while (board.canMove(ghostPiece, 0, 1)) {
            ghostPiece.y++;
        }
        
        return ghostPiece;
    }
    
    renderGhostPiece(ctx, piece, board) {
        const ghostPiece = this.getGhostPiece(piece, board);
        
        if (!ghostPiece) return;
        const color = ghostPiece.color || '#FFFFFF';
        
        // Only render ghost piece if it's within board bounds and not colliding with existing pieces
        for (let y = 0; y < ghostPiece.shape.length; y++) {
            for (let x = 0; x < ghostPiece.shape[y].length; x++) {
                if (ghostPiece.shape[y][x]) {
                    const boardX = ghostPiece.x + x;
                    const boardY = ghostPiece.y + y;
                    
                    // Only draw if within board boundaries and cell is not occupied
                    if (boardX >= 0 && boardX < board.width && boardY >= 0 && boardY < board.height && 
                        board.grid[boardY] && !board.grid[boardY][boardX]) {
                        this.drawGhostCell(ctx, boardX, boardY, color, board);
                    }
                }
            }
        }
    }
    
    drawGhostCell(ctx, x, y, color, board) {
        const pixelX = x * board.cellSize;
        const pixelY = y * board.cellSize;

        const c = color.toUpperCase();
        const isLight = c === '#FFFFFF' || c === '#FFFDF6' || c === '#FFF3E0';
        ctx.save();
        ctx.globalAlpha = isLight ? board.theme.ghostAlphaLight : board.theme.ghostAlpha;
        ctx.fillStyle = color;
        ctx.fillRect(pixelX, pixelY, board.cellSize, board.cellSize);

        ctx.globalAlpha = 1;
        ctx.strokeStyle = board.theme.cellBorder;
        ctx.lineWidth = 1;
        ctx.strokeRect(pixelX, pixelY, board.cellSize, board.cellSize);
        ctx.restore();
    }
}