# Manual Happy Path (3 players)

> Stan na teraz: aplikacja ma działające API rejestracji/logowania oraz UI lobby + widoki gameplay jako **podglądy** (osobne route’y). Nie ma jeszcze spiętej logiki gry multiplayer (brak klientowego socket.io / game state), więc „przejście faz” wykonuje się przez przechodzenie po route’ach.

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
- Można zmienić suwak max graczy (3–8)
- Można przełączyć warunek końca (punkty/rundy) i limit
- Lista „Dołączyli Gracze” jest widoczna

### Join (Gracz B i C)
1. `/menu` → **Dołącz do lobby**
2. Wpisz `A9X2FB` (6 znaków)
3. Kliknij **Dołącz do gry**

Oczekiwane:
- Przed 6 znakami przycisk jest disabled
- Po join widok „Poczekalnia: A9X2FB”

## 3) Cztery fazy gry (widoki preview)

> Te fazy są obecnie osobnymi route’ami — nie ma automatycznego przejścia między nimi.

### Faza 1 — Narrator wybiera kartę + skojarzenie
- Wejdź na `/narrator-hand`
- Wpisz skojarzenie (np. „Kosmiczna odyseja”)
- Kliknij kartę (powinna się podświetlić / zaznaczyć)

### Faza 2 — Gracze wybierają kartę
- Wejdź na `/player-hand`
- Kliknij kartę (zaznaczenie)

### Faza 3 — Głosowanie
- Gracze: `/player-vote` (wybierz kartę narratora)
- Narrator/podgląd: `/narrator-vote` (podgląd kart w rundzie)

### Faza 4 — Wynik rundy + koniec gry
- `/round-score` (wykres punktów rundy)
- `/round-end` (ekran zwycięzcy + powrót do menu)

## Aktualne ograniczenia (ważne przy interpretacji wyników)

- Widoki `HostGameView` i `JoinLobbyView` mają hard-coded listy graczy (nie odzwierciedlają realnego stanu serwera).
- Widoki gameplay są mockami — brak synchronizacji między graczami i brak faktycznego przejścia faz.
- W `/menu` powitanie jest statyczne (nie pobiera zalogowanego użytkownika).
