# Agent instructions

## Test, push, and deployment approval

- Ask the user for explicit permission before running tests or a production
  build.
- When the only changes are Markdown or documentation files, do not run tests
  or a build unless the user explicitly asks.
- After tests and build pass, ask the user for explicit permission before
  committing, pushing to GitHub, or deploying to Cloudflare.
- Never run tests, push, or deploy without the user's approval.
- After each build, record what changed in the app in the deployment log in
  `DEPLOYMENT.md`.
- Follow `DEPLOYMENT.md` for the full checklist and deployment log.
