/** Współdzielona instancja Socket.io (ustawiana w app.js po utworzeniu serwera). */
let io = null;

function setIo(instance) {
    io = instance;
}

function getIo() {
    if (!io) {
        throw new Error('Socket.io nie zostało zainicjalizowane');
    }
    return io;
}

module.exports = { setIo, getIo };
