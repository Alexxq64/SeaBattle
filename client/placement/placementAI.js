// placement/placementAI.js
// Алгоритмы расстановки кораблей для компьютера

import { BOARD_SIZE, CELL_EMPTY, CELL_SHIP } from '../core/attack.js';
import { 
    createEmptyPlacementBoard, 
    canPlaceShip, 
    placeShip, 
    SHIPS_CONFIG
} from './placementLogic.js';

// Базовый класс для алгоритмов расстановки
class PlacementAlgorithm {
    constructor(board) {
        this.board = board;
    }
    
    getShipsToPlace() {
        const ships = [];
        for (const config of SHIPS_CONFIG) {
            for (let i = 0; i < config.count; i++) {
                ships.push(config.size);
            }
        }
        return ships.sort((a, b) => b - a);
    }
}

// 1. Случайная расстановка
class RandomPlacement extends PlacementAlgorithm {
    run() {
        const ships = this.getShipsToPlace();
        
        for (const size of ships) {
            let placed = false;
            let attempts = 0;
            const maxAttempts = 2000;
            
            while (!placed && attempts < maxAttempts) {
                const orientation = Math.random() < 0.5 ? 'horizontal' : 'vertical';
                let x, y;
                
                if (orientation === 'horizontal') {
                    x = Math.floor(Math.random() * BOARD_SIZE);
                    y = Math.floor(Math.random() * (BOARD_SIZE - size + 1));
                } else {
                    x = Math.floor(Math.random() * (BOARD_SIZE - size + 1));
                    y = Math.floor(Math.random() * BOARD_SIZE);
                }
                
                if (canPlaceShip(this.board, x, y, size, orientation)) {
                    placeShip(this.board, x, y, size, orientation);
                    placed = true;
                }
                attempts++;
            }
            
            if (!placed) {
                this.board = createEmptyPlacementBoard();
                return this.run();
            }
        }
        
        return this.board;
    }
}

// 2. Умная расстановка
class SmartPlacement extends PlacementAlgorithm {
    run() {
        const ships = this.getShipsToPlace();
        
        for (const size of ships) {
            let placed = false;
            
            const possiblePositions = [];
            for (let i = 0; i < BOARD_SIZE; i++) {
                for (let j = 0; j < BOARD_SIZE; j++) {
                    if (canPlaceShip(this.board, i, j, size, 'horizontal')) {
                        possiblePositions.push({ x: i, y: j, orientation: 'horizontal' });
                    }
                    if (canPlaceShip(this.board, i, j, size, 'vertical')) {
                        possiblePositions.push({ x: i, y: j, orientation: 'vertical' });
                    }
                }
            }
            
            for (let i = possiblePositions.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [possiblePositions[i], possiblePositions[j]] = [possiblePositions[j], possiblePositions[i]];
            }
            
            for (const pos of possiblePositions) {
                if (canPlaceShip(this.board, pos.x, pos.y, size, pos.orientation)) {
                    placeShip(this.board, pos.x, pos.y, size, pos.orientation);
                    placed = true;
                    break;
                }
            }
            
            if (!placed) {
                this.board = createEmptyPlacementBoard();
                return this.run();
            }
        }
        
        return this.board;
    }
}

// 3. Плотная расстановка
class DensePlacement extends PlacementAlgorithm {
    run() {
        const ships = this.getShipsToPlace();
        
        for (const size of ships) {
            let placed = false;
            
            const positions = [];
            for (let i = 0; i < BOARD_SIZE; i++) {
                for (let j = 0; j < BOARD_SIZE; j++) {
                    const priority = Math.min(i, j, BOARD_SIZE - 1 - i, BOARD_SIZE - 1 - j);
                    if (canPlaceShip(this.board, i, j, size, 'horizontal')) {
                        positions.push({ x: i, y: j, orientation: 'horizontal', priority });
                    }
                    if (canPlaceShip(this.board, i, j, size, 'vertical')) {
                        positions.push({ x: i, y: j, orientation: 'vertical', priority });
                    }
                }
            }
            
            positions.sort((a, b) => b.priority - a.priority);
            
            for (const pos of positions) {
                if (canPlaceShip(this.board, pos.x, pos.y, size, pos.orientation)) {
                    placeShip(this.board, pos.x, pos.y, size, pos.orientation);
                    placed = true;
                    break;
                }
            }
            
            if (!placed) {
                this.board = createEmptyPlacementBoard();
                return this.run();
            }
        }
        
        return this.board;
    }
}

// 4. Расстановка по углам и краям
class EdgePlacement extends PlacementAlgorithm {
    run() {
        const ships = this.getShipsToPlace();
        
        for (const size of ships) {
            let placed = false;
            
            const positions = [];
            for (let i = 0; i < BOARD_SIZE; i++) {
                for (let j = 0; j < BOARD_SIZE; j++) {
                    let priority = 0;
                    if ((i === 0 || i === BOARD_SIZE - 1) && (j === 0 || j === BOARD_SIZE - 1)) {
                        priority = 3;
                    } else if (i === 0 || i === BOARD_SIZE - 1 || j === 0 || j === BOARD_SIZE - 1) {
                        priority = 2;
                    } else {
                        priority = 1;
                    }
                    
                    if (canPlaceShip(this.board, i, j, size, 'horizontal')) {
                        positions.push({ x: i, y: j, orientation: 'horizontal', priority });
                    }
                    if (canPlaceShip(this.board, i, j, size, 'vertical')) {
                        positions.push({ x: i, y: j, orientation: 'vertical', priority });
                    }
                }
            }
            
            positions.sort((a, b) => b.priority - a.priority);
            
            for (const pos of positions) {
                if (canPlaceShip(this.board, pos.x, pos.y, size, pos.orientation)) {
                    placeShip(this.board, pos.x, pos.y, size, pos.orientation);
                    placed = true;
                    break;
                }
            }
            
            if (!placed) {
                this.board = createEmptyPlacementBoard();
                return this.run();
            }
        }
        
        return this.board;
    }
}

// Фабрика алгоритмов
export function getPlacementAlgorithm(algorithm, board) {
    switch (algorithm) {
        case 'random':
            return new RandomPlacement(board).run();
        case 'smart':
            return new SmartPlacement(board).run();
        case 'dense':
            return new DensePlacement(board).run();
        case 'edge':
            return new EdgePlacement(board).run();
        default:
            return new RandomPlacement(board).run();
    }
}

// Упрощённые функции для прямого вызова
export function randomPlacement() {
    const board = createEmptyPlacementBoard();
    return new RandomPlacement(board).run();
}

export function smartPlacement() {
    const board = createEmptyPlacementBoard();
    return new SmartPlacement(board).run();
}

export function densePlacement() {
    const board = createEmptyPlacementBoard();
    return new DensePlacement(board).run();
}

export function edgePlacement() {
    const board = createEmptyPlacementBoard();
    return new EdgePlacement(board).run();
}