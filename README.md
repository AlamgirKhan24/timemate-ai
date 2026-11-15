# TimeMate AI

### Intelligent Scheduling. Effortless Productivity.

**TimeMate AI** is an intelligent productivity and time-management platform that brings task management, digital scheduling, automated reminders, and AI-assisted planning into one unified workspace.

Designed to simplify everyday organization, TimeMate AI enables users to manage tasks, organize their schedules, establish recurring routines, monitor productivity, and receive timely WhatsApp notifications.

The platform combines a modern web interface with a Python-powered backend, reliable scheduling services, and AI integrations to deliver a streamlined personal productivity experience.

---

## Project Overview

| Attribute | Details |
|---|---|
| Project Name | TimeMate AI |
| Category | Productivity & Time Management |
| Application Type | Full-Stack Web Application |
| Frontend | Next.js, React |
| Styling | Tailwind CSS |
| Backend | Python, FastAPI |
| Database | PostgreSQL |
| ORM | SQLAlchemy |
| Migrations | Alembic |
| Scheduler | APScheduler |
| Messaging | Meta WhatsApp Cloud API |
| AI Integration | LLM API |
| Deployment | Vercel + Python Hosting Provider |

## Core Features

### 1. Smart Task Management
- Create, update, complete, delete, and reschedule tasks.
- Assign priorities: High, Medium, and Low.
- Organize tasks using categories.
- Define task descriptions, dates, times, and durations.
- Monitor pending, completed, and overdue tasks.

### 2. Intelligent Digital Calendar
- Interactive daily, weekly, and monthly calendar views.
- Date-based task organization.
- Schedule navigation and event management.
- Integrated task creation and editing.
- Time-zone-aware scheduling.

### 3. Automated WhatsApp Reminders
- WhatsApp number verification and opt-in management.
- Automated scheduled notifications.
- Customizable reminder intervals.
- Official WhatsApp Business Platform integration.
- Delivery-status tracking and notification history.
- Failure handling and eligible retry mechanisms.

### 4. Recurring Task Management
- Daily and weekly recurring schedules.
- Custom weekday selection.
- Configurable recurrence end dates.
- Automatic future task generation.
- Duplicate reminder prevention.

### 5. AI-Powered Productivity Assistant
- Natural-language task creation.
- Intelligent task information extraction.
- AI-assisted daily planning.
- Schedule recommendations.
- User confirmation before saving AI-generated tasks.
- Optional voice-note transcription.

### 6. Productivity Analytics
- Daily and weekly productivity summaries.
- Completed, pending, and overdue task statistics.
- Task completion percentages.
- Category-based reporting.
- Date-range filtering and productivity insights.

### 7. User Account Management
- Secure registration and authentication.
- Profile management.
- Personalized time-zone preferences.
- WhatsApp notification preferences.
- User-specific data access and authorization.

---

## Technology Stack

TimeMate AI uses a modern full-stack architecture with dedicated frontend, backend, database, and integration layers.

| Technology | Purpose |
|---|---|
| Next.js | Frontend application framework |
| React | Component-based user interface |
| Tailwind CSS | Responsive interface styling |
| Python | Backend development |
| FastAPI | RESTful API development |
| PostgreSQL | Relational database |
| SQLAlchemy | Database ORM |
| Alembic | Database schema migrations |
| APScheduler | Background scheduling |
| Meta WhatsApp Cloud API | WhatsApp notifications |
| LLM API | AI-powered functionality |
| Recharts | Productivity visualization |
| Vercel | Frontend deployment |

---

## System Architecture

The application follows a modular client-server architecture.

```text
                 TIME MATE AI
                       |
          +------------+------------+
          |                         |
     FRONTEND                   BACKEND
          |                         |
    Next.js + React              FastAPI
          |                         |
          |                  +------+------+
          |                  |      |      |
          |               Services Models Scheduler
          |                  |      |      |
          |                  +------+------+
          |                         |
          |                    PostgreSQL
          |                         |
          |                  +------+------+
          |                  |             |
          |             WhatsApp API    AI API
          |                  |             |
          +------------------+-------------+
                       |
                  USER EXPERIENCE
```

