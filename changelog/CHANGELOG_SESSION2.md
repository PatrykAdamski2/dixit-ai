# Changelog — sesja 2

## Bugi naprawione

### Krytyczne

**Socket.io wysyłał `image_data` (Buffer) w payloadach**
- `server/handlers/gameHandler.js` — `connected_to_game`, `start_voting`, `round_ended`
- `server/lib/botOrchestrator.js` — `_transitionToVoting`
- Prisma zwraca `image_data` jako `Buffer`; socket.io przełączał się w tryb binarny i korumpował cały payload → frontend otrzymywał pusty stan, gracz nie widział kart
- Fix: strip `image_data` przed emisją, dodaj `image_url: /api/cards/:id/image`

**`narratorId` nigdy nie był ustawiany w storze**
- `client/src/app/store/useGameStore.ts` — `setGameState`
- Funkcja nadpisywała `narratorId` starą wartością gdy `players` nie był przekazany → `isNarrator` zawsze `false` → gracz zawsze widział `NarratorTurnView` zamiast `NarratorHandView`
- Fix: jeśli `narratorId` jest jawnie w `newState`, użyj go

**`new_round` nie aktualizował `narratorId`**
- `client/src/app/services/gameSocket.ts`
- Handler `new_round` ignorował `narrator_player_id` z payloadu → po rundzie 1 `isNarrator` był zły
- Fix: odczytaj `narrator_player_id` i ustaw `narratorId` w storze

**`myHand` nie odświeżała się po rundzie**
- `server/handlers/gameHandler.js` — `_endRound`
- Po zakończeniu rundy serwer usuwał zagraną kartę z DB, ale frontend nadal ją pokazywał → "nie masz tej karty w ręce" przy próbie użycia w następnej rundzie
- Fix: po dobieraniu kart serwer emituje `hand_updated` do per-player room (`player:<id>`); klient obsługuje nowy event

**Transakcja Prisma timeout przy dobieraniu kart**
- `server/handlers/gameHandler.js` — `_endRound`
- `drawCards` wykonywał ~5 zapytań per gracz wewnątrz jednej interaktywnej transakcji → timeout 5s → karty nie były dobierane → boty miały coraz mniej kart w kolejnych rundach
- Fix: usunięto transakcję, każdy gracz dobiera kartę sekwencyjnie poza transakcją

**`connect_to_game` nie był idempotentny**
- `server/handlers/gameHandler.js`
- Ponowne wywołanie dla tej samej gry zwracało błąd → React StrictMode (double mount) ustawiał `socketError` i losowo resetował UI
- Fix: jeśli `socket.game_id === game_id`, odśwież stan zamiast zwracać błąd

### Widoki / UI

**Narrator podczas głosowania widział dekoracyjne karty zamiast kart na stole**
- `client/src/app/views/Gameplay/GameBoard.tsx`
- Case `voting` pokazywał `NarratorTurnView` dla narratora zamiast `NarratorVoteView`
- Fix: zmieniono na `<NarratorVoteView />` dla narratora podczas `voting`

### Serwowanie obrazków

**`GET /api/cards/:id/image` zwracał 404 dla kart z relatywną ścieżką**
- `server/routes/cards.js`
- Endpoint obsługiwał tylko `image_data` i `http://` URL; karty z `image_url = /Karty/...` dostawały 404
- Fix: dodano `res.sendFile` dla relatywnych ścieżek

**Karty 23–30 w TestSet wskazywały na nieistniejące pliki**
- Fix skryptem DB: przekierowano na KartaNr1–8 (cykl)

### Boty


**`getCardImageB64` nie obsługiwał relatywnych ścieżek `/Karty/`**
- `server/lib/botClient.js`
- Obsługiwało tylko `image_data` i `http://` URL; karty z `/Karty/...` rzucały wyjątek → fallback clue
- Fix: dodano `fs.readFileSync` dla relatywnych ścieżek

**Fallback clue zawsze był "mystery"**
- `server/lib/botOrchestrator.js`
- Fix: tablica 28 losowych polskich skojarzeń zamiast stałego "mystery"

**Lobby przypisywało `TestSet` zamiast `Dixit Classic`**
- `server/routes/lobby.js`
- `findFirst()` bez sortowania brało pierwszy zestaw z bazy (TestSet)
- Fix: preferuj zestaw o nazwie "Dixit Classic"

### Timery / auto-advance

**Timer dobiegał do 0 i nic się nie działo**
- `server/lib/gameTimer.js`, `server/lib/botOrchestrator.js`, `server/handlers/gameHandler.js`, `server/routes/lobby.js`
- Brak obsługi wygaśnięcia timera — gra zawieszała się gdy gracz/bot nie zdążył w czasie
- Fix: `startPhaseTimer` przyjmuje callback `onExpire`; dodano `handlePromptingExpiry`, `handleSubmittingExpiry`, `handleVotingExpiry` — auto-wybierają losowe karty/głosy dla spóźnionych graczy

## Nowe pliki

| Plik | Opis |
|------|------|
| `server/scripts/seed-real-cards.js` | Wgrywa karty PNG z `public/Karty/` do zestawu "Dixit Classic" |

## Uwagi

- Gemini API (hasła dla botów) może zwracać 503 w godzinach szczytu — bot używa wtedy losowego polskiego skojarzenia
- Po każdej zmianie `.env` wymagane `docker compose up -d --force-recreate <service>` (nie samo `restart`)
- Per-player socket room `player:<id>` — serwer może teraz emitować eventy bezpośrednio do konkretnego gracza
