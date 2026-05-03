// pve/PvECore.js
// PvE режим: игрок против AI, полностью локально, без сокета

import { logger } from '../logger.js';
import * as ui from '../ui.js';
import { renderBoard } from '../core/render.js';
import { makeAttack, checkWin, BOARD_SIZE, CELL_SHIP, CELL_HIT, CELL_MISS } from '../core/attack.js';
import { initPlacementUI, showPlacementScreen, hidePlacementScreen } from '../placement/placementUI.js';
import { randomPlacement, smartPlacement, densePlacement, edgePlacement } from '../placement/placementAI.js';
import { createEmptyBoard } from '../core/board.js';

// Состояние PvE игры
let playerBoard = [];
let enemyBoard = [];
let currentTurn = 'player'; // 'player' или 'ai'
let gameActive = false;
let aiDifficulty = 'random';

// DOM элементы
let playerBoardEl = null;
let enemyBoardEl = null;

// Обработчик кликов
let clickHandler = null;

// Инициализация PvE игры
export function startPvEGame(dom) {
    logger.info('PvECore', 'Запуск PvE режима', dom);
    
    playerBoardEl = dom.playerBoardEl;
    enemyBoardEl = dom.enemyBoardEl;
    
    // Получаем сложность из UI
    const difficultySelect = document.getElementById('difficulty');
    aiDifficulty = difficultySelect ? difficultySelect.value : 'random';
    logger.info('PvECore', 'Сложность AI', { aiDifficulty });
    
    // Инициализируем UI расстановки (один раз)
    initPlacementUI();
    
    // Показываем экран расстановки
    showPlacementScreen(onPlacementComplete);
}

// Колбэк после завершения расстановки кораблей
function onPlacementComplete(placementBoard) {
    logger.info('PvECore', 'Расстановка завершена');
    
    // Сохраняем поле игрока
    playerBoard = placementBoard.map(row => [...row]);
    
    // Генерируем поле AI в зависимости от сложности
    switch (aiDifficulty) {
        case 'smart':
            enemyBoard = smartPlacement();
            break;
        case 'dense':
            enemyBoard = densePlacement();
            break;
        case 'edge':
            enemyBoard = edgePlacement();
            break;
        default:
            enemyBoard = randomPlacement();
    }
    
    logger.debug('PvECore', 'AI поле сгенерировано');
    
    // Скрываем экран расстановки, показываем игровой
    hidePlacementScreen();
    
    // Запускаем игру
    gameActive = true;
    currentTurn = 'player';
    
    // Отрисовываем поля
    renderBoard(playerBoardEl, playerBoard, false);
    renderBoard(enemyBoardEl, enemyBoard, true);
    
    ui.updateStatus('Ваш ход!');
    logger.info('PvECore', 'Игра началась, ход игрока');
    
    // Навешиваем обработчик кликов на поле противника
    attachClickHandler();
}

// Обработчик кликов по полю противника
function attachClickHandler() {
    if (!enemyBoardEl) return;
    
    // Удаляем старый обработчик, если есть
    if (clickHandler) {
        enemyBoardEl.removeEventListener('click', clickHandler);
    }
    
    clickHandler = (e) => {
        const cell = e.target.closest('.cell');
        if (!cell) return;
        
        const x = parseInt(cell.dataset.x);
        const y = parseInt(cell.dataset.y);
        
        playerAttack(x, y);
    };
    
    enemyBoardEl.addEventListener('click', clickHandler);
}

// Атака игрока
function playerAttack(x, y) {
    if (!gameActive) {
        logger.debug('PvECore', 'Игра не активна');
        return;
    }
    
    if (currentTurn !== 'player') {
        ui.updateStatus('Сейчас ход AI');
        return;
    }
    
    const cellValue = enemyBoard[x][y];
    if (cellValue === CELL_HIT || cellValue === CELL_MISS) {
        ui.updateStatus('Сюда уже стреляли!');
        return;
    }
    
    logger.info('PvECore', 'Атака игрока', { x, y });
    
    const { result } = makeAttack(enemyBoard, x, y);
    renderBoard(enemyBoardEl, enemyBoard, true);
    
    if (result === 'hit') {
        ui.updateStatus('Попадание! Ещё ход');
        
        if (checkWin(enemyBoard)) {
            gameActive = false;
            ui.updateStatus('🎉 ПОБЕДА! Вы уничтожили все корабли AI! 🎉');
            logger.info('PvECore', 'Победа игрока');
            detachClickHandler();
            return;
        }
        // Дополнительный ход — ничего не меняем
        return;
    }
    
    if (result === 'miss') {
        ui.updateStatus('Промах! Ход AI');
        currentTurn = 'ai';
        setTimeout(() => aiAttack(), 500);
    }
}

// Атака AI
function aiAttack() {
    if (!gameActive) {
        return;
    }
    
    if (currentTurn !== 'ai') {
        return;
    }
    
    logger.debug('PvECore', 'AI атака');
    
    // Находим все непрострелянные клетки
    const available = [];
    for (let i = 0; i < BOARD_SIZE; i++) {
        for (let j = 0; j < BOARD_SIZE; j++) {
            const val = playerBoard[i][j];
            if (val !== CELL_HIT && val !== CELL_MISS) {
                available.push([i, j]);
            }
        }
    }
    
    if (available.length === 0) return;
    
    // Случайный выбор (позже можно заменить на умный AI)
    const randomIndex = Math.floor(Math.random() * available.length);
    const [x, y] = available[randomIndex];
    
    logger.info('PvECore', 'AI атакует', { x, y });
    
    const { result } = makeAttack(playerBoard, x, y);
    renderBoard(playerBoardEl, playerBoard, false);
    
    if (result === 'hit') {
        ui.updateStatus('AI попал! Ещё ход AI');
        
        if (checkWin(playerBoard)) {
            gameActive = false;
            ui.updateStatus('💀 ПОРАЖЕНИЕ! AI уничтожил ваши корабли 💀');
            logger.info('PvECore', 'Победа AI');
            detachClickHandler();
            return;
        }
        // Дополнительный ход AI
        setTimeout(() => aiAttack(), 500);
        return;
    }
    
    if (result === 'miss') {
        ui.updateStatus('AI промахнулся! Ваш ход');
        currentTurn = 'player';
        renderBoard(enemyBoardEl, enemyBoard, true);
    }
}

// Открепление обработчика кликов
function detachClickHandler() {
    if (clickHandler && enemyBoardEl) {
        enemyBoardEl.removeEventListener('click', clickHandler);
        clickHandler = null;
    }
}