import { WallKickSystem } from './wallKicks.js';
import { TouchControls } from './touchControls.js';
export class Controls {
    constructor() {
        this.game = null;
        this.holdTimers = new Map();
        this.keyMap = {};
        this.touchControls = null;
        this.pressedKeys = new Set();
        this.setupKeyboardListeners();
    }
    setup(game) {
        this.game = game;
        this.keyMap = this.buildKeyMap();
        this.touchControls = new TouchControls(game);
        this.touchControls.setup();
    }
    setupKeyboardListeners() {
        document.addEventListener('keydown', (e) => {
            this.handleKeyDown(e);
        });
        document.addEventListener('keyup', (e) => {
            this.handleKeyUp(e);
        });
    }
    handleKeyDown(e) {
        if (!this.game) return;
        const key = e.key.toLowerCase();
        const action = this.getActionForKey(key, e);
        if (!action) return;
        if (this.game.gameOver && !this.isGameOverAllowedKey(key)) return;
        e.preventDefault();
        if (this.pressedKeys.has(key)) {
            if (this.isMovementKey(key)) {
                this.executeKeyAction(key, action);
            }
        } else {
            this.pressedKeys.add(key);
            this.executeKeyAction(key, action);
        }
    }
    getActionForKey(key, e) {
        const action = this.keyMap[key] || this.keyMap[e.key] || this.keyMap[e.code];
        if (!action) return null;
        if (key === 'r' && (e.ctrlKey || e.metaKey)) return null;
        return action;
    }
    executeKeyAction(key, action) {
        if (this.isMovementKey(key)) {
            this.handleArrowKeyRepeat(key, action);
        } else if (this.isRotationKey(key)) {
            action();
            this.game.ui.hideCursor();
        } else {
            action();
            this.game.ui.hideCursor();
        }
    }
    isMovementKey(key) { return key === 'arrowleft' || key === 'arrowright'; }
    isRotationKey(key) { return key === 'arrowup' || key === 'arrowdown'; }
    isGameOverAllowedKey(key) {
        const allowedKeys = ['r', 'к', 'm', 'ь', 'g', 'п', 'a', 'ф'];
        return allowedKeys.includes(key);
    }
    handleKeyUp(e) {
        const key = e.key.toLowerCase();
        
        this.pressedKeys.delete(key);
        
        if (this.isMovementKey(key)) {
            this.clearRepeatTimer(key);
        }
    }
    handleArrowKeyRepeat(key, action) {
        this.clearRepeatTimer(key);
        action();
        this.game.ui.hideCursor();
        this.setupRepeatTimer(key, () => {
            action();
            this.game.ui.hideCursor();
        });
    }
    clearRepeatTimer(key) {
        const t = this.holdTimers.get(key);
        if (t?.timeoutId) clearTimeout(t.timeoutId);
        if (t?.intervalId) clearInterval(t.intervalId);
        this.holdTimers.delete(key);
    }
    getRepeatDelays() {
        // Adapt repeat speed to game level - faster at higher levels
        const level = this.game?.level || 1;
        // Initial delay: 180ms at level 1, down to 80ms at level 10+
        const initialDelayMs = Math.max(80, 180 - (level - 1) * 12);
        // Repeat interval: 60ms at level 1, down to 35ms at level 10+
        const intervalMs = Math.max(35, 60 - (level - 1) * 3);
        return { initialDelayMs, intervalMs };
    }
    setupRepeatTimer(key, action) {
        // Get delays adapted to current level
        const { initialDelayMs, intervalMs } = this.getRepeatDelays();
        const timeoutId = setTimeout(() => {
            const intervalId = setInterval(action, intervalMs);
            const prev = this.holdTimers.get(key) || {};
            this.holdTimers.set(key, { ...prev, intervalId });
        }, initialDelayMs);
        this.holdTimers.set(key, { timeoutId, intervalId: null });
    }
    buildKeyMap() {
        return {
            '+': () => this.game.pieceMovement.increaseSpeed(),
            '=': () => this.game.pieceMovement.increaseSpeed(),
            'NumpadAdd': () => this.game.pieceMovement.increaseSpeed(),
            'p': () => { this.game.pause(); if (this.game.paused) this.game.ui.showCursor(); },
            'з': () => { this.game.pause(); if (this.game.paused) this.game.ui.showCursor(); },
            'arrowleft': () => this.moveSide(-1),
            'arrowright': () => this.moveSide(1),
            'arrowdown': () => this.rotatePieceClockwise(),
            'arrowup': () => this.rotatePiece(),
            ' ': () => this.hardDrop(),
            'r': () => this.game.startNewGame(),
            'к': () => this.game.startNewGame(),
            'm': () => this.game.audio.toggleMute(),
            'ь': () => this.game.audio.toggleMute(),
            'g': () => this.game.ui.toggleGhostPiece(),
            'п': () => this.game.ui.toggleGhostPiece(),
            'a': () => this.game.toggleAnimations(),
            'ф': () => this.game.toggleAnimations()
        };
    }
    movePiece(dx, dy) {
        if (dy === 0 && dx !== 0) {
            this.moveSide(dx);
        }
    }
    moveSide(dx) {
        if (this.game.paused || !this.game.currentPiece) return;
        
        const canMoveSide = this.game.board.canMove(this.game.currentPiece, dx, 0);
        if (canMoveSide) {
            this.game.currentPiece.x += dx;
            this.game.lockDelay = 0;
            this.game.audio.playMove();
            this.game.requestRender();
        }
    }
    softDrop() {
        if (this.game.paused || !this.game.currentPiece) return;
        
        if (this.game.board.canMove(this.game.currentPiece, 0, 1)) {
            this.game.currentPiece.y++;
            this.game.lockDelay = 0;
            this.game.audio.playDrop();
            this.game.scoreManager.addDropPoints(1);
            this.game.requestRender();
            return;
        }
        this.game.pieceMovement.lockPiece();
    }
    rotatePiece() { this.rotateWithOffset('counterClockwise'); }
    rotatePieceClockwise() { this.rotateWithOffset('clockwise'); }
    rotateWithOffset(direction) {
        if (this.game.paused || !this.game.currentPiece) return;
        
        const rotatedShape = this.getRotatedShape(direction);
        const piece = this.game.currentPiece;
        
        // Try to maintain the correct alignment based on rotation direction
        const targetX = direction === 'clockwise' 
            ? this.findPositionToMaintainRightmost(rotatedShape)
            : this.findPositionToMaintainLeftmost(rotatedShape);
        // Try rotation at the aligned position first
        if (this.tryRotationAt(targetX, piece.y, rotatedShape)) return;
        
        // Try current position as fallback
        if (this.tryRotationAt(piece.x, piece.y, rotatedShape)) return;
        
        // Try local positions with directional preference
        if (this.tryLocalRotation(targetX, direction, rotatedShape)) return;
        
        // If nothing works locally, rotation fails (no teleportation)
    }
    tryRotationAt(x, y, rotatedShape) {
        if (!this.game.board.canMove({ ...this.game.currentPiece, x }, 0, 0, rotatedShape)) {
            return false;
        }
        
        // Check if rotation path is clear (prevents teleportation)
        if (!this.isRotationPathClear(this.game.currentPiece.x, x, rotatedShape)) {
            return false;
        }
        
        this.applyRotation(x, y, rotatedShape);
        return true;
    }
    isRotationPathClear(startX, endX, rotatedShape) {
        const distance = Math.abs(endX - startX);
        if (distance <= 1) return true; // Small moves are safe
        
        // Check if this is an I-piece edge rotation (only at board edges)
        if (this.game.currentPiece.type === 'I' && this.isIEdgeRotation(startX, endX, rotatedShape)) {
            return true; // Allow I-piece edge rotations only
        }
        
        // For all other cases, check intermediate positions
        const steps = distance;
        const stepX = (endX - startX) / steps;
        
        for (let i = 1; i < steps; i++) {
            const intermediateX = Math.round(startX + stepX * i);
            
            // Check if current shape can exist at intermediate position
            if (!this.game.board.canMove({ ...this.game.currentPiece, x: intermediateX }, 0, 0)) {
                return false; // Path blocked
            }
        }
        
        return true;
    }
    isIEdgeRotation(startX, endX, rotatedShape) {
        const piece = this.game.currentPiece;
        const board = this.game.board;
        const currentWidth = this.getShapeWidth(piece.shape);
        const rotatedWidth = this.getShapeWidth(rotatedShape);
        
        // Check if this is vertical to horizontal or horizontal to vertical rotation
        const isVerticalToHorizontal = currentWidth === 1 && rotatedWidth === 4;
        const isHorizontalToVertical = currentWidth === 4 && rotatedWidth === 1;
        
        if (!isVerticalToHorizontal && !isHorizontalToVertical) return false;
        
        // Check if rotation would be at or near board edges
        const pieceRightEdge = startX + currentWidth - 1;
        const targetRightEdge = endX + rotatedWidth - 1;
        const pieceLeftEdge = startX;
        const targetLeftEdge = endX;
        
        // Allow only if at least one side is touching or very close to a board edge
        const leftEdge = Math.min(pieceLeftEdge, targetLeftEdge);
        const rightEdge = Math.max(pieceRightEdge, targetRightEdge);
        
        return leftEdge <= 1 || rightEdge >= board.width - 2;
    }
    tryLocalRotation(targetX, direction, rotatedShape) {
        const piece = this.game.currentPiece;
        const board = this.game.board;
        
        // For I-piece at edge, use edge-appropriate starting position
        let searchStartX = targetX;
        if (targetX < 0 || targetX > board.width - this.getShapeWidth(rotatedShape)) {
            const rotatedWidth = this.getShapeWidth(rotatedShape);
            if (targetX < 0) {
                searchStartX = 0; // Start from left edge
            } else {
                searchStartX = board.width - rotatedWidth; // Start from right edge
            }
        }
        
        // Simple search pattern: try closest positions first
        const positions = [0, 1, -1, 2, -2];
        
        // Add targeted kicks for I-piece right edge rotation
        if (piece.type === 'I' && searchStartX >= board.width - 3) {
            positions.push(-2, -3); // Right edge kicks
        }
        
        for (const dx of positions) {
            const testX = searchStartX + dx;
            if (testX >= 0 && testX <= board.width - this.getShapeWidth(rotatedShape)) {
                if (this.tryRotationAt(testX, piece.y, rotatedShape)) {
                    return true;
                }
            }
        }
        
        return false;
    }
    getRotatedShape(direction) {
        return direction === 'clockwise' 
            ? this.game.pieces.rotatePiece(this.game.currentPiece)
            : this.game.pieces.rotatePieceCounterClockwise(this.game.currentPiece);
    }
    trySimpleWallKicks(piece, rotatedShape) {
        // Only allow very basic kicks that don't risk teleportation
        // This prevents pieces from jumping through walls
        
        const basicKicks = [
            [-1, 0], [1, 0],   // Basic left/right kicks
            [0, -1],           // Basic up kick
        ];
        
        // For I-piece, add slightly more options but still very limited
        if (piece.type === 'I') {
            basicKicks.push([-2, 0], [2, 0]); // Extra kicks for I-piece only
        }
        
        for (const [dx, dy] of basicKicks) {
            // Only allow kicks that move at most 2 blocks in any direction
            if (Math.abs(dx) > 2 || Math.abs(dy) > 2) continue;
            
            // Check if the target position is valid for the rotated shape
            if (this.game.board.canMove(piece, dx, dy, rotatedShape)) {
                this.applyRotation(piece.x + dx, piece.y + dy, rotatedShape);
                return true;
            }
        }
        
        return false;
    }
    findPositionToMaintainRightmost(rotatedShape) {
        const piece = this.game.currentPiece;
        const currentRightmost = piece.x + this.getShapeWidth(piece.shape) - 1;
        return currentRightmost - (this.getShapeWidth(rotatedShape) - 1);
    }
    findPositionToMaintainLeftmost(rotatedShape) {
        return this.game.currentPiece.x;
    }
    applyRotation(x, y, shape) {
        this.game.currentPiece.x = x;
        this.game.currentPiece.y = y;
        this.game.currentPiece.shape = shape;
        this.game.lockDelay = 0;
        this.game.audio.playRotate();
        this.game.requestRender();
    }
    getShapeWidth(shape) {
        let maxWidth = 0;
        for (let row = 0; row < shape.length; row++) {
            const rowWidth = shape[row].length;
            if (rowWidth > maxWidth) {
                maxWidth = rowWidth;
            }
        }
        return maxWidth;
    }
    hardDrop() {
        if (this.game.paused || this.game.isAnimating || !this.game.currentPiece) return;
        
        const startY = this.game.currentPiece.y;
        const targetY = this.findOptimalDropPosition();
        const dropDistance = targetY - startY;
        if (dropDistance > 0) {
            this.game.audio.playHardDrop();
            this.game.scoreManager.addDropPoints(dropDistance * 2);
            this.game.animationManager.animateHardDrop(startY);
            this.game.requestRender();
        } else {
            // No movement needed, check if we should lock or start lock delay
            if (this.game.board.canMove(this.game.currentPiece, 0, 1)) {
                // Piece can still move down, let normal logic handle it
                this.game.lockDelay = 0;
            } else if (this.game.pieceMovement.canSlideUnderHangingBlocks(this.game.currentPiece)) {
                // Piece can move under hanging blocks to go deeper, start lock delay
                this.game.pieceMovement.startLockDelay();
            } else {
                // Piece cannot go deeper, lock it immediately
                this.game.pieceMovement.lockPiece();
            }
        }
    }
    findOptimalDropPosition() {
        const startY = this.game.currentPiece.y;
        let currentY = startY;
        while (this.game.board.canMove(this.game.currentPiece, 0, currentY - startY + 1)) {
            currentY++;
            const testPiece = { ...this.game.currentPiece, y: currentY };
            if (this.game.pieceMovement.canSlideUnderHangingBlocks(testPiece)) break;
        }
        return currentY;
    }

}