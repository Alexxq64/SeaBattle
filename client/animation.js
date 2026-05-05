// animation.js
export function animateCell(boardEl, x, y, className, duration = 200) {
    const cell = boardEl?.querySelector(`.cell[data-x='${x}'][data-y='${y}']`);
    if (cell) {
        cell.classList.add(className);
        setTimeout(() => cell.classList.remove(className), duration);
    }
}