// placement/placementUI.js
// UI для расстановки кораблей

import { logger } from '../logger.js';
import { renderBoard } from '../core/render.js';
import * as ui from '../ui.js';
import { 
    BOARD_SIZE, 
    CELL_SHIP, 
    CELL_EMPTY 
} from '../core/attack.js';
import { 
    createEmptyPlacementBoard, 
    placeShip, 
    removeShip, 
    rotateShip,
    isPlacementComplete,
    findShip
} from './placementLogic.js';
import { randomPlacement } from './placementAI.js';

// Состояние UI расстановки
let placementBoard = [];
let selectedShip = null;
let shipsPalette = [];
let placementComplete = false;

// DOM элементы
let placementBoardEl = null;
let shipPaletteEl = null;
let readyBtn = null;
let randomBtn = null;
let clearBtn = null;
let statusEl = null;

// Колбэк при завершении расстановки
let onCompleteCallback = null;

// Инициализация UI расстановки
export function initPlacementUI() {
    logger.info('PlacementUI', 'Инициализация');
    
    placementBoardEl = document.getElementById('placement-board');
    shipPaletteEl = document.getElementById('ship-palette');
    readyBtn = document.getElementById('placementReadyBtn');
    randomBtn = document.getElementById('randomPlaceBtn');
    clearBtn = document.getElementById('clearBoardBtn');
    statusEl = document.getElementById('placement-status');
    
    if (readyBtn) {
        readyBtn.onclick = () => {
            logger.debug('PlacementUI', 'Готов нажат', { placementComplete });
            if (placementComplete && onCompleteCallback) {
                logger.info('PlacementUI', 'Вызов onCompleteCallback');
                onCompleteCallback(placementBoard);
            } else if (!placementComplete) {
                ui.updateStatus('Расставьте все корабли!');
            }
        };
    }
    
    if (randomBtn) {
        randomBtn.onclick = () => {
            logger.info('PlacementUI', 'Случайная расстановка');
            placementBoard = randomPlacement();
            renderPlacementBoard();
            updatePalette();
            checkCompletion();
        };
    }
    
    if (clearBtn) {
        clearBtn.onclick = () => {
            logger.info('PlacementUI', 'Очистка поля');
            placementBoard = createEmptyPlacementBoard();
            renderPlacementBoard();
            initPalette();
            updatePalette();
            checkCompletion();
        };
    }
}

// Показать экран расстановки
export function showPlacementScreen(callback) {
    logger.info('PlacementUI', 'Показ экрана расстановки');
    
    onCompleteCallback = callback;
    placementBoard = createEmptyPlacementBoard();
    initPalette();
    
    ui.showScreen('placementScreen');
    renderPlacementBoard();
    updatePalette();
    checkCompletion();
    
    document.addEventListener('keydown', handleKeyDown);
}

// Скрыть экран расстановки
export function hidePlacementScreen() {
    logger.debug('PlacementUI', 'Скрытие экрана расстановки');
    ui.showScreen('gameScreen');
    document.removeEventListener('keydown', handleKeyDown);
}

// Инициализация палитры кораблей
function initPalette() {
    shipsPalette = [
        { size: 4, count: 1, placed: false },
        { size: 3, count: 2, placed: false },
        { size: 2, count: 3, placed: false },
        { size: 1, count: 4, placed: false }
    ];
    selectedShip = null;
}

