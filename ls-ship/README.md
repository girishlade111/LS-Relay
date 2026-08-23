# LS Ship 🚀

[![Next.js 14](https://img.shields.io/badge/Next.js-14.2-black?style=flat&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Drizzle ORM](https://img.shields.io/badge/Drizzle_ORM-0.45-green?style=flat&logo=drizzle)](https://orm.drizzle.team/)
[![Neon Postgres](https://img.shields.io/badge/Neon-PostgreSQL-00E599?style=flat&logo=postgresql)](https://neon.tech/)
[![Clerk Auth](https://img.shields.io/badge/Auth-Clerk-6C47FF?style=flat&logo=clerk)](https://clerk.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=flat&logo=tailwind-css)](https://tailwindcss.com/)

**LS Ship** is a multi-tenant SaaS automation platform ported from a legacy n8n pipeline. It connects to your GitHub repositories and automates the entire software shipping lifecycle directly from your Git commit messages:

1. 🪝 **Ingests GitHub Pushes**: Verifies HMAC-SHA256 signatures and processes commits server-side.
2. 🔍 **Parses Commit Messages**: Extracts Jira issue keys (e.g. `TASK-123`) and automation flags (`[auto-pr,main]`, `[taskcompleted]`).
3. 🔀 **Automated Pull Requests**: Checks for existing open PRs and automatically opens new PRs against specified or fallback base branches.
4. 📋 **Jira Task Synchronization**: Transitions Jira issues to **Development Done** when flagged.
5. 📢 **Multi-Channel Team Notifications**: Announces outcomes in **Slack** channels and appends structured audit blocks into **Notion** pages.
6. 🛡️ **Comprehensive Audit Log**: Tracks every push, created PR, duplicate check, skipped commit, and parse failure in an auditable dashboard.

Unlike legacy shared automation scripts, **LS Ship** isolates each user via OAuth 2.0 and encrypts all tokens, refresh tokens, and webhook secrets at rest using **AES-256-GCM**.

---

## 🏗️ Architecture & Data Flow

```mermaid
sequenceDiagram
    autonumber
    actor Dev as Developer
    participant GH as GitHub
    participant App as LS Ship Engine
    participant Jira as Atlassian Jira
    participant Slack as Slack Channel
    participant Notion as Notion Page
    participant DB as Neon PostgreSQL

    Dev->>GH: git push origin feature/auth
    Note over Dev,GH: Commit: TASK-101 Add OAuth login [auto-pr,main,taskcompleted]
    GH->>App: POST /api/webhooks/github/[repoId] (X-Hub-Signature-256)
    App->>App: Verify HMAC-SHA256 signature with AES-decrypted secret
    App->>App: Parse Jira key (TASK-101) & flags (auto-pr, main, taskcompleted)
    
    par PR & Jira Automation
        App->>GH: Check if PR already exists for feature/auth
        alt PR does not exist
            App->>GH: Create PR targeting 'main'
        end
        App->>Jira: Verify issue TASK-101 & transition status to 'Development Done'
    end

    par Parallel Team Notifications
        App->>Slack: Post announcement to configured Slack channel
        App->>Notion: Append activity paragraph to configured Notion page
    end

    App->>DB: Record immutable event log in webhookEvents
    App-->>GH: 200 OK
```

---

## ⚡ Tech Stack

- **Framework**: [Next.js 14](https://nextjs.org/) (App Router, Server Actions, Route Handlers)
- **Language**: [TypeScript 5](https://www.typescriptlang.org/) (Strict Mode)
- **Database & ORM**: [Neon Serverless PostgreSQL](https://neon.tech/) + [Drizzle ORM](https://orm.drizzle.team/)
- **Authentication**: [Clerk](https://clerk.com/) (`@clerk/nextjs`)
- **Cryptography**: Node.js `crypto` with `aes-256-gcm` authenticated encryption
- **External SDKs**: Official `@octokit/rest` (GitHub), `@notionhq/client` (Notion)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) with a curated Dark UI design system

---

## 🚀 Quick Start

### 1. Prerequisites
- Node.js 20+ and npm
- A free [Neon PostgreSQL](https://neon.tech) database
- A free [Clerk](https://clerk.com) account

### 2. Clone & Install
```bash
git clone https://github.com/your-org/ls-ship.git
cd ls-ship
npm install
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Generate a 32-byte Base64 encryption key:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Fill in `.env.local`:
```env
DATABASE_URL="postgresql://user:pass@ep-xyz.us-east-2.aws.neon.tech/neondb?sslmode=require"
ENCRYPTION_KEY="<your-generated-base64-key>"
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."
GITHUB_APP_CLIENT_ID="Iv1.xxxx"
GITHUB_APP_CLIENT_SECRET="xxxx"
JIRA_CLIENT_ID="xxxx"
JIRA_CLIENT_SECRET="xxxx"
SLACK_CLIENT_ID="xxxx"
SLACK_CLIENT_SECRET="xxxx"
NOTION_CLIENT_ID="xxxx"
NOTION_CLIENT_SECRET="xxxx"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```
*(For detailed setup guides for each provider, check the [Environment Variables Guide](./docs/environment-variables.md)).*

### 4. Push Database Schema
```bash
npm run db:push
```

### 5. Start Development Server
```bash
npm run dev
```
Visit [http://localhost:3000](http://localhost:3000) to open the application!

---

## 🏷️ Commit Message Conventions & Flags

Every commit destined for automation follows this standardized format:

```
<JIRA-KEY> <Commit description> [flags]
```

### Syntax Format
```regex
^([A-Z]+-\d+)\s(.*?)(?:\s\[(.*)\])?$
```

### Supported Flags
| Flag | Action | Example |
| :--- | :--- | :--- |
| `auto-pr` | Opens a PR from pushed branch against resolved base branch. | `[auto-pr,main]` |
| `taskcompleted` | Moves Jira issue to **Development Done**. | `[taskcompleted]` |
| `<branch_name>` | Specifies target base branch for the PR. | `[auto-pr,staging]` |

### Examples
```
PROJ-101 Fix login button layout              → Tracked in logs (no automation)
PROJ-102 Ship dark mode [auto-pr,staging]     → Opens PR against 'staging'
PROJ-103 Update deps [taskcompleted]          → Moves PROJ-103 to Development Done in Jira
PROJ-104 Full release [auto-pr,main,taskcompleted] → Opens PR against 'main' + Marks Jira task Done
```

---

## 📚 Detailed Documentation

Comprehensive guides covering all components, integrations, and architectural decisions:

| Topic | Document |
| :--- | :--- |
| **Complete Documentation Index** | [docs/README.md](./docs/README.md) |
| **System Architecture & Design** | [docs/architecture.md](./docs/architecture.md) |
| **Developer & Setup Guide** | [docs/developer-guide.md](./docs/developer-guide.md) |
| **Environment Variables & Config** | [docs/environment-variables.md](./docs/environment-variables.md) |
| **Database Schema & Drizzle ORM** | [docs/database-and-schema.md](./docs/database-and-schema.md) |
| **Commit Syntax & Flag Parser** | [docs/commit-conventions.md](./docs/commit-conventions.md) |
| **REST API Reference** | [docs/api-reference.md](./docs/api-reference.md) |
| **Production Deployment (Vercel)**| [docs/deployment.md](./docs/deployment.md) |

### 🔌 Third-Party Integration Guides
- [GitHub Integration Guide](./docs/integrations/github.md) — OAuth, Webhooks, HMAC verification, PR automation.
- [Jira Integration Guide](./docs/integrations/jira.md) — 3LO OAuth, Cloud ID resolution, 1-hour token refresh, task transitions.
- [Slack Integration Guide](./docs/integrations/slack.md) — OAuth scopes, channel discovery, link parser, rich messaging.
- [Notion Integration Guide](./docs/integrations/notion.md) — Public integration, shared page search, block appending.
- [Clerk Auth Guide](./docs/integrations/clerk.md) — Middleware, route matching, user mirroring, CSRF state protection.

---

## 🔒 Security & Privacy

- **AES-256-GCM Encryption**: All access tokens, refresh tokens, and webhook secrets are stored encrypted at rest.
- **Constant-Time Verification**: GitHub HMAC-SHA256 digests are verified using `crypto.timingSafeEqual` over untouched raw request bodies.
- **CSRF-Protected OAuth**: User IDs from authenticated Clerk sessions are passed as OAuth `state` parameters to prevent account hijacking.
- **Zero-Plaintext Policy**: Webhook secrets are shown in plaintext only once upon repository creation.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
