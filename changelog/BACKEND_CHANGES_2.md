# Changelog — zmiany backendowe (sesja 2026-05-29)

Wszystkie zmiany dotyczą wyłącznie `server/`. Brak migracji schematu Prisma.

---

## Nowe pliki

### `server/lib/botClient.js`
Klient HTTP do serwisu AI bota (Python FastAPI).

- `narratorPrompt(cardId)` → `POST /generate-prompt/pl` → zwraca hasło (string)
- `chooseCard(clue, cardIds[])` → `POST /choose-card` → zwraca index najlepszej karty
- Używa trybu `image_b64`: czyta `image_data` (bytea) z Prisma i konwertuje na base64 — działa nawet gdy `image_url = null` (karty zasiane przez `npm run seed`)
- Graceful fallback: jeśli `image_data` null i `image_url` to absolutny URL → pobiera przez `fetch`
- Wymaga zmiennej `BOT_SERVICE_URL` w `.env` (domyślnie `http://localhost:8000`)

---

### `server/lib/botOrchestrator.js`
Pełna logika wykonywania ruchów botów — 3 fazy gry.

#### `handleNarratorIfBot(io, gameId, round)`
- Sprawdza czy narrator rundy jest botem (`is_bot = true`)
- Jeśli tak: wybiera kartę z ręki, wywołuje `botClient.narratorPrompt()`, zapisuje do DB, emituje `prompt_submitted`, startuje timer submitting
- Idempotentne — sprawdza czy submission już istnieje (bezpieczne przy wielokrotnym wywołaniu)
- Fallback hasło: `"mystery"` gdy AI niedostępne

#### `handleBotSubmissions(io, gameId, roundId, clue)`
- Dla każdego bota (nie-narrator): pobiera rękę, wywołuje `botClient.chooseCard()`, tworzy `round_submission`
- Po każdym submissie sprawdza czy wszyscy przesłali → jeśli tak: przejście do fazy głosowania
- Fallback: losowa karta gdy AI niedostępne

#### `handleBotVotes(io, gameId, round, allSubmissions, allPlayers)`
- Dla każdego bota (nie-narrator): wywołuje `botClient.chooseCard()` na kartach submissji, tworzy `round_vote`
- Po każdym głosie sprawdza kworum (`totalPlayers - 1`) → jeśli osiągnięte: wywołuje `_endRound`
- Lazy `require('../handlers/gameHandler')` wewnątrz funkcji — unika circular dependency
- Fallback: losowy głos gdy AI niedostępne

#### `_transitionToVoting(io, gameId, round, allPlayers)`
- Współdzielona logika przejścia do fazy voting (używana gdy wszystkie submissje są gotowe)

---

### `server/lib/gameTimer.js`
Moduł timerów faz gry. Emituje event `timerTick` do wszystkich graczy w grze.

- `startPhaseTimer(io, gameId, phase)` — startuje odliczanie, emituje `{ seconds_left, phase }` co sekundę
- `clearPhaseTimer(gameId)` — zatrzymuje timer (wywołane przy `game_over`)
- Czasy faz: `prompting = 60s`, `submitting = 60s`, `voting = 45s`
- FE już nasłuchuje na `timerTick` w `socket.ts`

---

## Zmodyfikowane pliki

### `server/handlers/gameHandler.js`

| Zmiana | Linia | Opis |
|--------|-------|------|
| Import `botOrchestrator` | góra pliku | Podpięcie orchestratora |
| Import `gameTimer` | góra pliku | Już było z poprzedniej sesji |
| Bot submissions trigger | po `prompt_submitted` emit | `handleBotSubmissions()` gdy narrator = człowiek |
| Bot votes trigger | po `start_voting` emit | `handleBotVotes()` gdy wszystkie submissje złożone |
| Bot narrator trigger | po `new_round` emit | `handleNarratorIfBot()` dla kolejnych rund |
| Remis fix | `isWinner` | Usunięty błędny warunek `&& i === 0` — każdy z maxScore dostaje `games_won++` |
| Export `_endRound` | koniec pliku | `module.exports._endRound = _endRound` — dla lazy require w botOrchestrator |

---

### `server/routes/lobby.js`

