// pve/PvEAI.js
// AI для PvE режима: уровни сложности Easy, Medium, Hard

import { logger } from '../logger.js';
import { BOARD_SIZE } from '../core/attack.js';

// ==================== ОБЩАЯ ФУНКЦИЯ ====================
function excludeAroundShip(target, shipCells, boardSize, isSet = false) {
    const key = (x, y) => `${x},${y}`;
    for (const [x, y] of shipCells) {
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                const nx = x + dx;
                const ny = y + dy;
                if (nx >= 0 && nx < boardSize && ny >= 0 && ny < boardSize) {
                    if (isSet) {
                        const k = key(nx, ny);
                        if (!target.has(k)) target.add(k);
                    } else {
                        const idx = target.findIndex(([ax, ay]) => ax === nx && ay === ny);
                        if (idx !== -1) target.splice(idx, 1);
                    }
                }
            }
        }
    }
}

// ==================== EASY ====================
function createEasyAI() {
    logger.info('PvEAI', 'Создание Easy AI');
    
    let availableCells = [];
    
    function initAvailableCells() {
        availableCells = [];
        for (let i = 0; i < BOARD_SIZE; i++) {
            for (let j = 0; j < BOARD_SIZE; j++) {
                availableCells.push([i, j]);
            }
        }
    }
    
    initAvailableCells();
    
    function makeMove() {
        if (availableCells.length === 0) return null;
        const randomIndex = Math.floor(Math.random() * availableCells.length);
        const [x, y] = availableCells[randomIndex];
        availableCells.splice(randomIndex, 1);
        logger.debug('PvEAI', 'Easy выстрел', { x, y });
        return { x, y };
    }
    
    function onResult(hit, sunk, x, y) {
        logger.debug('PvEAI', 'Easy результат', { hit, sunk, x, y });
    }
    
    function reset() {
        initAvailableCells();
    }
    
    return { makeMove, onResult, reset };
}

// ==================== MEDIUM ====================
function createMediumAI() {
    logger.info('PvEAI', 'Создание Medium AI');
    
    let availableCells = [];
    let lastHit = null;
    
    function initAvailableCells() {
        availableCells = [];
        for (let i = 0; i < BOARD_SIZE; i++) {
            for (let j = 0; j < BOARD_SIZE; j++) {
                availableCells.push([i, j]);
            }
        }
        lastHit = null;
    }
    
    initAvailableCells();
    
    function getCrossNeighbors(x, y) {
        const neighbors = [];
        if (x > 0) neighbors.push([x - 1, y]);
        if (x < BOARD_SIZE - 1) neighbors.push([x + 1, y]);
        if (y > 0) neighbors.push([x, y - 1]);
        if (y < BOARD_SIZE - 1) neighbors.push([x, y + 1]);
        return neighbors;
    }
    
    function makeMove() {
        if (lastHit) {
            const [hx, hy] = lastHit;
            const neighbors = getCrossNeighbors(hx, hy);
            const validNeighbors = neighbors.filter(([nx, ny]) => {
                return availableCells.some(([ax, ay]) => ax === nx && ay === ny);
            });
            
            if (validNeighbors.length > 0) {
                const randomIndex = Math.floor(Math.random() * validNeighbors.length);
                const [x, y] = validNeighbors[randomIndex];
                const idx = availableCells.findIndex(([ax, ay]) => ax === x && ay === y);
                if (idx !== -1) availableCells.splice(idx, 1);
                logger.debug('PvEAI', 'Medium выстрел (крест от попадания)', { x, y });
                return { x, y };
            }
            lastHit = null;
        }
        
        if (availableCells.length === 0) return null;
        const randomIndex = Math.floor(Math.random() * availableCells.length);
        const [x, y] = availableCells[randomIndex];
        availableCells.splice(randomIndex, 1);
        logger.debug('PvEAI', 'Medium выстрел (случайный)', { x, y });
        return { x, y };
    }
    
    function onResult(hit, sunk, x, y, sunkCellsArray) {
        if (hit && !sunk) {
            lastHit = [x, y];
            logger.debug('PvEAI', 'Medium запомнил попадание', { x, y });
        }
        if (sunk) {
            if (sunkCellsArray) {
                excludeAroundShip(availableCells, sunkCellsArray, BOARD_SIZE, false);
            }
            lastHit = null;
            logger.debug('PvEAI', 'Medium корабль уничтожен, сброс lastHit');
        }
    }
    
    function reset() {
        initAvailableCells();
    }
    
    return { makeMove, onResult, reset };
}

