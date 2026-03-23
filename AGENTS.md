# AGENT HANDBOOK FOR WEB-PROJECT-YEARBOOK

1. Purpose: enable autonomous agents to ship safe, consistent improvements across the monorepo.
2. Scope: backend (Express + PostgreSQL) and frontend (React + Vite) live under `/backend` and `/frontend`.
3. Mindset: prefer incremental, reversible changes; document anything non-obvious.
4. Baseline Node version: use the version configured by the user's environment (no engines specified); default to `node >= 18`.
5. Package managers: use `npm` (lockfiles are npm v9 format).
6. Secrets: `.env` is not committed; rely on `dotenv` in backend and browser storage on frontend.
7. Casing conventions: backend sticks to double quotes, frontend prefers single quotes; keep existing style per file.
8. Type system: both projects are plain JavaScript; no TypeScript, so lean on JSDoc or comments for tricky logic.
9. Module system: ES Modules everywhere (`type: "module"`); use `import/export` exclusively.
10. Directory ownership: do not mix backend and frontend dependencies; run commands from their respective folders.

## PROJECT STRUCTURE SNAPSHOT
11. `/backend/src/server.js`: Express entrypoint wiring middleware, routes, DB pool.
12. `/backend/src/config/database.js`: creates and caches a `pg` connection pool via `getPool()`.
13. `/backend/src/routes/*.js`: thin route registries pointing to controllers.
14. `/backend/src/controllers`: business logic for auth, dashboard, memories, registrations, students.
15. `/backend/src/services/otpService.js`: OTP generation/verification plus expiry helpers.
16. `/backend/src/utils`: mailer (Nodemailer + Cloudinary) and `parseStudentName` parser.
17. `/backend/src/middleware`: auth token verification and Multer upload configuration.
18. `/frontend/src/main.jsx` + `App.jsx`: React bootstrap with React Router.
19. `/frontend/src/pages`: feature pages (Login, Registration, Dashboard) each with matching CSS modules.
20. `/frontend/src/services/api.js`: Axios wrapper for auth, students, memories, dashboard API calls.

## ENVIRONMENT QUICK START
21. Install dependencies once: `npm install` in both `/backend` and `/frontend`.
22. Backend env vars required: `PORT`, `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USER`, `DB_PASSWORD`, `JWT_SECRET`, `CLOUDINARY_*`, `SMTP_*` per controllers/utilities.
23. Frontend expects `/api` proxy to backend (configured via `vite.config.js`).
24. Run backend dev server: `npm run dev` inside `/backend` (uses nodemon).
25. Run backend production server locally: `npm start` inside `/backend` (plain node).
26. Run frontend dev server: `npm run dev` inside `/frontend` (Vite on port 3000 with proxy).
27. Build frontend for production: `npm run build` then preview with `npm run preview` (serves `dist/`).
28. Deploy story: serve built frontend via static host; backend expects a persistent PostgreSQL + Cloudinary + SMTP.

## BUILD / LINT / TEST COMMANDS
29. Backend build: none (runtime-transpiled). Rely on `npm start` for smoke-testing.
30. Backend lint: not configured; follow manual review and run `node --check` if syntax doubts.
31. Backend tests: no automated tests defined yet. Recommend adding `npm test` using Jest + Supertest scoped to controllers.
32. Running a single backend test (once added): structure scripts as `"test": "NODE_ENV=test vitest"` or `jest`, then execute `npm test -- authController` (adjust to chosen runner).
33. Frontend build: `npm run build` (Vite emits to `frontend/dist`).
34. Frontend lint: not configured. If you introduce ESLint, document the rules here and add `npm run lint`.
35. Frontend tests: none today. When introducing Vitest/RTL, prefer `npm test` for watch mode and `npm test -- --runInBand path/to/file.test.jsx` for a single test.
36. Manual QA: after backend + frontend are running, hit `http://localhost:3000` for UI and `http://localhost:5000/api/health` once a health route exists.
37. Formatting: no Prettier configured; respect existing whitespace and indentation (2 spaces backend, 2 spaces frontend JSX, 2 spaces CSS).
38. Git hooks: none defined; run `npm run build` on frontend before pushing to ensure Vite compiles.

