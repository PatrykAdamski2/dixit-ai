# Backend — co zostało zrobione i uwagi dla frontu

## TL;DR

Backend ma teraz w pełni działające: auth, lobby REST, lobby socket, grę przez socket.io
(punktacja, kolejne rundy, koniec gry) oraz endpointy statystyk i stanu gry.
Wszystkie 36 testów przechodzi.

---

## 1. Nowe endpointy REST

### Lobby — `/api/lobby`

| Metoda | Ścieżka | Auth | Opis |
|--------|---------|------|------|
| `POST` | `/api/lobby/create` | ✅ | Tworzy pokój, host automatycznie dołącza |
| `POST` | `/api/lobby/join` | ✅ | Dołącza do pokoju po kodzie |
| `POST` | `/api/lobby/start` | ✅ | Startuje grę (min. 3 graczy, tylko host) |
| `POST` | `/api/lobby/add-bot` | ✅ | Dodaje bota (tylko host) |
| `GET`  | `/api/lobby/default-settings` | ✅ | Domyślne ustawienia pokoju |
| `GET`  | `/api/lobby/:code` | ✅ | Aktualny stan lobby (gracze, ustawienia) |

#### Przykład: POST /api/lobby/create
```json
// Request body (wszystko opcjonalne):
{ "max_players": 6, "end_condition": "points", "point_limit": 30 }

// Response 201:
{
  "roomCode": "A9X2FB",
  "roomId": "uuid",
  "players": [
    { "id": "uuid", "username": "janek", "is_bot": false, "is_connected": true, "score": 0 }
  ]
}
```

#### Przykład: POST /api/lobby/join
```json
// Request body:
{ "roomCode": "A9X2FB" }

// Response 200 — taki sam kształt jak /create
```

#### Przykład: POST /api/lobby/start
```json
// Request body:
{ "roomCode": "A9X2FB" }

// Response 200:
{ "gameId": "uuid" }
```

#### Przykład: GET /api/lobby/:code
```json
// Response 200:
{
  "roomCode": "A9X2FB",
  "roomId": "uuid",
  "status": "waiting",
  "max_players": 6,
  "end_condition": "points",
  "point_limit": 30,
  "round_limit": null,
  "players": [...]
}
```

---

### Gra — `/api/game`

| Metoda | Ścieżka | Auth | Opis |
|--------|---------|------|------|
| `GET`  | `/api/game/:id` | ✅ | Stan gry (dla reconnektu) |

#### Przykład: GET /api/game/:id
```json
// Response 200:
{
  "game_id": "uuid",
  "status": "active",
  "current_round": 1,
  "player_id": "uuid",
  "round": {
    "id": "uuid",
    "round_number": 1,
    "status": "prompting",
    "narrator_player_id": "uuid",
    "prompt": null
  },
  "hand": [
    { "id": "uuid", "image_url": "/api/cards/{id}/image" }
  ],
  "scores": [
    { "player_id": "uuid", "username": "janek", "is_bot": false, "score": 0 }
  ]
}
```

---

### Statystyki — `/api/stats`

| Metoda | Ścieżka | Auth | Opis |
|--------|---------|------|------|
| `GET`  | `/api/stats/leaderboard` | ❌ | Top graczy (opcjonalnie `?limit=10`) |
| `GET`  | `/api/stats/me` | ✅ | Statystyki zalogowanego gracza |
| `GET`  | `/api/stats/game/:id` | ✅ | Wyniki konkretnej gry |

#### Przykład: GET /api/stats/leaderboard
```json
// Response 200:
[
  { "rank": 1, "username": "janek", "total_points": 150, "games_played": 5, "games_won": 2 },
  { "rank": 2, "username": "asia",  "total_points": 120, "games_played": 4, "games_won": 1 }
]
```

#### Przykład: GET /api/stats/me
```json
// Response 200 (nowy gracz):
{ "games_played": 0, "games_won": 0, "total_points": 0 }

// Response 200 (gracz z historią):
{ "games_played": 3, "games_won": 1, "total_points": 87, "updated_at": "..." }
```

---

## 2. Socket.io — pełny kontrakt

### Połączenie
Socket wymaga ciasteczka `token` (JWT z logowania). Bez tokena — połączenie odrzucone.

---

