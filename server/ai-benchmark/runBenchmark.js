// server/ai-benchmark/runBenchmark.js
// Запуск: npm run benchmark

import { createAI } from '../../client/pve/PvEAI.js';
import { runSeries } from './MatchRunner.js';
import { analyze } from './ResultsCollector.js';

// Временно отключаем логи в PvEAI.js
// В начале файла PvEAI.js можно добавить глобальный флаг
// но проще заглушить console.log в тесте

const originalLog = console.log;
console.log = () => {};

const GAMES_COUNT = 100;

const levels = ['easy', 'medium', 'hard'];

// Матрица сравнений: все пары
const pairs = [];
for (let i = 0; i < levels.length; i++) {
    for (let j = i + 1; j < levels.length; j++) {
        pairs.push({ A: levels[i], B: levels[j] });
    }
}

console.log = originalLog;

console.log('=== AI BENCHMARK ===');
console.log(`Матчей на пару: ${GAMES_COUNT}`);
console.log('');

for (const pair of pairs) {
    const aiA = createAI(pair.A);
    const aiB = createAI(pair.B);
    
    // Отключаем логи во время теста
    const originalLog2 = console.log;
    console.log = () => {};
    
    const results = runSeries(aiA, aiB, GAMES_COUNT);
    const stats = analyze(results, GAMES_COUNT);
    
    console.log = originalLog2;
    
    console.log(`${pair.A.toUpperCase()} vs ${pair.B.toUpperCase()}:`);
    console.log(`  ${pair.A}: ${(stats.winRateA * 100).toFixed(1)}%`);
    console.log(`  ${pair.B}: ${(stats.winRateB * 100).toFixed(1)}%`);
    console.log(`  среднее ходов: ${stats.avgMoves.toFixed(1)}`);
    console.log('');
}