# API Reference

This document provides a comprehensive REST API specification for all routes and endpoints within **LS Ship**.

---

## 🗂️ Endpoint Overview

| Method | Endpoint | Auth Required | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/webhooks/github/:repoId` | HMAC Signature | Ingests GitHub push webhook payloads. |
| `POST` | `/api/repos` | Clerk Session | Connects a repository and auto-provisions its webhook. |
| `PATCH` | `/api/repos` | Clerk Session | Toggles repository active status. |
| `DELETE` | `/api/repos` | Clerk Session | Deletes a repository connection. |
| `GET` | `/api/integrations/github/connect` | Clerk Session | Initiates GitHub OAuth authorization flow. |
| `GET` | `/api/integrations/github/callback` | OAuth State | Handles GitHub OAuth callback and token exchange. |
| `GET` | `/api/integrations/github/repos` | Clerk Session | Lists reachable GitHub repositories for authenticated user. |
| `GET` | `/api/integrations/jira/connect` | Clerk Session | Initiates Jira 3LO OAuth authorization flow. |
| `GET` | `/api/integrations/jira/callback` | OAuth State | Handles Jira OAuth callback and site resolution. |
| `GET` | `/api/integrations/slack/connect` | Clerk Session | Initiates Slack OAuth flow. |
| `GET` | `/api/integrations/slack/callback` | OAuth State | Handles Slack OAuth callback and bot token storage. |
| `GET` | `/api/integrations/slack/channels` | Clerk Session | Lists workspace public and private channels. |
| `GET` | `/api/integrations/notion/connect` | Clerk Session | Initiates Notion Public Integration OAuth flow. |
| `GET` | `/api/integrations/notion/callback` | OAuth State | Handles Notion Basic Auth token exchange. |
| `GET` | `/api/integrations/notion/pages` | Clerk Session | Lists shared Notion pages. |

---

## 🪝 Webhook Receiver

### `POST /api/webhooks/github/:repoId`

Ingests GitHub push event webhooks.

#### Headers
- `x-hub-signature-256`: `sha256=<hmac_hex_digest>` *(Required)*
- `Content-Type`: `application/json`

#### URL Parameters
- `repoId` (`string`, UUID): The unique ID of the connected repository.

#### Request Body
Standard GitHub push webhook payload:
```json
{
  "ref": "refs/heads/feature/login",
  "commits": [
    {
      "id": "c3ab8ff13720e8ad9047dd39466b3c8974e592c2",
      "message": "PROJ-101 Add OAuth login support [auto-pr,main,taskcompleted]"
    }
  ]
}
```

#### Responses
- **`200 OK`**: Push successfully processed or skipped.
  ```json
  {
    "ok": true,
    "processed": 1,
    "invalid": 0
  }
  ```
- **`401 Unauthorized`**: Signature verification failed.
  ```json
  {
    "ok": false,
    "error": "invalid_signature"
  }
  ```

---

## 📦 Repository Management API

### `POST /api/repos`

Adds a new repository and attempts automatic push webhook creation on GitHub.

#### Request Body
```json
{
  "owner": "facebook",
  "name": "react",
  "defaultBaseBranch": "main" // Optional
}
```

#### Responses
- **`201 Created`**:
  ```json
  {
    "repo": {
      "id": "d3b07384-d113-4b4e-982e-9d2a23e59b6c",
      "owner": "facebook",
      "name": "react",
      "defaultBaseBranch": "main",
      "active": true,
      "createdAt": "2026-08-23T02:00:00.000Z"
    },
    "webhookSecret": "4a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b",
    "webhookUrl": "https://ls-ship.vercel.app/api/webhooks/github/d3b07384-d113-4b4e-982e-9d2a23e59b6c",
    "webhook": {
      "status": "created" // "created" | "updated" | "failed" | "skipped"
    }
  }
  ```
- **`400 Bad Request`**: Validation error (missing owner/name).
- **`401 Unauthorized`**: User session missing.

---

### `PATCH /api/repos`

Toggles active state for a repository.

#### Request Body
```json
{
  "repoId": "d3b07384-d113-4b4e-982e-9d2a23e59b6c",
  "active": false
}
```

#### Responses
- **`200 OK`**: `{ "ok": true }`
- **`404 Not Found`**: Repository not found or not owned by active user.

---

### `DELETE /api/repos`

Deletes a repository and cascades deletion of its webhook event history.

#### Request Body
```json
{
  "repoId": "d3b07384-d113-4b4e-982e-9d2a23e59b6c"
}
```

#### Responses
- **`200 OK`**: `{ "ok": true }`
- **`404 Not Found`**: Repository not found.

---

## 🔍 Metadata & Helper Endpoints

### `GET /api/integrations/github/repos`
Fetches user repositories from GitHub via Octokit.

#### Response (`200 OK`)
```json
{
  "repos": [
    {
      "owner": "octocat",
      "name": "Hello-World",
      "defaultBranch": "main",
      "isPrivate": false
    }
  ]
}
```

---

### `GET /api/integrations/slack/channels`
Lists available channels in the connected Slack workspace.

#### Response (`200 OK`)
```json
{
  "channels": [
    {
      "id": "C0123ABCD9",
      "name": "dev-announcements"
    },
    {
      "id": "C9876ZYXW1",
      "name": "general"
    }
  ]
}
```

---

### `GET /api/integrations/notion/pages`
Searches shared pages in Notion.

#### Response (`200 OK`)
```json
{
  "pages": [
    {
      "id": "4f7e2a9b-1c8d-4e5f-6a7b-8c9d0e1f2a3b",
      "title": "Release & Automation Log"
    }
  ]
}
```