## IMPORT & MODULE GUIDELINES
39. Group imports: built-ins first, third-party packages next, internal modules last, each separated by a blank line.
40. Backend internal modules use relative paths starting with `./` or `../`; avoid deep aliasing until `NODE_PATH` or tsconfig paths are added.
41. Frontend uses relative imports from `src/`; keep path depth shallow by colocating shared helpers in `src/utils`.
42. Avoid default exports when a file exposes multiple semantics; prefer named exports (`export const requestOtp` etc.).
43. Side effects (like `dotenv.config()`) should happen once per process at the entrypoint before other imports rely on env vars.
44. When adding new dependencies, update the relevant `package.json` and run `npm install` to sync lockfiles.

## FORMATTING & NAMING
45. Use 2-space indentation globally; avoid tabs.
46. Strings: backend uses double quotes to match current files; frontend uses single quotes except for JSX attributes.
47. Arrow functions are preferred for React components and Express handlers unless `this` binding is required.
48. Name async functions with verbs that describe behavior (`handleLogin`, `createMemory`); avoid abbreviations except for well-known terms (OTP, JWT).
49. Constants go in `SCREAMING_SNAKE_CASE` only for env-derived config; regular runtime constants stay in `camelCase`.
50. CSS naming follows BEM-inspired tokens inside `.css` files; keep hyphenated lowercase class names.
51. Keep files focused: controllers stay lean and rely on services/utilities for shared logic.

## DATA & TYPES
52. Backend request validation currently uses inline checks; prefer extracting helpers when branching grows.
53. All database access flows through `req.app.locals.getPool()`; never instantiate new pools per request.
54. Use parameterized queries with `$1` placeholders; never interpolate string literals directly.
55. When returning JSON, keep payloads camelCased (`displayName`, `studentId`) to match frontend expectations.
56. Frontend state typically uses `useState`; consider `useReducer` for complex forms but stay consistent per component.
57. When handling numbers (student IDs, batch years), normalize types early (`String(student_id)` before comparisons).
58. Date formatting uses `toLocaleDateString`; keep locale consistent (`en-US`).

## ERROR HANDLING
59. Backend: wrap controller logic in `try/catch` and respond with meaningful status codes (400 validation, 401 auth, 409 conflict, 500 fallback).
60. Log internal errors with `console.error` including context (e.g., `console.error("Login Error", error)`), but do not leak stack traces to clients.
61. Frontend: catch Axios errors, read `err.response?.data?.error`, and show user-friendly fallback strings.
62. Promise rejections should always set loading states back to false in `finally` blocks.
63. Avoid throwing raw errors in React components; surface issues through error banners.
64. When adding file uploads, ensure `FormData` keys match backend expectations (`images`, `displayPhotoFile`).

## AUTH & SECURITY NOTES
65. JWT secret lives in `.env`; never commit fallback tokens.
66. `auth.js` middleware should guard every route requiring authentication; reuse existing pattern of verifying `Authorization: Bearer <token>`.
67. OTP logic caps attempts at 5 and uses hashed codes; preserve these constraints when updating flows.
68. Registration enforces `@iut-dhaka.edu` emails and full name + student ID format; do not relax without stakeholder approval.
69. When editing dashboard routes, ensure queries filter by authenticated user to prevent data leaks.
70. File uploads go through Multer; sanitize filenames and restrict MIME types before saving or forwarding to Cloudinary.

## STATE & STORAGE
71. Frontend stores `accessToken` and `user` JSON blob in `localStorage`; keep keys stable to avoid breaking existing sessions.
72. When logging out, always clear both values to prevent stale user context.
73. Derived values (batch, department) are computed server-side; trust backend payload rather than recalculating on the client.
74. Dashboard caches data in component state; trigger refetch after mutations (profile updates, new memories).

