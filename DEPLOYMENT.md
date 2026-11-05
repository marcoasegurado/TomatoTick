# Push and Deployment Workflow

This file defines the workflow for every completed phase or prompt in this
repository. Follow it after finishing any implementation work.

## Rule

After a phase or prompt is finished:

1. Run the full test suite and production build.
2. Ask the user for explicit permission before pushing to GitHub or deploying.
3. Only after approval, commit and push to `main`.
4. Cloudflare deploys automatically from `main`.
5. Verify the live site and record the result in the deployment log below.
6. Write a short summary of what changed in the app for that deployment.

Never push or deploy without the user's explicit approval.

## Checklist

```bash
npm test
npm run build
```

Ask the user:

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