### Application Workflow

1. The user authenticates and accesses the dashboard.
2. The user creates a task and configures its schedule.
3. The frontend communicates with the backend through REST APIs.
4. FastAPI validates the request and stores the information in PostgreSQL.
5. APScheduler checks for reminders that are due.
6. The notification service processes the scheduled reminder.
7. WhatsApp Cloud API delivers the notification to the verified recipient.
8. The application records notification results and updates task information.

---

## Repository Structure

```text
timemate-ai/
│
├── frontend/
│   ├── app/
│   ├── components/
│   ├── services/
│   ├── public/
│   ├── .env.example
│   ├── package.json
│   └── package-lock.json
│
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── services/
│   │   ├── scheduler/
│   │   ├── integrations/
│   │   ├── core/
│   │   └── main.py
│   │
│   ├── migrations/
│   ├── tests/
│   ├── requirements.txt
│   └── requirements-dev.txt
│
├── docs/
│   ├── requirements.md
│   ├── database-design.md
│   └── api-design.md
│
├── .env.example
├── .gitignore
└── README.md
```

---

## Getting Started

Follow the instructions below to configure and run TimeMate AI locally.

### Prerequisites

Ensure the following tools are installed:

- Python 3.11 or newer (Python 3.12 recommended).
- Node.js 20.9 or newer.
- npm.
- PostgreSQL 15 or newer.
- Git.

Optional integrations:

- Meta WhatsApp Business Platform account.
- Compatible LLM API credentials.
- Compatible audio transcription service.

### 1. Clone the Repository

```bash
git clone <PROJECT_REPOSITORY_URL>
cd timemate-ai
```

### 2. Configure PostgreSQL

Create a database and dedicated database user.

```sql
CREATE USER timemate_user
WITH PASSWORD 'your_secure_password';

CREATE DATABASE timemate_ai
OWNER timemate_user;
```

Ensure PostgreSQL is running before proceeding.

### 3. Configure Backend Environment

From the project root, create your environment file.

**Windows:**

```powershell
Copy-Item .env.example .env
```

**macOS / Linux:**

```bash
cp .env.example .env
```

Configure the following variables:

```env
DATABASE_URL=postgresql+psycopg2://timemate_user:YOUR_PASSWORD@localhost:5432/timemate_ai

SECRET_KEY=YOUR_SECURE_SECRET_KEY
```

Generate a secure secret key:

```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Keep all credentials private.

### 4. Install Backend Dependencies

**Windows:**

```powershell
cd backend

py -3.12 -m venv venv

.\venv\Scripts\python.exe -m pip install --upgrade pip

.\venv\Scripts\python.exe -m pip install -r requirements.txt
```

**macOS / Linux:**

```bash
cd backend

python3 -m venv venv

source venv/bin/activate

python -m pip install --upgrade pip

