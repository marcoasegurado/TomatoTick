# TomatoTick 🍅

**A cheerful Pomodoro timer that helps you stay focused, one tomato at a time.**

[![CI](https://github.com/marcoasegurado/TomatoTick/actions/workflows/ci.yml/badge.svg)](https://github.com/marcoasegurado/TomatoTick/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**[Try TomatoTick live →](https://tomatotick.marcoeduardo-asegurado.workers.dev/)**

TomatoTick is a browser-based Pomodoro timer that combines configurable focus
and break sessions with task tracking, session history, and lightweight
productivity stats. It runs entirely in your browser and needs no account or
backend.

## Screenshots

![TomatoTick timer showing a paused focus session, the progress ring, and the task sidebar](docs/screenshots/timer.png)

| Task list | Statistics |
| --- | --- |
| <img src="docs/screenshots/tasks.png" alt="Task drawer on mobile with tasks and focus progress" width="300" /> | <img src="docs/screenshots/stats.png" alt="Stats modal with summary cards, weekly chart, streaks, activity heatmap, and per-task breakdown" width="450" /> |

## Features

- **Pomodoro timer** with focus, short break, and long break modes.
- **Configurable sessions** for focus length, break lengths, and the number of
  focus sessions between long breaks.
- **Accurate, timestamp-based countdown** that stays correct in background tabs
  and resumes after a refresh or closed tab.
- **Live timer in the tab title** so you can see the remaining time from any
  browser tab.
- **Task list** for adding, completing, deleting, and selecting the task you
  are currently working on.
- **Session history and statistics**, including:
  - Sessions and focus time today and all-time
  - Last-seven-days focus chart
  - Current and longest streaks
  - GitHub-style activity heatmap
  - Focus time grouped by task
- **Audio alerts** with bell, chime, and beep options plus volume control.
- **Browser notifications** when sessions end, where supported and permitted.
- **Auto-start** for the next session.
- **Keyboard shortcuts** for starting, resetting, and skipping sessions.
- **Persistent browser storage** so the timer, settings, tasks, and session
  history survive page refreshes.
- **Responsive interface** with accessible labels, live timer status, and
  keyboard-friendly controls.

## Tech stack

- React 19 with TypeScript
- Vite
- Recharts
- Vitest and Testing Library
- GitHub Actions for CI
- Cloudflare for hosting

## Getting started

### Prerequisites

- Node.js 18 or newer
- npm

### Installation

```bash
git clone https://github.com/marcoasegurado/TomatoTick.git
cd TomatoTick
npm install
```

### Start the development server

```bash
npm run dev
```

Open the local URL printed by Vite, usually
`http://localhost:5173`.

### Create a production build

```bash
npm run build
```

To preview the production build locally:

```bash
npm run preview
```

## Available scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite development server |
| `npm run build` | Type-check and create a production build |
| `npm run preview` | Serve the production build locally |
| `npm test` | Run the test suite once |
| `npm run test:watch` | Run Vitest in watch mode |

## How to use

1. Start the default 25-minute focus session with the play button.
2. Open **Tasks** to add a task and mark it as the current focus.
3. Use **Settings** to adjust timer durations, break intervals, alerts, and
   auto-start behavior.
4. When a focus session completes, TomatoTick records it in your history and
   credits the selected task.
5. Open **Stats** to review your focus time, streaks, activity, and task
   breakdown.

The timer supports the standard Pomodoro cycle: after the configured number of
focus sessions, it switches to a long break; otherwise, it switches to a short
break.

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| `Space` | Start or pause the current session |
| `R` | Reset the current session |
| `S` | Skip to the next session |

Shortcuts are ignored while you are typing in an input. They are also listed in
the Settings modal.

## Data and privacy

TomatoTick is a client-side application. It does not require an account or a
backend. The following data is stored in the browser's `localStorage`:

- Timer state
- Timer settings
- Tasks and task progress
- Completed focus sessions

Clearing the site's browser data resets the app and removes this local history.
Browser notifications are optional and require permission from the browser.

## Project structure

```text
docs/
└── screenshots/  Screenshots used in this README
src/
├── components/   UI components for the timer, tasks, settings, and stats
├── context/      React context providers for settings, tasks, and sessions
├── hooks/        Timer and keyboard-shortcut hooks
├── utils/        Timer, storage, formatting, alert, and statistics logic
├── App.tsx       Application shell and modal state
└── main.tsx      React entry point and provider setup
```

The timer and data transformations are kept in `src/utils/` so they can be
tested independently of the UI. The app uses React context providers to share
settings, task state, and completed sessions across components.

## Testing

Run all tests with:

```bash
npm test
```

The suite covers timer behavior, settings validation, task operations, session
statistics, time formatting, and the main application flow. GitHub Actions runs
the tests and a production build on every push and pull request.

## Deploying to Cloudflare Pages

TomatoTick is a static single-page app, so it deploys to Cloudflare Pages with
no server-side configuration. The deployment is set up in the Cloudflare
dashboard:

1. Go to **Workers & Pages** and create a **Pages** project.
2. Connect the GitHub repository for this project.
3. Use these build settings:

| Setting | Value |
| --- | --- |
| Framework preset | Vite |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Production branch | `main` |

Every push to `main` publishes the live site, and Cloudflare creates preview
deployments for other branches. The Vite `base` option stays at `/` because
Cloudflare Pages serves the app from the site root.

## Roadmap

The roadmap for TomatoTick includes:

- **Installable PWA support** so the app can be installed and used more like a
  native desktop or mobile app.
- **Offline-first improvements** for reliable use without an internet
  connection.
- **More notification options**, including additional sounds and improved
  background reminders.
- **Richer task management**, such as task editing, tags, priorities, and
  optional task estimates.
- **Expanded analytics**, including custom date ranges, exportable reports, and
  additional productivity trends.
- **Data export and import** so users can back up or move their local tasks,
  settings, and session history.
- **Theme customization**, including dark mode and additional color themes.
- **Accessibility and mobile refinements** based on continued testing across
  browsers, screen readers, and small screens.
- **Optional synchronization** for users who want their data available across
  multiple devices.

The roadmap is subject to change as the app evolves. Planned features are not
currently part of the production behavior described above.

## License

This project is licensed under the [MIT License](LICENSE).
