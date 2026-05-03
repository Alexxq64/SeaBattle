// placement/placementLogic.js
// Чистая логика расстановки кораблей (без UI, без state)

import { BOARD_SIZE, CELL_EMPTY, CELL_SHIP } from '../core/attack.js';

// Конфигурация кораблей
export const SHIPS_CONFIG = [
    { size: 4, count: 1 },
    { size: 3, count: 2 },
    { size: 2, count: 3 },
    { size: 1, count: 4 }
];

// Получить общее количество клеток кораблей
export function getTotalShipCells() {
    return SHIPS_CONFIG.reduce((total, ship) => total + ship.size * ship.count, 0);
}

// Проверка, что клетка изолирована (нет соседних кораблей)
export function isCellIsolated(board, x, y) {
    for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && nx < BOARD_SIZE && ny >= 0 && ny < BOARD_SIZE) {
                if (board[nx][ny] === CELL_SHIP) return false;
            }
        }
    }
    return true;
}

// Проверка, можно ли разместить корабль
export function canPlaceShip(board, x, y, size, orientation) {
    if (orientation === 'horizontal') {
        if (y + size > BOARD_SIZE) return false;
        for (let i = 0; i < size; i++) {
            if (board[x][y + i] !== CELL_EMPTY) return false;
            if (!isCellIsolated(board, x, y + i)) return false;
        }
    } else {
        if (x + size > BOARD_SIZE) return false;
        for (let i = 0; i < size; i++) {
            if (board[x + i][y] !== CELL_EMPTY) return false;
            if (!isCellIsolated(board, x + i, y)) return false;
        }
    }
    return true;
}

// Разместить корабль
export function placeShip(board, x, y, size, orientation) {
    if (!canPlaceShip(board, x, y, size, orientation)) return false;
    
    for (let i = 0; i < size; i++) {
        if (orientation === 'horizontal') {
            board[x][y + i] = CELL_SHIP;
        } else {
            board[x + i][y] = CELL_SHIP;
        }
    }
    return true;
}

// Найти корабль по клетке
export function findShip(board, x, y) {
    if (board[x][y] !== CELL_SHIP) return [];
    
    const cells = [];
    const queue = [[x, y]];
    const visited = new Set();
    const dirs = [[0, 1], [1, 0], [0, -1], [-1, 0]];
    
    while (queue.length > 0) {
        const [cx, cy] = queue.shift();
        const key = `${cx},${cy}`;
        if (visited.has(key)) continue;
        visited.add(key);
        cells.push([cx, cy]);
        
        for (const [dx, dy] of dirs) {
            const nx = cx + dx;
            const ny = cy + dy;
            if (nx >= 0 && nx < BOARD_SIZE && ny >= 0 && ny < BOARD_SIZE) {
                if (board[nx][ny] === CELL_SHIP && !visited.has(`${nx},${ny}`)) {
                    queue.push([nx, ny]);
                }
            }
        }
    }
    
    return cells;
}

// Удалить корабль по клетке
export function removeShip(board, x, y) {
    const cells = findShip(board, x, y);
    if (cells.length === 0) return null;
    
    for (const [cx, cy] of cells) {
        board[cx][cy] = CELL_EMPTY;
    }
    
    return { size: cells.length, cells };
}

// Повернуть корабль
export function rotateShip(board, x, y) {
    const cells = findShip(board, x, y);
    if (cells.length === 0) return false;
    
    const size = cells.length;
    const isHorizontal = cells.length > 1 && cells[0][0] === cells[1]?.[0];
    const newOrientation = isHorizontal ? 'vertical' : 'horizontal';
    
    let minX = Math.min(...cells.map(c => c[0]));
    let minY = Math.min(...cells.map(c => c[1]));
    
    removeShip(board, x, y);
    
    let placed = false;
    if (newOrientation === 'horizontal') {
        placed = placeShip(board, minX, minY, size, 'horizontal');
    } else {
        placed = placeShip(board, minX, minY, size, 'vertical');
    }
    
    if (!placed) {
        for (const [cx, cy] of cells) {
            board[cx][cy] = CELL_SHIP;
        }
    }
    
    return placed;
}

// Проверить, все ли корабли расставлены
export function isPlacementComplete(board) {
    let shipCells = 0;
    for (let i = 0; i < BOARD_SIZE; i++) {
        for (let j = 0; j < BOARD_SIZE; j++) {
            if (board[i][j] === CELL_SHIP) shipCells++;
        }
    }
    return shipCells === getTotalShipCells();
}

// Создать пустое поле для расстановки
export function createEmptyPlacementBoard() {
    const board = [];
    for (let i = 0; i < BOARD_SIZE; i++) {
        board[i] = [];
        for (let j = 0; j < BOARD_SIZE; j++) {
            board[i][j] = CELL_EMPTY;
        }
    }
    return board;
}

// Получить список нерасставленных кораблей
export function getRemainingShips(board) {
    const placedSizes = [];
    const visited = new Set();
    
    for (let i = 0; i < BOARD_SIZE; i++) {
        for (let j = 0; j < BOARD_SIZE; j++) {
            if (board[i][j] === CELL_SHIP && !visited.has(`${i},${j}`)) {
                const ship = findShip(board, i, j);
                for (const [cx, cy] of ship) {
                    visited.add(`${cx},${cy}`);
                }
                placedSizes.push(ship.length);
            }
        }
    }
    
    placedSizes.sort((a, b) => b - a);
    
    const needed = [];
    for (const config of SHIPS_CONFIG) {
        for (let i = 0; i < config.count; i++) {
            needed.push(config.size);
        }
    }
    needed.sort((a, b) => b - a);
    
    const remaining = [];
    let j = 0;
    for (const need of needed) {
        if (placedSizes[j] === need) {
            j++;
        } else {
            remaining.push(need);
        }
    }
    
    return remaining;
}