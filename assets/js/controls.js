// Controls Module - Input Handling v2
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

        // Block game controls during game over, but allow restart, mute, and ghost toggle
        if (this.game.gameOver && !this.isGameOverAllowedKey(key)) return;

        e.preventDefault();

        // Track pressed keys to prevent repeat for rotation keys
        if (this.pressedKeys.has(key)) {
            // Key is already pressed, only allow repeat for movement keys
            if (this.isMovementKey(key)) {
                this.executeKeyAction(key, action);
            }
        } else {
            // First time pressing this key
            this.pressedKeys.add(key);
            this.executeKeyAction(key, action);
        }
    }

    getActionForKey(key, e) {
        const action = this.keyMap[key] || this.keyMap[e.key] || this.keyMap[e.code];
        if (!action) return null;

        // R key: ignore if ctrl/cmd held (browser refresh)
        if (key === 'r' && (e.ctrlKey || e.metaKey)) return null;

        return action;
    }

    executeKeyAction(key, action) {
        // For movement arrow keys (left, right), use repeat logic
        if (this.isMovementKey(key)) {
            this.handleArrowKeyRepeat(key, action);
        } else if (this.isRotationKey(key)) {
            // For rotation keys, execute immediately but don't repeat
            action();
            this.game.ui.hideCursor();
        } else {
            // For all other keys, execute immediately
            action();
            this.game.ui.hideCursor();
        }
    }

    isMovementKey(key) {
        return key === 'arrowleft' || key === 'arrowright';
    }

    isRotationKey(key) {
        return key === 'arrowup' || key === 'arrowdown';
    }

    isGameOverAllowedKey(key) {
        // Allow these keys to work even during game over
        const allowedKeys = ['r', 'к', 'm', 'ь', 'g', 'п']; // Restart, mute, ghost toggle (English and Russian)
        return allowedKeys.includes(key);
    }

    handleKeyUp(e) {
        const key = e.key.toLowerCase();
        
        // Remove from pressed keys set
        this.pressedKeys.delete(key);
        
        // Only clear timers for movement arrow keys (left, right)
        // Rotation keys don't have timers, so no need to clear them
        if (this.isMovementKey(key)) {
            this.clearRepeatTimer(key);
        }
    }

    handleArrowKeyRepeat(key, action) {
        // Clear any existing timer for this key
        this.clearRepeatTimer(key);

        // Execute action immediately on first press
        action();
        this.game.ui.hideCursor();

        // Set up repeat timers using the same logic as touch controls
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

    setupRepeatTimer(key, action) {
        // Get delays adapted to current level
        const { initialDelayMs, intervalMs } = this.getRepeatDelays();

        // Set up repeat timers
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
            'з': () => { this.game.pause(); if (this.game.paused) this.game.ui.showCursor(); }, // Russian з for pause
            'arrowleft': () => this.moveSide(-1),
            'arrowright': () => this.moveSide(1),
            'arrowdown': () => this.rotatePieceClockwise(),
            'arrowup': () => this.rotatePiece(),
            ' ': () => this.hardDrop(),
            'r': () => this.game.startNewGame(),
            'к': () => this.game.startNewGame(), // Russian к for restart
            'm': () => this.game.audio.toggleMute(),
            'ь': () => this.game.audio.toggleMute(), // Russian ь for mute
            'g': () => this.game.ui.toggleGhostPiece(),
            'п': () => this.game.ui.toggleGhostPiece(), // Russian п for ghost piece
        };
    }

    movePiece(dx, dy) {
        // Down arrow is now used for clockwise rotation, not soft drop
        if (dy === 0 && dx !== 0) {
            this.moveSide(dx);
        }
    }

    moveSide(dx) {
        if (this.game.paused || this.game.isAnimating || !this.game.currentPiece) return;

        const canMoveSide = this.game.board.canMove(this.game.currentPiece, dx, 0);

        if (canMoveSide) {
            this.game.currentPiece.x += dx;
            this.game.lockDelay = 0;
            this.game.audio.playMove();
            this.game.requestRender();
        }
        // Removed: immediate locking on failed horizontal moves - now only applies to hard drops
    }

    softDrop() {
        if (this.game.paused || this.game.isAnimating || !this.game.currentPiece) return;

        if (this.game.board.canMove(this.game.currentPiece, 0, 1)) {
            this.game.currentPiece.y++;
            this.game.lockDelay = 0;
            this.game.audio.playDrop();
            this.game.pieceMovement.addDropPoints(1);
            this.game.requestRender();
            return;
        }

        // If the player asks to move down but it's impossible, lock immediately.
        this.game.pieceMovement.lockPiece();
    }

    rotatePiece() {
        this.rotateWithOffset('counterClockwise');
    }
    rotatePieceClockwise() {
        this.rotateWithOffset('clockwise');
    }

    rotateWithOffset(direction) {
        if (this.game.paused || this.game.isAnimating || !this.game.currentPiece) return;

        const rotatedShape = this.getRotatedShape(direction);
        
        // Calculate target position to maintain the appropriate edge
        const targetX = direction === 'clockwise' 
            ? this.findPositionToMaintainRightmost(rotatedShape)
            : this.findPositionToMaintainLeftmost(rotatedShape);

        // Try to rotate and move to the target position
        if (this.tryRotationAtPosition(targetX, rotatedShape)) return;
        
        // Fallback to current position if target position doesn't work
        if (this.tryDirectRotation(this.game.currentPiece, rotatedShape)) return;
        this.tryWallKicks(this.game.currentPiece, rotatedShape);
    }

    getRotatedShape(direction) {
        return direction === 'clockwise' 
            ? this.game.pieces.rotatePiece(this.game.currentPiece)
            : this.game.pieces.rotatePieceCounterClockwise(this.game.currentPiece);
    }

    getRotationOffset(direction) {
        // No special I-piece handling
        return { x: 0, y: 0 };
    }

    createAdjustedPiece(offset) {
        return {
            ...this.game.currentPiece,
            x: this.game.currentPiece.x + offset.x,
            y: this.game.currentPiece.y + offset.y
        };
    }

    tryDirectRotation(piece, rotatedShape) {
        if (this.game.board.canMove(piece, 0, 0, rotatedShape)) {
            this.applyRotation(piece.x, piece.y, rotatedShape);
            return true;
        }
        return false;
    }

    tryWallKicks(adjustedPiece, rotatedShape) {
        const kickTests = WallKickSystem.getPrioritizedKickTests(
            this.game.currentPiece.type, 
            this.game.currentPiece.shape, 
            this.game.board, 
            this.game.currentPiece, 
            rotatedShape
        );

        for (const [dx, dy] of kickTests) {
            const testPiece = { ...adjustedPiece };
            if (this.game.board.canMove(testPiece, dx, dy, rotatedShape)) {
                this.applyRotation(testPiece.x + dx, testPiece.y + dy, rotatedShape);
                return;
            }
            
            if (this.game.board.canMove(this.game.currentPiece, dx, dy, rotatedShape)) {
                this.applyRotation(this.game.currentPiece.x + dx, this.game.currentPiece.y + dy, rotatedShape);
                return;
            }
        }
    }

    applyRotation(x, y, shape) {
        this.game.currentPiece.x = x;
        this.game.currentPiece.y = y;
        this.game.currentPiece.shape = shape;
        this.game.lockDelay = 0;
        this.game.audio.playRotate();
        this.game.requestRender();
    }

    findPositionToMaintainRightmost(rotatedShape) {
        const piece = this.game.currentPiece;
        const board = this.game.board;
        const currentRightmost = piece.x + this.getShapeWidth(piece.shape) - 1;
        const targetX = currentRightmost - (this.getShapeWidth(rotatedShape) - 1);
        
        if (targetX >= 0 && board.canMove({ ...piece, x: targetX }, 0, 0, rotatedShape)) {
            return targetX;
        }
        
        for (let x = targetX; x >= 0; x--) {
            if (board.canMove({ ...piece, x }, 0, 0, rotatedShape)) return x;
        }
        
        return piece.x;
    }

    findPositionToMaintainLeftmost(rotatedShape) {
        const piece = this.game.currentPiece;
        const board = this.game.board;
        const targetX = piece.x;
        
        if (targetX >= 0 && board.canMove({ ...piece, x: targetX }, 0, 0, rotatedShape)) {
            return targetX;
        }
        
        const maxX = board.width - this.getShapeWidth(rotatedShape);
        for (let x = targetX + 1; x <= maxX; x++) {
            if (board.canMove({ ...piece, x }, 0, 0, rotatedShape)) return x;
        }
        
        return piece.x;
    }

    tryRotationAtPosition(targetX, rotatedShape) {
        const piece = this.game.currentPiece;
        const testPiece = { ...piece, x: targetX };
        
        if (this.game.board.canMove(testPiece, 0, 0, rotatedShape)) {
            this.applyRotation(targetX, piece.y, rotatedShape);
            return true;
        }
        
        return false;
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
        let dropDistance = 0;
        const startY = this.game.currentPiece.y;

        // Create a temporary piece to calculate final position
        const tempPiece = {
            ...this.game.currentPiece,
            y: startY
        };

        // Calculate final position
        while (this.game.board.canMove(tempPiece, 0, 1)) {
            tempPiece.y++;
            dropDistance++;
        }

        if (dropDistance > 0) {
            this.game.audio.playHardDrop();
            this.game.pieceMovement.addDropPoints(dropDistance * 2);
            // Animate the drop
            this.animateHardDrop(startY, tempPiece.y);
            this.game.requestRender();
        } else {
            // Already at bottom and can't move down - lock immediately
            this.game.pieceMovement.lockPiece();
        }
    }
    animateHardDrop(startY, endY) {
        const duration = 200, startTime = performance.now();
        const piece = this.game.currentPiece;
        this.game.isAnimating = true;

        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeProgress = 1 - Math.pow(1 - progress, 3);
            piece.y = startY + (endY - startY) * easeProgress;

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                if (this.game.pieceMovement.hasMoreFilledBlocksAboveAfterMove()) {
                    this.game.pieceMovement.startLockDelay();
                } else {
                    this.game.pieceMovement.lockPiece();
                }
                this.game.isAnimating = false;
            }
        };
        requestAnimationFrame(animate);
    }
}