## PERFORMANCE & UX
75. Keep API calls debounced where possible (e.g., student tag search already requires 2 characters).
76. When adding new modals, follow the existing `modal-backdrop` pattern and stop event propagation inside the modal.
77. Avoid unnecessary re-renders by memoizing computed arrays if they grow; current components rely on primitive state, which is fine for now.
78. Loading indicators: use `.spinner` or `.loading-text` to match established UI language.

## DOCUMENTATION & COMMENTS
79. Only add comments for non-trivial SQL or parsing logic; prefer descriptive function names elsewhere.
80. Update this `AGENTS.md` whenever you add tooling (tests, lint, formatters) or change workflows.
81. When introducing new npm scripts, document purpose, args, and single-test usage below.

## FUTURE TESTING GUIDANCE
82. Recommended backend test stack: Jest + Supertest; place specs under `/backend/tests` mirroring `src` structure.
83. Example script addition: `"test": "NODE_ENV=test jest"` and `"test:watch": "npm run test -- --watch"`.
84. Run a single backend spec: `npm test -- authController.test.js` once Jest is configured.
85. For frontend, prefer Vitest + React Testing Library; store tests alongside components (`Dashboard.test.jsx`).
86. Example script: `"test": "vitest"`, `"test:ui": "vitest --ui"`.
87. Run one frontend test file: `npm test -- Dashboard.test.jsx`.
88. Until those scripts exist, rely on manual testing paths described above.

## DATABASE PRACTICES
89. Schema assumptions: tables include `users`, `students`, `otp_verifications`, `departments`, `yearbooks`, `memories`, `albums`.
90. Always wrap multi-step mutations in transactions if you add cross-table dependencies (e.g., posting a memory with tags and images).
91. Use `ON CONFLICT` upserts sparingly and only where uniqueness is enforced (student IDs, department codes, yearbooks).
92. Monitor pool errors via `pool.on("error")`; bubbled logs already exist—extend if you add new pooling behavior.

## CSS & DESIGN SYSTEM
93. Palette stored in `src/styles/index.css`; define new colors as CSS variables before use.
94. Keep scrapbook aesthetic: layered backgrounds, corner pins, vintage fonts.
95. Animations currently disabled globally (`* { animation: none }`); re-enable selectively if you add motion.
96. Component-level CSS lives next to the JSX file; avoid inline styles unless dynamic.
97. When adding responsive tweaks, extend existing `@media (max-width: 768px)` block.

## DEPLOYMENT CONSIDERATIONS
98. Backend is stateful (DB + file uploads). If deploying, ensure environment provides persistent storage and network egress for Cloudinary + SMTP.
99. Frontend expects `/api` and `/uploads` proxies; configure reverse proxy (NGINX, Vercel rewrites, etc.) accordingly.
100. Document any deployment scripts you add (Docker, PM2, etc.) in this file.

## WORKFLOW CHECKLIST FOR NEW TASKS
101. Review open PRs/branches for context (use `git status`, `git log -5`).
102. Sync dependencies (`npm install`) before running dev servers.
103. Update or create env samples if new configuration keys appear.
104. Implement changes respecting style guidance above.
105. Run relevant build commands (`npm run build` frontend, `npm start` backend) to catch runtime issues.
106. Execute or document tests (once added) and include commands in PR descriptions.
107. Summarize changes clearly when opening PRs; link to any issues or tickets.
108. Update `AGENTS.md` if your change introduces new scripts, directories, or conventions.

## CURSOR / COPILOT RULES
109. There are currently no `.cursor/rules/` or `.cursorrules` files in the repo.
110. There is no `.github/copilot-instructions.md` file.
111. If such rule files are created later, summarize them in this section and follow them in addition to the guidance above.

## CONTACTS & ESCALATION
112. No explicit CODEOWNERS; default to repo owners for approvals.
113. When modifying sensitive flows (auth, registration, payments if ever added), get human approval before merging.
114. For schema changes, coordinate migrations and communicate required SQL to maintainers.
115. For production incidents, capture logs plus reproduction steps before handing off.

## CHANGELOG FOR THIS HANDBOOK
116. 2026-03-08: Initial 150-line agent handbook authored automatically by OpenCode assistant.
117. Future edits: append dated entries with a short summary so other agents can diff expectations quickly.
