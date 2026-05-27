# Manual Happy Path (3 players)

> **Nawigacja:** aktualne trasy UI i stan projektu — [docs/MAPOWANIE_KODU.md](docs/MAPOWANIE_KODU.md), [docs/STAN_PROJEKTU.md](docs/STAN_PROJEKTU.md).  
> **Trasy preview (aktualne):** `/preview/narrator-hand`, `/preview/player-hand`, `/preview/player-vote`, itd. (nie `/narrator-hand`).

> **Stan na teraz:** działa auth + socket (po zalogowaniu). Lobby API na serwerze **brak** — host/join używają trybu **demo** lub pustej listy graczy. Pełna gra multiplayer wymaga backendu z [PLAN_MVP_PODSTAWOWY.md](docs/PLAN_MVP_PODSTAWOWY.md).
>
> **Szybki test bez 3 graczy i API:** menu → **Gra demonstracyjna** → `/game` (fazy w jednym widoku).

## 0) Prerekwizyty

- Backend działa na `http://localhost:3000`
- Frontend (Vite) działa na `http://localhost:5173`
- W `server/.env` ustawione jest `DATABASE_URL` i `JWT_SECRET`
- (Opcjonalnie) testowa baza Postgres w WSL: `dixit_ai_test` + user `dixit_test`

## 1) Logowanie 3 graczy (oddzielne przeglądarki)

Otwórz trzy niezależne sesje (np. Chrome, Firefox, Edge albo 1x incognito + 2x normal).

Dla każdego gracza:
1. Wejdź na `http://localhost:5173/`
2. Kliknij **Zarejestruj nowe konto**
3. Utwórz konto:
   - Gracz A: login `happyA`, email `happyA@example.com`, hasło `secret123`
   - Gracz B: login `happyB`, email `happyB@example.com`, hasło `secret123`
   - Gracz C: login `happyC`, email `happyC@example.com`, hasło `secret123`
4. Zaloguj się tym loginem i hasłem

Oczekiwane:
- Po loginie redirect do `/menu`
- W DevTools → Application/Storage widać cookie `token` (httpOnly)
- (Opcjonalnie) w konsoli przeglądarki: `fetch('/api/auth/me').then(r=>r.json())` zwraca `username` i `id`

## 2) Lobby (Host + Join)

### Host (Gracz A)
1. `/menu` → **Stwórz nową grę**
2. Skopiuj kod lobby (UI pokazuje `A9X2FB`)

Oczekiwane:
- Można zmienić suwak max graczy (3–8); **Start** wymaga min. 3 graczy w pokoju
- Można przełączyć warunek końca (punkty/rundy) i limit
- Lista „Dołączyli Gracze” jest widoczna

### Join (Gracz B i C)
1. `/menu` → **Dołącz do lobby**
2. Wpisz `A9X2FB` (6 znaków)
3. Kliknij **Dołącz do gry**

Oczekiwane:
- Przed 6 znakami przycisk jest disabled
- Po join widok „Poczekalnia: A9X2FB”

## 3) Fazy gry

### A) Tryb demonstracyjny (zalecany bez API lobby)

1. Zaloguj się → `/menu` → **Gra demonstracyjna**
2. Automatycznie `/game`, faza `prompting`, karty z `mockCards.ts`
3. Panel **Dev** (prawy dolny róg): przełączanie faz `submitting`, `voting`, `scoring`, `ended`

### B) Podglądy UI (`/preview/*`)

> Osobne route’y z auto-seedem — bez przejścia między graczami.

### Faza 1 — Narrator wybiera kartę + skojarzenie
- Wejdź na `/preview/narrator-hand`
- Wpisz skojarzenie (np. „Kosmiczna odyseja”)
- Kliknij kartę (powinna się podświetlić / zaznaczyć)

### Faza 2 — Gracze wybierają kartę
- Wejdź na `/preview/player-hand`
- Kliknij kartę (zaznaczenie)

### Faza 3 — Głosowanie
- Gracze: `/preview/player-vote` (wybierz kartę narratora)
- Narrator/podgląd: `/preview/narrator-vote` (podgląd kart w rundzie)

### Faza 4 — Wynik rundy + koniec gry
- `/preview/round-score` (wykres punktów rundy)
- `/preview/round-end` (ekran zwycięzcy + powrót do menu)

## 4) Tylko frontend (bez backendu lobby) — checklista

Wykonaj po `npm run dev` w `client/` (auth może być wyłączony tylko na `/preview/*`).

### Menu i lobby
- [ ] `/menu` — **Gra demonstracyjna** → `/game`, baner demo, toast nie jest wymagany
- [ ] `/host` — **Stwórz pokój** → toast „demonstracyjny”, kod 6 znaków, min. 3 graczy do startu
- [ ] `/host` — **Dodaj AI** → lista rośnie w demo
- [ ] `/host` — **Rozpocznij grę** → toast (demo vs serwer), przejście na `/game`
- [ ] `/join` — kod 6 znaków → poczekalnia, skeleton gdy brak graczy, `join_room` (Network → socket)

### Rozgrywka (demo lub Dev)
- [ ] `/game` w demo: narrator → skojarzenie → submitting → voting → scoring → **Kontynuuj** / **Zakończ grę**
- [ ] Głosowanie: zaznaczenie karty, przycisk disabled po głosie
- [ ] Błąd socket (Dev, złe `game_id`) → czerwony banner + toast
- [ ] `/preview/*` — każda trasa: layout, karty 2:3, brak pustego ekranu
- [ ] RWD: wąski (~360px), średni (~768px), szeroki — przewijanie ręki w poziomie

### Widoki pomocnicze
- [ ] `/stats` — mock rankingu + baner API
- [ ] `/personalization` — mock motywów, lokalny „kup” / „wybierz”
- [ ] `/preview/round-end` — **Wróć do menu** czyści grę (`resetGame`)

### Build
- [ ] `cd client && npm run build` — brak błędów TS

## Aktualne ograniczenia (ważne przy interpretacji wyników)

- Lobby **nie synchronizuje** 3 przeglądarek bez REST + `lobbyUpdate` z graczami (FE wysyła już `join_room`).
- Automatyczny host → join → start **bez demo** wymaga backendu z planu MVP.
- W **trybie demo** cała pętla faz działa lokalnie (`advanceDemoAfter*`); punkty na scoring są symulowane.
- Produkcja: punkty i kolejne rundy po `gameStateUpdate` / evencie z serwera.

Szczegóły zmian FE: [docs/ZMIANY_FRONTEND.md](docs/ZMIANY_FRONTEND.md).
