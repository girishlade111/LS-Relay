# LS Relay / LS Ship 🚢

Welcome to the **LS Relay** repository. This project contains **LS Ship**, a multi-tenant SaaS application that automates pull requests, Jira issue transitions, and team notifications directly from Git commit messages.

---

## 📂 Repository Structure

- **[`ls-ship/`](./ls-ship)**: The core Next.js 14 web application, API server, database layer, and UI dashboard.
  - **[`ls-ship/README.md`](./ls-ship/README.md)**: Main project documentation and quickstart.
  - **[`ls-ship/docs/`](./ls-ship/docs)**: Comprehensive technical documentation directory.

---

## 📚 Technical Documentation Map

All detailed guides and references are organized within [`ls-ship/docs/`](./ls-ship/docs):

- 📖 [**Documentation Index**](./ls-ship/docs/README.md)
- 🏗️ [**System Architecture & Design**](./ls-ship/docs/architecture.md)
- 🛠️ [**Developer Guide & Setup**](./ls-ship/docs/developer-guide.md)
- 🔑 [**Environment Variables & Configuration**](./ls-ship/docs/environment-variables.md)
- 🗄️ [**Database Schema & Drizzle ORM**](./ls-ship/docs/database-and-schema.md)
- 🏷️ [**Commit Conventions & Automation Flags**](./ls-ship/docs/commit-conventions.md)
- 🔌 **Third-Party Integrations**:
  - [GitHub Integration](./ls-ship/docs/integrations/github.md)
  - [Jira Integration](./ls-ship/docs/integrations/jira.md)
  - [Slack Integration](./ls-ship/docs/integrations/slack.md)
  - [Notion Integration](./ls-ship/docs/integrations/notion.md)
  - [Clerk Authentication](./ls-ship/docs/integrations/clerk.md)
- 🌐 [**REST API Reference**](./ls-ship/docs/api-reference.md)
- 🚀 [**Production Deployment (Vercel)**](./ls-ship/docs/deployment.md)

---

## 🚀 Getting Started

To run the application locally:

```bash
cd ls-ship
npm install
cp .env.example .env.local
# Fill in your environment variables in .env.local
npm run db:push
npm run dev
```

For full setup instructions, see the [Developer Guide](./ls-ship/docs/developer-guide.md).
