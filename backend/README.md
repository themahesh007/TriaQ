# TriaQ — Backend API

Non-diagnostic healthcare triage assistant REST API for Indian public health facilities.

## Prerequisites
- Node.js 18+ (tested on v24)
- (Optional) PostgreSQL database (via Supabase, Render, Neon, or local Docker)

## Installation & Setup

1. Navigate to backend directory:
   ```bash
   cd backend
   npm install
   ```

2. Configure environment variables:
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   If using PostgreSQL, configure `DATABASE_URL`. If left blank, the API runs with an automatic zero-config in-memory store for local testing.

3. Run automated tests:
   ```bash
   npm test
   ```

4. Start development server:
   ```bash
   npm run dev
   ```
   Server will listen on `http://localhost:3001`.

## API Endpoints
- `POST /api/patients` - Creates a new intake session token (e.g. "Ward-11")
- `POST /api/triage-notes` - Submits symptoms & report image for rule-based triage
- `GET /api/triage-notes?status=PENDING` - Returns pending notes sorted RED -> AMBER -> GREEN
- `GET /api/triage-notes/:id` - Returns a single triage note
- `PATCH /api/triage-notes/:id` - Approve, Edit & Approve, or Reject note with audit logging
- `GET /api/audit-log` - Returns recent reviewer audit entries
