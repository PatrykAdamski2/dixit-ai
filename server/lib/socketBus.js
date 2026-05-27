// Shared Socket.io instance — set once in app.js, used by REST routes to broadcast
let _io = null;

function setIo(io) {
    _io = io;
}

function getIo() {
    return _io;
}

module.exports = { setIo, getIo };
