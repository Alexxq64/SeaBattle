// core/render.js
import { BOARD_SIZE, CELL_SHIP, CELL_HIT, CELL_MISS, CELL_WOUND } from './attack.js';

export function renderBoard(boardElement, board, hideShips = false) {
    if (!boardElement || !board) return;
    
    boardElement.innerHTML = '';
    
    for (let i = 0; i < BOARD_SIZE; i++) {
        for (let j = 0; j < BOARD_SIZE; j++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            
            const value = board[i]?.[j];
            
            if (value === CELL_SHIP && !hideShips) {
                cell.classList.add('ship');
            } else if (value === CELL_HIT) {
                cell.classList.add('hit');
            } else if (value === CELL_WOUND) {
                cell.classList.add('wound');
            } else if (value === CELL_MISS) {
                cell.classList.add('miss');
            }
            
            cell.dataset.x = i;
            cell.dataset.y = j;
            
            boardElement.appendChild(cell);
        }
    }
}