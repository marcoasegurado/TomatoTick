# Push and Deployment Workflow

This file defines the workflow for every completed phase or prompt in this
repository. Follow it after finishing any implementation work.

## Rule

After a phase or prompt is finished:

1. Check which files changed.
2. Ask the user for explicit permission before running tests or a build.
3. If the only changes are Markdown or documentation files, skip tests and the
   build unless the user explicitly asks for them.
4. After tests and build pass, ask for separate permission to push to GitHub
   and deploy.
5. Only after approval, commit and push to `main`.
6. Cloudflare deploys automatically from `main`.
7. Verify the live site and record the result in the deployment log below.
8. Write a short summary of what changed in the app for that deployment.

Never run tests, push, or deploy without the user's explicit approval.

## Checklist

Ask the user before running:

```bash
npm test
npm run build
```

After tests and build pass, ask the user:

> Tests and build pass. May I push these changes to GitHub `main` and update
> the Cloudflare deployment?

After approval:

```bash
git status --short
git add <changed-files>
git commit -m "feat: phase N short description"
git push origin main
```

Cloudflare is connected to the GitHub repository and deploys every push to
`main`. The production build settings are:

| Setting | Value |
| --- | --- |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Production branch | `main` |
| Live URL | https://tomatotick.marcoeduardo-asegurado.workers.dev/ |

## Verify the deployment

After Cloudflare finishes deploying:

1. Fetch the live URL and confirm it returns HTTP 200.
2. Check that the asset hashes in the served `index.html` match the new build.
3. Confirm the deployed JavaScript contains a string from the new feature.
4. Record the deployment and summarize what changed in the app in the log below.

## Deployment log

| Date | Phase or prompt | Commit | GitHub pushed | Cloudflare verified | What changed in the app |
| --- | --- | --- | --- | --- | --- |
| 2026-11-05 | Phase 11: richer task management | `90cd0a2` | Yes | Yes | Added inline task editing, priorities with sorting, tags and tag filtering, session estimates with progress, all/active/completed filters, pinned current focus, and backwards-compatible task and backup migration. Updated the README and test suite. |
| 2026-11-05 | Phase 12: notification and alert improvements | `ba9cd1e` | Yes | Yes | Added Marimba and Digital alert sounds, service-worker notifications with a Notification fallback, notification click handling, a Test notification button with permission feedback, and new alert tests. Updated the README. |
| 2026-11-05 | Phase 13: additional themes | `a84d847` | Yes | Yes | Added System, Light, Dark, Sunset, Forest, and Midnight themes, a theme picker with previews, OS-following System mode, per-theme palettes, and theme tests. Updated the README. |
| 2026-11-06 | Phase 14: expanded analytics | `44763ac` | Yes | Yes | Added Stats range controls (7 days, 30 days, this month, all time, and custom with validation), range-scoped summary cards, a trends panel comparing the previous period, daily or weekly chart granularity, CSV export of the selected range, a remembered range preference, range-aware empty states, and accessible chart summaries. Updated the README and test suite. |
| 2026-11-06 | Phase 15: accessibility and mobile refinements | `pending` | No | No | Switched layouts and modals to dynamic viewport units, added notched-phone safe areas, raised small controls to 44px, kept mobile form text at 16px, announced Stats range changes, added a text alternative for the activity calendar, added Windows High Contrast rules, added axe checks for the four main views, and documented a manual accessibility checklist. Updated the README. |