| Zmiana | Opis |
|--------|------|
| Import `botOrchestrator` | Trigger rundy 1 |
| Import `gameTimer` | Już było |
| **Hotfix narratora** | `POST /start` — pierwszy narrator zawsze człowiek: `players.filter(p => !p.is_bot)` |
| Bot round 1 trigger | Po `game_started` emit: `handleNarratorIfBot()` dla rundy 1 (jeśli narrator byłby botem) |
| **Fix `POST /join`** | Akceptuje `{ code }` i `{ roomCode }` — FE wysyłało `{ code }`, backend czytał tylko `{ roomCode }` → join zawsze failował |
| **Fix `GET /default-settings`** | Zwraca camelCase `{ maxPlayers, endCondition, endLimit }` — FE (interface `LobbySettings`) oczekiwało camelCase, snake_case powodował bug NaN w polach liczbowych |
| Walidacja rounds ≥ 2 | `POST /create` — 400 gdy `end_condition=rounds` i `round_limit < 2` |

---

### `server/routes/stats.js`

| Zmiana | Opis |
|--------|------|
| Import `jwt` | Do opcjonalnego auth w `/global` |
| **Nowy `GET /api/stats/global`** | Leaderboard w formacie którego używa FE (`StatisticsView`): `{ topPlayers: [{rank, name, wins, avatar}], currentUserRank: {...} \| null }`. Auth opcjonalny — jeśli zalogowany, dołącza pozycję aktualnego gracza |
| `GET /api/stats/my-games` | Historia zakończonych gier zalogowanego gracza: `[{ game_id, started_at, ended_at, total_rounds, score, rank, players }]`. Parametry: `?limit=20&offset=0` |

> **Uwaga:** `GET /api/stats/leaderboard` nadal istnieje (stary format, nie używany przez FE).

---

### `server/routes/personalization.js`

| Zmiana | Opis |
|--------|------|
| **Format themes** | `GET /api/personalization/themes` zwraca teraz `{ themes: [...] }` zamiast `[...]` — FE (`PersonalizationView`) oczekiwało wrappera |
| **Pole `price`** | Każdy motyw ma `price: number` — FE używa go do logiki kupowania |
| **Fix `POST /select`** | Akceptuje `{ themeId }` i `{ theme_id }` — FE wysyłało `themeId` (camelCase), handler czytał `theme_id` |
| `POST /buy` | Zwraca 501 (nie 200) — FE przy 501 odpada do trybu mock, nie crashuje |

Motywy (statyczne, brak tabeli w DB):

| id | name | price |
|----|------|-------|
| `classic` | Classic | 0 (gratis) |
| `ocean` | Ocean | 100 |
| `forest` | Forest | 100 |
| `dark` | Dark | 200 |

---

### `server/routes/user.js`

| Zmiana | Opis |
|--------|------|
| **Kształt odpowiedzi** | `GET /api/user/profile` zwraca teraz pola oczekiwane przez `PersonalizationView`: `{ username, coins, avatar, activeThemeId, ownedThemeIds, stats }` |
| `coins` | Zawsze `0` — system walut niezaimplementowany w schemacie |
| `avatar` | Pierwsze 2 litery username (uppercase) |
| `activeThemeId` | Zawsze `"classic"` — brak tabeli preferencji |
| `ownedThemeIds` | Zawsze `["classic"]` — brak tabeli preferencji |

---

### `server/routes/cards.js`

| Zmiana | Opis |
|--------|------|
| **Fallback image_url** | `GET /api/cards/:id/image` — jeśli `image_data = null` ale `image_url` jest absolutnym URL (`http...`): redirect 302. Naprawia szare karty dla kart z URL zamiast binarnych danych |

Priorytet serwowania:
1. `image_data` (bytea) → serwuje PNG bezpośrednio
2. `image_url` zaczyna się od `http` → redirect 302
3. Brak obu → 404

---

### `.env.example`

Dodana zmienna:
```
BOT_SERVICE_URL="http://localhost:8000"
```

---

## Co nadal wymaga pracy

| Obszar | Co zrobić |
|--------|-----------|
| **Seed kart** | Pliki PNG do `server/public/Karty/` → `npm run seed`. Bez seeda karty w DB nie mają `image_data` → szare. |
| **Monety / waluta** | Brak tabeli w schemacie. `coins` zawsze 0, `buy` zawsze 501. Wymaga migracji Prisma. |
| **Personalizacja trwała** | `activeThemeId` / `ownedThemeIds` zawsze defaults. Wymaga nowej tabeli `user_settings`. |
| **Test E2E** | 3 konta / 3 przeglądarki: host → join → pełna runda z botami po wdrożeniu. |
| **psycho-profile** | Wspomniany w opisie PR frontu, ale nie wmerge'owany. Brak endpointu i kodu FE. |
