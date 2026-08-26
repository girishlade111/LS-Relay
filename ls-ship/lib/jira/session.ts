import "server-only";

import { encrypt } from "@/lib/crypto";
import {
  getDecryptedIntegration,
  updateIntegrationMetadata,
  upsertIntegration,
  type DecryptedIntegration,
} from "@/lib/db/queries";
import { refreshJiraToken } from "./refresh";

// Refresh slightly before actual expiry so in-flight requests never race a
// token that dies mid-call due to small clock differences.
const EARLY_REFRESH_MS = 60_000;

function isExpiring(metadata: Record<string, unknown>): boolean {
  const expiresAt =
    typeof metadata.expiresAt === "string" ? Date.parse(metadata.expiresAt) : NaN;
  return Number.isFinite(expiresAt) && Date.now() >= expiresAt - EARLY_REFRESH_MS;
}

/**
 * Loads the user's Jira integration, refreshing the access token when it has
 * expired (or when `force` is set after a 401). Newly issued tokens are
 * re-encrypted and persisted; the returned value lives in memory only.
 */
export async function getFreshJiraCreds(
  userId: string,
  force = false
): Promise<DecryptedIntegration | null> {
  const integration = await getDecryptedIntegration(userId, "jira");
  if (!integration) {
    return null;
  }

  if (!force && !isExpiring(integration.metadata)) {
    return integration;
  }

  if (!integration.refreshToken) {
    throw new Error(
      "Jira access token expired and no refresh token is stored — reconnect from the Integrations page"
    );
  }

  const refreshed = await refreshJiraToken(integration.refreshToken);

  await upsertIntegration(userId, "jira", {
    encryptedAccessToken: encrypt(refreshed.accessToken),
    encryptedRefreshToken: encrypt(refreshed.refreshToken),
  });
  // Merge-only update: cloudId must survive while only expiresAt changes.
  if (refreshed.expiresInSeconds !== null) {
    await updateIntegrationMetadata(userId, "jira", {
      expiresAt: new Date(
        Date.now() + refreshed.expiresInSeconds * 1000
      ).toISOString(),
    });
  }

  return { ...integration, accessToken: refreshed.accessToken };
}
