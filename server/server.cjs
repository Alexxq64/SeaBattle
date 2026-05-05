// server.cjs
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const os = require('os');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: { origin: "*" }
});

app.use(express.static(path.join(__dirname, '../client')));

let player1 = null;
let player2 = null;
let currentTurn = 'player1';
let readyCount = 0;
let readyPlayers = {};

function getLocalIP() {
    const { execSync } = require('child_process');
    try {
        // Получаем IP интерфейса, через который идёт маршрут к шлюзу по умолчанию
        const output = execSync('route print 0.0.0.0', { encoding: 'utf8' });
        const lines = output.split('\n');
        
        for (const line of lines) {
            // Ищем строку с 0.0.0.0
            if (line.includes('0.0.0.0') && !line.includes('224.0.0.0')) {
                const parts = line.trim().split(/\s+/);
                // IP интерфейса обычно в 4-й колонке (индекс 3)
                if (parts.length >= 4) {
                    const possibleIp = parts[3];
                    if (possibleIp && /^\d+\.\d+\.\d+\.\d+$/.test(possibleIp) && !possibleIp.startsWith('127.')) {
                        return possibleIp;
                    }
                }
            }
        }
    } catch (e) {}
    
    // fallback
    const nets = require('os').networkInterfaces();
    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            if (net.family === 'IPv4' && !net.internal && !net.address.startsWith('169.254.')) {
                return net.address;
            }
        }
    }
    return 'localhost';
}

io.on('connection', (socket) => {
    console.log('Клиент подключился:', socket.id);
    
    socket.on('clientLog', (logEntry) => {
        console.log(`[${logEntry.level.toUpperCase()}] [CLIENT:${logEntry.module}] ${logEntry.message}`);
        if (logEntry.data) {
            console.log('  data:', logEntry.data);
        }
    });

    if (player1 === null) {
        player1 = socket.id;
        const ip = getLocalIP();
        socket.emit('role', { role: 'player1', ip: ip });
        console.log('Назначен Player 1:', socket.id);
        console.log('  → Отправлена роль player1, IP:', ip);
    } else if (player2 === null) {
        player2 = socket.id;
        socket.emit('role', { role: 'player2' });
        console.log('Назначен Player 2:', socket.id);
        console.log('  → Отправлена роль player2');
        console.log('Оба игрока подключены, ожидаем расстановку');
    } else {
        socket.disconnect();
        console.log('Отклонён третий игрок:', socket.id);
    }

    socket.on('shoot', (data) => {
        const target = socket.id === player1 ? player2 : player1;
        if (target) {
            io.to(target).emit('shoot', { x: data.x, y: data.y, shooter: data.shooter });
            console.log(`Выстрел от ${socket.id} → ${target}`);
        }
    });

    socket.on('result', (data) => {
        if (data.result === 'miss') {
            currentTurn = currentTurn === 'player1' ? 'player2' : 'player1';
        }
        
        const stateUpdate = {
            x: data.x,
            y: data.y,
            result: data.result,
            sunk: data.sunk || false,
            nextTurn: currentTurn,
            shooter: data.shooter
        };
        io.emit('stateUpdate', stateUpdate);
        console.log(`Результат: ${data.result}, sunk: ${data.sunk || false}, следующий ход: ${currentTurn}`);
    });

    socket.on('placementReady', () => {
        readyPlayers[socket.id] = true;
        readyCount = Object.keys(readyPlayers).length;
        console.log(`Игрок ${socket.id} готов. Всего готовых: ${readyCount}`);
        
        if (readyCount === 1 && socket.id === player2) {
            console.log(`Отправляем startPlacement игроку ${player1}`);
            io.to(player1).emit('startPlacement');
        }
        
        if (readyCount === 2) {
            console.log('Оба игрока готовы, отправляем bothReady');
            io.emit('bothReady');
            readyPlayers = {};
            readyCount = 0;
        }
    });

    socket.on('resetGame', () => {
        console.log(`Сброс игры от ${socket.id}`);
        
        currentTurn = 'player1';
        readyPlayers = {};
        readyCount = 0;
        
        if (player1) io.to(player1).emit('resetGame');
        if (player2) io.to(player2).emit('resetGame');
    });

    socket.on('disconnect', () => {
        console.log('Клиент отключился:', socket.id);

        if (socket.id === player1 || socket.id === player2) {
            const opponent = socket.id === player1 ? player2 : player1;
            if (opponent) {
                io.to(opponent).emit('gameOver', { reason: 'opponent_disconnected' });
                console.log(`Отправлен gameOver игроку ${opponent}`);
            }
            setTimeout(() => {
                player1 = null;
                player2 = null;
                currentTurn = 'player1';
                readyPlayers = {};
                readyCount = 0;
                console.log('Состояние сброшено');
            }, 1000);
        }
        
        if (readyPlayers[socket.id]) {
            delete readyPlayers[socket.id];
            readyCount = Object.keys(readyPlayers).length;
        }
    });
});

const PORT = 3000;
server.listen(PORT, () => {
    const ip = getLocalIP();
    console.log(`Сервер запущен на http://localhost:${PORT}`);
    console.log(`Для игры по сети используйте: http://${ip}:${PORT}`);
});