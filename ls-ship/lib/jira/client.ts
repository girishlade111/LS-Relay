export interface JiraCreds {
  accessToken: string;
  cloudId: string;
}

/**
 * Builds the base URL for Jira Cloud API requests.
 * @param cloudId - The Atlassian cloud ID for the Jira instance
 * @returns The base URL for API calls
 */
export function buildBaseUrl(cloudId: string): string {
  return `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3`;
}

/**
 * Wraps fetch with Authorization Bearer header, Content-Type/Accept application/json,
 * and a 10-second timeout via AbortSignal.timeout.
 * Throws a descriptive error including status code + truncated response body on non-2xx responses.
 * 
 * @param creds - Jira credentials containing accessToken and cloudId
 * @param path - API path (e.g., "/issue/PROJ-123")
 * @param init - Optional fetch init options
 * @returns Promise resolving to typed response data
 */
export async function jiraFetch<T>(
  creds: JiraCreds,
  path: string,
  init?: RequestInit
): Promise<T> {
  const url = buildBaseUrl(creds.cloudId) + path;
  
  const controller = new AbortController();
  const timeoutSignal = AbortSignal.timeout(10000); // 10 seconds
  
  // Combine signals if both are provided
  const combinedSignal = init?.signal 
    ? (() => {
        const signal = AbortSignal.any([timeoutSignal, init.signal!]);
        return signal;
      })()
    : timeoutSignal;

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: `Bearer ${creds.accessToken}`,
    ...init?.headers,
  };

  const response = await fetch(url, {
    ...init,
    headers,
    signal: combinedSignal,
  });

  if (!response.ok) {
    let bodyText: string;
    try {
      bodyText = await response.text();
      // Truncate response body if too long
      if (bodyText.length > 500) {
        bodyText = bodyText.slice(0, 500) + "... [truncated]";
      }
    } catch {
      bodyText = "[unable to read response body]";
    }
    
    throw new Error(
      `Jira API request failed with status ${response.status}: ${bodyText}`
    );
  }

  return response.json() as Promise<T>;
}