// Обновить палитру
function updatePalette() {
    if (!shipPaletteEl) return;
    
    const placedSizes = [];
    const visited = new Set();
    
    for (let i = 0; i < BOARD_SIZE; i++) {
        for (let j = 0; j < BOARD_SIZE; j++) {
            if (placementBoard[i][j] === CELL_SHIP && !visited.has(`${i},${j}`)) {
                const ship = findShip(placementBoard, i, j);
                for (const [cx, cy] of ship) {
                    visited.add(`${cx},${cy}`);
                }
                placedSizes.push(ship.length);
            }
        }
    }
    
    const sizeCount = {};
    for (const size of placedSizes) {
        sizeCount[size] = (sizeCount[size] || 0) + 1;
    }
    
    for (const ship of shipsPalette) {
        const placed = sizeCount[ship.size] || 0;
        ship.placed = placed >= ship.count;
    }
    
    shipPaletteEl.innerHTML = '';
    
    for (const ship of shipsPalette) {
        const shipDiv = document.createElement('div');
        shipDiv.className = 'palette-ship';
        if (ship.placed) shipDiv.classList.add('placed');
        
        const shipCells = document.createElement('div');
        shipCells.className = 'ship-preview';
        shipCells.style.display = 'flex';
        shipCells.style.flexDirection = 'row';
        
        for (let i = 0; i < ship.size; i++) {
            const cell = document.createElement('div');
            cell.className = 'ship-cell';
            shipCells.appendChild(cell);
        }
        
        shipDiv.appendChild(shipCells);
        shipDiv.appendChild(document.createTextNode(` (${ship.size})`));
        
        if (!ship.placed) {
            shipDiv.onclick = () => selectShipFromPalette(ship.size);
        }
        
        shipPaletteEl.appendChild(shipDiv);
    }
}

function selectShipFromPalette(size) {
    selectedShip = { size, orientation: 'horizontal', x: null, y: null };
    ui.updateStatus(`Выбран корабль на ${size} палубы. Нажмите на поле для размещения.`);
}

function renderPlacementBoard() {
    if (!placementBoardEl) return;
    
    renderBoard(placementBoardEl, placementBoard, false);
    
    const cells = placementBoardEl.querySelectorAll('.cell');
    cells.forEach(cell => {
        cell.onclick = () => {
            const x = parseInt(cell.dataset.x);
            const y = parseInt(cell.dataset.y);
            handleCellClick(x, y);
        };
        cell.oncontextmenu = (e) => {
            e.preventDefault();
            const x = parseInt(cell.dataset.x);
            const y = parseInt(cell.dataset.y);
            handleCellRightClick(x, y);
            return false;
        };
    });
}

function handleCellClick(x, y) {
    // Размещение нового корабля из палитры
    if (selectedShip && selectedShip.x === null) {
        const size = selectedShip.size;
        const orientation = selectedShip.orientation;
        
        if (placeShip(placementBoard, x, y, size, orientation)) {
            // Не сбрасываем selectedShip, а обновляем координатами размещённого корабля
            selectedShip = {
                size: size,
                orientation: orientation,
                x: x,
                y: y
            };
            renderPlacementBoard();
            updatePalette();
            checkCompletion();
            ui.updateStatus(`Корабль размещён. Стрелки — перемещение, 0 — поворот, Enter — фиксация`);
            highlightSelectedShip();
        } else {
            ui.updateStatus('Нельзя разместить корабль здесь');
        }
    } 
    // Выбор уже размещённого корабля для перемещения
    else if (placementBoard[x][y] === CELL_SHIP) {
        const cells = findShip(placementBoard, x, y);
        if (cells.length > 0) {
            const isHorizontal = cells.length > 1 && cells[0][0] === cells[1][0];
            const minX = Math.min(...cells.map(c => c[0]));
            const minY = Math.min(...cells.map(c => c[1]));
            
            selectedShip = {
                size: cells.length,
                orientation: isHorizontal ? 'horizontal' : 'vertical',
                x: minX,
                y: minY
            };
            ui.updateStatus(`Корабль выбран. Стрелки — перемещение, 0 — поворот, Enter — фиксация`);
        }
        renderPlacementBoard();
        highlightSelectedShip();
    }
}

function handleCellRightClick(x, y) {
    if (placementBoard[x][y] === CELL_SHIP) {
        removeShip(placementBoard, x, y);
        renderPlacementBoard();
        updatePalette();
        checkCompletion();
        ui.updateStatus('Корабль удалён');
    }
}

