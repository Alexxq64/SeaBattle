// ui.js - только экраны и кнопки, никакой бизнес-логики

import { logger } from './logger.js';
import { startPvE, startPvP } from './main.js';

// Переключение экранов
export function showScreen(screenId) {
    logger.debug('UI', 'Показ экрана', { screenId });
    
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.add('hidden');
    });
    
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
        targetScreen.classList.remove('hidden');
    } else {
        logger.error('UI', 'Экран не найден', { screenId });
    }
}

// Обновление статуса
export function updateStatus(text) {
    const statusEl = document.getElementById('status');
    if (statusEl) {
        statusEl.textContent = text;
        logger.debug('UI', 'Статус обновлён', { text });
    }
}

// Обновление ссылки для приглашения (PvP)
export function updateGameLink(url) {
    const linkEl = document.getElementById('gameLink');
    if (linkEl) {
        linkEl.textContent = url;
        logger.debug('UI', 'Ссылка обновлена', { url });
    }
}

// Показать/скрыть выбор сложности (PvE)
export function showDifficulty() {
    const el = document.getElementById('difficulty-container');
    if (el) {
        el.classList.remove('hidden');
        logger.debug('UI', 'Показана панель сложности');
    }
}

export function hideDifficulty() {
    const el = document.getElementById('difficulty-container');
    if (el) {
        el.classList.add('hidden');
        logger.debug('UI', 'Скрыта панель сложности');
    }
}

// Получить выбранную сложность
export function getSelectedDifficulty() {
    const select = document.getElementById('difficulty');
    const difficulty = select ? select.value : 'random';
    logger.debug('UI', 'Выбрана сложность', { difficulty });
    return difficulty;
}

// Инициализация всех кнопок
export function initButtons() {
    logger.info('UI', 'Инициализация кнопок');
    
    // Кнопка PvE
    const pveBtn = document.getElementById('pveBtn');
    if (pveBtn) {
        pveBtn.onclick = () => {
            logger.info('UI', 'Нажата кнопка PvE');
            startPvE();
        };
    } else {
        logger.warn('UI', 'Кнопка PvE не найдена');
    }
    
    // Кнопка PvP
    const pvpBtn = document.getElementById('pvpBtn');
    if (pvpBtn) {
        pvpBtn.onclick = () => {
            logger.info('UI', 'Нажата кнопка PvP');
            startPvP();
        };
    } else {
        logger.warn('UI', 'Кнопка PvP не найдена');
    }
    
    // Кнопка "Отмена" в экране ожидания
    const cancelWaitingBtn = document.getElementById('cancelWaitingBtn');
    if (cancelWaitingBtn) {
        cancelWaitingBtn.onclick = () => {
            logger.info('UI', 'Отмена ожидания, возврат в стартовое меню');
            showScreen('startScreen');
        };
    }
    
    // Кнопка копирования ссылки — добавляем параметр ?join=true
    const copyLinkBtn = document.getElementById('copyLinkBtn');
    if (copyLinkBtn) {
        copyLinkBtn.onclick = () => {
            const link = document.getElementById('gameLink')?.textContent;
            if (link) {
                const joinLink = link + '?join=true';
                navigator.clipboard.writeText(joinLink);
                logger.info('UI', 'Ссылка скопирована', { link: joinLink });
                updateStatus('Ссылка скопирована!');
            }
        };
    }
    
    // Кнопка "Новая игра"
    const newGameBtn = document.getElementById('new-game');
    if (newGameBtn) {
        newGameBtn.onclick = () => {
            logger.info('UI', 'Новая игра - отправляем resetGame на сервер');
            
            // Если есть активный сокет (PvP режим), отправляем сброс
            if (window.activeSocket && window.activeSocket.connected) {
                window.activeSocket.emit('resetGame');
            }
            
            showScreen('startScreen');
        };
    }
    
    logger.debug('UI', 'Инициализация кнопок завершена');
}