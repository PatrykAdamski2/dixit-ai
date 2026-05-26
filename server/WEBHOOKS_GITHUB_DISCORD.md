# GitHub → Discord Webhooks (do wątku)

Backend ma endpoint:

- `POST /api/webhooks/github`

Pliki:
- Router: `server/routes/webhooks.js`
- Podpięcie: `server/appFactory.js`

## Zmienne środowiskowe (server)

Ustaw w `server/.env` (albo w zmiennych środowiskowych na hoście):

- `DISCORD_WEBHOOK_URL=...`  
  URL webhooka z Discorda (np. `https://discord.com/api/webhooks/.../...`).
- `DISCORD_THREAD_ID=...` *(opcjonalne, ale wymagane jeśli chcesz pisać do wątku)*  
  ID wątku, do którego mają trafiać powiadomienia.
- `GITHUB_WEBHOOK_SECRET=...` *(opcjonalne, zalecane)*  
  Sekret do weryfikacji podpisu GitHuba (`X-Hub-Signature-256`).

Dodatkowo do testów lokalnych:
- `DISCORD_WEBHOOK_DRY_RUN=true` (nie wysyła na Discord, tylko loguje i zwraca `204`).

## Jak wysłać do wątku (nie na kanał główny)

Discord wspiera wysyłanie webhookiem do istniejącego wątku przez parametr `thread_id`.

Masz 2 opcje:

1) Ustaw `DISCORD_THREAD_ID` (polecane) — backend dopisze `?thread_id=...` do URL webhooka.

2) Wklej do `DISCORD_WEBHOOK_URL` webhook URL już z parametrem, np.:  
`https://discord.com/api/webhooks/<id>/<token>?thread_id=<threadId>`

### Skąd wziąć `thread_id`

- W Discord: Settings → Advanced → włącz **Developer Mode**
- Prawy klik na wątek → **Copy ID**

## Konfiguracja webhooka w GitHub

W repo na GitHub:

1. Settings → Webhooks → Add webhook
2. Payload URL: `https://<twoj-publiczny-host>/api/webhooks/github`
   - lokalnie potrzebujesz tunelu typu `ngrok` / `cloudflared`
3. Content type: `application/json`
4. Secret: wpisz dokładnie to samo co w `GITHUB_WEBHOOK_SECRET`
5. Events:
   - minimum: `Pushes` + `Pull requests`
   - opcjonalnie: `Issues`, `Issue comments`, `Releases`

Po zapisaniu GitHub wyśle event `ping` — powinieneś zobaczyć wiadomość w wątku.
