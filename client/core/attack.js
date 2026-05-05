// core/attack.js
// Чистая логика атаки и проверки победы

export const BOARD_SIZE = 10;
export const CELL_EMPTY = 0;
export const CELL_SHIP = 1;
export const CELL_HIT = 2;
export const CELL_MISS = 3;
export const CELL_WOUND = 4;

// Общее количество клеток кораблей (4+3+3+2+2+2+1+1+1+1 = 20)
export const TOTAL_SHIP_CELLS = 20;

// Получить все клетки корабля
export function getShipCells(board, x, y) {
    const cells = [];
    const queue = [[x, y]];
    const visited = Array(10).fill().map(() => Array(10).fill(false));
    const dirs = [[0, 1], [1, 0], [0, -1], [-1, 0]];
    
    while (queue.length > 0) {
        const [cx, cy] = queue.shift();
        if (visited[cx][cy]) continue;
        visited[cx][cy] = true;
        
        if (board[cx][cy] === CELL_SHIP || board[cx][cy] === CELL_WOUND) {
            cells.push([cx, cy]);
            
            for (const [dx, dy] of dirs) {
                const nx = cx + dx;
                const ny = cy + dy;
                if (nx >= 0 && nx < BOARD_SIZE && ny >= 0 && ny < BOARD_SIZE) {
                    if (board[nx][ny] === CELL_SHIP || board[nx][ny] === CELL_WOUND) {
                        if (!visited[nx][ny]) queue.push([nx, ny]);
                    }
                }
            }
        }
    }
    return cells;
}

// Проверка, убит ли корабль после попадания
function isShipSunk(board, x, y) {
    const shipCells = getShipCells(board, x, y);
    return shipCells.every(([cx, cy]) => board[cx][cy] === CELL_HIT || board[cx][cy] === CELL_WOUND);
}

// Перекрасить весь корабль в красный (после уничтожения)
export function markShipAsSunk(board, x, y) {
    const shipCells = getShipCells(board, x, y);
    for (const [cx, cy] of shipCells) {
        board[cx][cy] = CELL_HIT;
    }
}

export function makeAttack(board, x, y) {
    if (!board || !board[x] || board[x][y] === undefined) {
        return { success: false, result: 'invalid' };
    }

    const target = board[x][y];

    if (target === CELL_HIT || target === CELL_MISS || target === CELL_WOUND) {
        return { success: false, result: 'invalid' };
    }

    if (target === CELL_SHIP) {
        board[x][y] = CELL_WOUND;
        const sunk = isShipSunk(board, x, y);
        
        if (sunk) {
            markShipAsSunk(board, x, y);
        }
        
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