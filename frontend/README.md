# TriaQ — Frontend (React + Vite + Tailwind CSS)

Human-in-the-loop healthcare triage interface for Indian public health clinics and camps.

## Features
- **Design System**: Exact healthcare palette (Primary `#2B6E64`, Paper `#F6F5F1`, Ink `#16302B`)
- **Patient Intake (`/intake`)**: Multi-lingual selector (English, Hindi, Odia), voice-to-text input with Web Speech API & fallback, lab report upload with OCR preview, and mandatory consent compliance.
- **Reviewer Dashboard (`/dashboard`)**: Clinically prioritized queue (RED urgent → AMBER moderate → GREEN routine), detail inspector, human editable summary, and single-click Approve / Save Edit & Approve / Reject actions with real-time audit logging.
- **Persistent Disclaimer**: Prominently displays non-diagnostic educational notice across all views.

## Local Development

1. Install dependencies:
   ```bash
   cd frontend
   npm install
   ```

2. Start the Vite dev server:
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` in your browser.
