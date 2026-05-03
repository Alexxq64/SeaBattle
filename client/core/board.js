// client/core/board.js
// Создание пустого поля

import { BOARD_SIZE, CELL_EMPTY } from './attack.js';

export function createEmptyBoard() {
    const board = [];
    for (let i = 0; i < BOARD_SIZE; i++) {
        board[i] = [];
        for (let j = 0; j < BOARD_SIZE; j++) {
            board[i][j] = CELL_EMPTY;
        }
    }
    return board;
}

// Фиксированная расстановка (для тестов)
export function placeShips(board) {
    const ships = [
        [[0,0],[1,0],[2,0],[3,0]],
        [[5,0],[6,0],[7,0]],
        [[0,2],[0,3],[0,4]],
        [[9,1],[9,2]],
        [[2,5],[2,6]],
        [[7,5],[7,6]],
        [[9,9]], [[8,4]], [[4,8]], [[5,5]]
    ];
    
    for (let i = 0; i < BOARD_SIZE; i++) {
        for (let j = 0; j < BOARD_SIZE; j++) {
            board[i][j] = CELL_EMPTY;
        }
    }
    
    for (const ship of ships) {
        for (const [x, y] of ship) {
            if (board[x] && board[x][y] !== undefined) {
                board[x][y] = CELL_SHIP;
            }
        }
    }
}