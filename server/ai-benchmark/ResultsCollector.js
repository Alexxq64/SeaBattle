// server/ai-benchmark/ResultsCollector.js

export function analyze(results, gamesCount) {
    return {
        winRateA: results.A_wins / gamesCount,
        winRateB: results.B_wins / gamesCount,
        drawRate: results.draws / gamesCount,
        avgMoves: results.totalMoves / gamesCount
    };
}