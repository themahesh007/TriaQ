# TriaQ — Healthcare Triage Assistant

> **A human-in-the-loop healthcare triage assistant for Indian public health facilities (government hospitals, PHCs, health camps, clinics).**
> *Strictly non-diagnostic hackathon prototype: organizes patient information for a human reviewer; never outputs a diagnosis, prescription, or medical advice.*

---

## Architecture Overview

```
+---------------------------------------------------------------------------------+
|                                 FRONTEND                                        |
|  React 18/19 (Vite) + Tailwind CSS (Custom Indian Healthcare Palette)           |
|  - Persistent top non-diagnostic educational banner                             |
|  - Patient Intake (/intake): Multilingual, voice-to-text, lab report OCR        |
|  - Reviewer Dashboard (/dashboard): Priority Queue (RED → AMBER → GREEN),        |
|    detail inspector, editable summary, Approve/Edit/Reject, audit log           |
+---------------------------------------+-----------------------------------------+
                                        | HTTP REST (CORS enabled)
                                        v
+---------------------------------------+-----------------------------------------+
|                                  BACKEND                                        |
|  Node.js + Express REST API (Port 3001)                                         |
|  - Deterministic Risk Engine (Hardcoded RED, AMBER, GREEN keywords)             |
|  - Missing Information Detector (duration, medications, chronic conditions)     |
|  - Rules-based Follow-up Question Generator                                     |
|  - Server-side Tesseract OCR for lab reports                                    |
|  - Non-diagnostic LLM Summarizer (with deterministic fallback)                 |
|  - PostgreSQL via Prisma ORM (with zero-config local persistent fallback)        |
+---------------------------------------------------------------------------------+
```

---

## Quick Start (Running Locally)

### 1. Start the Backend API
```bash
cd backend
npm install
npm test      # runs all 8 automated endpoint and rules tests
npm run dev   # starts backend on http://localhost:3001
```

### 2. Start the Frontend App
In a second terminal window:
```bash
cd frontend
npm install
npm run dev   # starts Vite server on http://localhost:5173
```
Open **http://localhost:5173** in your browser.

---

## Acceptance Criteria Verified
- [x] **Backend API**: All 5 REST endpoints implemented and tested with 100% pass rate.
- [x] **Intake Page**: "chest pain" produces RED tag; "mild headache" produces GREEN tag.
- [x] **Missing Info**: Gaps detected for duration, medications, and conditions.
- [x] **Dashboard**: Queue orders RED → AMBER → GREEN, newest first.
- [x] **Audit Trail**: Every Approve, Edit & Approve, and Reject decision writes an audit log entry.
- [x] **Persistent Banner**: Top educational disclaimer banner present on every view.
- [x] **Resilience**: Operates without errors even without external API keys or remote DB.

---

## Deployment Guides
- **Backend on Render**: See [`backend/DEPLOYMENT.md`](backend/DEPLOYMENT.md)
- **Frontend on Vercel**: See [`frontend/DEPLOYMENT.md`](frontend/DEPLOYMENT.md)