function handleKeyDown(e) {
    logger.debug('PlacementUI', 'Нажата клавиша', { key: e.key, selectedShip: !!selectedShip });
    
    if (!selectedShip) return;
    
    let { x, y, size, orientation } = selectedShip;
    
    switch (e.key) {
        case 'ArrowUp':
            logger.debug('PlacementUI', 'Стрелка ВВЕРХ: удаляем старый корабль', { oldX: x, oldY: y });
            removeShip(placementBoard, x, y);
            selectedShip.x = Math.max(0, x - 1);
            placeShip(placementBoard, selectedShip.x, selectedShip.y, size, orientation);
            logger.debug('PlacementUI', 'Стрелка ВВЕРХ: новая позиция', { newX: selectedShip.x, newY: selectedShip.y });
            break;
        case 'ArrowDown':
            logger.debug('PlacementUI', 'Стрелка ВНИЗ: удаляем старый корабль', { oldX: x, oldY: y });
            removeShip(placementBoard, x, y);
            selectedShip.x = Math.min(BOARD_SIZE - (orientation === 'vertical' ? size : 1), x + 1);
            placeShip(placementBoard, selectedShip.x, selectedShip.y, size, orientation);
            logger.debug('PlacementUI', 'Стрелка ВНИЗ: новая позиция', { newX: selectedShip.x, newY: selectedShip.y });
            break;
        case 'ArrowLeft':
            logger.debug('PlacementUI', 'Стрелка ВЛЕВО: удаляем старый корабль', { oldX: x, oldY: y });
            removeShip(placementBoard, x, y);
            selectedShip.y = Math.max(0, y - 1);
            placeShip(placementBoard, selectedShip.x, selectedShip.y, size, orientation);
            logger.debug('PlacementUI', 'Стрелка ВЛЕВО: новая позиция', { newX: selectedShip.x, newY: selectedShip.y });
            break;
        case 'ArrowRight':
            logger.debug('PlacementUI', 'Стрелка ВПРАВО: удаляем старый корабль', { oldX: x, oldY: y });
            removeShip(placementBoard, x, y);
            selectedShip.y = Math.min(BOARD_SIZE - (orientation === 'horizontal' ? size : 1), y + 1);
            placeShip(placementBoard, selectedShip.x, selectedShip.y, size, orientation);
            logger.debug('PlacementUI', 'Стрелка ВПРАВО: новая позиция', { newX: selectedShip.x, newY: selectedShip.y });
            break;
        case '0':
            e.preventDefault();
            logger.debug('PlacementUI', 'Поворот корабля', { x, y, orientation });
            if (rotateShip(placementBoard, x, y)) {
                const newCells = findShip(placementBoard, x, y);
                if (newCells.length > 0) {
                    const newIsHorizontal = newCells.length > 1 && newCells[0][0] === newCells[1][0];
                    const newMinX = Math.min(...newCells.map(c => c[0]));
                    const newMinY = Math.min(...newCells.map(c => c[1]));
                    selectedShip.orientation = newIsHorizontal ? 'horizontal' : 'vertical';
                    selectedShip.x = newMinX;
                    selectedShip.y = newMinY;
                    logger.debug('PlacementUI', 'Поворот: новое состояние', { orientation: selectedShip.orientation, x: selectedShip.x, y: selectedShip.y });
                }
                renderPlacementBoard();
                updatePalette();
                checkCompletion();
                ui.updateStatus('Корабль повёрнут');
            } else {
                logger.debug('PlacementUI', 'Поворот: не удался', { x, y, orientation });
                ui.updateStatus('Нельзя повернуть корабль здесь');
            }
            break;
        default:
            return;
    }
    
    renderPlacementBoard();
    highlightSelectedShip();
}

function highlightSelectedShip() {
    if (!selectedShip || selectedShip.x === null) return;
    
    const cells = placementBoardEl.querySelectorAll('.cell');
    const { x, y, size, orientation } = selectedShip;
    
    for (let i = 0; i < size; i++) {
        let cx, cy;
        if (orientation === 'horizontal') {
            cx = x;
            cy = y + i;
        } else {
            cx = x + i;
            cy = y;
        }
        
        const index = cx * BOARD_SIZE + cy;
        if (cells[index]) {
            cells[index].classList.add('placement-highlight');
        }
    }
}

function checkCompletion() {
    placementComplete = isPlacementComplete(placementBoard);
    
    if (readyBtn) {
        readyBtn.disabled = !placementComplete;
    }
    
    if (placementComplete) {
        ui.updateStatus('Все корабли расставлены! Нажмите "Готов"');
    }
}

export function getPlacementBoard() {
    return placementBoard;
}