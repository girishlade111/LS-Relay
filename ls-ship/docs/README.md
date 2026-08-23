# LS Ship Documentation

Welcome to the technical documentation for **LS Ship**, a multi-tenant SaaS automation platform that transforms tagged Git commits into automated pull requests, Jira status transitions, and multi-channel notifications across Slack and Notion.

---

## 📚 Documentation Index

| Section | Description | Target Audience |
| :--- | :--- | :--- |
| [**Architecture & System Design**](./architecture.md) | High-level system design, legacy n8n migration background, data flow, and security model | Architects & Engineers |
| [**Developer Guide**](./developer-guide.md) | Local environment setup, project structure, testing, webhook tunneling, and workflow | Contributors & Developers |
| [**Environment Variables & Configuration**](./environment-variables.md) | Complete reference for all `.env` secrets, encryption keys, and provider credentials | DevOps & Developers |
| [**Database & Schema Reference**](./database-and-schema.md) | Neon Postgres schema, Drizzle ORM definitions, encrypted fields, and migrations | Database Admins & Backend Devs |
| [**Commit Conventions & Automation Flags**](./commit-conventions.md) | Commit message syntax regex, command flags (`auto-pr`, `taskcompleted`), and branch fallbacks | Developers & Teams |
| [**API Reference**](./api-reference.md) | Detailed specifications for all REST endpoints, webhooks, and OAuth handlers | Integrators & Backend Devs |
| [**Deployment Guide**](./deployment.md) | Production deployment instructions for Vercel, Neon DB, and OAuth providers | DevOps & SREs |

---

## 🔌 Third-Party Integrations

Detailed integration guides for configuring third-party services:

* [**GitHub Integration**](./integrations/github.md) — OAuth 2.0, scopes, webhook auto-registration, HMAC SHA-256 signatures, Octokit client, and automated PR generation.
* [**Atlassian Jira Integration**](./integrations/jira.md) — 3LO OAuth 2.0, accessible-resources Cloud ID resolution, 1-hour token expiration & refresh flow, issue retrieval, and status transitions.
* [**Slack Integration**](./integrations/slack.md) — Bot token OAuth 2.0 (`chat:write`), workspace channel discovery (`conversations.list`), channel link parser, and rich notifications.
* [**Notion Integration**](./integrations/notion.md) — Public integration OAuth (Basic Auth), page search and permissions, page URL parser, and rich text block appending.
* [**Clerk Authentication**](./integrations/clerk.md) — User authentication, middleware routing, session validation, OAuth CSRF state binding, and user mirroring.

---

## 🚀 Quick Navigation

- **Need to set up the app locally?** Start with the [Developer Guide](./developer-guide.md) and [Environment Variables](./environment-variables.md).
- **Need to configure OAuth apps?** Check the [Integrations Directory](./integrations/).
- **Need to understand commit flags?** See [Commit Conventions](./commit-conventions.md).
- **Looking for API schemas?** Check the [API Reference](./api-reference.md).
