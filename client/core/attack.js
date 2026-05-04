// core/attack.js
// Чистая логика атаки и проверки победы

export const BOARD_SIZE = 10;
export const CELL_EMPTY = 0;
export const CELL_SHIP = 1;
export const CELL_HIT = 2;
export const CELL_MISS = 3;

// Общее количество клеток кораблей (4+3+3+2+2+2+1+1+1+1 = 20)
export const TOTAL_SHIP_CELLS = 20;

// Проверка, убит ли корабль после попадания
function isShipSunk(board, x, y) {
    // Найти все клетки корабля
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
                if (board[nx][ny] === CELL_SHIP || board[nx][ny] === CELL_HIT) {
                    if (!visited.has(`${nx},${ny}`)) queue.push([nx, ny]);
                }
            }
        }
    }
    
    // Если все клетки корабля имеют CELL_HIT — корабль уничтожен
    return cells.every(([cx, cy]) => board[cx][cy] === CELL_HIT);
}

export function makeAttack(board, x, y) {
    if (!board || !board[x] || board[x][y] === undefined) {
        return { success: false, result: 'invalid' };
    }

    const target = board[x][y];

    if (target === CELL_HIT || target === CELL_MISS) {
        return { success: false, result: 'invalid' };
    }

    if (target === CELL_SHIP) {
        board[x][y] = CELL_HIT;
        const sunk = isShipSunk(board, x, y);
        return { success: true, result: 'hit', sunk };
    }

    board[x][y] = CELL_MISS;
    return { success: true, result: 'miss' };
}

export function checkWin(board) {
    for (let i = 0; i < BOARD_SIZE; i++) {
        for (let j = 0; j < BOARD_SIZE; j++) {
            if (board[i][j] === CELL_SHIP) return false;
        }
    }
    return true;
}