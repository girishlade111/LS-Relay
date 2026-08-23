# Environment Variables & Configuration

This guide provides a comprehensive reference for configuring environment variables in **LS Ship**. All environment variables are configured in `.env.local` for local development and in the platform settings (e.g., Vercel Project Settings) for production deployments.

---

## 📋 Overview Table

| Variable | Scope | Secret? | Description | Example / Format |
| :--- | :--- | :--- | :--- | :--- |
| `DATABASE_URL` | Server | **Yes** | Neon PostgreSQL connection URI with SSL | `postgresql://user:pass@ep-xyz.us-east-2.aws.neon.tech/neondb?sslmode=require` |
| `ENCRYPTION_KEY` | Server | **Yes** | 32-byte Base64 key for AES-256-GCM token encryption | `Base64 string (44 characters)` |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Client & Server | No | Clerk frontend publishable API key | `pk_test_...` or `pk_live_...` |
| `CLERK_SECRET_KEY` | Server | **Yes** | Clerk backend secret key | `sk_test_...` or `sk_live_...` |
| `GITHUB_APP_CLIENT_ID` | Server | No | GitHub OAuth App Client ID | `Iv1.8a2b3c4d5e6f7g8h` |
| `GITHUB_APP_CLIENT_SECRET` | Server | **Yes** | GitHub OAuth App Client Secret | `Hex string (40 characters)` |
| `JIRA_CLIENT_ID` | Server | No | Atlassian OAuth 2.0 (3LO) Client ID | Alphanumeric string |
| `JIRA_CLIENT_SECRET` | Server | **Yes** | Atlassian OAuth 2.0 (3LO) Client Secret | Alphanumeric secret |
| `SLACK_CLIENT_ID` | Server | No | Slack App Client ID | `1234567890.1234567890` |
| `SLACK_CLIENT_SECRET` | Server | **Yes** | Slack App Client Secret | Alphanumeric string |
| `NOTION_CLIENT_ID` | Server | No | Notion Public Integration Client ID | UUID formatted string |
| `NOTION_CLIENT_SECRET` | Server | **Yes** | Notion Public Integration Client Secret | `secret_...` |
| `NEXT_PUBLIC_APP_URL` | Client & Server | No | Base public URL of the application | `http://localhost:3000` or `https://ls-ship.vercel.app` |

---

## 🔑 Variable-by-Variable Deep Dive

### 1. `DATABASE_URL`

