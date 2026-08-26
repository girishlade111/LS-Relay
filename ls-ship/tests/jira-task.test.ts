import { describe, expect, it } from "vitest";
import { JiraApiError } from "@/lib/jira/client";
import { getTask } from "@/lib/jira/task";

// getTask must translate exactly one failure mode (404) into `null` so the
// webhook can skip unknown keys; every other error still throws.
describe("getTask 404 handling", () => {
  const creds = { accessToken: "t", cloudId: "c" };

  it("returns null for JiraApiError with status 404", async () => {
    // jiraFetch is exercised indirectly through its error contract; simulate
    // a 404 by stubbing global fetch.
    const originalFetch = global.fetch;
    global.fetch = (async () =>
      new Response(JSON.stringify({ errorMessages: ["Issue does not exist"] }), {
        status: 404,
      })) as typeof fetch;
    try {
      expect(await getTask(creds, "PROJ-999")).toBeNull();
    } finally {
      global.fetch = originalFetch;
    }
  });

  it("throws for other API errors (e.g. 500)", async () => {
    const originalFetch = global.fetch;
    global.fetch = (async () =>
      new Response("boom", { status: 500 })) as typeof fetch;
    try {
      await expect(getTask(creds, "PROJ-1")).rejects.toThrow();
    } finally {
      global.fetch = originalFetch;
    }
  });

  it("JiraApiError carries status and truncated context", () => {
    const error = new JiraApiError("/issue/PROJ-1", 403, "x".repeat(600));
    expect(error.status).toBe(403);
    // Prefix + path + status + the 500-char (plus ellipsis) body snippet.
    expect(error.message.length).toBeLessThanOrEqual(560);
    expect(error.name).toBe("JiraApiError");
  });
});
