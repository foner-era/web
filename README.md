# Foner Atelier — Architecture & Deployment Guide

This repository contains the full production architecture for **Foner Atelier**, separated into independent `frontend/` and `backend/` applications.

---

## Architecture Overview

```text
Foner/
├── frontend/                     # Independent React/Vite Single-Page Application (SPA)
│   ├── src/                      # Components, pages, hooks, API client, types
│   ├── public/                   # Static assets, images, banners, product photography
│   ├── index.html                # HTML entry point
│   ├── package.json              # Frontend dependencies (React 19, Tailwind CSS, Lucide, Motion)
│   ├── vite.config.ts            # Vite bundler configuration & local dev API proxy
│   ├── tsconfig.json             # Frontend TypeScript configuration
│   ├── vercel.json               # Vercel deployment rewrites for client-side routing
│   └── .env.example              # Frontend environment variables template
│
├── backend/                      # Independent Express/Node.js REST API Server
│   ├── src/                      # Database logic (src/db.ts) & backend utilities
│   ├── db/                       # PostgreSQL schema (schema.sql) & persistence
│   ├── migrations/               # Schema migrations CLI runner (migrate.ts)
│   ├── server.ts                 # Express server, authentication, routes, diagnostics
│   ├── package.json              # Backend dependencies (Express, pg, bcryptjs, nodemailer, zod)
│   ├── tsconfig.json             # Backend TypeScript configuration
│   └── .env.example              # Backend environment variables template
│
├── README.md                     # Architecture, installation & deployment documentation
├── package.json                  # Root orchestrator scripts
├── tsconfig.json                 # Root TypeScript configuration
└── vite.config.ts                # Root bundler configuration
```

### Production Data Flow & Security Boundary

```text
┌─────────────────────────┐
│      Admin / Customer   │
│       Web Browser       │
└────────────┬────────────┘
             │  HTTPS / JSON API (Bearer or HttpOnly cookie)
             ▼
┌─────────────────────────┐
│     Backend Server      │  ◄── Node.js Express API (Port 3000)
│      (backend/)         │      Authentication, Rate Limiting, Audit Logs
└────────────┬────────────┘
             │  Internal TCP (Localhost / 127.0.0.1:5432)
             ▼
┌─────────────────────────┐
│   PostgreSQL Database   │  ◄── Database "f", User "f_user"
│      (Backend Only)     │      NEVER exposed to the browser or public internet
└─────────────────────────┘
```

> **Security Rule**: The frontend **never** connects directly to PostgreSQL. Database connection strings, credentials, passwords, and secrets remain strictly isolated inside the backend environment.

---

## 1. Frontend

The frontend is a React 19 application built with Vite and Tailwind CSS. It can be developed locally against the backend, or built and deployed independently to **Vercel**, **Cloudflare Pages**, or **Netlify**.

### Installation

```bash
cd frontend
npm install
```

### Running Locally

```bash
npm run dev
```

The Vite dev server starts on `http://localhost:5173`. When `VITE_API_URL` is empty, requests to `/api` and `/uploads` are automatically proxied to the backend at `http://localhost:3000`.

### Building for Production

```bash
npm run build
```

The compiled static assets are written to `frontend/dist/`.

### Deployment to Vercel

1. Set the **Root Directory** in your Vercel Project Settings to `frontend`.
2. Configure **Environment Variables** in Vercel:
   - `VITE_API_URL`: The public HTTPS URL of your deployed backend (e.g. `https://api.foner.pk`).
3. Deploy! `frontend/vercel.json` automatically configures SPA fallback rewrites to `/index.html`.

### Frontend Environment Variables (`frontend/.env.example`)

| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `VITE_API_URL` | Base URL for remote backend API. Leave empty for local development. | `https://api.foner.pk` |

---

## 2. Backend

The backend is an Express REST API with PostgreSQL integration, bcrypt password hashing, Nodemailer transactional emailing (for OTP registration and order receipts), and system diagnostics.

