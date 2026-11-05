# TimeMate AI

A smart calendar and task app that sends WhatsApp reminders at the right time.

## Features (MVP)
- Register and log in, with a time zone per user (Asia/Karachi for Pakistan)
- Create, edit, complete and delete tasks
- Month, week and day calendar views
- Reminders with a chosen offset (for example 30 minutes before)
- Reminders go only to users who gave WhatsApp opt-in
- Notification history showing sent, failed and pending messages
- A scheduler that runs on the server, so reminders go out when the website is closed

## Tech stack
- Frontend: Next.js, React, Tailwind CSS
- Backend: Python, FastAPI, SQLAlchemy, Alembic
- Database: PostgreSQL
- Scheduler: APScheduler
- Messaging: Meta WhatsApp Cloud API

## Folder structure

## Setup

### 1. Environment file
Copy `.env.example` to `.env` in the project root and fill in the values.
Never commit `.env`. It holds your secrets.

### 2. Backend
```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload
```
The API runs at http://127.0.0.1:8000 and the docs at http://127.0.0.1:8000/docs.

### 3. Frontend
```powershell
cd frontend
npm install
npm run dev
```
The website runs at http://localhost:3000.

## How reminders work
1. The user creates a task and chooses a reminder (for example 30 minutes before).
2. The backend saves the reminder with its exact send time in UTC.
3. The scheduler checks every minute for pending reminders that are due.
4. Each reminder is sent once and marked sent, failed or missed, and the result is logged.
5. Completed and deleted tasks do not receive reminders.

## WhatsApp setup notes
- Messages go through the official Meta WhatsApp Cloud API.
- Meta requires business verification before messages reach real users.
- Reminders sent outside a 24-hour chat window need an approved message template.
- Never put the access token in frontend code or in the repository.

## Status
MVP in progress. Planned next: approved WhatsApp template, permanent token,
delivery status webhook, automated tests, deployment, then recurring tasks,
an AI assistant and productivity reports.