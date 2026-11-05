# Agent instructions

## Push and deployment approval

- After completing any phase or user prompt, run the full test suite and
  production build.
- Then ask the user for explicit permission before committing, pushing to
  GitHub, or deploying to Cloudflare.
- Never push or deploy without the user's approval.
- After each build, record what changed in the app in the deployment log in
  `DEPLOYMENT.md`.
- Follow `DEPLOYMENT.md` for the full checklist and deployment log.
