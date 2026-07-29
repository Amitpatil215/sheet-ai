# AI Sheets

ChatGPT-like workspace for Google Spreadsheets: connect sheets as named connectors, `@tag` them in chat, run CRUD via OpenRouter + a custom Sheets tool layer, and schedule automations that spawn audit chat threads.

## Stack

- Next.js (App Router) + Tailwind + TypeScript
- Firebase Auth (Google) + Firestore
- Vercel AI SDK + `@openrouter/ai-sdk-provider` (BYOK)
- Custom in-process Google Sheets tools via `googleapis`
- Firebase Cloud Functions (`processDueAutomations` scheduler)

## Setup

### 1. Install

```bash
cp .env.example .env.local
npm install
cd functions && npm install && cd ..
```

### 2. Firebase

1. Create a Firebase project (Blaze plan needed for scheduled Functions).
2. Enable **Google** sign-in under Authentication.
3. Create a Firestore database; deploy rules:

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

4. Create a web app and copy `NEXT_PUBLIC_FIREBASE_*` into `.env.local`.
5. Generate a service account key; set `FIREBASE_ADMIN_PROJECT_ID`, `FIREBASE_ADMIN_CLIENT_EMAIL`, and `FIREBASE_ADMIN_PRIVATE_KEY` (escape newlines as `\n`).

### 3. Google OAuth (Sheets)

Firebase Auth Google sign-in is **identity only**. Sheets access uses a separate OAuth client:

1. In Google Cloud Console → APIs & Services, enable **Google Sheets API** and **Google Drive API**.
2. Create an OAuth 2.0 Web client.
3. Add authorized redirect URI: `http://localhost:3000/api/google/callback` (and your production URL).
4. Set `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_OAUTH_REDIRECT_URI`.
5. Scopes requested: `spreadsheets`, `drive.metadata.readonly`, `userinfo.email` with `access_type=offline` + `prompt=consent`.

### 4. Encryption

Set `ENCRYPTION_KEY` to a long random string. OpenRouter API keys and Google refresh tokens are stored encrypted under `users/{uid}/secrets/*` (Admin SDK only; Firestore rules deny client access).

### 5. Run locally

```bash
npm run dev
```

Open http://localhost:3000 → Sign in with Google → Settings:

1. Paste your OpenRouter API key (BYOK).
2. Connect Google Sheets.
3. Add a connector (spreadsheet URL + permission tier).
4. Start a chat, type `@YourSlug`, and ask to read or insert rows.

### 6. Automations (Cloud Functions)

```bash
cd functions && npm run build
firebase deploy --only functions
```

Set Functions env:

- `AUTOMATION_RUNNER_URL=https://<your-app>/api/internal/automations/run`
- `AUTOMATION_RUNNER_SECRET` (same as Next.js)

The scheduler runs every 5 minutes, finds due automations (`enabled` + `nextRunAt`), and POSTs to the runner. Each run creates a chat titled `Auto: {name} — {timestamp}` with `source: 'automation'`.

You can also click **Run now** in Settings → Automations without deploying Functions.

## Key paths

| Area | Path |
|------|------|
| Chat API | `src/app/api/chat/route.ts` |
| Sheets tools | `src/lib/sheets/tools.ts` |
| Agent | `src/lib/ai/agent.ts` |
| Pending ops | chat `pendingOperation` + `propose_operation` / `confirm_operation` tools |
| OAuth | `src/app/api/google/oauth` + `callback` |
| Scheduler | `functions/src/index.ts` |
| Rules | `firestore.rules` |

## Permission tiers

Connectors support `read` → `read_insert` → `read_insert_update` → `full_crud`. Tools refuse operations outside the tier with a clear error.

## Notes

- No spreadsheet cell data is persisted in Firestore except pending-operation state and automation metadata.
- `npm run build` succeeds with placeholder env vars; API routes return clear errors until Firebase Admin / OAuth / encryption are configured.
