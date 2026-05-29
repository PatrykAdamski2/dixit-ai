# Dixit AI — frontend (Vite + React)

## Uruchomienie

```bash
npm install
npm run dev
```

UI: `http://localhost:5173` (proxy `/api` i `/socket.io` → backend na `:3000`).

```bash
npm run build   # weryfikacja TypeScript + Vite
```

**Backend jest wymagany** do logowania, lobby i gry multiplayer.

## Trasy aplikacji

| Ścieżka | Opis |
|---------|------|
| `/` | Logowanie / rejestracja (`GuestOnly`) |
| `/menu` | Menu główne |
| `/host` | Utworzenie pokoju, boty, start gry |
| `/join` | Dołączenie kodem 6 znaków |
| `/game` | Rozgrywka (fazy przez Socket.io) |
| `/stats` | Ranking i statystyki gracza |
| `/psycho-profile` | Profil psychologiczny (wykres; API planowane) |
| `/personalization` | Zestawy kart (API lub podgląd) |
| `/my-cards` | Własne karty — upload i edytor canvas |

Chronione trasy: `RequireAuth`. **Brak** `/preview/*` i panelu Dev.

## Przepływ gry (multiplayer)

1. Zaloguj się — `session.ts` wywołuje `socket.connect()`.
2. Host: `/host` → **Stwórz pokój** → dodaj graczy/boty (min. 3) → **Rozpocznij grę**.
3. Join: `/join` → kod 6 znaków → poczekalnia (lista z `lobbyUpdate`).
4. Po starcie: REST zwraca `gameId`; socket emituje `game_started` → `connect_to_game`.
5. `/game`: widoki faz wysyłają `submit_prompt` / `submit_card` / `submit_vote`.

Szczegóły eventów: [BACKEND_CHANGES.md](../BACKEND_CHANGES.md).

## Kontrakt store ↔ API

| Pole store | Źródło |
|------------|--------|
| `roomCode` | create / join / `lobbyUpdate` |
| `gameId` | start / `game_started` / `lobbyUpdate` |
| `players[]` | create / join / `lobbyUpdate` |
| `myId` | `connected_to_game` |
| `narratorId` | `connected_to_game` / `round_state` |
| `currentPhase` | eventy gry / `mapRoundStatus()` |
| `myHand[]` | `connected_to_game` (`mapServerCard`) |
| `tableCards[]` | `start_voting` |
| `lastRoundScores` | `round_ended` |
| `socketError` | socket `error` + toast (`socketNotify.ts`) |

Typy: `GameStateUpdatePayload` w `gameSocket.ts`, DTO lobby w `lobbyApi.ts`.

## Auth

- Chronione: `/menu`, `/host`, `/join`, `/game`, `/stats`, `/psycho-profile`, `/personalization`, `/my-cards`.
- **Wyloguj się** → `resetGame()` + `socket.disconnect()`.

## Karty

- W grze: `GET /api/cards/:id/image` (z `image_url` lub `mapServerCard`).
- Własne: `/my-cards` → `api.ts` (`fetchMyCards`, upload, canvas).
- Rewers: `/Karty/KartaRewers.svg` w `public/`.

## Znane luki integracji

- Po `new_round` frontend nie pobiera ponownie ręki z serwera.
- Po `game_over` nie mapuje pełnego payloadu wyników.
- Brak reconnectu przez `GET /api/game/:id` po odświeżeniu strony.

Stan projektu: [docs/STAN_PROJEKTU.md](../docs/STAN_PROJEKTU.md).
