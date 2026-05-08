// pve/PvECore.js
// PvE режим: игрок против AI, полностью локально, без сокета

import { logger } from '../logger.js';
import * as ui from '../ui.js';
import { renderBoard } from '../core/render.js';
import { makeAttack, checkWin, BOARD_SIZE, CELL_SHIP, CELL_HIT, CELL_MISS, getShipCells } from '../core/attack.js';
import { initPlacementUI, showPlacementScreen, hidePlacementScreen } from '../placement/placementUI.js';
import { randomPlacement, smartPlacement, densePlacement, edgePlacement, mixedPlacement } from '../placement/placementAI.js';
import { createEmptyBoard } from '../core/board.js';
import { createAI } from './PvEAI.js';
import { sound } from '../sound.js';
import { animateCell, animateSinkingRandom } from '../animation.js';

// Состояние PvE игры
let playerBoard = [];
let enemyBoard = [];
let currentTurn = 'player';
let gameActive = false;
let ai = null;

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
    
    // === ПОЛУЧАЕМ СЛОЖНОСТЬ И СОЗДАЁМ AI ===
    const difficultySelect = document.getElementById('difficulty');
    const aiDifficulty = difficultySelect ? difficultySelect.value : 'easy';
    logger.info('PvECore', 'Сложность AI', { aiDifficulty });
    
    // Создаём AI объект
    ai = createAI(aiDifficulty);
    
    // Генерируем поле AI в зависимости от уровня сложности
    switch (aiDifficulty) {
        case 'easy':
            enemyBoard = randomPlacement();
            break;
        case 'medium':
            enemyBoard = smartPlacement();
            break;
        case 'hard':
            enemyBoard = mixedPlacement();
            break;
        default:
            enemyBoard = randomPlacement();
    }
    
    logger.debug('PvECore', 'AI поле сгенерировано');
    
    // Сбрасываем состояние AI перед игрой
    if (ai && ai.reset) {
        ai.reset();
    }
    
    // Скрываем экран расстановки, показываем игровой
    hidePlacementScreen();
    
    // Запускаем игру
    gameActive = true;
    
    // Случайный выбор первого хода
    const firstTurn = Math.random() < 0.5 ? 'player' : 'ai';
    currentTurn = firstTurn;
    logger.info('PvECore', 'Первый ход:', { firstTurn });
    
    // Отрисовываем поля
    renderBoard(playerBoardEl, playerBoard, false);
    renderBoard(enemyBoardEl, enemyBoard, true);
    
    // Навешиваем обработчик кликов на поле противника (в любом случае)
    attachClickHandler();
    
    if (currentTurn === 'player') {
        ui.updateStatus('Ваш ход!');
    } else {
        ui.updateStatus('Ход AI...');
        setTimeout(() => aiAttack(), 500);
    }
    
    logger.info('PvECore', 'Игра началась, ход:', currentTurn);
}

// Обработчик кликов по полю противника
function attachClickHandler() {
    if (!enemyBoardEl) return;
    
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
    
    sound.play('shoot');
    animateCell(enemyBoardEl, x, y, 'shoot-flash', 200);
    
    // Получаем клетки корабля ДО атаки
    let shipCells = [];
    if (enemyBoard[x][y] === CELL_SHIP) {
        shipCells = getShipCells(enemyBoard, x, y);
    }
    
    const { result, sunk } = makeAttack(enemyBoard, x, y);
    renderBoard(enemyBoardEl, enemyBoard, true);
    
    if (result === 'hit') {
        animateCell(enemyBoardEl, x, y, 'hit-pulse', 300);
        sound.play('hit');
        if (sunk) {
            if (shipCells.length > 0) {
                animateSinkingRandom(enemyBoardEl, shipCells);
            } else {
                animateCell(enemyBoardEl, x, y, 'sunk-effect', 400);
            }
            sound.play('sunk');
            ui.updateStatus('Корабль уничтожен! Ещё ход');
            logger.info('PvECore', 'Игрок уничтожил корабль AI', { x, y });
        } else {
            ui.updateStatus('Попадание! Ещё ход');
        }
        
        if (checkWin(enemyBoard)) {
            gameActive = false;
            console.log('🔊 Победа игрока, играем win');
            setTimeout(() => {}, 1000);
            sound.play('win');
            ui.updateStatus('🎉 ПОБЕДА! Вы уничтожили все корабли AI! 🎉');
            logger.info('PvECore', 'Победа игрока');
            detachClickHandler();
            return;
        }
        return;
    }
    
    if (result === 'miss') {
        animateCell(enemyBoardEl, x, y, 'miss-pulse', 200);
        sound.play('miss');
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
    
    const move = ai.makeMove();
    if (!move) return;
    
    const { x, y } = move;
    logger.info('PvECore', 'AI атакует', { x, y });
    
    sound.play('shoot');
    animateCell(playerBoardEl, x, y, 'shoot-flash', 200);
    
    // Получаем клетки корабля ДО атаки
    let shipCells = [];
    if (playerBoard[x][y] === CELL_SHIP) {
        shipCells = getShipCells(playerBoard, x, y);
    }
    
    const { result, sunk } = makeAttack(playerBoard, x, y);
    renderBoard(playerBoardEl, playerBoard, false);
    
    ai.onResult(result === 'hit', sunk, x, y, shipCells);
    
    if (result === 'hit') {
        animateCell(playerBoardEl, x, y, 'hit-pulse', 300);
        sound.play('hit');
        if (sunk) {
            if (shipCells.length > 0) {
                animateSinkingRandom(playerBoardEl, shipCells);
            } else {
                animateCell(playerBoardEl, x, y, 'sunk-effect', 400);
            }
            sound.play('sunk');
            ui.updateStatus('AI уничтожил ваш корабль! Ещё ход AI');
            logger.info('PvECore', 'AI уничтожил корабль игрока', { x, y });
        } else {
            ui.updateStatus('AI попал! Ещё ход AI');
        }
        
        if (checkWin(playerBoard)) {
            gameActive = false;
            ui.updateStatus('💀 ПОРАЖЕНИЕ! AI уничтожил ваши корабли 💀');
            logger.info('PvECore', 'Победа AI');
            detachClickHandler();
            return;
        }
        setTimeout(() => aiAttack(), 500);
        return;
    }
    
    if (result === 'miss') {
        animateCell(playerBoardEl, x, y, 'miss-pulse', 200);
        sound.play('miss');
        ui.updateStatus('AI промахнулся! Ваш ход');
        currentTurn = 'player';
        renderBoard(enemyBoardEl, enemyBoard, true);
    }
}

function detachClickHandler() {
    if (clickHandler && enemyBoardEl) {
        enemyBoardEl.removeEventListener('click', clickHandler);
        clickHandler = null;
    }
}