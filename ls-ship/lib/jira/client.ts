import "server-only";

export interface JiraCreds {
  accessToken: string;
  cloudId: string;
}

export function jiraApiBase(cloudId: string): string {
  return `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3`;
}

const TIMEOUT_MS = 10_000;
const MAX_ERROR_BODY_LENGTH = 500;

export class JiraApiError extends Error {
  readonly status: number;

  constructor(path: string, status: number, bodySnippet: string) {
    // The class enforces the cap itself so oversized context can never leak
    // into logs or DB error columns regardless of the call site.
    super(
      `Jira API ${path} failed (${status}): ${truncate(bodySnippet)}`
    );
    this.name = "JiraApiError";
    this.status = status;
  }
}

function truncate(body: string): string {
  return body.length > MAX_ERROR_BODY_LENGTH
    ? `${body.slice(0, MAX_ERROR_BODY_LENGTH)}…`
    : body;
}

// All Jira Cloud REST calls go through Atlassian's tenant-exchange gateway:
// the cloudId scopes the request to one Jira site. `path` must start with "/".
export async function jiraFetch<T>(
  creds: JiraCreds,
  path: string,
  init?: RequestInit
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${jiraApiBase(creds.cloudId)}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${creds.accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        ...init?.headers,
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new Error(`Jira API ${path} timed out after ${TIMEOUT_MS}ms`);
    }
    throw error;
  }

  if (response.status === 204) {
    return undefined as T;
  }

  if (!response.ok) {
    const body = truncate(await response.text());
    throw new JiraApiError(path, response.status, body);
  }

  return (await response.json()) as T;
}
