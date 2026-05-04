// main.js - точка входа, только роутинг

import { logger, setLoggerSocket } from './logger.js';
import * as ui from './ui.js';

let currentGame = null;

export function startPvE() {
    logger.info('Main', '🚀 Запуск PvE режима');
    
    // Показываем выбор сложности
    ui.showDifficulty();
    
    import('./pve/PvECore.js').then(module => {
        const { startPvEGame } = module;
        startPvEGame({
            playerBoardEl: document.getElementById('player-board'),
            enemyBoardEl: document.getElementById('enemy-board')
        });
    }).catch(err => {
        logger.error('Main', 'Ошибка загрузки PvE', err.message);
    });
}

export function startPvP() {
    logger.info('Main', '🚀 Запуск PvP режима');
    
    // Скрываем выбор сложности
    ui.hideDifficulty();
    
    const socket = io();
    window.activeSocket = socket;
    setLoggerSocket(socket);
    
    const dom = {
        playerBoardEl: document.getElementById('player-board'),
        enemyBoardEl: document.getElementById('enemy-board')
    };
    
    socket.onAny((event, ...args) => {
        logger.info('Main', `🔴 ЛЮБОЕ СОБЫТИЕ: ${event}`, args);
    });
    
    socket.on('connect', () => {
        logger.info('Main', 'Сокет подключен', { id: socket.id });
    });
    
    socket.on('connect_error', (err) => {
        logger.error('Main', 'Ошибка подключения сокета', err.message);
    });
    
    let controller = null;
    let bufferedRole = null;
    let bufferedStartPlacement = false;
    
    socket.on('role', (data) => {
        logger.info('Main', '🔴 role получен ДО импорта', { role: data.role });
        bufferedRole = data;
        if (controller) {
            controller.setRole(data);
        }
    });
    
    socket.on('startPlacement', () => {
        logger.info('Main', '🔴 startPlacement получен ДО импорта');
        bufferedStartPlacement = true;
        if (controller) {
            controller.startPlacement();
        }
    });
    
    import('./pvp/PvPCore.js').then(module => {
        logger.info('Main', 'PvPCore загружен, создаём контроллер');
        const { createPvPController } = module;
        controller = createPvPController(socket, dom);
        
        if (bufferedRole) {
            logger.info('Main', 'Применяем буферизированную роль');
            controller.setRole(bufferedRole);
        }
        if (bufferedStartPlacement) {
            logger.info('Main', 'Применяем буферизированный startPlacement');
            controller.startPlacement();
        }
        
        socket.on('role', (data) => {
            logger.info('Main', '🔴 role получен ПОСЛЕ импорта', { role: data.role });
            controller.setRole(data);
        });
        
        socket.on('startPlacement', () => {
            logger.info('Main', '🔴 startPlacement получен ПОСЛЕ импорта');
            controller.startPlacement();
        });
        
    }).catch(err => {
        logger.error('Main', 'Ошибка загрузки PvP', err.message);
    });
}

// Проверяем URL параметр ?join
const urlParams = new URLSearchParams(window.location.search);
const isJoin = urlParams.has('join');

// Всегда инициализируем кнопки и показываем стартовый экран
ui.initButtons();
ui.showScreen('startScreen');
logger.info('Main', 'Приложение загружено, ожидание выбора режима');

if (isJoin) {
    logger.info('Main', '🔗 Обнаружен параметр ?join — запускаем PvP автоматически');
    startPvP();
}