// ==================== HARD ====================
function createHardAI() {
    logger.info('PvEAI', 'Создание Hard AI (final)');

    let shotCells = new Set();
    let hitCells = new Set();
    let hits = [];
    let sunkCells = new Set();

    const boardSize = BOARD_SIZE;
    const shipLengths = [4, 3, 3, 2, 2, 2];

    function initState() {
        shotCells.clear();
        hitCells.clear();
        hits = [];
        sunkCells.clear();
    }

    initState();

    const key = (x, y) => `${x},${y}`;

    const isUnknown = (x, y) =>
        !shotCells.has(key(x, y));

    const markShot = (x, y) => shotCells.add(key(x, y));
    const markHit = (x, y) => {
        hitCells.add(key(x, y));
        markShot(x, y);
    };
    const markMiss = (x, y) => markShot(x, y);

    function addHit(x, y) {
        if (!hits.some(([hx, hy]) => hx === x && hy === y)) {
            hits.push([x, y]);
        }
    }

    function getNeighbors(x, y) {
        const res = [];
        if (x > 0) res.push([x - 1, y]);
        if (x < boardSize - 1) res.push([x + 1, y]);
        if (y > 0) res.push([x, y - 1]);
        if (y < boardSize - 1) res.push([x, y + 1]);
        return res;
    }

    function getLineTargets() {
        if (hits.length < 2) return [];

        const [x1, y1] = hits[0];
        const [x2, y2] = hits[1];

        const horizontal = x1 === x2;
        const result = [];

        if (horizontal) {
            const x = x1;
            const sorted = [...hits].sort((a, b) => a[1] - b[1]);
            const minY = sorted[0][1];
            const maxY = sorted[sorted.length - 1][1];

            if (minY > 0) result.push([x, minY - 1]);
            if (maxY < boardSize - 1) result.push([x, maxY + 1]);
        } else {
            const y = y1;
            const sorted = [...hits].sort((a, b) => a[0] - b[0]);
            const minX = sorted[0][0];
            const maxX = sorted[sorted.length - 1][0];

            if (minX > 0) result.push([minX - 1, y]);
            if (maxX < boardSize - 1) result.push([maxX + 1, y]);
        }

        return result;
    }

    function buildMap() {
        const map = Array.from({ length: boardSize }, () =>
            Array(boardSize).fill(0)
        );

        for (const len of shipLengths) {
            // horizontal
            for (let i = 0; i < boardSize; i++) {
                for (let j = 0; j <= boardSize - len; j++) {
                    let ok = true;

                    for (let k = 0; k < len; k++) {
                        const x = i;
                        const y = j + k;

                        if (sunkCells.has(key(x, y))) {
                            ok = false;
                            break;
                        }
                        if (shotCells.has(key(x, y)) && !hitCells.has(key(x, y))) {
                            ok = false;
                            break;
                        }
                    }

                    if (ok) {
                        for (let k = 0; k < len; k++) {
                            map[i][j + k]++;
                        }
                    }
                }
            }

            // vertical
            for (let i = 0; i <= boardSize - len; i++) {
                for (let j = 0; j < boardSize; j++) {
                    let ok = true;

                    for (let k = 0; k < len; k++) {
                        const x = i + k;
                        const y = j;

                        if (sunkCells.has(key(x, y))) {
                            ok = false;
                            break;
                        }
                        if (shotCells.has(key(x, y)) && !hitCells.has(key(x, y))) {
                            ok = false;
                            break;
                        }
                    }

                    if (ok) {
                        for (let k = 0; k < len; k++) {
                            map[i + k][j]++;
                        }
                    }
                }
            }
        }

        // bonus around hits
        for (const [x, y] of hits) {
            map[x][y] += 20;
            for (const [nx, ny] of getNeighbors(x, y)) {
                if (isUnknown(nx, ny)) {
                    map[nx][ny] += 10;
                }
            }
        }

        return map;
    }

    function makeMove() {

        // TARGET MODE
        if (hits.length > 0) {

            if (hits.length >= 2) {
                const line = getLineTargets()
                    .filter(([x, y]) => isUnknown(x, y));

                if (line.length > 0) {
                    const [x, y] = line[0];
                    markShot(x, y);
                    return { x, y };
                }
            }

            const [x, y] = hits[hits.length - 1];
            const neigh = getNeighbors(x, y)
                .filter(([nx, ny]) => isUnknown(nx, ny));

            if (neigh.length > 0) {
                const [x2, y2] = neigh[0];
                markShot(x2, y2);
                return { x: x2, y: y2 };
            }

            hits = [];
        }

        // SEARCH MODE
        const map = buildMap();

        let best = null;
        let bestScore = -1;

        for (let i = 0; i < boardSize; i++) {
            for (let j = 0; j < boardSize; j++) {
                if (!isUnknown(i, j)) continue;

                if (map[i][j] > bestScore) {
                    bestScore = map[i][j];
                    best = [i, j];
                }
            }
        }

        const [x, y] = best;
        markShot(x, y);
        return { x, y };
    }

    function onResult(hit, sunk, x, y, sunkCellsArray) {
        if (hit) {
            markHit(x, y);
            addHit(x, y);
        } else {
            markMiss(x, y);
        }

        if (sunk) {
            if (sunkCellsArray) {
                for (const [sx, sy] of sunkCellsArray) {
                    sunkCells.add(key(sx, sy));
                }
                excludeAroundShip(shotCells, sunkCellsArray, boardSize, true);
            }
            hits = [];
            hitCells.clear();
        }
    }

    function reset() {
        initState();
    }

    return { makeMove, onResult, reset };
}

// ==================== ФАБРИКА ====================
export function createAI(difficulty) {
    logger.info('PvEAI', 'Создание AI', { difficulty });
    
    switch (difficulty) {
        case 'easy':
            return createEasyAI();
        case 'medium':
            return createMediumAI();
        case 'hard':
            return createHardAI();
        default:
            logger.warn('PvEAI', 'Неизвестная сложность, использую easy', { difficulty });
            return createEasyAI();
    }
}