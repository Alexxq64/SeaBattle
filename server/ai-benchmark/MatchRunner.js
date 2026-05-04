// server/ai-benchmark/MatchRunner.js

import { simulateGame } from './AIGameSimulator.js';

export function runSeries(aiA, aiB, gamesCount = 100) {
    const results = {
        A_wins: 0,
        B_wins: 0,
        draws: 0,
        totalMoves: 0
    };
    
    for (let i = 0; i < gamesCount; i++) {
        const { winner, moves } = simulateGame(aiA, aiB);
        
        if (winner === 'A') results.A_wins++;
        else if (winner === 'B') results.B_wins++;
        else results.draws++;
        
        results.totalMoves += moves;
        
        // Прогресс
        if ((i + 1) % 10 === 0) {
            console.log(`  Прогресс: ${i + 1}/${gamesCount}`);
        }
    }
    
    return results;
}