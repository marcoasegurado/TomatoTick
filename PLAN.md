# TomatoTick: Build Plan

**App name:** TomatoTick

**Description:** A cheerful Pomodoro timer that helps you stay focused, one tomato at a time.

Use the name "TomatoTick" everywhere: page title, header, `package.json`, README, and repo name. Use the description above as the tagline in the app and at the top of the README.

TomatoTick is a playful, tomato-themed Pomodoro timer with a task list and productivity stats. It is built in phases so each stage can be reviewed, tested, and committed before moving on.

## Instructions for the AI agent

- Work **one phase at a time**. Do not start the next phase until the current one is finished and its checklist passes.
- After each phase: make sure the app runs without errors, then make a git commit with a clear message (e.g. `feat: phase 2 core timer`).
- Keep code clean and modular: small components, custom hooks for logic, no giant files.
- Use plain JavaScript or TypeScript (prefer TypeScript if comfortable), functional components, and hooks.
- Do not add features that are not listed in this plan.

## Tech stack

- React + Vite
- localStorage for all persistence (no backend)
- Vitest for unit tests
- Cloudflare Pages deployment (connected to the GitHub repo, auto-deploys on push to `main`)
- GitHub Actions for CI (tests and build checks)
- A lightweight chart library (e.g. Recharts) for stats

## Final feature list

| Area | Requirements |
| --- | --- |
| Timer | Classic Pomodoro cycle: focus, short break, long break (long break every 4 focus sessions). Durations adjustable in settings. |
| Accuracy | Timestamp-based (store end time, compute remaining time). Stays accurate in background tabs. Resumes after refresh or closed tab. Live time shown in the browser tab title. |
| Tasks | Add, complete, delete tasks. Pick one task as the current focus. Completed focus sessions are credited to that task. |
| Stats | Sessions and focus time (today and all-time), daily/weekly bar chart, streak counter, GitHub-style heatmap, per-task focus time breakdown. |
| Alerts | Sound alert, browser notification, auto-start next session (toggleable), choice of alert sounds and volume control. |
| Look | Playful tomato theme, rounded shapes, color changes per mode (focus, short break, long break). |
| Layout | Timer is the main view. Task list in a sidebar (drawer on mobile). Stats and settings open as modals. Fully responsive. |
| Extras | Keyboard shortcuts (e.g. `Space` start/pause, `R` reset, `S` skip). |
| Repo | Polished README, Cloudflare Pages demo, Vitest tests, CI on every push. |

---

## Phase 1: Project setup

**Goal:** A clean, running skeleton.

- [x] Scaffold a React + Vite project.
- [x] Set up a folder structure (`components/`, `hooks/`, `utils/`, `context/` or `store/`, `assets/`).
- [x] Add global styles and CSS variables for the three mode colors (focus, short break, long break).
- [x] Add Vitest and a sample passing test.
- [x] Add a `.gitignore`. Keep the Vite `base` option at `/` (the default), since Cloudflare Pages serves the site from the root.
- [x] Create a basic app shell: header, main timer area, empty sidebar.

**Done when:** `npm run dev`, `npm run build`, and `npm test` all work.

---

## Phase 2: Core timer

**Goal:** A reliable, accurate Pomodoro timer.

- [x] Timer display with a progress ring and large time text.
- [x] Mode switcher: Focus, Short Break, Long Break.
- [x] Start, pause, reset, and skip controls.
- [x] Timestamp-based countdown logic in a custom hook (store the target end time and compute the remaining time on each tick).
- [x] Automatic cycle: after every 4 focus sessions, a long break; otherwise a short break.
- [x] Session counter showing progress through the current cycle.
- [x] Persist running state in localStorage so the timer survives a refresh or closed tab.
- [x] Show the live remaining time in `document.title`.
- [x] Unit tests for the timer logic (countdown math, mode transitions, resume after reload).

**Done when:** The timer stays accurate when the tab is in the background, and reloading mid-session continues correctly.

---

## Phase 3: Settings and alerts

**Goal:** Customizable durations and session-end notifications.

- [x] Settings modal with adjustable focus, short break, and long break lengths, and the long-break interval.
- [x] Persist settings in localStorage.
- [x] Sound alert when a session ends, with a choice of at least 3 sounds and a volume slider.
- [x] Browser notification when a session ends (ask for permission gracefully, and handle denial).
- [x] Auto-start next session toggle (on/off).
- [x] Preview button to test the selected sound.
- [x] Unit tests for settings validation (e.g. no zero or negative durations).

**Done when:** Changing settings takes effect immediately and survives a refresh, and all alerts work.

---

## Phase 4: Task list

**Goal:** A simple task list connected to the timer.

- [x] Sidebar task list (becomes a slide-in drawer on mobile).
- [x] Add, complete (toggle), and delete tasks.
- [x] Select one task as the "current focus", displayed under the timer.
- [x] Each completed focus session is credited to the current task (session count and focus minutes).
- [x] Persist tasks in localStorage.
- [x] Empty state message when there are no tasks.
- [x] Unit tests for task state logic.

**Done when:** Tasks persist, and finishing a focus session updates the selected task's totals.

