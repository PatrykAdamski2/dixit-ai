import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Copy, Flag, Trophy, Settings2, Bot, Plus } from 'lucide-react';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { useGameStore } from '../store/useGameStore';
import { LobbyPlayerList } from '../components/LobbyPlayerList';
import { DEFAULT_LOBBY_SETTINGS } from '../services/api';
import {
  fetchLobbyDefaultSettings,
  createLobby,
  startLobbyGame,
  addLobbyBot,
} from '../services/lobbyApi';
import { notifyError, notifySuccess } from '../services/socketNotify';

const MIN_PLAYERS = 3;
const MAX_PLAYERS_CAP = 8;

export function HostGameView() {
  const navigate = useNavigate();
  const { players: storePlayers, roomCode, myId } = useGameStore();
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [endCondition, setEndCondition] = useState<'points' | 'rounds'>('points');
  const [endLimit, setEndLimit] = useState(30);
  const [creating, setCreating] = useState(false);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  const hasRoom = !!roomCode && roomCode !== '------';
  const lobbyCode = hasRoom ? roomCode! : '------';
  const playerCount = storePlayers.length;
  const canStart = hasRoom && playerCount >= MIN_PLAYERS;

  useEffect(() => {
    const loadSettings = async () => {
      const data = await fetchLobbyDefaultSettings();
      if (data) {
        const max = Number(data.maxPlayers);
        const limit = Number(data.endLimit);
        setMaxPlayers(
          Number.isFinite(max)
            ? Math.min(MAX_PLAYERS_CAP, Math.max(MIN_PLAYERS, max))
            : DEFAULT_LOBBY_SETTINGS.maxPlayers
        );
        setEndCondition(data.endCondition ?? DEFAULT_LOBBY_SETTINGS.endCondition);
        setEndLimit(Number.isFinite(limit) ? limit : DEFAULT_LOBBY_SETTINGS.endLimit);
      } else {
        setMaxPlayers(DEFAULT_LOBBY_SETTINGS.maxPlayers);
        setEndCondition(DEFAULT_LOBBY_SETTINGS.endCondition);
        setEndLimit(DEFAULT_LOBBY_SETTINGS.endLimit);
      }
    };
    loadSettings();
  }, []);

  const handleCopy = () => {
    if (hasRoom) navigator.clipboard.writeText(lobbyCode);
  };

  const handleCreateRoom = async () => {
    setCreating(true);
    setStartError(null);
    try {
      await createLobby({ maxPlayers, endCondition, endLimit });
    } catch {
      notifyError('Nie udało się utworzyć pokoju. Sprawdź połączenie z backendem.');
    }
    setCreating(false);
  };

  const handleAddBot = async () => {
    if (!hasRoom) return;
    const ok = await addLobbyBot(lobbyCode);
    if (!ok) {
      notifyError('Nie udało się dodać bota.');
    }
  };

  const handleStartGame = async () => {
    setStartError(null);
    if (!hasRoom || !canStart) return;

    setStarting(true);
    const settings = { maxPlayers, endCondition, endLimit };
    const { ok, gameId: serverGameId } = await startLobbyGame(lobbyCode, settings);
    const currentGameId = useGameStore.getState().gameId;
    const resolvedId = serverGameId ?? currentGameId;

    if (ok && resolvedId) {
      notifySuccess('Gra uruchomiona na serwerze — łączenie z pokojem gry.');
      navigate('/game');
      setStarting(false);
      return;
    }

    setStartError('Nie udało się uruchomić gry. Spróbuj ponownie za chwilę.');
    setStarting(false);
  };

  return (
    <div className="w-full max-w-xl mx-auto px-4 py-8 relative">
      <div className="bg-white/95 backdrop-blur-xl border border-gray-100 rounded-[2.5rem] shadow-2xl p-8 md:p-12 space-y-10">
        {startError && (
          <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800 border border-amber-200">
            {startError}
          </p>
        )}
        <div className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-gray-900 rounded-[1.5rem] flex items-center justify-center text-white mb-6 rotate-[-10deg] shadow-lg">
            <Settings2 size={32} className="text-orange-400" />
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">
            Ustawienia Lobby
          </h1>
          <p className="text-gray-500 font-medium">
            {hasRoom
              ? 'Udostępnij kod znajomym; po starcie gra przejdzie na serwer.'
              : 'Utwórz pokój, aby zaprosić graczy do lobby.'}
          </p>
        </div>

        {!hasRoom && (
          <Button
            size="lg"
            onClick={handleCreateRoom}
            disabled={creating}
            className="w-full flex items-center justify-center gap-3 py-6 rounded-2xl"
          >
            <Plus size={22} />
            {creating ? 'Tworzenie…' : 'Stwórz pokój'}
          </Button>
        )}

        <div className="bg-orange-50 border-2 border-orange-200 rounded-3xl p-6 text-center relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-r from-orange-400/10 to-transparent pointer-events-none" />
          <p className="text-xs font-bold text-orange-600 uppercase tracking-widest mb-2">Kod Lobby</p>
          <div className="flex justify-center items-center gap-4">
            <span className="text-5xl font-black text-gray-900 tracking-[0.2em]">{lobbyCode}</span>
            {hasRoom && (
              <button
                onClick={handleCopy}
                className="p-3 bg-white border border-orange-200 rounded-xl text-orange-600 hover:bg-orange-100 transition-colors shadow-sm active:scale-95"
                title="Skopiuj kod"
                type="button"
              >
                <Copy size={24} />
              </button>
            )}
          </div>
        </div>

        <div className="space-y-8">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <label className="flex items-center gap-2 font-bold text-gray-900 text-lg">
                <img src="/Ikony/PlayerIcon.svg" className="w-6 h-6 opacity-60" alt="" />
                Maksymalna liczba graczy
              </label>
              <span className="bg-gray-100 text-gray-900 px-4 py-1 rounded-full font-black text-xl">
                {maxPlayers}
              </span>
            </div>
            <input
              type="range"
              min={MIN_PLAYERS}
              max={MAX_PLAYERS_CAP}
              value={maxPlayers}
              onChange={(e) => setMaxPlayers(parseInt(e.target.value, 10))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-500 hover:accent-orange-600"
            />
            <div className="flex justify-between text-xs font-bold text-gray-400">
              <span>{MIN_PLAYERS}</span>
              <span>{MAX_PLAYERS_CAP}</span>
            </div>
            <p className="text-xs text-gray-500 font-medium">
              Zasady Dixit: od {MIN_PLAYERS} do {MAX_PLAYERS_CAP} graczy w pokoju.
            </p>
          </div>

          <div className="space-y-4">
            <label className="flex items-center gap-2 font-bold text-gray-900 text-lg mb-2">
              <Flag className="text-gray-400" />
              Warunek końca gry
            </label>
            <div className="bg-gray-100 p-1.5 rounded-2xl flex w-full relative">
              <div
                className={`absolute inset-y-1.5 left-1.5 w-[calc(50%-6px)] bg-white rounded-xl shadow-sm transition-all duration-300 ease-out z-0 ${
                  endCondition === 'rounds' ? 'translate-x-full' : ''
                }`}
              />
              <button
                type="button"
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold z-10 transition-colors ${
                  endCondition === 'points' ? 'text-orange-600' : 'text-gray-500 hover:text-gray-900'
                }`}
                onClick={() => setEndCondition('points')}
              >
                <Trophy size={18} /> Limit Punktów
              </button>
              <button
                type="button"
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold z-10 transition-colors ${
                  endCondition === 'rounds' ? 'text-orange-600' : 'text-gray-500 hover:text-gray-900'
                }`}
                onClick={() => setEndCondition('rounds')}
              >
                <Flag size={18} /> Limit Rund
              </button>
            </div>

            <div className="flex items-center justify-between bg-gray-50 border border-gray-200 p-4 rounded-2xl">
              <span className="font-medium text-gray-700">
                {endCondition === 'points' ? 'Wymagane punkty do wygranej:' : 'Liczba rund do zagrania:'}
              </span>
              <Input
                type="number"
                value={endLimit}
                onChange={(e) => {
                const next = parseInt(e.target.value, 10);
                setEndLimit(Number.isFinite(next) ? next : DEFAULT_LOBBY_SETTINGS.endLimit);
              }}
                className="w-24 text-center font-bold text-lg h-10"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <label className="flex items-center gap-2 font-bold text-gray-900 text-lg">
                Dołączyli Gracze ({playerCount}/{maxPlayers})
              </label>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddBot}
                disabled={!hasRoom || playerCount >= maxPlayers}
                className="h-8 text-xs gap-1.5"
              >
                <Bot size={14} /> Dodaj AI
              </Button>
            </div>
            {creating ? (
              <LobbyPlayerList players={[]} maxPlayers={maxPlayers} loading loadingCount={3} />
            ) : (
              <LobbyPlayerList
                players={storePlayers}
                maxPlayers={maxPlayers}
                myId={myId}
                showEmptySlots={hasRoom}
              />
            )}
            {!hasRoom && !creating && (
              <p className="text-center text-sm text-gray-500 font-medium">
                Najpierw utwórz pokój, aby zobaczyć listę graczy.
              </p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Button
            size="lg"
            onClick={handleStartGame}
            disabled={!canStart || starting}
            className="w-full flex items-center justify-center gap-4 py-8 rounded-2xl text-xl shadow-xl shadow-orange-500/20"
          >
            <img src="/Ikony/AcceptIcon.svg" className="w-8 h-8" alt="" />
            {starting ? 'Uruchamianie…' : 'Rozpocznij Grę'}
          </Button>
          {hasRoom && playerCount < MIN_PLAYERS && (
            <p className="text-center text-sm font-bold text-amber-700">
              Dixit wymaga co najmniej {MIN_PLAYERS} graczy (dodaj boty lub poczekaj na dołączenia).
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
