/**
 * Moduł timerów faz gry.
 * Emituje `timerTick` co sekundę do wszystkich graczy w danej grze.
 */

const PHASE_DURATIONS = {
    prompting: 60,
    submitting: 60,
    voting: 45
};

const timers = new Map(); // gameId → intervalId

function startPhaseTimer(io, gameId, phase, onExpire = null) {
    clearPhaseTimer(gameId);

    const duration = PHASE_DURATIONS[phase] ?? 60;
    let secondsLeft = duration;

    // FE oczekuje liczby (seconds: number), nie obiektu
    io.to(gameId).emit('timerTick', duration);

    const intervalId = setInterval(() => {
        secondsLeft--;
        io.to(gameId).emit('timerTick', secondsLeft);
        if (secondsLeft <= 0) {
            clearPhaseTimer(gameId);
            if (onExpire) {
                Promise.resolve(onExpire()).catch(err =>
                    console.error(`[Timer] onExpire error game=${gameId} phase=${phase}:`, err));
            }
        }
    }, 1000);

    timers.set(gameId, intervalId);
}

function clearPhaseTimer(gameId) {
    const id = timers.get(gameId);
    if (id !== undefined) {
        clearInterval(id);
        timers.delete(gameId);
    }
}

module.exports = { startPhaseTimer, clearPhaseTimer };