### Eventy lobby

#### Klient → Serwer

| Event | Payload | Kiedy wysłać |
|-------|---------|-------------|
| `join_room` | `{ roomCode: "A9X2FB" }` | Po create/join przez REST — podpina socket do kanału lobby |
| `leave_room` | brak | Gdy gracz opuszcza lobby |

#### Serwer → Klient

| Event | Payload | Kiedy |
|-------|---------|-------|
| `lobbyUpdate` | `{ players: [LobbyPlayerDto] }` | Przy każdej zmianie listy graczy |
| `game_started` | `{ gameId: "uuid" }` | Gdy host wystartuje grę przez REST |
| `lobby_closed` | `{ reason: "Host opuścił pokój" }` | Gdy host opuści lobby |
| `error` | `{ message: "..." }` | Błąd (zły kod, brak uprawnień) |

**LobbyPlayerDto:**
```json
{
  "id": "uuid",
  "username": "janek",
  "is_bot": false,
  "is_connected": true,
  "score": 0
}
```

---

### Eventy gry

#### Klient → Serwer

| Event | Payload | Kiedy wysłać |
|-------|---------|-------------|
| `connect_to_game` | `{ game_id: "uuid" }` | Po otrzymaniu `game_started` z lobby lub po reconnekcie |
| `submit_prompt` | `{ card_id: "uuid", prompt: "skojarzenie" }` | Narrator w fazie `prompting` |
| `submit_card` | `{ card_id: "uuid" }` | Non-narrator w fazie `submitting` |
| `submit_vote` | `{ submission_id: "uuid" }` | Non-narrator w fazie `voting` |
| `disconnect_from_game` | brak | Gdy gracz świadomie wychodzi z gry |

#### Serwer → Klient

| Event | Payload | Co zrobić na frontendzie |
|-------|---------|--------------------------|
| `connected_to_game` | `{ game_state, round_state, hand, player_id, scores }` | Ustaw stan gry, zapisz player_id |
| `prompt_submitted` | `{ prompt, narrator_player_id }` | Przejdź do fazy `submitting`, pokaż prompt |
| `player_submitted_card` | `{ player_id }` | Zaktualizuj UI (kto już oddał kartę) |
| `start_voting` | `{ cards: [{ submission_id, card }] }` | Przejdź do fazy `voting`, pokaż potasowane karty |
| `player_voted` | `{ player_id }` | Zaktualizuj UI (kto już zagłosował) |
| `round_ended` | patrz niżej | Pokaż wyniki rundy |
| `new_round` | `{ round_number, narrator_player_id, status }` | Zacznij nową rundę |
| `game_over` | `{ scores: [...] }` | Ekran końca gry |
| `error` | `{ message: "..." }` | Toast z błędem |

#### Payload `round_ended`:
```json
{
  "round_id": "uuid",
  "narrator_submission_id": "uuid",
  "scores": [
    { "player_id": "uuid", "round_points": 3, "total_score": 3 }
  ],
  "submissions": [
    { "submission_id": "uuid", "player_id": "uuid", "card": { "id": "uuid", "image_url": "..." } }
  ],
  "votes": [
    { "voter_player_id": "uuid", "voted_submission_id": "uuid" }
  ]
}
```

---

### Typowy flow gry — kolejność eventów

```
[REST] POST /api/lobby/create  → { roomCode }
[SOCK] join_room { roomCode }  → lobbyUpdate
[REST] POST /api/lobby/join    → lobbyUpdate (broadcast)
[SOCK] join_room { roomCode }  → lobbyUpdate
[REST] POST /api/lobby/start   → game_started { gameId } (broadcast do lobby)
[SOCK] connect_to_game { game_id } → connected_to_game { hand, round_state, ... }

--- runda ---
[SOCK] submit_prompt { card_id, prompt }  → prompt_submitted (broadcast)
[SOCK] submit_card { card_id }            → player_submitted_card (broadcast)
[SOCK] submit_card { card_id }            → player_submitted_card + start_voting (broadcast)
[SOCK] submit_vote { submission_id }      → player_voted (broadcast)
[SOCK] submit_vote { submission_id }      → player_voted + round_ended + new_round (broadcast)
--- kolejna runda lub game_over ---
```

---

## 3. Zasady punktacji (Dixit)

