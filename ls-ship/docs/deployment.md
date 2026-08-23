# Production Deployment Guide

This guide provides instructions for deploying **LS Ship** to production using **Vercel** and **Neon Serverless PostgreSQL**.

---

## 🏗️ Deployment Checklist

- [ ] Production Neon PostgreSQL instance provisioned
- [ ] Database schema pushed via `npm run db:push`
- [ ] 32-byte Base64 AES-256 encryption key generated
- [ ] Clerk production application created and keys copied
- [ ] Production OAuth redirect URLs configured in GitHub, Atlassian, Slack, and Notion
- [ ] Environment variables configured in Vercel Project Settings
- [ ] `NEXT_PUBLIC_APP_URL` set to production domain

---

## 🚀 Step-by-Step Deployment

### 1. Provision Neon PostgreSQL Database
1. Go to [console.neon.tech](https://console.neon.tech/) and create a production project.
2. Under **Connection Details**, select the `main` branch and copy the connection string.
3. Apply the database schema from your local terminal:
   ```bash
   DATABASE_URL="<your-neon-prod-connection-string>" npm run db:push
   ```

---

### 2. Generate Production Encryption Key
Run in a secure terminal:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```
> [!CAUTION]
> Back up this encryption key in a secure secrets manager. If the key is lost, all stored OAuth tokens and webhook secrets in the database become unrecoverable.

---

### 3. Configure OAuth Providers for Production Domain
Ensure all OAuth callback URLs are updated to your production domain (`https://ls-ship.yourdomain.com`):

| Provider | Callback URL Path |
| :--- | :--- |
| **GitHub** | `https://<your-domain>/api/integrations/github/callback` |
| **Atlassian Jira** | `https://<your-domain>/api/integrations/jira/callback` |
| **Slack** | `https://<your-domain>/api/integrations/slack/callback` |
| **Notion** | `https://<your-domain>/api/integrations/notion/callback` |

---

### 4. Deploy to Vercel
1. Import your Git repository into [Vercel](https://vercel.com/new).
2. Framework Preset is automatically detected as **Next.js**.
3. Under **Environment Variables**, add all required keys:
   - `DATABASE_URL`
   - `ENCRYPTION_KEY`
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`
   - `GITHUB_APP_CLIENT_ID`
   - `GITHUB_APP_CLIENT_SECRET`
   - `JIRA_CLIENT_ID`
   - `JIRA_CLIENT_SECRET`
   - `SLACK_CLIENT_ID`
   - `SLACK_CLIENT_SECRET`
   - `NOTION_CLIENT_ID`
   - `NOTION_CLIENT_SECRET`
   - `NEXT_PUBLIC_APP_URL` (Set to `https://<your-domain>`)
4. Click **Deploy**.

---

### 5. Post-Deployment Verification
1. Visit `https://<your-domain>` and sign in via Clerk.
2. Go to **Integrations** and connect GitHub, Jira, Slack, and Notion.
3. Go to **Repos** and connect a test GitHub repository.
4. Verify on GitHub (**Settings** -> **Webhooks**) that the webhook payload URL points to `https://<your-domain>/api/webhooks/github/<repoId>`.
5. Push a test commit with flags (e.g. `TASK-100 Test deploy [auto-pr,main]`) and verify that:
   - The pull request opens on GitHub.
   - The event appears in the LS Ship **Logs** tab.
   - Notifications arrive in Slack and Notion.
