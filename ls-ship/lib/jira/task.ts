import { jiraFetch, JiraCreds } from "./client";

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

/**
 * Fetches a Jira issue by its key.
 * 
 * @param creds - Jira credentials containing accessToken and cloudId
 * @param issueKey - The issue key (e.g., "PROJ-123")
 * @returns The Jira task if found, null if the issue doesn't exist (404)
 * @throws Error for any non-404 errors
 */
export async function getTask(creds: JiraCreds, issueKey: string): Promise<JiraTask | null> {
  try {
    const data = await jiraFetch<JiraTask>(creds, `/issue/${issueKey}`);
    return data;
  } catch (error) {
    // Check if it's a 404 error (task doesn't exist)
    if (error instanceof Error && error.message.includes("status 404")) {
      return null;
    }
    // Re-throw any other error
    throw error;
  }
}

/**
 * Transitions a Jira issue to a new status.
 * 
 * @param creds - Jira credentials containing accessToken and cloudId
 * @param issueKey - The issue key (e.g., "PROJ-123")
 * @param statusId - The transition ID to apply
 * @throws Error if the request fails
 */
export async function updateTaskStatus(
  creds: JiraCreds,
  issueKey: string,
  statusId: string
): Promise<void> {
  await jiraFetch(creds, `/issue/${issueKey}/transitions`, {
    method: "POST",
    body: JSON.stringify({
      transition: {
        id: statusId,
      },
    }),
  });
}
