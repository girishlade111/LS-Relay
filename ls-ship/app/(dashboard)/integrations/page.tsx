import { auth } from "@clerk/nextjs/server";
import {
  listIntegrations,
  type IntegrationProviderValue,
} from "@/lib/db/queries";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { NotionPageForm } from "@/components/dashboard/NotionPageForm";
import { SlackChannelForm } from "@/components/dashboard/SlackChannelForm";

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

const errorMessages: Record<string, string> = {
  invalid_channel:
    "That doesn't look like a Slack channel link or ID — paste the channel's Copy link value.",
  invalid_block:
    "Couldn't find a Notion page ID in that — paste the full page URL instead.",
};

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
  const saved = searchParams.saved;
  const success = searchParams.success;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-h1">Integrations</h1>
        {typeof error === "string" ? (
          <Badge variant="danger">
            {errorMessages[error] ?? `Connection failed (${error})`}
          </Badge>
        ) : typeof saved === "string" ? (
          <Badge variant="success">
            {saved === "slack"
              ? "Slack channel saved"
              : saved === "notion"
                ? "Notion page saved"
                : `Saved ${saved}`}
          </Badge>
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

              {/* Channel picking is automatic now: the dropdown lists every
                  Slack channel via conversations.list. The fallback input also
                  accepts a pasted channel link — the ID is extracted for you. */}
              {provider === "slack" && connected ? (
                <SlackChannelForm current={slackChannelId} />
              ) : null}

              {/* Same pattern: shared Notion pages appear in a dropdown; the
                  fallback accepts a whole pasted page URL and pulls out the ID. */}
              {provider === "notion" && connected ? (
                <NotionPageForm current={notionBlockId} />
              ) : null}
            </Card>
          );
        })}
      </div>
    </>
  );
}
