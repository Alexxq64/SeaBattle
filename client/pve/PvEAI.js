// pve/PvEAI.js
// AI для PvE режима: уровни сложности Easy, Medium, Hard

import { logger } from '../logger.js';
import { BOARD_SIZE } from '../core/attack.js';

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
    
    function onResult(hit, sunk, x, y) {
        if (hit && !sunk) {
            lastHit = [x, y];
            logger.debug('PvEAI', 'Medium запомнил попадание', { x, y });
        }
        if (sunk) {
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
    logger.info('PvEAI', 'Создание Hard AI');
    
    let availableCells = [];
    let hits = [];
    let direction = null;
    
    function initAvailableCells() {
        availableCells = [];
        for (let i = 0; i < BOARD_SIZE; i++) {
            for (let j = 0; j < BOARD_SIZE; j++) {
                availableCells.push([i, j]);
            }
        }
        hits = [];
        direction = null;
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
    
    function getLineInDirection() {
        if (hits.length === 0) return [];
        
        const result = [];
        if (direction === 'horizontal') {
            const sorted = [...hits].sort((a, b) => a[1] - b[1]);
            const minY = sorted[0][1];
            const maxY = sorted[sorted.length - 1][1];
            const y = hits[0][0];
            
            if (minY > 0) result.push([y, minY - 1]);
            if (maxY < BOARD_SIZE - 1) result.push([y, maxY + 1]);
        } else if (direction === 'vertical') {
            const sorted = [...hits].sort((a, b) => a[0] - b[0]);
            const minX = sorted[0][0];
            const maxX = sorted[sorted.length - 1][0];
            const x = hits[0][1];
            
            if (minX > 0) result.push([minX - 1, x]);
            if (maxX < BOARD_SIZE - 1) result.push([maxX + 1, x]);
        }
        
        return result;
    }
    
    function getDirectionFromHits() {
        if (hits.length < 2) return null;
        const [x1, y1] = hits[0];
        const [x2, y2] = hits[1];
        if (x1 === x2) return 'horizontal';
        if (y1 === y2) return 'vertical';
        return null;
    }
    
    function makeMove() {
        if (hits.length > 0) {
            if (!direction && hits.length >= 2) {
                direction = getDirectionFromHits();
            }
            
            if (direction) {
                const candidates = getLineInDirection();
                const validCandidates = candidates.filter(([cx, cy]) => {
                    return availableCells.some(([ax, ay]) => ax === cx && ay === cy);
                });
                
                if (validCandidates.length > 0) {
                    const [x, y] = validCandidates[0];
                    const idx = availableCells.findIndex(([ax, ay]) => ax === x && ay === y);
                    if (idx !== -1) availableCells.splice(idx, 1);
                    logger.debug('PvEAI', 'Hard выстрел (добивание по линии)', { x, y, direction });
                    return { x, y };
                }
            }
            
            if (!direction && hits.length === 1) {
                const [hx, hy] = hits[0];
                const neighbors = getCrossNeighbors(hx, hy);
                const validNeighbors = neighbors.filter(([nx, ny]) => {
                    return availableCells.some(([ax, ay]) => ax === nx && ay === ny);
                });
                
                if (validNeighbors.length > 0) {
                    const randomIndex = Math.floor(Math.random() * validNeighbors.length);
                    const [x, y] = validNeighbors[randomIndex];
                    const idx = availableCells.findIndex(([ax, ay]) => ax === x && ay === y);
                    if (idx !== -1) availableCells.splice(idx, 1);
                    logger.debug('PvEAI', 'Hard выстрел (крест от попадания)', { x, y });
                    return { x, y };
                }
            }
            
            hits = [];
            direction = null;
        }
        
        if (availableCells.length === 0) return null;
        const randomIndex = Math.floor(Math.random() * availableCells.length);
        const [x, y] = availableCells[randomIndex];
        availableCells.splice(randomIndex, 1);
        logger.debug('PvEAI', 'Hard выстрел (случайный поиск)', { x, y });
        return { x, y };
    }
    
    function onResult(hit, sunk, x, y) {
        if (hit && !sunk) {
            hits.push([x, y]);
            logger.debug('PvEAI', 'Hard добавлено попадание', { x, y, hitsCount: hits.length });
        }
        if (sunk) {
            hits = [];
            direction = null;
            logger.debug('PvEAI', 'Hard корабль уничтожен, сброс состояния');
        }
    }
    
    function reset() {
        initAvailableCells();
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