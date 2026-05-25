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

## Ścieżki testowe (MVP)


| Tryb          | Jak wejść                                                           | Backend    |
| ------------- | ------------------------------------------------------------------- | ---------- |
| **Produkcja** | `/` → logowanie → menu → host/join → gra po API/socket              | Wymagany   |
| **Demo**      | Menu → **Gra demonstracyjna** lub host → Start (toast + baner demo) | Nie        |
| **Preview**   | `/preview/narrator-hand`, `/preview/player-vote`, …                 | Nie        |
| **Dev**       | Panel w prawym dolnym rogu — `game_id`, fazy                        | Opcjonalny |


### Preview (QA UI)

- `/preview/narrator-hand` — narrator, faza `prompting`
- `/preview/narrator-turn` — oczekiwanie narratora
- `/preview/player-hand` — gracz, `submitting`
- `/preview/player-turn` — tura gracza
- `/preview/player-vote` — głosowanie
- `/preview/narrator-vote` — podgląd stołu
- `/preview/round-score` — wynik rundy (`scoring`)
- `/preview/round-end` — koniec gry (`ended`)

### Demo vs host (komunikaty)

- **Menu → Gra demonstracyjna** — `gameId: demo-game-id`, pełna pętla faz lokalnie (Dev lub przyciski w widokach).
- **Host → Stwórz pokój** — 404 na `/api/lobby/create` → kod demo + toast; `**join_room`** emitowany na socket.
- **Host → Rozpocznij grę** — sukces API → gra serwerowa; w przeciwnym razie toast + tryb demo (nie cicho).
- **Join** — lista z API/`lobbyUpdate`; bez API: skeleton + komunikat.
- **Start gry** wymaga **min. 3 graczy** (zasady Dixit).

## Kontrakt store ↔ API (docelowy)

Pola, które `useGameStore` powinien dostać po REST / socket (mapowanie w `lobbyApi.ts`, `gameSocket.ts`):


| Pole store       | Źródło                                                | Uwagi                                                      |
| ---------------- | ----------------------------------------------------- | ---------------------------------------------------------- |
| `roomCode`       | `create` / `join` / `lobbyUpdate`                     | 6 znaków                                                   |
| `gameId`         | `create` / `start` / `lobbyUpdate`                    | UUID; demo: `demo-game-id`                                 |
| `players[]`      | `create` / `join` / `lobbyUpdate` / `gameStateUpdate` | `id`, `username`, `score`, `is_narrator` → `isNarrator`, … |
| `myId`           | `connected_to_game` / `gameStateUpdate`               | ID gracza w grze                                           |
| `narratorId`     | `players` lub `round_state`                           |                                                            |
| `currentPhase`   | `gameStateUpdate` / `round_state.status`              | `mapRoundStatus()`                                         |
| `myHand[]`       | `connected_to_game` / `gameStateUpdate`               | karty: `mapServerCard({ id, image_url })`                  |
| `tableCards[]`   | `start_voting` / `gameStateUpdate`                    | `submission_id` + `card`                                   |
| `narratorPrompt` | `prompt_submitted` / round state                      |                                                            |
| `timer`          | `timerTick` / `gameStateUpdate`                       | sekundy                                                    |
| `socketError`    | socket `error`                                        | + toast (`socketNotify.ts`)                                |


Typy: `GameStateUpdatePayload` w `gameSocket.ts`, `LobbyPlayerDto` / `CreateLobbyResponse` w `lobbyApi.ts`.

## Auth

- Chronione trasy: `/menu`, `/host`, `/join`, `/game`, `/stats`, `/personalization` (`RequireAuth`).
- **Wyloguj się** → `resetGame()` + `socket.disconnect()`.

## Gra

- Fazy: `waiting` → `prompting` → `submitting` → `voting` → `scoring` → `ended`.
- Demo: `advanceDemoAfter`* w `demoLobby.ts` — przejścia bez serwera.
- **Kontynuuj** na scoring — tylko `gameId === 'demo-game-id'`.

