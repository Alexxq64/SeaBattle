// pve/PvEAI.js
// AI для PvE режима: уровни сложности Easy, Medium, Hard

import { logger } from '../logger.js';
import { BOARD_SIZE } from '../core/attack.js';

// ==================== 1. ОБЩАЯ ФУНКЦИЯ ПОЛУЧЕНИЯ РАЗРЕШЕННЫХ КЛЕТОК ====================

/**
 * Возвращает все клетки, в которые можно стрелять
 * @param {Set} shotCells - клетки, куда уже стреляли (формат "x,y")
 * @param {Array} sunkShips - массив потопленных кораблей
 *        каждый элемент: { cells: [[x,y], ...], isHorizontal: boolean }
 * @param {number} boardSize - размер доски
 * @returns {Array} массив [x, y] разрешенных клеток
 */
function getAllAllowedCells(shotCells, sunkShips, boardSize) {
    const allowed = [];
    
    for (let i = 0; i < boardSize; i++) {
        for (let j = 0; j < boardSize; j++) {
            const cellKey = `${i},${j}`;
            
            // 1. Уже стреляли
            if (shotCells.has(cellKey)) continue;
            
            // 2. Проверка соседних клеток потопленных кораблей
            let isForbidden = false;
            for (const ship of sunkShips) {
                for (const [sx, sy] of ship.cells) {
                    const dx = Math.abs(i - sx);
                    const dy = Math.abs(j - sy);
                    
                    // Диагональ — всегда запрещена
                    if (dx === 1 && dy === 1) {
                        isForbidden = true;
                        break;
                    }
                    
                    // Горизонтальный сосед (слева/справа)
                    if (dx === 0 && dy === 1 && ship.isHorizontal) {
                        isForbidden = true;
                        break;
                    }
                    
                    // Вертикальный сосед (сверху/снизу)
                    if (dx === 1 && dy === 0 && !ship.isHorizontal) {
                        isForbidden = true;
                        break;
                    }
                }
                if (isForbidden) break;
            }
            
            if (!isForbidden) {
                allowed.push([i, j]);
            }
        }
    }
    
    return allowed;
}

// ==================== 2. EASY ====================
function createEasyAI() {
    logger.info('PvEAI', 'Создание Easy AI');
    
    let shotCells = new Set();
    let sunkShips = [];
    
    function makeMove() {
        const allowedCells = getAllAllowedCells(shotCells, sunkShips, BOARD_SIZE);
        if (allowedCells.length === 0) return null;
        const randomIndex = Math.floor(Math.random() * allowedCells.length);
        const [x, y] = allowedCells[randomIndex];
        logger.debug('PvEAI', 'Easy выстрел', { x, y });
        return { x, y };
    }
    
    function onResult(hit, sunk, x, y, sunkCellsArray) {
        shotCells.add(`${x},${y}`);
        
        if (sunk && sunkCellsArray) {
            // Определяем ориентацию потопленного корабля
            let isHorizontal = null;
            if (sunkCellsArray.length >= 2) {
                const [first, second] = sunkCellsArray;
                isHorizontal = first[0] === second[0];
            }
            sunkShips.push({
                cells: sunkCellsArray,
                isHorizontal: isHorizontal
            });
        }
        
        logger.debug('PvEAI', 'Easy результат', { hit, sunk, x, y });
    }
    
    function reset() {
        shotCells.clear();
        sunkShips = [];
    }
    
    return { makeMove, onResult, reset };
}

