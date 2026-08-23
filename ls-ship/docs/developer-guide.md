# Developer Guide

Welcome to the **LS Ship** developer guide. This document provides step-by-step instructions for setting up the local development environment, testing webhooks, understanding the project architecture, and contributing code.

---

## 🛠️ Prerequisites

Before getting started, ensure you have the following tools and accounts ready:

- **Node.js**: `v20.x` or higher (LTS recommended)
- **Package Manager**: `npm` (v10+)
- **Git**: `v2.x+`
- **Neon Account**: A free serverless PostgreSQL database at [neon.tech](https://neon.tech)
- **Clerk Account**: A free authentication app at [clerk.com](https://clerk.com)
- **GitHub Account**: For creating OAuth apps and testing push webhooks
- **Tunneling Tool**: [ngrok](https://ngrok.com/), [localtunnel](https://localtunnel.github.io/www/), or [Cloudflare Tunnels](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/) (required for receiving webhooks locally)

---

## 🚀 Quickstart Local Setup

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/ls-ship.git
cd ls-ship
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Copy the sample environment file:

```bash
cp .env.example .env.local
```

Generate an AES-256-GCM encryption key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Fill in all values in `.env.local` (refer to the [Environment Variables Guide](./environment-variables.md) for full details on each provider):

```env
DATABASE_URL=postgresql://neondb_owner:password@ep-cool-snowflake-123456.us-east-2.aws.neon.tech/neondb?sslmode=require
ENCRYPTION_KEY=<generated-base64-key>
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
GITHUB_APP_CLIENT_ID=...
GITHUB_APP_CLIENT_SECRET=...
JIRA_CLIENT_ID=...
JIRA_CLIENT_SECRET=...
SLACK_CLIENT_ID=...
SLACK_CLIENT_SECRET=...
NOTION_CLIENT_ID=...
NOTION_CLIENT_SECRET=...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Push Database Schema to Neon

Synchronize your schema definitions with the Neon PostgreSQL database:

```bash
npm run db:push
```

### 5. Start the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📜 NPM Scripts Reference

| Script | Command | Purpose |
| :--- | :--- | :--- |
| `npm run dev` | `next dev` | Starts the Next.js development server with hot reloading on port 3000. |
| `npm run build` | `next build` | Compiles the production build, generates static assets, and type-checks code. |
| `npm run start` | `next start` | Runs the compiled production server. |
| `npm run lint` | `next lint` | Runs ESLint across all TypeScript and React files. |
| `npm run db:push` | `drizzle-kit push` | Applies schema changes in `lib/db/schema.ts` directly to Neon PostgreSQL. |
| `npm run db:generate`| `drizzle-kit generate` | Generates SQL migration files in the `drizzle/` directory based on schema diffs. |

---

## 📂 Project Structure & Codebase Map

```
ls-ship/
├── app/                          # Next.js 14 App Router
│   ├── (auth)/                   # Authentication routes (Clerk)
│   │   ├── sign-in/              # Sign in page
│   │   └── sign-up/              # Sign up page
│   ├── (dashboard)/              # Authenticated dashboard section
│   │   ├── layout.tsx            # Dashboard layout + user sync + sidebar
│   │   ├── dashboard/page.tsx    # Metrics & recent events
│   │   ├── repos/page.tsx        # Connected repository management
│   │   ├── integrations/         # Integrations management (OAuth & config)
│   │   ├── logs/page.tsx         # Real-time webhook event audit trail
│   │   └── settings/page.tsx     # Global settings & branch fallback
│   ├── (marketing)/              # Public landing page
│   │   └── page.tsx              # Feature overview & sign-up CTA
│   ├── api/                      # Backend REST API routes
│   │   ├── integrations/         # OAuth connect, callback, & metadata endpoints
│   │   ├── repos/                # Repository CRUD API
│   │   └── webhooks/             # GitHub webhook ingestion endpoint
│   ├── globals.css               # Global CSS styles & design system tokens
│   └── layout.tsx                # Root HTML layout with ClerkProvider
├── components/                   # Reusable React components
│   ├── dashboard/                # Dashboard widgets, forms, & auto-refreshers
│   ├── repos/                    # Repository list, picker, & setup modal
│   └── ui/                       # Design system components (Badge, Button, Card, etc.)
├── docs/                         # Comprehensive project documentation
├── drizzle/                      # Drizzle SQL migration files
├── lib/                          # Backend business logic & utility modules
│   ├── commit-parser.ts          # Commit message regex & flag parser
│   ├── crypto.ts                 # AES-256-GCM token encryption/decryption
│   ├── db/                       # Database client, Drizzle schema, & queries
│   ├── github/                   # Octokit client, PRs, & HMAC verification
│   ├── jira/                     # Jira client, token refresh, & issue transitions
│   ├── notion/                   # Notion SDK client, search, & block appending
│   └── slack/                    # Slack API client, channels, & notifications
├── middleware.ts                 # Clerk authentication & route protection middleware
├── drizzle.config.ts             # Drizzle ORM configuration
├── next.config.mjs               # Next.js build configuration
├── tailwind.config.ts            # Tailwind CSS theme & token configuration
└── package.json                  # Dependencies & scripts
```

---

## 🪝 Local Webhook Testing Workflow

GitHub cannot send webhooks directly to `http://localhost:3000`. You must expose your local server using a public tunnel.

### Step 1: Start a Tunnel

Using [ngrok](https://ngrok.com/):

```bash
ngrok http 3000
```

Copy the forwarding HTTPS URL, for example: `https://abc123.ngrok-free.app`.

### Step 2: Update `NEXT_PUBLIC_APP_URL`

In `.env.local`, set:

```env
NEXT_PUBLIC_APP_URL="https://abc123.ngrok-free.app"
```

Restart your Next.js server (`npm run dev`).

### Step 3: Register or Connect Your Repo

1. In the LS Ship dashboard, go to **Repos**.
2. Connect your repository. LS Ship will automatically register the ngrok URL as the webhook on GitHub.
3. If setting up manually, copy the Payload URL and Secret into your GitHub repository settings under **Settings** -> **Webhooks**.

---

## 🧪 Simulating Webhooks with `curl`

You can test webhook processing locally without making actual Git pushes using a Node.js simulation script.

Create a scratch script `test-webhook.mjs`:

```javascript
import { createHmac } from "crypto";

const REPO_ID = "<YOUR_REPO_ID>";
const WEBHOOK_SECRET = "<YOUR_PLAINTEXT_WEBHOOK_SECRET>";
const APP_URL = "http://localhost:3000";

const payload = {
  ref: "refs/heads/feature/login",
  commits: [
    {
      id: "9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e",
      message: "PROJ-101 Add OAuth login support [auto-pr,main,taskcompleted]",
    },
  ],
};

const rawBody = JSON.stringify(payload);
const signature = "sha256=" + createHmac("sha256", WEBHOOK_SECRET).update(rawBody, "utf8").digest("hex");

const res = await fetch(`${APP_URL}/api/webhooks/github/${REPO_ID}`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-hub-signature-256": signature,
  },
  body: rawBody,
});

console.log("Response Status:", res.status);
console.log("Response Body:", await res.json());
```

Run with:

```bash
node test-webhook.mjs
```

Check the **Logs** tab in your dashboard to view the processed event!

---

## 📐 Coding Standards & Guidelines

1. **Server vs Client Separation**:
   - Use `"server-only"` imports for all cryptographic, database, and backend SDK modules in `lib/`.
   - Never import `lib/crypto.ts` or database queries inside client components.
2. **Encrypted Persistence**:
   - All third-party OAuth access tokens, refresh tokens, and webhook secrets **must** pass through `encrypt()` before saving to PostgreSQL.
3. **Resilient Webhook Handling**:
   - Webhook processing iterates through commits sequentially and catches errors on a per-commit basis. One failing commit must never abort processing for other valid commits in the same push.
   - Use `Promise.allSettled()` for multi-channel notifications so a failure in Slack does not block Notion delivery.
