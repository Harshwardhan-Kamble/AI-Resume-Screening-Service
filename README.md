# AI Resume Screening Service 🚀

A high-precision, privacy-focused resume screening service that leverages a **Hybrid AI Architecture**. It uses local BERT models for semantic data refinement and Google's Gemini 2.5 for intelligent candidate evaluation.

## 🏗️ Architecture Overview

The system is designed for high reliability and clean data signal:

1.  **Frontend/API (Express)**: Handles multipart resume uploads (PDF) and enqueues jobs.
2.  **Task Queue (BullMQ/Redis)**: Manages background processing with automatic retries.
3.  **Preprocessing (Local BERT)**: Uses a local `all-MiniLM-L6-v2` model to "clean" and refine resume/JD text before it reaches the cloud. This significantly reduces hallucinations.
4.  **Evaluation (Gemini 2.5)**: A high-precision cloud LLM analyzes the refined text against strict business rules (Seniority, Tech Stack, Education).
5.  **Database (PostgreSQL/Prisma)**: Stores evaluation results, scorecard JSONs, and justifications.

## 🚀 Getting Started

### Prerequisites

- **Node.js**: v20+
- **Docker & Docker Compose**
- **Google AI API Key**: Get it from [Google AI Studio](https://aistudio.google.com/app/apikey).

### Option 1: Docker (Recommended)

One command to start the entire stack (API, Worker, DB, Redis):

```powershell
# Build and launch
docker-compose up --build
```

The API will be available at `http://localhost:3000`. Database migrations are handled automatically on startup.

### Option 2: Local Development

1.  **Install dependencies**:
    ```powershell
    npm install
    ```
2.  **Setup Environment**:
    - Copy `.env.example` to `.env` and add your `GEMINI_API_KEY`.
3.  **Start Services**:
    - Ensure Postgres and Redis are running locally.
    - Run migrations: `npx prisma migrate dev`
4.  **Run Application**:
    ```powershell
    # Terminal 1: API
    npm run dev:api

    # Terminal 2: Worker
    npm run dev:worker
    ```

## 🧪 Testing

The project includes an integration suite using **Vitest** and **Supertest** that verifies the full lifecycle (Upload -> Process -> Result).

```powershell
npm test
```
*Note: Tests use a local database but mock AI calls to prevent API costs.*

## 📡 API Endpoints

### 1. Initiate Evaluation
**POST** `/evaluate`
- Body: `multipart/form-data`
- Fields: `resume` (file), `job_description` (text)
- Returns: `201 Created` with `evaluation_id`.

### 2. Fetch Result
**GET** `/result/:id`
- Returns: Scorecard JSON (score, verdict, justification, missing requirements).

## 📄 Environment Variables

| Variable | Description | Default |
| :--- | :--- | :--- |
| `PORT` | API Server Port | `3000` |
| `DATABASE_URL` | PostgreSQL Connection String | - |
| `REDIS_HOST` | Redis Hostname | `localhost` |
| `GEMINI_API_KEY` | Your Google AI API Key | - |
| `GEMINI_MODEL` | Gemini Model Version | `gemini-2.5-flash` |
| `LOG_LEVEL` | logging verbosity | `info` |

## 🛡️ License
ISC
