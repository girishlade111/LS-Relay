# LS Ship

LS Ship is a multi-tenant SaaS port of a legacy n8n automation workflow. Connect a GitHub repo, and every push is processed server-side:

1. A webhook receives the push and verifies its HMAC signature.
2. Commit messages are parsed for Jira task keys and automation flags.
3. Valid commits automatically **open pull requests** against a base branch (skipping ones that already exist).
4. Flagged tasks are moved to **Development Done** in Jira.
5. Results are announced to **Slack** and logged to a **Notion** page.
6. Everything — created PRs, skipped commits, parse failures, errors — lands in an auditable event log behind the dashboard.

Unlike the old workflow, each user connects their own integrations (OAuth), owns their own repos, and their tokens/secrets are encrypted at rest with AES-256-GCM.

## Tech stack

Next.js 14 (App Router) · TypeScript · Tailwind CSS · Drizzle ORM + Neon Postgres · Clerk auth · Octokit · official Notion SDK

## Environment variables

Copy `.env.example` to `.env.local` and fill in:

| Variable | Where to get it |
| --- | --- |
| `DATABASE_URL` | Neon dashboard → your project → Connection string |
| `ENCRYPTION_KEY` | Generate yourself: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk dashboard → API Keys |
| `CLERK_SECRET_KEY` | Clerk dashboard → API Keys |
| `GITHUB_APP_CLIENT_ID` / `GITHUB_APP_CLIENT_SECRET` | GitHub → Settings → Developer settings → OAuth Apps → New OAuth App. Callback URL: `<your-domain>/api/integrations/github/callback` |
| `JIRA_CLIENT_ID` / `JIRA_CLIENT_SECRET` | Atlassian developer console → OAuth 2.0 (3LO) app. Callback URL: `<your-domain>/api/integrations/jira/callback` |
| `SLACK_CLIENT_ID` / `SLACK_CLIENT_SECRET` | Slack → api.slack.com/apps → your app → OAuth & Permissions. Redirect URL: `<your-domain>/api/integrations/slack/callback` |
| `NOTION_CLIENT_ID` / `NOTION_CLIENT_SECRET` | notion.so/my-integrations → create a public integration. Redirect URI: `<your-domain>/api/integrations/notion/callback` |
| `NEXT_PUBLIC_APP_URL` | The public origin of your deployment (e.g. `https://ls-ship.vercel.app`). Used for all OAuth redirects and webhook URLs |

## Local setup

```bash
git clone <repo-url>
cd ls-ship
npm install
cp .env.example .env.local   # then fill in every value
npm run db:push              # creates/updates tables in Neon
npm run dev
```

## Commit message format

```
TASK-123 Short commit message [flags]
```

The part before the first space must match `KEY-<digits>` (any uppercase prefix). Flags go in trailing square brackets, comma-separated:

| Flag | Effect |
| --- | --- |
| `auto-pr` | Open a PR from the pushed branch. Requires a base branch flag, e.g. `[auto-pr,main]` (falls back to repo default, then account default) |
| `taskcompleted` | Move the Jira task to Development Done |
| any other word | Treated as the base branch name |

Examples:

```
PROJ-101 Fix login validation            → tracked, no automation
PROJ-102 Ship dark mode [auto-pr,staging]        → PR into staging
PROJ-103 Update deps [taskcompleted]             → Jira task marked done
PROJ-104 Full flow [auto-pr,main,taskcompleted]  → PR into main + done
```

Commits that don't match the format are logged as `invalid` events, never silently dropped.

## Deployment (Vercel)

1. Push the repo and connect it in Vercel (framework auto-detected).
2. Add **every** variable above under Project → Settings → Environment Variables.
3. Set `NEXT_PUBLIC_APP_URL` to the production domain Vercel assigns (or your custom domain) — OAuth callbacks and generated webhook URLs derive from it.
4. Deploy, then update each provider's redirect/callback URL to the production domain if you only registered localhost earlier.
5. For each connected repo, open GitHub → Settings → Webhooks and confirm the Payload URL points at the **production** domain (`https://<your-domain>/api/webhooks/github/<repoId>`). If you tested locally, re-add the webhook using the URL shown when re-saving the repo on the Repos page — note the webhook secret changes if you regenerate it.

### Existing database installs

If your Neon database predates the settings feature, apply this once (fresh installs get it via `db:push`):

```sql
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "defaultBaseBranch" text;
```
