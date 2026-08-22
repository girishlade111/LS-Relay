import { jiraFetch, JiraApiError, type JiraCreds } from "./client";

export interface JiraTask {
  id: string;
  key: string;
  fields: {
    summary: string;
    status: {
      id: string;
      name: string;
    };
  };
}

// Returns null only when the issue genuinely does not exist (404) — callers
// use this to skip pushes referencing unknown keys. Auth errors, rate limits,
// network failures etc. still throw.
export async function getTask(
  creds: JiraCreds,
  issueKey: string
): Promise<JiraTask | null> {
  try {
    return await jiraFetch<JiraTask>(
      creds,
      `/issue/${encodeURIComponent(issueKey)}`
    );
  } catch (error) {
    if (error instanceof JiraApiError && error.status === 404) {
      return null;
    }
    throw error;
  }
}

export async function updateTaskStatus(
  creds: JiraCreds,
  issueKey: string,
  statusId: string
): Promise<void> {
  await jiraFetch<void>(creds, `/issue/${encodeURIComponent(issueKey)}/transitions`, {
    method: "POST",
    body: JSON.stringify({ transition: { id: statusId } }),
  });
}
