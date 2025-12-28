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
        
        // Get all possible rotation states for this piece
        const rotationStates = this.getAllRotationStates(pieceData.shape);
        const randomRotation = rotationStates[Math.floor(Math.random() * rotationStates.length)];
        
        return {
            type: randomType,
            shape: randomRotation,
            color,
            x: Math.floor(10 / 2) - Math.floor(randomRotation[0].length / 2),
            y: 0
        };
    }
    
    getAllRotationStates(shape) {
        const states = [];
        let currentShape = shape;
        
        // Add the initial state
        states.push(currentShape);
        
        // Generate rotations until we get back to the original shape
        for (let i = 0; i < 3; i++) {
            currentShape = this.rotateMatrix(currentShape);
            
            // Check if this rotation is unique (not already in states)
            const isUnique = !states.some(state => 
                this.shapesEqual(state, currentShape)
            );
            
            if (isUnique) {
                states.push(currentShape);
            } else {
                // We've found a duplicate, so we've found all unique states
                break;
            }
        }
        
        return states;
    }
    
    rotateMatrix(shape) {
        const rotated = [];
        const rows = shape.length;
        const cols = shape[0].length;
        
        for (let x = 0; x < cols; x++) {
            rotated[x] = [];
            for (let y = rows - 1; y >= 0; y--) {
                rotated[x][rows - 1 - y] = shape[y][x];
            }
        }
        
        return rotated;
    }
    
    shapesEqual(shape1, shape2) {
        if (shape1.length !== shape2.length) return false;
        if (shape1[0].length !== shape2[0].length) return false;
        
        for (let y = 0; y < shape1.length; y++) {
            for (let x = 0; x < shape1[y].length; x++) {
                if (shape1[y][x] !== shape2[y][x]) return false;
            }
        }
        
        return true;
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
                if (board.isCellFree(bx, by)) {
                    const pixelX = bx * board.cellSize;
                    const pixelY = by * board.cellSize;
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
        }
    }

    renderCachedGhost(ctx, ghost, board) {
        if (!ghost || !board) return;

        const color = ghost.color || '#FFFFFF';
        const isLightColor = this.isLightColor(color);

        for (let y = 0; y < ghost.shape.length; y++) {
            for (let x = 0; x < ghost.shape[y].length; x++) {
                if (!ghost.shape[y][x]) continue;
                const bx = ghost.x + x, by = ghost.y + y;
                if (board.isCellFree(bx, by)) {
                    this.renderGhostCell(ctx, { bx, by, color, isLight: isLightColor, theme: board.theme, cellSize: board.cellSize });
                }
            }
        }
    }

    isLightColor(color) {
        const c = color.toUpperCase();
        return c === '#FFFFFF' || c === '#FFFDF6' || c === '#FFF3E0';
    }

    renderGhostCell(ctx, config) {
        const { bx, by, color, isLight, theme, cellSize } = config;
        const pixelX = bx * cellSize;
        const pixelY = by * cellSize;

        ctx.save();
        ctx.globalAlpha = isLight ? theme.ghostAlphaLight : theme.ghostAlpha;
        ctx.fillStyle = color;
        ctx.fillRect(pixelX, pixelY, cellSize, cellSize);
        ctx.globalAlpha = 1;
        ctx.strokeStyle = theme.cellBorder;
        ctx.lineWidth = 1;
        ctx.strokeRect(pixelX, pixelY, cellSize, cellSize);
        ctx.restore();
    }

    buildPieceCache(cacheCanvas, cacheCtx, piece, board) {
        if (!piece || !cacheCanvas || !cacheCtx) return;

        const cacheConfig = this.getCacheConfig(piece, board);
        this.setupCacheCanvas(cacheCanvas, cacheCtx, cacheConfig);
        this.renderPieceToCache(cacheCtx, piece, board, cacheConfig);
    }

    getCacheConfig(piece, board) {
        const shape = piece.shape;
        return {
            cols: shape[0]?.length || 4,
            rows: shape.length || 4,
            cellSize: board.cellSize,
            dpr: board.dpr
        };
    }

    setupCacheCanvas(cacheCanvas, cacheCtx, config) {
        const { cols, rows, cellSize, dpr } = config;
        cacheCanvas.width = cols * cellSize * dpr;
        cacheCanvas.height = rows * cellSize * dpr;
        cacheCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
        cacheCtx.clearRect(0, 0, cols * cellSize, rows * cellSize);
    }

    renderPieceToCache(cacheCtx, piece, board, config) {
        const { cols, rows, cellSize } = config;
        const color = piece.color || '#FFFFFF';

        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                if (piece.shape[y][x]) {
                    this.drawCellScaled(cacheCtx, { x: x * cellSize, y: y * cellSize, size: cellSize, color }, board);
                }
            }
        }
    }

    renderPieceCached(ctx, piece, cacheCanvas, board) {
        if (!piece || !cacheCanvas) return;

        const pixelX = piece.x * board.cellSize;
        const pixelY = piece.y * board.cellSize;
        const cols = piece.shape[0]?.length || 4;
        const rows = piece.shape.length || 4;
        const width = cols * board.cellSize;
        const height = rows * board.cellSize;

        ctx.drawImage(cacheCanvas, pixelX, pixelY, width, height);
    }

    

}