// ==================== 3. MEDIUM ====================
function createMediumAI() {
    logger.info('PvEAI', 'Создание Medium AI');
    
    let shotCells = new Set();
    let sunkShips = [];
    let lastHit = null;
    
    function getCrossNeighbors(x, y) {
        const neighbors = [];
        if (x > 0) neighbors.push([x - 1, y]);
        if (x < BOARD_SIZE - 1) neighbors.push([x + 1, y]);
        if (y > 0) neighbors.push([x, y - 1]);
        if (y < BOARD_SIZE - 1) neighbors.push([x, y + 1]);
        return neighbors;
    }
    
    function makeMove() {
        // Режим охоты: стреляем вокруг последнего попадания
        if (lastHit) {
            const [hx, hy] = lastHit;
            const neighbors = getCrossNeighbors(hx, hy);
            
            // Проверяем, какие из соседей разрешены
            const allowedCells = getAllAllowedCells(shotCells, sunkShips, BOARD_SIZE);
            const allowedSet = new Set(allowedCells.map(([x, y]) => `${x},${y}`));
            
            const validNeighbors = neighbors.filter(([nx, ny]) => 
                allowedSet.has(`${nx},${ny}`)
            );
            
            if (validNeighbors.length > 0) {
                const randomIndex = Math.floor(Math.random() * validNeighbors.length);
                const [x, y] = validNeighbors[randomIndex];
                logger.debug('PvEAI', 'Medium выстрел (крест от попадания)', { x, y });
                return { x, y };
            } else {
                lastHit = null;
            }
        }
        
        // Режим поиска: случайный выбор из разрешенных клеток
        const allowedCells = getAllAllowedCells(shotCells, sunkShips, BOARD_SIZE);
        if (allowedCells.length === 0) return null;
        const randomIndex = Math.floor(Math.random() * allowedCells.length);
        const [x, y] = allowedCells[randomIndex];
        logger.debug('PvEAI', 'Medium выстрел (случайный)', { x, y });
        return { x, y };
    }
    
    function onResult(hit, sunk, x, y, sunkCellsArray) {
        shotCells.add(`${x},${y}`);
        
        if (hit && !sunk) {
            lastHit = [x, y];
            logger.debug('PvEAI', 'Medium запомнил попадание', { x, y });
        }
        
        if (sunk && sunkCellsArray) {
            // Определяем ориентацию потопленного корабля
            let isHorizontal = null;
            if (sunkCellsArray.length >= 2) {
                const [first, second] = sunkCellsArray;
                isHorizontal = first[0] === second[0];
            }
            sunkShips.push({
                cells: sunkCellsArray,
                isHorizontal: isHorizontal
            });
            lastHit = null;
            logger.debug('PvEAI', 'Medium корабль уничтожен, сброс lastHit');
        }
    }
    
    function reset() {
        shotCells.clear();
        sunkShips = [];
        lastHit = null;
    }
    
    return { makeMove, onResult, reset };
}

