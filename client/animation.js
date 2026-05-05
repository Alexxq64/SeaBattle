// animation.js
export function animateCell(boardEl, x, y, className, duration = 200) {
    const cell = boardEl?.querySelector(`.cell[data-x='${x}'][data-y='${y}']`);
    if (cell) {
        cell.classList.add(className);
        setTimeout(() => cell.classList.remove(className), duration);
    }
}

// Анимация потопления корабля (несколько миганий вразнобой, затем одновременный взрыв)
export function animateSinkingRandom(boardEl, shipCells) {
    if (!shipCells.length) return;
    
    const flashCount = 4; // количество миганий на клетку
    const flashDuration = 120; // длительность одного мигания
    const totalPhase1Duration = 800; // длительность первой фазы (мигания)
    
    // Фаза 1: несколько миганий вразнобой (случайные цвета и задержки)
    for (let i = 0; i < flashCount; i++) {
        shipCells.forEach(([x, y]) => {
            const randomDelay = Math.random() * totalPhase1Duration;
            const randomColor = Math.random() > 0.5 ? 'sunk-flash-yellow' : 'sunk-flash-red';
            
            setTimeout(() => {
                const cell = boardEl.querySelector(`.cell[data-x='${x}'][data-y='${y}']`);
                if (cell) {
                    cell.classList.add(randomColor);
                    setTimeout(() => cell.classList.remove(randomColor), flashDuration);
                }
            }, randomDelay);
        });
    }
    
    // Фаза 2: одновременный взрыв всех клеток
    setTimeout(() => {
        shipCells.forEach(([x, y]) => {
            const cell = boardEl.querySelector(`.cell[data-x='${x}'][data-y='${y}']`);
            if (cell) {
                cell.classList.add('sunk-explosion');
                setTimeout(() => cell.classList.remove('sunk-explosion'), 400);
            }
        });
    }, totalPhase1Duration + 100);
}