# Manual Happy Path (3 players)

> **Nawigacja:** [docs/MAPOWANIE_KODU.md](docs/MAPOWANIE_KODU.md), [docs/STAN_PROJEKTU.md](docs/STAN_PROJEKTU.md).  
> **Wymaga:** działający backend (`:3000`), frontend (`:5173`), seed kart (`npm run seed` w `server/`).

## 0) Prerekwizyty

- `docker compose -f docker-compose.dev.yml up --build` **lub** lokalnie server + client
- W `.env`: `DATABASE_URL`, `JWT_SECRET`
- Seed wykonany — talia w bazie

## 1) Logowanie 3 graczy (oddzielne przeglądarki)

Otwórz trzy niezależne sesje (np. Chrome, Firefox, Edge albo profil normalny + 2× incognito).

Dla każdego gracza:

1. Wejdź na `http://localhost:5173/`
2. **Zarejestruj nowe konto** (lub użyj istniejącego)
   - Gracz A: `happyA` / `happyA@example.com` / `secret123`
   - Gracz B: `happyB` / `happyB@example.com` / `secret123`
   - Gracz C: `happyC` / `happyC@example.com` / `secret123`
3. Zaloguj się

Oczekiwane:

- Redirect do `/menu`
- Cookie `token` (httpOnly)
- W konsoli po loginie: połączenie Socket.io (jeśli `socket.connect()` w sesji)

## 2) Lobby (Host + Join)

### Host (Gracz A)

1. `/menu` → **Stwórz nową grę**
2. **Stwórz pokój** — pojawia się kod 6 znaków (np. `A9X2FB`)
3. Opcjonalnie: **Dodaj AI** (bot przez API), aby mieć ≥3 graczy szybciej
4. Upewnij się, że na liście jest **co najmniej 3 graczy**
5. **Rozpocznij grę** → przejście na `/game`, toast o uruchomieniu

### Join (Gracz B i C)

1. `/menu` → **Dołącz do lobby**
2. Wpisz ten sam kod (6 znaków) → **Dołącz do gry**
3. Poczekalnia — lista graczy aktualizuje się przez `lobbyUpdate`

Oczekiwane u wszystkich po starcie hosta:

- Event `game_started` (socket)
- Przekierowanie / wejście na `/game`
- Faza przechodzi z `waiting` do `prompting` po `connected_to_game`

## 3) Pełna runda (3 graczy)

Kolejność zależy od losowego narratora.

### Narrator

1. Widok ręki + pole skojarzenia (max ~8 słów)
2. Wybierz kartę, wpisz skojarzenie, zatwierdź → `submit_prompt`

### Pozostali gracze

1. Faza `submitting` — wybór jednej karty → `submit_card`
2. Faza `voting` — głos na kartę (nie własną) → `submit_vote`

### Po rundzie

1. Faza `scoring` — wykres punktów rundy (`round_ended`)
2. Kolejna runda — `new_round` → z powrotem `prompting` (sprawdź, czy ręka się odświeża — znana luka FE)
3. Gra do `game_over` → ekran końca → **Wróć do menu**

## 4) Checklist akceptacji

### Lobby

- [ ] Host tworzy pokój z kodem 6 znaków
- [ ] B i C dołączają tym samym kodem
- [ ] Lista graczy zsynchronizowana u wszystkich
- [ ] Start możliwy przy ≥3 graczach
- [ ] Po starcie wszyscy na `/game` bez ręcznego Dev

### Rozgrywka

- [ ] Narrator: hasło + karta
- [ ] Pozostali: karta + głos
- [ ] Wynik rundy widoczny
- [ ] Kolejne rundy (rotacja narratora)
- [ ] Koniec partii i powrót do menu

### Opcjonalnie

- [ ] `/stats` — ranking z API (może być pusty)
- [ ] `/my-cards` — upload / zapis karty
- [ ] `/personalization` — komunikat o braku API (jeśli BE nie wdrożony)

### Build

- [ ] `cd client && npm run build` — bez błędów TS
- [ ] `cd server && npm run test:api` — przy skonfigurowanej bazie testowej

## Znane ograniczenia (przy interpretacji wyników)

- Po `new_round` frontend może **nie** odświeżyć ręki — obserwuj w długiej grze.
- `game_over` nie mapuje jeszcze pełnego payloadu wyników do wykresu końcowego.
- Odświeżenie strony w trakcie partii — brak automatycznego reconnectu (`GET /api/game/:id`).

Szczegóły: [docs/ZMIANY_FRONTEND.md](docs/ZMIANY_FRONTEND.md).
