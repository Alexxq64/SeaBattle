// client/logger.js
export const LOG_LEVELS = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3
};

let currentLevel = LOG_LEVELS.DEBUG;
let socket = null;

export function setLoggerSocket(sock) {
    socket = sock;
}

export function setLogLevel(level) {
    currentLevel = level;
}

function sendLog(level, module, message, data) {
    if (level < currentLevel) return;
    
    const logEntry = {
        timestamp: new Date().toISOString(),
        level: Object.keys(LOG_LEVELS).find(k => LOG_LEVELS[k] === level),
        module,
        message,
        data: data ? JSON.stringify(data) : null
    };
    
    console.log(`[${logEntry.level}] [${module}] ${message}`, data || '');
    
    if (socket && socket.connected) {
        socket.emit('clientLog', logEntry);
    }
}

export const logger = {
    debug: (module, msg, data) => sendLog(LOG_LEVELS.DEBUG, module, msg, data),
    info: (module, msg, data) => sendLog(LOG_LEVELS.INFO, module, msg, data),
    warn: (module, msg, data) => sendLog(LOG_LEVELS.WARN, module, msg, data),
    error: (module, msg, data) => sendLog(LOG_LEVELS.ERROR, module, msg, data)
};