### Installation

```bash
cd backend
npm install
```

### Running Locally

```bash
npm run dev
```

The Express API server starts on `http://localhost:3000` (or the configured `PORT`).

### PostgreSQL Setup & Database Migrations

1. Ensure PostgreSQL is installed and running:
   ```bash
   sudo systemctl status postgresql
   ```
2. Create the database and user (if not already created):
   ```sql
   CREATE USER f_user WITH PASSWORD 'your_secure_password';
   CREATE DATABASE f OWNER f_user;
   GRANT ALL PRIVILEGES ON DATABASE f TO f_user;
   ```
3. Run the schema migrations and initial seed:
   ```bash
   cd backend
   npm run db:migrate
   ```
   Or from the root directory:
   ```bash
   npm run db:migrate
   ```

### Starting in Production

```bash
cd backend
npm run build
npm start
```

### Backend Environment Variables (`backend/.env.example`)

| Variable | Description | Example / Default |
| :--- | :--- | :--- |
| `PORT` | HTTP port for the Express backend server | `3000` |
| `HOST` | Bind host address | `0.0.0.0` |
| `DATABASE_URL` | PostgreSQL connection string | `postgres://f_user:pass@127.0.0.1:5432/f` |
| `POSTGRES_HOST` | Fallback PostgreSQL host | `127.0.0.1` |
| `POSTGRES_PORT` | Fallback PostgreSQL port | `5432` |
| `POSTGRES_DB` | Fallback PostgreSQL database name | `f` |
| `POSTGRES_USER` | Fallback PostgreSQL user | `f_user` |
| `POSTGRES_PASSWORD` | Fallback PostgreSQL password | `your_secure_password` |
| `SESSION_SECRET` | 64-character random string for session tokens | `your_secure_random_session_key` |
| `CORS_ORIGIN` | Allowed origin for frontend SPA requests | `https://foner.vercel.app` |
| `SMTP_HOST` | Outgoing SMTP host for emails & OTP | `smtp.gmail.com` |
| `SMTP_PORT` | SMTP port | `587` |
| `SMTP_USER` | SMTP username / address | `fonerera@gmail.com` |
| `SMTP_PASS` | SMTP application password | `your_16_digit_app_password` |
| `SMTP_FROM` | Outgoing sender display header | `Foner Atelier <fonerera@gmail.com>` |
| `CONTACT_RECEIVER_EMAIL` | Inbox address for customer contact inquiries | `fonerera@gmail.com` |

---

## 3. System Diagnostics

The platform features live diagnostic health checks to verify that both the backend server and PostgreSQL database are running and reachable.

### In Admin Dashboard

Navigate to:
**Admin Dashboard → Settings → System Diagnostics**

Features available:
- **Combined System Status Card**:
  ```text
  System Diagnostics

  Backend
  ● Connected

  Database
  ● Connected

  Last checked
  20:45:32
  ```
- **Test Backend Connection**:
  - Triggers a real HTTP request from the browser to `GET /api/health`.
  - Displays `Backend: Connected` only if the backend responds successfully with HTTP 200 OK.
  - Displays `Backend: Not Connected` with a safe human-readable error if unreachable.
- **Test Database Connection**:
  - Triggers an authenticated request to `GET /api/admin/diagnostics/database`.
  - The backend executes a minimal query (`SELECT 1;`) directly on PostgreSQL and returns the verified result.
  - Displays `Database: Connected` with query latency, or `Database: Not Connected` on failure.
  - **No secrets, passwords, or connection strings are ever leaked in diagnostic payloads**.
- **Run Full Diagnostics**: Runs both tests concurrently and updates the telemetry status.

### Diagnostic API Endpoints

- `GET /api/health`: Public health check verifying that the Express API is running.
- `GET /api/admin/diagnostics/database`: Admin-authenticated check that executes `SELECT 1 as ping, current_database() as db_name`.