---

## Phase 5: Session history and stats

**Goal:** Meaningful productivity stats in a modal.

- [x] Record every completed focus session (date, duration, task id) in localStorage.
- [x] Stats modal with these sections:
  - [x] Summary cards: sessions and focus time for today and all-time.
  - [x] Bar chart of focus minutes per day (last 7 days).
  - [x] Current streak and longest streak.
  - [x] GitHub-style calendar heatmap of focus activity.
  - [x] Per-task breakdown (focus time per task).
- [x] Handle empty states (no sessions yet) without errors.
- [x] Unit tests for stats calculations (totals, streaks, grouping by day and task).

**Done when:** Stats are correct against sample data, and the modal looks good with both empty and populated data.

---

## Phase 6: Theme, responsiveness, and shortcuts

**Goal:** Polish the look and the usability.

- [x] Apply the playful tomato theme: rounded shapes, friendly typography, mode-based color changes with smooth transitions.
- [x] Make the layout fully responsive (phone, tablet, desktop), with sidebar to drawer on small screens.
- [x] Keyboard shortcuts: `Space` start/pause, `R` reset, `S` skip. Ignore shortcuts while typing in an input.
- [x] Show a small shortcuts hint somewhere discoverable (e.g. in settings).
- [x] Basic accessibility: labeled buttons, focus states, sufficient contrast, `aria-live` for timer changes where reasonable.
- [x] Test at 360px, 768px, and 1280px widths.

**Done when:** The app looks and works well on all three widths and every feature is reachable by mouse, touch, and keyboard.

---

## Phase 7: Testing, CI, and deployment

**Goal:** A reliable, deployed project.

- [x] Review and fill gaps in unit tests (timer, settings, tasks, stats).
- [x] Add a GitHub Actions workflow that runs install, lint (if configured), tests, and build on every push and pull request.
- [x] Prepare the project for Cloudflare Pages. Do not add a GitHub Pages workflow. The deployment itself is set up by the owner in the Cloudflare dashboard (Workers & Pages, create a Pages project, connect the GitHub repo) with these build settings:
  - Framework preset: Vite (or build command `npm run build`)
  - Build output directory: `dist`
  - Production branch: `main`
- [x] Make sure `npm run build` succeeds from a clean install and produces a working `dist/` folder.
- [x] Add a short "Deploying to Cloudflare Pages" section to the README with the settings above.
- [x] After the owner deploys, confirm the live site works (assets load, timer runs, localStorage persists, no console errors).

**Done when:** CI passes on every push, a clean build works, and a push to `main` publishes the live demo on Cloudflare Pages.

---

## Phase 8: README and documentation

**Goal:** A portfolio-ready repository.

- [x] Write a polished `README.md` with:
  - [x] Project title, short description, and live demo link.
  - [x] Screenshots or a GIF of the timer, task list, and stats.
  - [x] Features list.
  - [x] Tech stack.
  - [x] Getting started (install, run, test, build).
  - [x] Keyboard shortcuts table.
  - [x] Project structure overview.
  - [x] Roadmap (e.g. backend sync, data export/import, PWA).
- [x] Add a `LICENSE` file (MIT).
- [x] Final cleanup: remove unused files and dead code, and make sure there are no console errors.

**Done when:** A new visitor can understand, run, and try the project from the README alone.

---

## Phase 9: Performance, accessibility, and data safety

**Goal:** A faster, more accessible app with a way to back up local data.

- [x] Lazy-load the stats modal and split the chart library into its own chunk, so the initial bundle no longer includes Recharts.
- [x] Add focus management for dialogs: move focus in, trap Tab, close on `Escape`, restore focus on close, and lock background scrolling.
- [x] Treat the mobile task sidebar as a modal drawer: close on `Escape`, remove it from the tab order when hidden, and expose `aria-expanded`/`aria-controls` on the Tasks button.
- [x] Add versioned JSON export/import for settings, tasks, and session history, with validation, warnings for skipped entries, and confirmation before replacing data.
- [x] Add tests for backup parsing, dialog focus behavior, the mobile drawer, and the import flow.
- [x] Update the README for data backup and keep the bundle warning-free.

**Done when:** Initial load avoids the chart bundle, every overlay is keyboard-accessible, and data can be exported and restored safely.

---

## Phase 10: Installable PWA and offline support

**Goal:** Let people install TomatoTick like an app and keep using it offline.

- [x] Add a web app manifest with app name, theme colors, display mode, and scope.
- [x] Add 192px, 512px, and Apple touch icons for install surfaces.
- [x] Register a service worker in production builds only, without affecting development.
- [x] Precache the app shell and runtime-cache hashed Vite assets for offline use.
- [x] Add an in-app install button that appears when the browser offers an install prompt.
- [x] Keep offline navigation working by falling back to the cached app shell.
- [x] Add tests for the PWA helpers.
- [x] Document installation and offline behavior in the README.

**Done when:** The app can be installed from a supported browser, loads from cache after the first visit, and the production build passes tests and CI.

---

## Out of scope (for now)

- Backend, accounts, or cloud sync
- Task categories or tags