// ==================== 4. HARD ====================
function createHardAI() {
    logger.info('PvEAI', 'Создание Hard AI (final)');

    let shotCells = new Set();
    let hitCells = new Set();
    let hits = [];
    let sunkShips = [];
    let remainingShips = [4, 3, 3, 2, 2, 2];

    const boardSize = BOARD_SIZE;

    function initState() {
        shotCells.clear();
        hitCells.clear();
        hits = [];
        sunkShips = [];
        remainingShips = [4, 3, 3, 2, 2, 2];
    }

    initState();

    const key = (x, y) => `${x},${y}`;

    function getNeighbors(x, y) {
        const res = [];
        if (x > 0) res.push([x - 1, y]);
        if (x < boardSize - 1) res.push([x + 1, y]);
        if (y > 0) res.push([x, y - 1]);
        if (y < boardSize - 1) res.push([x, y + 1]);
        return res;
    }

    function getAllowedCells() {
        return getAllAllowedCells(shotCells, sunkShips, boardSize);
    }

    function getLineTargets() {
        if (hits.length < 2) return [];

        const sorted = [...hits].sort((a, b) =>
            a[0] !== b[0] ? a[0] - b[0] : a[1] - b[1]
        );

        const [x1, y1] = sorted[0];
        const [x2, y2] = sorted[sorted.length - 1];

        const res = [];

        if (x1 === x2) {
            const x = x1;
            const minY = sorted[0][1];
            const maxY = sorted[sorted.length - 1][1];
            if (minY > 0) res.push([x, minY - 1]);
            if (maxY < boardSize - 1) res.push([x, maxY + 1]);
        } else {
            const y = y1;
            const minX = sorted[0][0];
            const maxX = sorted[sorted.length - 1][0];
            if (minX > 0) res.push([minX - 1, y]);
            if (maxX < boardSize - 1) res.push([maxX + 1, y]);
        }

        return res;
    }

    function buildProbabilityMap(allowedSet) {
        const map = Array.from({ length: boardSize }, () =>
            Array(boardSize).fill(0)
        );

        for (const len of remainingShips) {
            // horizontal
            for (let i = 0; i < boardSize; i++) {
                for (let j = 0; j <= boardSize - len; j++) {
                    let ok = true;

                    for (let k = 0; k < len; k++) {
                        const x = i;
                        const y = j + k;

                        if (!allowedSet.has(key(x, y))) {
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

                        if (!allowedSet.has(key(x, y))) {
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
            for (const [nx, ny] of getNeighbors(x, y)) {
                if (allowedSet.has(key(nx, ny))) {
                    map[nx][ny] += 10;
                }
            }
        }

        return map;
    }

    function getDeterministicTarget() {
        if (hits.length === 0) return null;

        // 2+ попадания — определяем линию и стреляем по краям
        if (hits.length >= 2) {
            const line = getLineTargets();
            const allowedCells = getAllowedCells();
            const allowedSet = new Set(allowedCells.map(([x, y]) => key(x, y)));
            
            const validLine = line.filter(([x, y]) => allowedSet.has(key(x, y)));
            if (validLine.length > 0) {
                // Выбираем конец с максимальным пространством
                let bestEnd = validLine[0];
                let bestSpace = -1;
                
                for (const [lx, ly] of validLine) {
                    let space = 0;
                    const sorted = [...hits].sort((a, b) => a[0] !== b[0] ? a[0] - b[0] : a[1] - b[1]);
                    const [x1, y1] = sorted[0];
                    const [x2, y2] = sorted[sorted.length - 1];
                    const isHorizontal = x1 === x2;
                    
                    if (isHorizontal) {
                        let steps = 1;
                        while (ly + steps < boardSize && allowedSet.has(key(lx, ly + steps))) steps++;
                        space += steps;
                        steps = 1;
                        while (ly - steps >= 0 && allowedSet.has(key(lx, ly - steps))) steps++;
                        space += steps;
                    } else {
                        let steps = 1;
                        while (lx + steps < boardSize && allowedSet.has(key(lx + steps, ly))) steps++;
                        space += steps;
                        steps = 1;
                        while (lx - steps >= 0 && allowedSet.has(key(lx - steps, ly))) steps++;
                        space += steps;
                    }
                    
                    if (space > bestSpace) {
                        bestSpace = space;
                        bestEnd = [lx, ly];
                    }
                }
                return bestEnd;
            }
        }

        // 1 попадание — стреляем по соседям (детерминированный порядок)
        if (hits.length === 1) {
            const [x, y] = hits[0];
            const allowedCells = getAllowedCells();
            const allowedSet = new Set(allowedCells.map(([x, y]) => key(x, y)));
            
            const neighbors = getNeighbors(x, y).filter(([nx, ny]) => allowedSet.has(key(nx, ny)));
            
            if (neighbors.length > 0) {
                // Детерминированный порядок: вверх, вниз, влево, вправо
                const order = [[-1, 0], [1, 0], [0, -1], [0, 1]];
                for (const [dx, dy] of order) {
                    const nx = x + dx;
                    const ny = y + dy;
                    if (nx >= 0 && nx < boardSize && ny >= 0 && ny < boardSize && allowedSet.has(key(nx, ny))) {
                        return [nx, ny];
                    }
                }
            }
        }

        return null;
    }

    function makeMove() {
        const allowedCells = getAllowedCells();
        if (allowedCells.length === 0) return null;

        // 1. TARGET MODE — deterministic, без случайностей
        if (hits.length > 0) {
            const target = getDeterministicTarget();
            if (target) {
                const [x, y] = target;
                shotCells.add(key(x, y));
                return { x, y };
            }
            // НЕ сбрасываем hits при тупике
        }

        // 2. SEARCH MODE — Probability map (без parity)
        const allowedSet = new Set(allowedCells.map(([x, y]) => key(x, y)));
        const probabilityMap = buildProbabilityMap(allowedSet);
        
        let best = null;
        let bestScore = -1;
        
        for (const [x, y] of allowedCells) {
            if (probabilityMap[x][y] > bestScore) {
                bestScore = probabilityMap[x][y];
                best = [x, y];
            }
        }
        
        if (!best) return null;
        const [x, y] = best;
        shotCells.add(key(x, y));
        return { x, y };
    }

    function onResult(hit, sunk, x, y, sunkCellsArray) {
        shotCells.add(key(x, y));

        if (hit) {
            hitCells.add(key(x, y));
            if (!hits.some(([hx, hy]) => hx === x && hy === y)) {
                hits.push([x, y]);
            }
        }

        if (sunk && sunkCellsArray) {
            const len = sunkCellsArray.length;
            const idx = remainingShips.indexOf(len);
            if (idx !== -1) remainingShips.splice(idx, 1);

            sunkShips.push({
                cells: sunkCellsArray,
                isHorizontal: sunkCellsArray.length >= 2
                    ? sunkCellsArray[0][0] === sunkCellsArray[1][0]
                    : null
            });

            for (const [sx, sy] of sunkCellsArray) {
                hitCells.delete(key(sx, sy));
            }

            // Удаляем только потопленные попадания, НЕ сбрасываем все hits
            const sunkSet = new Set(sunkCellsArray.map(([sx, sy]) => key(sx, sy)));
            hits = hits.filter(([hx, hy]) => !sunkSet.has(key(hx, hy)));
        }
    }

    function reset() {
        initState();
    }

    return { makeMove, onResult, reset };
}

// ==================== 5. ФАБРИКА ====================
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