Implementacja w `server/lib/scoring.js`:

- Jeśli **wszyscy** non-narrator zagłosowali na kartę narratora → narrator **0**, inni **+2**
- Jeśli **nikt** nie zagłosował na kartę narratora → narrator **0**, inni **+2**
- W przeciwnym razie → narrator **+3**, każdy kto trafił kartę narratora **+3**
- **Bonus** (zawsze): każda karta non-narratora dostaje **+1** za każdy głos na nią

---

## 4. Zmiana w schemacie bazy

Dodana kolumna do tabeli `rooms`:
```sql
code VARCHAR(6) UNIQUE NOT NULL
```

Zastosuj przez: `npx prisma db push` lub migration SQL w `prisma/migrations/20260526000000_add_room_code/`.

---

## 5. Uruchamianie backendu

```bash
cd server
npm install
npx prisma generate
npx prisma db push         # lub migrate dev
npm run seed               # skanuje public/Karty/*.png i dodaje do bazy tylko istniejące pliki
npm run dev                # serwer na http://localhost:3000
```

### Zmienne środowiskowe (`server/.env`)
```
DATABASE_URL="postgresql://user:pass@host:5432/dbname"
JWT_SECRET="tajny-klucz"
```

---

## 6. Testy

```bash
npm run test:unit   # testy logiki punktacji — nie potrzebuje DB
npm run test:api    # testy REST + socket — potrzebuje DATABASE_URL
```

36 testów łącznie:
- 6 × scoring (unit, bez DB)
- 9 × auth REST
- 16 × lobby REST
- 4 × game REST
- 5 × stats REST
- 3 × lobby socket
- 8 × game socket (pełna runda)

---

## 7. Uwagi i sugestie dla frontu

### Reconnect
Po odświeżeniu strony front powinien:
1. `GET /api/auth/me` — sprawdź czy zalogowany
2. `GET /api/game/:id` — pobierz stan gry jeśli `gameId` jest w local storage
3. Socket `connect_to_game { game_id }` — podłącz do gry

### Karty — przechowywanie w bazie (bytea)

Obrazy kart są przechowywane jako `bytea` bezpośrednio w PostgreSQL. Nie ma plików statycznych.

**Pobieranie obrazu:**
```
GET /api/cards/:id/image
→ Content-Type: image/png (binarny)
```
Każda karta zwracana przez API ma pole `image_url: "/api/cards/{id}/image"`. Front powinien używać tego URL-a jako `src` w `<img>`.

**Seed domyślnej talii:**
- Umieść pliki PNG w `server/public/Karty/`
- `npm run seed` wczyta każdy plik i zapisze jako bytea w DB
- Katalog `public/Karty/` służy tylko jako źródło do seeda — po zasileniu bazy pliki nie są potrzebne do działania serwera

**Upload własnych kart (Faza 6):**

| Endpoint | Opis |
|----------|------|
| `POST /api/cards/upload` | multipart `image` (PNG/WebP, max 2 MB) → bytea |
| `POST /api/cards/canvas` | JSON `{ image_base64, tags }` — eksport z canvasa |
| `GET /api/cards/mine` | lista własnych kart |
| `GET /api/cards/sets/mine` | własne zestawy z listą kart |

Odpowiedź zawsze ma `image_url: "/api/cards/{id}/image"` — binarnych danych nie zwracamy w listach.

### Status pokoju
`rooms.status` może być: `waiting` | `in_game` | `finished`

### Fazy rundy
`rounds.status` może być: `prompting` | `submitting` | `voting` | `ended`

Mapowanie dla frontu (z frontpr.MD): `ended` → faza `scoring` w UI

### Narrator nie głosuje
Przy fazie `voting` — narrator nie może wysłać `submit_vote`, dostanie `error`.

### gameStateUpdate
Event `gameStateUpdate` (nasłuchiwany przez FE) **nie jest zaimplementowany** — zamiast niego używamy osobnych eventów (`prompt_submitted`, `start_voting`, itd.). Można to zmienić jeśli FE tego wymaga.

### CORS / cookies
Socket.io skonfigurowany z `cors: { origin: true, credentials: true }`.
Fetch na frontendzie musi używać `credentials: 'include'` żeby cookie `token` było wysyłane.
