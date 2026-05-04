// server/ai-benchmark/AIGameSimulator.js
// Симуляция одного матча AI vs AI (без DOM)

const BOARD_SIZE = 10;
const CELL_EMPTY = 0;
const CELL_SHIP = 1;
const CELL_HIT = 2;
const CELL_MISS = 3;

function createEmptyBoard() {
    const board = [];
    for (let i = 0; i < BOARD_SIZE; i++) {
        board[i] = [];
        for (let j = 0; j < BOARD_SIZE; j++) {
            board[i][j] = CELL_EMPTY;
        }
    }
    return board;
}

function makeAttack(board, x, y) {
    const target = board[x][y];
    if (target === CELL_HIT || target === CELL_MISS) {
        return { result: 'invalid' };
    }
    if (target === CELL_SHIP) {
        board[x][y] = CELL_HIT;
        // Упрощённая проверка sunk (без BFS, только для тестов)
        let sunk = false;
        // Проверяем соседей — если есть ещё CELL_SHIP, корабль не убит
        let hasShipNeighbor = false;
        const dirs = [[0, 1], [1, 0], [0, -1], [-1, 0]];
        for (const [dx, dy] of dirs) {
            const nx = x + dx, ny = y + dy;
            if (nx >= 0 && nx < BOARD_SIZE && ny >= 0 && ny < BOARD_SIZE) {
                if (board[nx][ny] === CELL_SHIP) hasShipNeighbor = true;
            }
        }
        sunk = !hasShipNeighbor;
        return { result: 'hit', sunk };
    }
    board[x][y] = CELL_MISS;
    return { result: 'miss' };
}

function checkWin(board) {
    for (let i = 0; i < BOARD_SIZE; i++) {
        for (let j = 0; j < BOARD_SIZE; j++) {
            if (board[i][j] === CELL_SHIP) return false;
        }
    }
    return true;
}

function randomPlacement() {
    // Упрощённая случайная расстановка для тестов
    const board = createEmptyBoard();
    const ships = [4, 3, 3, 2, 2, 2, 1, 1, 1, 1];
    for (const size of ships) {
        let placed = false;
        let attempts = 0;
        while (!placed && attempts < 1000) {
            const orientation = Math.random() < 0.5 ? 'horizontal' : 'vertical';
            let x, y;
            if (orientation === 'horizontal') {
                x = Math.floor(Math.random() * BOARD_SIZE);
                y = Math.floor(Math.random() * (BOARD_SIZE - size + 1));
            } else {
                x = Math.floor(Math.random() * (BOARD_SIZE - size + 1));
                y = Math.floor(Math.random() * BOARD_SIZE);
            }
            // Упрощённая проверка (без isCellIsolated для тестов)
            let ok = true;
            for (let i = 0; i < size; i++) {
                const cx = orientation === 'horizontal' ? x : x + i;
                const cy = orientation === 'horizontal' ? y + i : y;
                if (board[cx]?.[cy] !== CELL_EMPTY) ok = false;
            }
            if (ok) {
                for (let i = 0; i < size; i++) {
                    const cx = orientation === 'horizontal' ? x : x + i;
                    const cy = orientation === 'horizontal' ? y + i : y;
                    board[cx][cy] = CELL_SHIP;
                }
                placed = true;
            }
            attempts++;
        }
    }
    return board;
}

export function simulateGame(aiA, aiB) {
    const boardA = randomPlacement();
    const boardB = randomPlacement();
    
    aiA.reset();
    aiB.reset();
    
    let turn = 'A';
    let moves = 0;
    
    while (true) {
        moves++;
        if (moves > 1000) return { winner: 'draw', moves }; // защита от зацикливания
        
        if (turn === 'A') {
            const { x, y } = aiA.makeMove();
            const { result, sunk } = makeAttack(boardB, x, y);
            aiA.onResult(result === 'hit', sunk, x, y);
            
            if (checkWin(boardB)) {
                return { winner: 'A', moves };
            }
            turn = 'B';
        } else {
            const { x, y } = aiB.makeMove();
            const { result, sunk } = makeAttack(boardA, x, y);
            aiB.onResult(result === 'hit', sunk, x, y);
            
            if (checkWin(boardA)) {
                return { winner: 'B', moves };
            }
            turn = 'A';
        }
    }
}