python -m pip install -r requirements.txt
```

### 5. Initialize the Database

From the backend directory:

```bash
python -m alembic upgrade head
```

On Windows, if using the commands above without activating the environment:

```powershell
.\venv\Scripts\python.exe -m alembic upgrade head
```

### 6. Start the Backend Server

```bash
python -m uvicorn app.main:app --reload
```

Backend services:

| Service | Local Address |
|---|---|
| API Server | http://127.0.0.1:8000 |
| Health Check | http://127.0.0.1:8000/health |
| Swagger Documentation | http://127.0.0.1:8000/docs |
| ReDoc Documentation | http://127.0.0.1:8000/redoc |

Keep the backend server running.

### 7. Configure the Frontend

Open another terminal:

```bash
cd frontend
```

Create the frontend environment file.

**Windows:**

```powershell
Copy-Item .env.example .env.local
```

**macOS / Linux:**

```bash
cp .env.example .env.local
```

Configure the backend API address:

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

### 8. Install Frontend Dependencies

```bash
npm ci
```

### 9. Start the Frontend

```bash
npm run dev
```

Open the application:

**http://localhost:3000**

The frontend and backend should now be running independently.

---

## Environment Configuration

TimeMate AI uses environment variables to manage application configuration and external integrations.

### Backend Configuration

| Variable | Description |
|---|---|
| DATABASE_URL | PostgreSQL connection string |
| SECRET_KEY | Application signing secret |
| LLM_API_URL | AI provider endpoint |
| LLM_API_KEY | AI provider credentials |
| LLM_MODEL | Selected AI model |
| LLM_TRANSCRIPTION_URL | Voice transcription endpoint |
| LLM_TRANSCRIPTION_MODEL | Voice transcription model |
| WHATSAPP_TOKEN | WhatsApp API access token |
| WHATSAPP_PHONE_NUMBER_ID | Registered WhatsApp phone number ID |
| WHATSAPP_VERIFY_TOKEN | Webhook verification token |
| WHATSAPP_APP_SECRET | Meta application secret |
| WHATSAPP_REMINDER_TEMPLATE | Approved reminder template |
| WHATSAPP_OTP_TEMPLATE | Approved verification template |
| WHATSAPP_TEMPLATE_LANGUAGE | WhatsApp template language |
| WHATSAPP_GRAPH_VERSION | Meta Graph API version |

### Frontend Configuration

| Variable | Description |
|---|---|
| NEXT_PUBLIC_API_URL | Backend API base URL |

**Security:** Never commit `.env` or `.env.local` files. Never expose backend credentials through frontend environment variables or public source code.

---

## WhatsApp Integration

TimeMate AI uses the official Meta WhatsApp Cloud API for automated reminder delivery.

The integration supports:

- Phone number verification.
- Explicit user opt-in.
- Scheduled reminder messages.
- Approved WhatsApp message templates.
- Message delivery status updates.
- Webhook-based notification tracking.
- Error handling and eligible retries.

### Webhook Configuration

Configure the public HTTPS webhook endpoint in Meta:

```text
https://YOUR_PUBLIC_API/whatsapp/webhook
```

Use the same verification token configured in your backend environment.

WhatsApp delivery requires appropriate Meta Business configuration, an eligible phone number, approved templates where required, and valid API credentials.

---

## AI Integration

The AI assistant provides additional productivity functionality through a compatible language model API.

Supported capabilities include:

- Natural-language task drafts.
- Task date and time extraction.
- AI-assisted daily planning.
- Productivity suggestions.
- Optional voice-note transcription.

Example request:

```text
Remind me tomorrow at 9 AM
to study Python for two hours.
```

The assistant extracts the task information and presents it for user confirmation before saving.

AI functionality requires an appropriately configured provider and API credentials. AI services are optional for the core task-management experience.

---

## API Documentation

TimeMate AI exposes RESTful endpoints through FastAPI.

The API documentation is automatically generated.

**Interactive documentation:**

http://127.0.0.1:8000/docs

### Main API Resources

| Resource | Operations |
|---|---|
| Authentication | Register, login |
| Tasks | Create, read, update, delete |
| Calendar | Retrieve scheduled tasks |
| Reminders | Configure reminder schedules |
| Notifications | Retrieve notification history |
| WhatsApp | Phone verification and integration |
| Profile | Manage user information |

Example endpoints:

```http
POST   /auth/register
POST   /auth/login

GET    /tasks
POST   /tasks
GET    /tasks/{id}
PUT    /tasks/{id}
DELETE /tasks/{id}

GET    /calendar
POST   /reminders
GET    /notifications

