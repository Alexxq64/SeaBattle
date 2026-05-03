// core/attack.js
// Чистая логика атаки и проверки победы

export const BOARD_SIZE = 10;
export const CELL_EMPTY = 0;
export const CELL_SHIP = 1;
export const CELL_HIT = 2;
export const CELL_MISS = 3;

// Общее количество клеток кораблей (4+3+3+2+2+2+1+1+1+1 = 20)
export const TOTAL_SHIP_CELLS = 20;

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
        return { success: true, result: 'hit' };
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