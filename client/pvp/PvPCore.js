// pvp/PvPCore.js
// PvP режим: игра по сети через сокет

import { logger } from '../logger.js';
import * as ui from '../ui.js';
import { renderBoard } from '../core/render.js';
import { makeAttack, checkWin, CELL_HIT, CELL_MISS, TOTAL_SHIP_CELLS } from '../core/attack.js';
import { initPlacementUI, showPlacementScreen, hidePlacementScreen } from '../placement/placementUI.js';
import { sound } from '../sound.js';

export function createPvPController(socket, dom) {
    let myRole = null;
    let gameActive = false;
    let playerBoard = [];
    let enemyBoard = [];
    let clickHandler = null;
    let currentTurn = null;
    
    const playerBoardEl = dom.playerBoardEl;
    const enemyBoardEl = dom.enemyBoardEl;
    
    function setRole(data) {
        logger.info('PvPCore', 'setRole', { role: data.role });
        myRole = data.role;
        
        if (myRole === 'player1' && data.ip) {
            ui.updateGameLink(`http://${data.ip}:3000`);
            ui.showScreen('waitingScreen');
            ui.updateStatus('Вы хост. Отправьте ссылку второму игроку');
        } else if (myRole === 'player2') {
            ui.updateStatus('Вы игрок 2. Расставьте корабли');
            startPlacement();
        }
    }
    
    function startPlacement() {
        logger.info('PvPCore', 'startPlacement');
        initPlacementUI();
        showPlacementScreen(onPlacementComplete);
    }
    
    function onPlacementComplete(placementBoard) {
        logger.info('PvPCore', 'Расстановка завершена');
        playerBoard = placementBoard.map(row => [...row]);
        renderBoard(playerBoardEl, playerBoard, false);
        socket.emit('placementReady');
        ui.updateStatus('Ожидание противника...');
        hidePlacementScreen();
    }
    
    function startGame() {
        logger.info('PvPCore', 'Старт игры');
        gameActive = true;
        currentTurn = 'player1'; 
        
        for (let i = 0; i < 10; i++) {
            enemyBoard[i] = [];
            for (let j = 0; j < 10; j++) {
                enemyBoard[i][j] = 0;
            }
        }
        
        renderBoard(playerBoardEl, playerBoard, false);
        renderBoard(enemyBoardEl, enemyBoard, true);
        ui.updateStatus('Игра началась');
        attachClickHandler();
    }
    
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
            
            if (!gameActive) return;
            
            // Проверка хода
            if (currentTurn !== myRole) {
                ui.updateStatus('Сейчас не ваш ход!');
                return;
            }
            
            const cellValue = enemyBoard[x][y];
            if (cellValue === CELL_HIT || cellValue === CELL_MISS) {
                ui.updateStatus('Сюда уже стреляли!');
                return;
            }
            
            sound.play('shoot');
            logger.info('PvPCore', 'Атака', { x, y, myRole });
            socket.emit('shoot', { x, y, shooter: myRole });
        };
        
        enemyBoardEl.addEventListener('click', clickHandler);
    }
    
    socket.on('shoot', (data) => {
        logger.info('PvPCore', '🔴 ПОЛУЧЕН ВЫСТРЕЛ от', { shooter: data.shooter, x: data.x, y: data.y });
        
        if (!gameActive) return;
        
        const { result, sunk } = makeAttack(playerBoard, data.x, data.y);
        logger.info('PvPCore', 'Результат выстрела', { result, sunk });
        
        socket.emit('result', {
            x: data.x,
            y: data.y,
            result: result,
            sunk: sunk || false,
            shooter: data.shooter
        });
        
        renderBoard(playerBoardEl, playerBoard, false);
        
        if (result === 'hit') {
            sound.play('hit');
            if (sunk) {
                sound.play('sunk');
                ui.updateStatus('Противник уничтожил ваш корабль!');
                logger.info('PvPCore', 'Противник уничтожил корабль', { x, y });
            } else {
                ui.updateStatus('Противник попал!');
            }
            if (checkWin(playerBoard)) {
                gameActive = false;
                sound.play('win');
                ui.updateStatus('💀 ПОРАЖЕНИЕ! 💀');
            }
        } else if (result === 'miss') {
            sound.play('miss');
            ui.updateStatus('Противник промахнулся!');
        }
    });
    
    socket.on('bothReady', () => {
        logger.info('PvPCore', 'bothReady');
        startGame();
    });
    
    socket.on('stateUpdate', (data) => {
        handleStateUpdate(data);
    });
    
    socket.on('gameOver', (data) => {
        logger.info('PvPCore', 'gameOver', data);
        gameActive = false;
        ui.updateStatus(data.reason === 'opponent_disconnected' 
            ? 'Противник отключился' 
            : 'Игра завершена');
        if (clickHandler) {
            enemyBoardEl.removeEventListener('click', clickHandler);
        }
    });
    
    // Обработчик сброса игры (Новая игра)
    socket.on('resetGame', () => {
        logger.info('PvPCore', 'Получен resetGame, сброс состояния');
        
        // Сбрасываем игровое состояние
        gameActive = false;
        playerBoard = [];
        enemyBoard = [];
        currentTurn = null;
        
        // Удаляем обработчик кликов
        if (clickHandler && enemyBoardEl) {
            enemyBoardEl.removeEventListener('click', clickHandler);
            clickHandler = null;
        }
        
        // Показываем экран расстановки заново
        startPlacement();
    });
    
    function handleStateUpdate(data) {
        const iAmShooter = (data.shooter === myRole);
        
        // Обновляем текущий ход
        if (data.nextTurn) {
            currentTurn = data.nextTurn;
        }
        
        if (iAmShooter) {
            enemyBoard[data.x][data.y] = data.result === 'hit' ? CELL_HIT : CELL_MISS;
            renderBoard(enemyBoardEl, enemyBoard, true);
            
            if (data.result === 'hit') {
                if (data.sunk) {
                    sound.play('sunk');
                    ui.updateStatus('Корабль уничтожен!');
                    logger.info('PvPCore', 'Игрок уничтожил корабль противника', { x: data.x, y: data.y });
                } else {
                    sound.play('hit');
                    ui.updateStatus('Попадание!');
                }
                // Подсчёт попаданий вместо checkWin
                const hitCount = enemyBoard.flat().filter(cell => cell === CELL_HIT).length;
                if (hitCount === TOTAL_SHIP_CELLS) {
                    gameActive = false;
                    sound.play('win');
                    ui.updateStatus('🎉 ПОБЕДА! 🎉');
                }
            } else {
                sound.play('miss');
                ui.updateStatus('Промах! Ход противника');
            }
        } else {
            renderBoard(playerBoardEl, playerBoard, false);
            
            if (data.result === 'hit') {
                if (data.sunk) {
                    ui.updateStatus('Противник уничтожил ваш корабль!');
                    logger.info('PvPCore', 'Противник уничтожил ваш корабль', { x: data.x, y: data.y });
                } else {
                    ui.updateStatus('Противник попал!');
                }
                if (checkWin(playerBoard)) {
                    gameActive = false;
                    sound.play('win');
                    ui.updateStatus('💀 ПОРАЖЕНИЕ! 💀');
                }
            } else {
                ui.updateStatus('Противник промахнулся! Ваш ход');
            }
        }
    }
    
    return {
        setRole,
        startPlacement
    };
}