POST   /whatsapp/verify
```

All private resources must enforce authentication and user ownership authorization.

---

## Testing & Quality Assurance

Testing is essential to maintaining application reliability and preventing scheduling or notification errors.

### Frontend Checks

```bash
npm run lint
npm run build
```

### Backend Tests

Install development dependencies:

```bash
python -m pip install -r requirements-dev.txt
```

Run the test suite:

```bash
python -m pytest
```

### Important Test Scenarios

- User registration and authentication.
- Task creation and modification.
- Calendar date and time accuracy.
- User-specific data authorization.
- Reminder scheduling and duplicate prevention.
- Completed and deleted task handling.
- WhatsApp delivery failures.
- Time-zone handling.
- Recurring task generation.

---

## Deployment

The recommended deployment architecture separates the frontend, backend, and database.

| Component | Recommended Platform |
|---|---|
| Frontend | Vercel |
| Backend | Python-compatible hosting provider |
| Database | Managed PostgreSQL |
| Messaging | Meta WhatsApp Cloud API |
| AI | Compatible LLM API |

### Production Requirements

Before deployment:

1. Configure production environment variables.
2. Provision a managed PostgreSQL database.
3. Apply database migrations.
4. Deploy the FastAPI backend.
5. Configure production CORS origins.
6. Deploy the Next.js frontend.
7. Configure the public WhatsApp webhook.
8. Verify reminder delivery and notification logging.
9. Configure backups and application monitoring.

**Important:** The current scheduler runs within the FastAPI process. Use one backend instance with one worker to prevent duplicate scheduling. For horizontal scaling, move scheduling into a dedicated worker or managed scheduling service.

---

## Security & Privacy

Security and privacy are fundamental considerations in TimeMate AI.

The application incorporates the following security requirements:

- Secure password hashing.
- Authentication and authorization.
- User-specific data ownership.
- Backend input validation.
- Environment-based secret management.
- HTTPS for production communication.
- WhatsApp opt-in and phone verification.
- Restricted access to notification logs.
- Consent before sharing task information or audio with AI providers.

A comprehensive security, privacy, and compliance review is recommended before public production deployment.

---

## Development Roadmap

TimeMate AI is designed to evolve through incremental development.

| Phase | Development Focus |
|---|---|
| Phase 1 | Project foundation and architecture |
| Phase 2 | Authentication and user management |
| Phase 3 | Task management and database integration |
| Phase 4 | Digital calendar and dashboard |
| Phase 5 | Automated reminder scheduling |
| Phase 6 | WhatsApp integration |
| Phase 7 | Recurring tasks and productivity reports |
| Phase 8 | AI assistant and intelligent planning |
| Phase 9 | Voice input and advanced automation |
| Phase 10 | Performance, security, and scalability improvements |

---

## Contributing

Contributions, suggestions, and constructive feedback are welcome.

To contribute:

1. Fork the repository.
2. Create a feature branch.
3. Implement your changes.
4. Test your implementation.
5. Commit your changes with meaningful messages.
6. Submit a pull request describing your contribution.

Example:

```bash
git checkout -b feature/your-feature

git add .

git commit -m "feat: add your feature"

git push origin feature/your-feature
```

Please ensure that changes are tested and documented appropriately.

---

## Project Documentation

Additional project documentation can be maintained in the `docs/` directory.

- `requirements.md` — Functional and non-functional requirements.
- `database-design.md` — Database schema and relationships.
- `api-design.md` — API structure and endpoint documentation.

---

## License

The licensing terms for this project should be defined in a dedicated `LICENSE` file before redistribution or external contributions.

---

## Acknowledgements

TimeMate AI is built using modern open-source technologies and third-party services.

Special appreciation to the developers and communities behind Next.js, React, Python, FastAPI, PostgreSQL, and the broader open-source ecosystem.

---

<p align="center">

**TimeMate AI**

*Plan Smarter. Stay Organized. Make Every Moment Count.*

</p>