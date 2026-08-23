import { revalidatePath } from "next/cache";
import { auth } from "@clerk/nextjs/server";
import {
  listIntegrations,
  updateIntegrationMetadata,
  type IntegrationProviderValue,
} from "@/lib/db/queries";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

const providers: {
  provider: IntegrationProviderValue;
  name: string;
  description: string;
}[] = [
  {
    provider: "github",
    name: "GitHub",
    description:
      "Connect GitHub so pushes that reference Jira keys can open pull requests.",
  },
  {
    provider: "jira",
    name: "Jira",
    description:
      "Connect Jira to move task statuses forward when pull requests are created.",
  },
  {
    provider: "slack",
    name: "Slack",
    description:
      "Get notified in a channel when pull requests are created or tasks are completed.",
  },
  {
    provider: "notion",
    name: "Notion",
    description: "Log automation activity into a Notion page.",
  },
];

async function saveChannelId(formData: FormData): Promise<void> {
  "use server";

  const { userId } = await auth();
  if (!userId) {
    return;
  }

  const raw = formData.get("channelId");
  const channelId = typeof raw === "string" ? raw.trim() : "";
  if (!channelId) {
    return;
  }

  await updateIntegrationMetadata(userId, "slack", { channelId });
  revalidatePath("/integrations");
}

async function saveBlockId(formData: FormData): Promise<void> {
  "use server";

  const { userId } = await auth();
  if (!userId) {
    return;
  }

  const raw = formData.get("blockId");
  const blockId = typeof raw === "string" ? raw.trim() : "";
  if (!blockId) {
    return;
  }

  await updateIntegrationMetadata(userId, "notion", { blockId });
  revalidatePath("/integrations");
}

export default async function IntegrationsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const { userId } = await auth();
  if (!userId) {
    return null;
  }

  const rows = await listIntegrations(userId);
  const byProvider = new Map(rows.map((row) => [row.provider, row]));

  const metadataFor = (provider: IntegrationProviderValue) =>
    byProvider.get(provider)?.metadata ?? {};
  const slackChannelId =
    typeof metadataFor("slack").channelId === "string"
      ? (metadataFor("slack").channelId as string)
      : "";
  const notionBlockId =
    typeof metadataFor("notion").blockId === "string"
      ? (metadataFor("notion").blockId as string)
      : "";

  const error = searchParams.error;
  const success = searchParams.success;

  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-h1">Integrations</h1>
        {typeof error === "string" ? (
          <Badge variant="danger">Connection failed ({error})</Badge>
        ) : typeof success === "string" ? (
          <Badge variant="success">Connected {success}</Badge>
        ) : null}
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {providers.map(({ provider, name, description }) => {
          const connected = byProvider.has(provider);

          return (
            <Card key={provider} className="p-4">
              <div className="flex items-center justify-between">
                <h2 className="font-medium">{name}</h2>
                <Badge variant={connected ? "success" : "neutral"}>
                  {connected ? "Connected" : "Not Connected"}
                </Badge>
              </div>
              <p className="mt-1 max-w-[440px] text-sm text-text-muted">
                {description}
              </p>

              {!connected ? (
                <Button
                  href={`/api/integrations/${provider}/connect`}
                  variant="accent"
                  className="mt-4"
                >
                  Connect {name}
                </Button>
              ) : null}

              {/* MVP shortcut: instead of building a full channel picker UI,
                  the user pastes the target channel ID directly — it is visible
                  via Slack's "Copy link" on any channel (the ID sits between
                  the slashes). Backing this with conversations.list and a real
                  dropdown is the obvious v2 improvement. */}
              {provider === "slack" && connected ? (
                <form
                  action={saveChannelId}
                  className="mt-4 flex items-center gap-2 border-t border-border pt-4"
                >
                  <Input
                    name="channelId"
                    placeholder="Channel ID (e.g. C0123456789)"
                    defaultValue={slackChannelId}
                    aria-label="Slack channel ID"
                    className="max-w-xs"
                  />
                  <Button type="submit">Save channel</Button>
                </form>
              ) : null}

              {/* Same MVP pattern as Slack: paste the page/block ID taken from
                  the page URL in Notion. A searchable page picker backed by the
                  search endpoint is a good v2 upgrade. */}
              {provider === "notion" && connected ? (
                <form
                  action={saveBlockId}
                  className="mt-4 flex items-center gap-2 border-t border-border pt-4"
                >
                  <Input
                    name="blockId"
                    placeholder="Page or block ID (from its URL)"
                    defaultValue={notionBlockId}
                    aria-label="Notion page or block ID"
                    className="max-w-xs"
                  />
                  <Button type="submit">Save page</Button>
                </form>
              ) : null}
            </Card>
          );
        })}
      </div>
    </>
  );
}
