# IUT Yearbook Monorepo

Web-Project-Yearbook is a full-stack monorepo that powers IUT's digital yearbook experience. The backend (Express + PostgreSQL) manages authentication, student profiles, memories, clubs, notifications, and yearbook publishing flows. The frontend (React + Vite) delivers a scrapbook-inspired interface for students and admins to collaborate on releases.

## Feature Highlights
- **Student Portal** – OTP-gated registration, login, and profile management with display photos, bios, and mottos.
- **Memory Composer** – Rich posting flow with drafts, privacy controls (department/batch/club/public), tagging, and multi-image upload with drag-and-drop ordering.
- **Yearbook Studio** – Admin tooling to create yearbook releases, seed department/club pages, assign editors, collect submissions, and manage publishing stages.
- **Clubs & Events** – Club directory with join/leave actions, event announcements, and club-scoped memories.
- **Notifications** – Tag approval requests and activity notifications keep contributors informed.
- **Admin & Dashboard Views** – Department, batch, and public feeds plus moderation endpoints for roles, batches, and yearbooks.

## Tech Stack
- **Frontend:** React 18, React Router, Axios, Vite
- **Backend:** Node.js 18+, Express 5, PostgreSQL (`pg`), JWT auth, Multer uploads, Cloudinary, Nodemailer
- **Tooling:** Nodemon for backend dev, Vite preview for frontend, npm (lockfiles align with npm v9)

## Repository Layout
```
backend/        # Express API, PostgreSQL access, controllers, routes, services
frontend/       # React + Vite client, pages, components, styles
scripts/        # Database helpers (seeders, wipe/create utilities)
AGENTS.md       # Internal handbook for repo automation agents
LICENSE         # GPL-2.0
```

## Prerequisites
- Node.js 18 or newer
- npm 9+
- PostgreSQL instance reachable from the backend
- Cloudinary account (for media storage)
- SMTP credentials (for OTP emails)

## Environment Variables
Create a `.env` next to `backend/package.json` with the following keys:

```
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_DATABASE=yearbook
DB_USER=postgres
DB_PASSWORD=postgres
JWT_SECRET=replace-me
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
SMTP_HOST=...
SMTP_PORT=587
SMTP_USER=...
SMTP_PASSWORD=...
```

The frontend relies on Vite's dev proxy to forward `/api` calls to the backend running on `PORT`; no extra env config is required unless you customize the proxy.

## Installation
From the repo root:

```bash
# Backend dependencies
cd backend
npm install

# Frontend dependencies
cd ../frontend
npm install
```

## Running Locally
### Backend
- Development with auto-restart: `npm run dev` (inside `backend/`)
- Production-style run: `npm start` (inside `backend/`)

### Frontend
- Development server (Vite on port 3000): `npm run dev` (inside `frontend/`)
- Production build: `npm run build`
- Preview the build: `npm run preview`

Visit `http://localhost:3000` during development; API calls proxy to `http://localhost:5000/api`.

## Database Utilities
Helper scripts live under `scripts/` and use the same `.env` configuration as the backend. Run with Node 18+:

```bash
node scripts/wipe-users.mjs          # Clears users, students, and related data
node scripts/create-dummy-users.mjs  # Seeds sample student accounts (password defaults to passcode123)
node scripts/seed-clubs.mjs          # Sets up example clubs
node scripts/seed-minimal.mjs        # Wipe + seed clubs + dummy users
```

## Available npm Scripts
| Location  | Script  | Description |
|-----------|---------|-------------|
| backend   | `npm run dev` | Start Express server with Nodemon |
| backend   | `npm start` | Start Express server with Node |
| frontend  | `npm run dev` | Launch Vite dev server with proxy |
| frontend  | `npm run build` | Build production assets |
| frontend  | `npm run preview` | Preview the production build |

## Testing & Linting
Automated tests and linters are not configured yet. Manual QA is recommended:
1. Start backend (`npm run dev` in `backend/`).
2. Start frontend (`npm run dev` in `frontend/`).
3. Visit `http://localhost:3000` and walk through login, dashboard posting, and yearbook studio flows.

When adding test suites, prefer Jest + Supertest on the backend and Vitest + React Testing Library on the frontend (see `AGENTS.md` for future guidance).

## Deployment Notes
- Build the frontend (`npm run build`) and deploy the `frontend/dist` folder via a static host.
- Deploy the backend as a long-running Node process (e.g., PM2, Docker) with access to PostgreSQL, Cloudinary, and SMTP.
- Configure your reverse proxy to route `/api/*` to the backend and serve `/uploads/*` from the backend static directory.
- Persist the PostgreSQL data volume and ensure outbound network access for Cloudinary + SMTP.

## Contributing
1. Create a feature branch.
2. Follow the coding conventions captured in `AGENTS.md` (import ordering, string style, indentation).
3. Document non-obvious decisions inside relevant files or the handbook.
4. Run frontend builds before opening a PR to catch Vite errors.

## License
Distributed under the GPL-2.0-only license. See `LICENSE` for details.