- **Purpose**: Establishes the database connection pool between Next.js/Drizzle ORM and Neon Serverless PostgreSQL.
- **Where to obtain**:
  1. Log into your [Neon Console](https://console.neon.tech/).
  2. Select your project and branch (e.g., `main`).
  3. Navigate to **Dashboard** -> **Connection Details**.
  4. Select **Postgres** and copy the **Connection string**. Ensure `sslmode=require` is appended to the connection string.
- **Format**:
  ```env
  DATABASE_URL=postgresql://[user]:[password]@[neon-hostname]/[dbname]?sslmode=require
  ```
- **Validation**: If unset, `drizzle.config.ts` and `lib/db/client.ts` will throw an explicit initialization error upon startup or query execution.

---

### 2. `ENCRYPTION_KEY`

- **Purpose**: Used by `lib/crypto.ts` to encrypt and decrypt sensitive third-party tokens (GitHub OAuth access tokens, Jira access & refresh tokens, Slack bot tokens, Notion tokens, and repository webhook HMAC secrets) using **AES-256-GCM**.
- **Security Requirement**: Must decode from Base64 into **exactly 32 bytes (256 bits)** of cryptographically secure random data.
- **How to generate**:
  Run this command in your terminal:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
  ```
- **Format**:
  ```env
  ENCRYPTION_KEY=dGhpcyBpcyBhIHNhbXBsZSAzMiBieXRlIGtleSBmb3IgYWVzISE=
  ```
- **Caution**: Never rotate or modify `ENCRYPTION_KEY` in an existing environment without re-encrypting all existing rows in `integrations` and `repos`. Decryption with a different key will cause payload tampering errors and fail all webhook authentications.

---

### 3. `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` & `CLERK_SECRET_KEY`

- **Purpose**: Powers user authentication, session tokens, sign-in/sign-up forms, and route protection via Clerk.
- **Where to obtain**:
  1. Open the [Clerk Dashboard](https://dashboard.clerk.com/).
  2. Select your application.
  3. Go to **API Keys** in the sidebar.
  4. Copy both the **Publishable key** and **Secret key**.
- **Format**:
  ```env
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_Y2xlcmsuZXhhbXBsZS5jb20k
  CLERK_SECRET_KEY=sk_test_1234567890abcdefghijklmnopqrstuvwxyz
  ```

---

### 4. `GITHUB_APP_CLIENT_ID` & `GITHUB_APP_CLIENT_SECRET`

- **Purpose**: Powers GitHub OAuth 2.0 authentication for users connecting their personal GitHub accounts and listing repositories.
- **Where to obtain**:
  1. Navigate to **GitHub** -> **Settings** -> **Developer Settings** -> **OAuth Apps**.
  2. Click **New OAuth App** (or select your existing app).
  3. Set **Application name** to `LS Ship`.
  4. Set **Homepage URL** to `https://<your-domain>` (or `http://localhost:3000` for dev).
  5. Set **Authorization callback URL** to:
     ```
     https://<your-domain>/api/integrations/github/callback
     ```
     *(For local development: `http://localhost:3000/api/integrations/github/callback`)*
  6. Register the app, copy the **Client ID**, and generate a new **Client Secret**.
- **Required OAuth Scopes** (requested automatically in `/api/integrations/github/connect`):
  - `repo`: Access private and public repositories to create automated PRs.
  - `admin:repo_hook`: Automatically provision and manage push webhooks on repositories.
- **Format**:
  ```env
  GITHUB_APP_CLIENT_ID=Iv1.0123456789abcdef
  GITHUB_APP_CLIENT_SECRET=0123456789abcdef0123456789abcdef01234567
  ```

---

### 5. `JIRA_CLIENT_ID` & `JIRA_CLIENT_SECRET`

- **Purpose**: Enables 3-legged OAuth 2.0 (3LO) with Atlassian Cloud to inspect Jira issues and transition issue statuses to "Development Done".
- **Where to obtain**:
  1. Visit the [Atlassian Developer Console](https://developer.atlassian.com/console/myapps/).
  2. Click **Create** -> **OAuth 2.0 integration**.
  3. Navigate to **Permissions** -> **Jira platform REST API** and add:
     - `read:jira-work`
     - `write:jira-work`
  4. Navigate to **Authorization** -> **OAuth 2.0 (3LO)** -> **Add redirect URL**:
     ```
     https://<your-domain>/api/integrations/jira/callback
     ```
     *(For local development: `http://localhost:3000/api/integrations/jira/callback`)*
  5. Navigate to **Settings** in the left sidebar to find your **Client ID** and **Secret**.
- **Format**:
  ```env
  JIRA_CLIENT_ID=abc123def456ghi789jkl
  JIRA_CLIENT_SECRET=ATOA1234567890abcdefghijklmnopqrstuvwxyz
  ```

---

### 6. `SLACK_CLIENT_ID` & `SLACK_CLIENT_SECRET`

- **Purpose**: Enables users to connect Slack workspaces and authorize the LS Ship bot to broadcast automation updates into configured channels.
- **Where to obtain**:
  1. Open [Slack API: Your Apps](https://api.slack.com/apps).
  2. Click **Create New App** -> **From scratch**.
  3. Go to **OAuth & Permissions** in the sidebar.
  4. Under **Redirect URLs**, add:
     ```
     https://<your-domain>/api/integrations/slack/callback
     ```
     *(For local development: `http://localhost:3000/api/integrations/slack/callback`)*
  5. Under **Scopes** -> **Bot Token Scopes**, add:
     - `chat:write` (Allows the app to post messages to channels)
     - `channels:read` (Allows reading public channel lists)
     - `groups:read` (Allows reading private channel lists where invited)
  6. Go to **Basic Information** to copy **Client ID** and **Client Secret** under **App Credentials**.
- **Format**:
  ```env
  SLACK_CLIENT_ID=1234567890123.1234567890123
  SLACK_CLIENT_SECRET=abcdef0123456789abcdef0123456789
  ```

---

### 7. `NOTION_CLIENT_ID` & `NOTION_CLIENT_SECRET`

- **Purpose**: Powers OAuth 2.0 authentication with Notion to search user-authorized pages and append automation logs as child blocks.
- **Where to obtain**:
  1. Open [Notion Integrations](https://www.notion.so/my-integrations).
  2. Click **+ New integration**.
  3. Set Integration Type to **Public** (required for OAuth).
  4. Fill in company info and set **Redirect URI** to:
     ```
     https://<your-domain>/api/integrations/notion/callback
     ```
     *(For local development: `http://localhost:3000/api/integrations/notion/callback`)*
  5. Under **Capabilities**, select:
     - Read content
     - Update content
     - Insert content
  6. Save and copy **OAuth Client ID** and **OAuth Client Secret**.
- **Format**:
  ```env
  NOTION_CLIENT_ID=00000000-0000-0000-0000-000000000000
  NOTION_CLIENT_SECRET=secret_1234567890abcdefghijklmnopqrstuvwxyz
  ```

---

### 8. `NEXT_PUBLIC_APP_URL`

- **Purpose**: Specifies the canonical base URL of the deployment. It is used to generate exact OAuth callback redirects, determine server origin, construct GitHub webhook payload URLs, and detect whether the webhook URL is accessible publicly or running locally.
- **Examples**:
  - **Local Development**: `http://localhost:3000`
  - **Local with ngrok tunnel**: `https://random-subdomain.ngrok-free.app`
  - **Production on Vercel**: `https://ls-ship.vercel.app`
- **Format**:
  ```env
  NEXT_PUBLIC_APP_URL=https://ls-ship.vercel.app
  ```
  *(Note: Do not include a trailing slash)*

---

## 🛠️ Setting Up `.env.local`

To set up your local environment:

1. Create a copy of `.env.example`:
   ```bash
   cp .env.example .env.local
   ```
2. Populate all values in `.env.local`:
   ```env
   DATABASE_URL="postgresql://neondb_owner:password@ep-cool-snowflake-123456.us-east-2.aws.neon.tech/neondb?sslmode=require"
   ENCRYPTION_KEY="<base64-32-byte-key>"
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
   CLERK_SECRET_KEY="sk_test_..."
   GITHUB_APP_CLIENT_ID="Iv1.xxxxxxxxxxxx"
   GITHUB_APP_CLIENT_SECRET="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
   JIRA_CLIENT_ID="xxxxxxxxxxxxxxxxxxxx"
   JIRA_CLIENT_SECRET="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
   SLACK_CLIENT_ID="123456789.123456789"
   SLACK_CLIENT_SECRET="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
   NOTION_CLIENT_ID="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
   NOTION_CLIENT_SECRET="secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
   NEXT_PUBLIC_APP_URL="http://localhost:3000"
   ```
3. Test your configuration with:
   ```bash
   npm run db:push
   npm run dev
   ```

---

## 🔒 Security Best Practices

1. **Never Commit `.env` or `.env.local`**: Ensure `.gitignore` contains `.env`, `.env.local`, `.env*.local`.
2. **Environment Separation**: Use separate Clerk applications, GitHub OAuth apps, and database instances for development/staging and production.
3. **Restricted Token Access**: Tokens stored in PostgreSQL are encrypted using `ENCRYPTION_KEY`. Plaintext secrets never leave the server boundaries.
4. **Regular Auditing**: Review connected integrations periodically and revoke stale OAuth grants from provider dashboards.
