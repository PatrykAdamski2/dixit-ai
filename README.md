# Dixit AI

Wieloosobowa gra inspirowana **Dixit** — karty z surrealistycznymi ilustracjami, narrator wymyśla skojarzenie, pozostali gracze dobierają karty, potem głosują. W planie: **boty AI** (Gemini + OpenCLIP), statystyki, personalizacja, własne karty (po MVP).

**Stan na dziś:** auth + **pełna gra w trybie demo** (jedna przeglądarka); lobby z toastami i `join_room`, min. 3 graczy w UI; backend REST lobby i multiplayer 3 osób — w toku ([docs/STAN_PROJEKTU.md](docs/STAN_PROJEKTU.md), [docs/ZMIANY_FRONTEND.md](docs/ZMIANY_FRONTEND.md)).

## Szybki start

| Krok | Polecenie / adres |
|------|-------------------|
| Konfiguracja | Skopiuj `.env.example` → `.env` i uzupełnij `DATABASE_URL`, `JWT_SECRET`, opcjonalnie `GEMINI_API_KEY` |
| Docker (dev) | `docker compose -f docker-compose.dev.yml up --build` — szczegóły: [docs/URUCHOMIENIE.md](docs/URUCHOMIENIE.md) |
| Frontend | http://localhost:5173 |
| Backend API + Socket.io | http://localhost:3000 |
| Bot AI (FastAPI) | http://localhost:8000 |

Bez Dockera: osobno `npm install && npm run dev` w `server/` i `client/`, Postgres lokalnie, bot: `cd bot && uv sync && uv run uvicorn src.main:app --reload`.

**Szybki test UI bez lobby API:** zaloguj się → menu → **Gra demonstracyjna** lub `client/README.md` (preview, panel Dev).

## Gdzie szukać informacji

| Temat | Plik |
|-------|------|
| **Indeks całej dokumentacji** | [docs/INDEKS.md](docs/INDEKS.md) |
| Uruchomienie Docker, logi, problemy | [docs/URUCHOMIENIE.md](docs/URUCHOMIENIE.md) |
| Zasady Dixit i mapowanie na kod | [docs/GRA_DIXIT.md](docs/GRA_DIXIT.md) |
| Stack, moduły, porty, baza | [docs/ARCHITEKTURA.md](docs/ARCHITEKTURA.md) |
| Co działa vs plan tygodniowy | [docs/STAN_PROJEKTU.md](docs/STAN_PROJEKTU.md) |
| **Plan MVP (podstawowa gra)** | [docs/PLAN_MVP_PODSTAWOWY.md](docs/PLAN_MVP_PODSTAWOWY.md) |
| **Plan prac — podział na zespół** | [docs/PLAN_ZESPOL.md](docs/PLAN_ZESPOL.md) |
| Własne karty (interesariusze + negocjacje) | [docs/FUNKCJONALNOSC_WLASNE_KARTY.md](docs/FUNKCJONALNOSC_WLASNE_KARTY.md) |
| Ostatnie zmiany frontendu | [docs/ZMIANY_FRONTEND.md](docs/ZMIANY_FRONTEND.md) |
| Mapa plików i tras UI | [docs/MAPOWANIE_KODU.md](docs/MAPOWANIE_KODU.md) |
| Test ręczny 3 graczy | [MANUAL_HAPPY_PATH.md](MANUAL_HAPPY_PATH.md) *(część tras może być nieaktualna — patrz MAPOWANIE_KODU)* |
| Wymagania API od frontendu | [docs/TODO.txt](docs/TODO.txt) |
| Przykładowe zapytania Prisma (gra) | [przykładowe_zapytania.md](przykładowe_zapytania.md) |
| Testy API (Jest) | [server/README_TESTS.md](server/README_TESTS.md) |
| Webhooki GitHub → Discord | [server/WEBHOOKS_GITHUB_DISCORD.md](server/WEBHOOKS_GITHUB_DISCORD.md) |

Dla asystentów AI w Cursorze: [AGENTS.md](AGENTS.md).

## Struktura repozytorium

```
dixit-ai/
├── client/          React + Vite + Tailwind (UI gry)
├── server/          Express + Socket.io + Prisma (API, multiplayer)
├── bot/             FastAPI — Gemini (narrator) + OpenCLIP (gracz)
├── docs/            Plany tygodniowe, CSV, dokumentacja projektu
├── docker-compose.dev.yml
└── .env.example
```

Repozytorium GitHub (wg `package.json`): https://github.com/Filip082/dixit-ai

### Przed pierwszym pushem na GitHub

1. Skopiuj `.env.example` → `.env` lokalnie (plik `.env` **nie** trafia do gita).
2. Folder `dixit-ai-main/` to stara kopia/archiwum — jest w `.gitignore`; pracuj w `client/`, `server/`, `bot/` w korzeniu repo.
3. `npm install` w `client/` i `server/` — commituj `package-lock.json`, **nie** commituj `node_modules/`.
4. Model OpenCLIP: `bot/model/` jest ignorowany (pobierany w Dockerze / lokalnie).
5. Sprawdź: `git status` nie powinien pokazywać `.env`, `node_modules`, ani `dixit-ai-main/`.
