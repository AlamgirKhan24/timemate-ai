# TimeMate AI

### A little more breathing room in your day.

TimeMate brings tasks, calendar events, routines, reports, AI planning, and WhatsApp reminders together in one place. This guide walks you from a fresh copy of the project to a running app—and then through the extra steps needed to put it online.

> **A quick safety note:** `.env` files hold passwords and provider keys. Keep them private, never commit them, and never put backend keys in frontend code. If a key has been shared or exposed, revoke it and create a new one.

## Contents

- [What you can do with TimeMate](#what-you-can-do-with-timemate)
- [Before you begin](#before-you-begin)
- [Where things live](#where-things-live)
- [Get it running on Windows](#get-it-running-on-windows)
- [Run it on macOS or Linux](#run-it-on-macos-or-linux)
- [Connect AI or WhatsApp when you're ready](#connect-ai-or-whatsapp-when-youre-ready)
- [Take it for a first spin](#take-it-for-a-first-spin)
- [Keep it running when your computer is off](#keep-it-running-when-your-computer-is-off)
- [What it may cost](#what-it-may-cost)
- [If something gets stuck](#if-something-gets-stuck)
- [Before a public launch](#before-a-public-launch)

## What you can do with TimeMate

- Account registration, sign-in, time-zone preferences, and profile management.
- Create, edit, complete, and delete tasks; choose a date, time, duration, priority, category, and reminder offset.
- Month, week, and day calendar views, plus a dashboard with today's and upcoming tasks.
- Daily, weekly, or selected-weekday recurring schedules.
- Productivity summaries and completion reports by date range and category.
- WhatsApp opt-in and phone verification, reminder delivery, delivery-status webhooks, notification history, and safe retry for eligible failures.
- AI task drafts that users review before saving, a suggested plan for the day, and optional voice-note transcription. The app asks for consent before sending schedule details or audio to an AI provider.
- A background scheduler that checks for due reminders about once a minute and prepares recurring tasks hourly. It keeps working while the backend is running; for uninterrupted reminders, host the backend somewhere that stays online.

## Before you begin

You’ll need a few tools installed before starting. The optional AI and WhatsApp accounts can wait until you’re ready to try those features.

- **Operating system:** Windows 10/11, macOS, or Linux.
- **Python:** Python 3.11 or 3.12 is recommended for the backend virtual environment.
- **Node.js:** Node.js 20.9 or newer; use an active LTS release. Next.js 16 lists Node 20.9 as its minimum. [Next.js installation requirements](https://nextjs.org/docs/app/getting-started/installation)
- **npm:** Installed with Node.js.
- **PostgreSQL:** A running PostgreSQL database that the backend can reach. PostgreSQL 15 or newer is a suitable baseline.
- **Git:** Needed to clone the repository (or download and unpack the project files).
- **Provider accounts (optional for local core features):** Meta WhatsApp Business Platform for live WhatsApp messages; an OpenAI-compatible API for AI draft/planning; a compatible transcription endpoint for voice notes.

You can check what’s already installed with:

```text
python --version
node --version
npm --version
psql --version
```

If the Windows Python launcher is installed, `py -3.12 --version` checks Python 3.12 directly.

## Where things live

```text
TimeMate AI/
├── .env.example                 # Backend environment-variable template
├── README.md                    # This setup and handoff guide
├── backend/
│   ├── app/                     # FastAPI routes, models, schemas, services, scheduler
│   ├── migrations/              # Alembic database migrations
│   ├── tests/                   # Backend tests
│   ├── requirements.txt         # Backend runtime dependencies
│   └── requirements-dev.txt     # Development/test dependencies
└── frontend/
    ├── app/                     # Next.js pages and global styles
    ├── components/              # Shared navigation, forms, and charts
    ├── services/api.js          # Browser-to-backend API client
    ├── .env.example             # Frontend environment-variable template
    ├── package.json             # Frontend commands and dependencies
    └── package-lock.json        # Locked npm dependency versions
```

## Get it running on Windows

The first setup takes a few minutes. You’ll use **two PowerShell windows**: one for the API and scheduler, and one for the website. Leave both open while you work.

### 1. Get the project and start PostgreSQL

Open PowerShell and move to the folder where you keep projects. If you already have the TimeMate files, use that folder and skip the clone command.

```powershell
git clone <PROJECT_REPOSITORY_URL> timemate-ai
cd timemate-ai
```

Make sure PostgreSQL is installed and running. In pgAdmin or `psql`, create a local database and a user for the app. Replace the example password with one of your own:

```sql
CREATE USER timemate_user WITH PASSWORD 'replace-with-a-strong-password';
CREATE DATABASE timemate_ai OWNER timemate_user;
```

Keep PostgreSQL running before you move on to migrations and the API.

### 2. Give the backend its local settings

From the project’s main folder, make your private environment file:

```powershell
Copy-Item .env.example .env
```

Open `.env` and fill in the database address and a private signing key:

```env
DATABASE_URL=postgresql+psycopg2://timemate_user:URL_ENCODED_PASSWORD@localhost:5432/timemate_ai
SECRET_KEY=PASTE_A_LONG_RANDOM_VALUE_HERE
```

To make a strong signing key, run this command and copy its output into `SECRET_KEY`:

```powershell
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

If your database password contains characters such as `@`, `:`, `/`, or `#`, URL-encode them in `DATABASE_URL`. Keep the real password and key in `.env`; they don’t belong in the README or source control.

### 3. Install and start the API

The API looks for `.env` in the **main project folder**. Run these commands from the `backend` folder. Calling the virtual environment’s Python directly also avoids common PowerShell activation-policy issues.

```powershell
cd E:\timemate-ai\backend
py -3.12 -m venv venv
.\venv\Scripts\python.exe -m pip install --upgrade pip
.\venv\Scripts\python.exe -m pip install -r requirements.txt
.\venv\Scripts\python.exe -m alembic upgrade head
.\venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

If you put the project somewhere other than `E:\timemate-ai`, use your own folder path. If `py -3.12` isn’t available, use `python -m venv venv` after checking that Python 3.11 or newer is installed.

When the API starts successfully, these addresses should be available:

- API: <http://127.0.0.1:8000>
- Health check: <http://127.0.0.1:8000/health>
- Interactive API documentation: <http://127.0.0.1:8000/docs>

Leave this window open while using TimeMate. Press **Ctrl+C** here when you want to stop the API.

### 4. Start the website

In your second PowerShell window, run:

```powershell
cd E:\timemate-ai\frontend
Copy-Item .env.example .env.local
npm ci
npm run dev
```

`frontend/.env.example` sets the local backend address:

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

Visit <http://localhost:3000>, create an account, and sign in. Keep this window open too; **Ctrl+C** stops the website.

### Next time you want to work on TimeMate

Once the setup is done, you won’t need to install packages again. Start PostgreSQL, then open two terminals:

**Terminal 1 — backend:**

```powershell
cd E:\timemate-ai\backend
.\venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

**Terminal 2 — frontend:**

```powershell
cd E:\timemate-ai\frontend
npm run dev
```

Only run migrations again when a project update adds new database changes:

```powershell
cd E:\timemate-ai\backend
.\venv\Scripts\python.exe -m alembic upgrade head
```

## Run it on macOS or Linux

The same setup works on macOS and Linux. First, create the private settings file in the project root:

```bash
cp .env.example .env
```

Fill in `DATABASE_URL` and generate a fresh `SECRET_KEY`, then set up the API:

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
python -m alembic upgrade head
python -m uvicorn app.main:app --reload
```

In a second terminal, set up and start the website:

```bash
cd frontend
cp .env.example .env.local
npm ci
npm run dev
```

Now open <http://localhost:3000>. The API and its interactive docs use the same addresses listed above.

## Connect AI or WhatsApp when you're ready

You can explore the tasks, calendar, and reports before connecting any external services. AI features and live WhatsApp delivery need provider accounts and private credentials. After changing `.env`, restart the API so it picks up the new settings.

### AI task drafts and planning

To turn on AI task drafts and day planning, add the following to the **project-root** `.env`:

```env
LLM_API_URL=https://api.openai.com/v1/chat/completions
LLM_API_KEY=YOUR_PRIVATE_API_KEY
LLM_MODEL=YOUR_SUPPORTED_CHAT_MODEL
```

Choose a provider and model that support the chat-completions request and JSON response mode used by this app. ChatGPT subscriptions and API billing are separate. If the API returns `429`, check its billing, credits, usage, and spending limits—restarting TimeMate can’t change a limit set by the provider.

Voice transcription is optional. If you want to use voice notes, add a compatible audio-transcription endpoint and model:

```env
LLM_TRANSCRIPTION_URL=YOUR_PROVIDER_TRANSCRIPTION_ENDPOINT
LLM_TRANSCRIPTION_MODEL=YOUR_TRANSCRIPTION_MODEL
```

You can leave `LLM_TRANSCRIPTION_MODEL` blank if your transcription endpoint uses `LLM_MODEL`. TimeMate asks before sending an audio recording for transcription.

### WhatsApp reminders and verification

For WhatsApp verification and reminders, add the values below to the project-root `.env`. Get the credentials and approved template names from your Meta Business setup:

| Variable | Purpose |
|---|---|
| `WHATSAPP_TOKEN` | Server-side access token for WhatsApp Cloud API. |
| `WHATSAPP_PHONE_NUMBER_ID` | Cloud API phone-number ID used to send messages. |
| `WHATSAPP_VERIFY_TOKEN` | Secret string used to verify the Meta webhook handshake. Choose and keep it private. |
| `WHATSAPP_APP_SECRET` | Meta app secret used to validate webhook signatures. |
| `WHATSAPP_REMINDER_TEMPLATE` | Approved reminder template name; the template must match the message parameters sent by the app. |
| `WHATSAPP_OTP_TEMPLATE` | Approved one-time verification template name. |
| `WHATSAPP_TEMPLATE_LANGUAGE` | Language code that matches the approved templates, such as `en_US`. |
| `WHATSAPP_GRAPH_VERSION` | Meta Graph API version; defaults in `.env.example`. |
| `WHATSAPP_VERIFICATION_CODE_MINUTES` | Verification-code lifetime; defaults in `.env.example`. |

Restart the API, then add a number in TimeMate, opt in, and finish verification. Reminder and verification messages use approved templates. To receive delivery updates, set your public Meta webhook URL to `https://YOUR_PUBLIC_API/whatsapp/webhook` and subscribe to message-status updates. Meta controls account approval, phone-number eligibility, templates, and delivery rules, so setup may take a little time. See [WhatsApp Business Platform pricing and message categories](https://whatsappbusiness.com/products/platform-pricing/).

You can still use TimeMate without WhatsApp credentials; reminders simply won’t be delivered until the service is configured.

## Take it for a first spin

Here’s an easy way to make sure the pieces are talking to each other:

1. Check that the API terminal has no startup error, then open <http://127.0.0.1:8000/health>. A healthy API replies with `{"status":"ok"}`.
2. Visit <http://127.0.0.1:8000/docs> to explore the API endpoints.
3. Open <http://localhost:3000>, create a test account, and sign in.
4. Create a task for a future time. Look for it on the dashboard and calendar.
5. Edit the task, mark it complete, and look at the productivity report.
6. Create a daily or weekly routine and check that the scheduler creates its tasks.
7. If you’ve configured AI, ask it for a draft and review the date and time before saving. Planning and audio transcription also require the relevant consent.
8. Try WhatsApp after Meta setup is approved: opt in, verify a number, use an approved template, and check the delivery history.

Optional code-quality checks:

```powershell
cd E:\timemate-ai\frontend
npm run lint
npm run build
```

```powershell
cd E:\timemate-ai\backend
.\venv\Scripts\python.exe -m pip install -r requirements-dev.txt
.\venv\Scripts\python.exe -m pytest
```

The frontend build and lint are separate checks, so run both before handing off a frontend release.

## Keep it running when your computer is off

While you’re developing locally, reminders depend on your computer and the API staying on. If your computer sleeps or shuts down, the scheduler pauses too. For reminders to run around the clock, deploy the API and database to always-available services, then publish the Next.js website.

One straightforward deployment setup looks like this:

1. **PostgreSQL:** Create a managed production database and keep its connection string private.
2. **Backend:** Deploy the `backend` directory as a Python web service. Install with `pip install -r requirements.txt`; run migrations with `python -m alembic upgrade head`; start the service with `python -m uvicorn app.main:app --host 0.0.0.0 --port $PORT` (adapt the port variable to the host if needed).
3. **Backend environment:** Add `DATABASE_URL`, a fresh random `SECRET_KEY`, and any provider variables in the host's private environment-variable settings. Never put backend secrets in Vercel/Next.js `NEXT_PUBLIC_*` variables.
4. **Frontend:** Deploy the `frontend` directory as a Next.js app. Set `NEXT_PUBLIC_API_URL` to the public HTTPS API base URL **before building** the frontend, for example `https://api.example.com` (no trailing slash). Redeploy after changing it.
5. **CORS:** The current backend allows only `http://localhost:3000` and `http://127.0.0.1:3000`. Add the exact production frontend origin to the backend CORS allowlist in `backend/app/main.py` before deploying, then redeploy the backend. Do not allow every origin for an authenticated production app.
6. **WhatsApp webhook:** Set the public HTTPS callback to `https://YOUR_PUBLIC_API/whatsapp/webhook`, the same verify token as `WHATSAPP_VERIFY_TOKEN`, and enable the relevant status webhook subscription in Meta.
7. **Take a careful first lap:** Test registration, login, task creation and editing, the calendar, reports, and recurring tasks. Then test one opted-in and verified WhatsApp delivery and confirm its status reaches the webhook. Try AI only after the provider key and billing are ready.

### Scheduler deployment warning

The scheduler currently runs inside the FastAPI process. Keep **one backend instance with one worker** so the same reminder isn’t picked up by duplicate schedulers. If the app needs to scale to several API instances, move the scheduler into its own single worker or managed scheduling service first.

### Backups and updates

- Keep a tested database backup before migrations or a release that changes data.
- Apply `alembic upgrade head` as a deployment pre-start/release command before serving the new app version.
- Keep production secrets out of source control and logs; rotate any credential that was exposed.
- Monitor backend logs, database availability, scheduler activity, AI provider errors, and WhatsApp delivery webhooks.

## What it may cost

Here’s a starting point for budgeting. These are **rough USD estimates**, based on public pricing pages checked **November 14, 2026**. Your bill can change with region, traffic, storage, taxes, AI usage, and where WhatsApp messages are sent. Developer time, paid support, and a custom domain are not included.

| Item | Starting budget | Notes |
|---|---:|---|
| Frontend hosting | **$0/month** for a personal, non-commercial Vercel Hobby project; **$20/month** for Vercel Pro | Vercel describes Hobby as personal/non-commercial and lists Pro at $20/month with included usage credit. A delivered commercial client/business app needs an eligible commercial plan or another host. [Vercel pricing](https://vercel.com/pricing) |
| Always-on backend | **about $7/month** on a small Render paid web-service instance | Needed so the scheduler can run while your own computer is off. Render charges separately for compute and usage. [Render pricing](https://render.com/pricing) |
| Managed PostgreSQL | **about $6/month** for Render's smallest paid database tier | Check storage, backup, and compute limits against the current plan before production. [Render pricing](https://render.com/pricing) |
| AI task drafts/plans | **Usage-based; start with about $5 credit for testing** | Cost depends on model and tokens. OpenAI prepaid API billing currently lists a $5 minimum purchase; usage is billed separately from ChatGPT. [OpenAI API pricing](https://developers.openai.com/api/docs/pricing), [prepaid billing](https://help.openai.com/en/articles/8264644-setting-up-prepaid-api-billing) |
| Voice transcription | **Usage-based** | Billed by the chosen provider/model and audio duration; optional if voice notes are not used. |
| WhatsApp messages | **Per delivered message; varies by destination country and category** | The app does not charge a WhatsApp platform subscription itself. Meta's rate depends on market/message category; a BSP or partner may add its own fees. Check the official rate card before estimating message volume. [Meta pricing](https://whatsappbusiness.com/products/platform-pricing/) |
| Domain name | **Additional; varies by registrar and domain ending** | Optional, but a branded domain is recommended for a public launch and webhook URL. |

**A simple monthly starting estimate:** about **$13 plus usage** for a personal project with Vercel Hobby and small paid Render backend/database plans, or about **$33 plus usage** with Vercel Pro for commercial use. These are estimates, not a quote. An AI credit purchase is a balance you use over time, not a monthly subscription. WhatsApp charges are extra and depend on message volume and recipient country.

## If something gets stuck

| Problem | Check |
|---|---|
| `uvicorn` or `alembic` is not recognized on Windows | Run them through the virtual environment: `..\venv\Scripts\python.exe -m uvicorn ...` from the backend directory, or use the complete commands in this guide. |
| `DATABASE_URL` or `SECRET_KEY` validation error | Confirm the file is named `.env` in the project root, not only `backend/.env`, and both values are filled in. |
| Database connection refused | Start PostgreSQL; check database name, user, password, port, and `DATABASE_URL`. Run migrations after the database is reachable. |
| Browser reports a CORS error | For local development, keep the frontend at `http://localhost:3000` or `http://127.0.0.1:3000`; for deployment, add the exact frontend domain to `backend/app/main.py`. |
| Port 8000 or 3000 is already in use | Stop the other process or select another port and update `NEXT_PUBLIC_API_URL` to match the backend. |
| AI says provider is not configured | Set `LLM_API_URL`, `LLM_API_KEY`, and `LLM_MODEL` in project-root `.env`; restart the backend. Add transcription variables only for voice notes. |
| AI returns HTTP 429 | Check provider billing/credits, account/project spend limits, and rate limits. Restarting the app does not add credits or remove provider limits. |
| WhatsApp returns 401/400 or messages fail | Verify token and phone-number ID, token permissions/validity, recipient number, approved template name/language/parameters, and Meta account setup. Never paste the token into issue reports. |
| Reminder did not send while developing | The backend must be running and the reminder time must be due. The recipient must be opted in and verified; live messages also need valid WhatsApp credentials and approved templates. Check reminder history and backend logs. |
| Meta webhook verification fails | Use a publicly reachable HTTPS URL, match the verify token exactly, set the app secret, and subscribe to the needed message-status events. |

## Before a public launch

- The database stores timestamps consistently and displays schedule times using each user's time zone. Set the correct zone in the profile before creating new tasks.
- Users explicitly opt in to WhatsApp reminders and confirm their number. Do not send reminders to unverified/unconsented recipients.
- AI task drafts are proposed for user review; task data is saved only after confirmation. Day planning requires explicit consent to share task details, and voice transcription requires explicit audio-sharing consent.
- Apply every new Alembic migration before using a version that depends on it. Do not delete a production database to fix a migration problem.
- Provider access, WhatsApp business verification, sender registration, template approval, and billing are external account requirements; source code alone cannot complete them.
- The app is an MVP implementation. Before a public launch, review authentication/session security, privacy and retention policy, monitoring/alerts, backup restoration, rate limiting, accessibility, and applicable legal requirements for your audience.
#   t i m e m a t e - a i  
 