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
    
    rotatePieceCounterClockwise(piece) {
        const rotated = [];
        const rows = piece.shape.length;
        const cols = piece.shape[0].length;
        
        // Initialize the rotated matrix with the correct dimensions
        for (let i = 0; i < cols; i++) {
            rotated[i] = [];
            for (let j = 0; j < rows; j++) {
                rotated[i][j] = 0;
            }
        }
        
        // Perform counter-clockwise rotation
        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                if (piece.shape[y][x]) {
                    // Counter-clockwise: (x, y) -> (cols-1-x, y)
                    rotated[cols - 1 - x][y] = piece.shape[y][x];
                }
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
        // Scale to the preview canvas size so it always fits (mobile preview is smaller).
        const cols = piece.shape?.[0]?.length || 4;
        const rows = piece.shape?.length || 4;
        const padding = 6;
        const availableW = Math.max(1, ctx.canvas.width - padding * 2);
        const availableH = Math.max(1, ctx.canvas.height - padding * 2);
        const cellSize = Math.max(8, Math.floor(Math.min(availableW / cols, availableH / rows)));
        const offsetX = Math.floor((ctx.canvas.width - cols * cellSize) / 2);
        const offsetY = Math.floor((ctx.canvas.height - rows * cellSize) / 2);
        const color = piece.color || '#FFFFFF';
        
        for (let y = 0; y < piece.shape.length; y++) {
            for (let x = 0; x < piece.shape[y].length; x++) {
                if (piece.shape[y][x]) {
                    this.drawCellScaled(ctx, { x: offsetX + x * cellSize, y: offsetY + y * cellSize, size: cellSize, color }, board);
                }
            }
        }
    }
    
    drawCell(ctx, x, y, color, board) {
        const pixelX = x * board.cellSize;
        const pixelY = y * board.cellSize;
        
        this.drawCellScaled(ctx, { x: pixelX, y: pixelY, size: board.cellSize, color }, board);
    }

    drawCellScaled(ctx, rect, board) {
        const { x, y, size, color } = rect;
        const blur = board?.isMobile ? 2 : 6;
        ctx.shadowColor = color;
        ctx.shadowBlur = blur;
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
        const ghost = this.getGhostPiece(piece, board);
        if (!ghost) return;

        const color = ghost.color || '#FFFFFF';
        for (let y = 0; y < ghost.shape.length; y++) {
            for (let x = 0; x < ghost.shape[y].length; x++) {
                if (!ghost.shape[y][x]) continue;
                const bx = ghost.x + x, by = ghost.y + y;
                if (board.isCellFree(bx, by)) this.drawGhostCell(ctx, bx, by, color, board);
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