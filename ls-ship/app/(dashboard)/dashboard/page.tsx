import { auth } from "@clerk/nextjs/server";
import {
  countActiveRepos,
  countEventsByStatusSince,
  countRepos,
  listRecentEvents,
  type WebhookEventStatusValue,
} from "@/lib/db/queries";
import { webhookEventStatus } from "@/lib/db/schema";
import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Row } from "@/components/ui/Row";
import { AutoRefresh } from "@/components/dashboard/AutoRefresh";

const badgeVariantByStatus: Record<WebhookEventStatusValue, BadgeVariant> = {
  received: "neutral",
  invalid: "danger",
  pr_created: "success",
  pr_exists: "neutral",
  task_updated: "success",
  skipped: "neutral",
  error: "danger",
};

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card className="p-4">
      <p className="text-sm text-text-muted">{label}</p>
      <p className="mt-1 text-h1">{value}</p>
    </Card>
  );
}

function EmptyState() {
  return (
    <Card className="mt-8 px-6 py-14">
      <div className="flex flex-col items-center gap-4 text-center">
        <h2 className="text-h1">No repos connected yet</h2>
        <p className="max-w-md text-sm text-text-muted">
          Connect a GitHub repository to start turning tagged pushes into
          Jira-linked pull requests.
        </p>
        <Button href="/repos" variant="accent">
          Connect your first repo
        </Button>
      </div>
    </Card>
  );
}

export default async function OverviewPage() {
  const { userId } = await auth();

  if (!userId) {
    return null;
  }

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [totalRepos, activeRepos, eventsByStatus, recentEvents] =
    await Promise.all([
      countRepos(userId),
      countActiveRepos(userId),
      countEventsByStatusSince(userId, weekAgo),
      listRecentEvents(userId),
    ]);

  if (totalRepos === 0) {
    return (
      <>
        <h1 className="text-h1">Overview</h1>
        <EmptyState />
      </>
    );
  }

  const totalsByStatus = new Map(
    eventsByStatus.map((row) => [row.status, row.total])
  );
  const eventsThisWeek = eventsByStatus.reduce(
    (sum, row) => sum + row.total,
    0
  );
  const prsCreated = totalsByStatus.get("pr_created") ?? 0;
  const errors = totalsByStatus.get("error") ?? 0;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-h1">Overview</h1>
        <AutoRefresh intervalSeconds={30} />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active Repos" value={activeRepos} />
        <StatCard label="Events This Week" value={eventsThisWeek} />
        <StatCard label="PRs Created" value={prsCreated} />
        <StatCard label="Errors" value={errors} />
      </div>

      <Card className="mt-8">
        <h2 className="border-b border-border px-4 py-3 text-sm font-medium text-text-muted">
          Recent Activity
        </h2>
        {recentEvents.length === 0 ? (
          <Row
            title="No webhook activity yet"
            description="Events will appear here once your repos start receiving pushes."
            last
          />
        ) : (
          recentEvents.map((event, index) => (
            <Row
              key={event.id}
              title={
                event.jiraKey
                  ? `${event.repoName} · ${event.jiraKey}`
                  : event.repoName
              }
              description={`${event.status} · ${dateFormatter.format(
                event.createdAt
              )}`}
              action={
                <Badge variant={badgeVariantByStatus[event.status]}>
                  {event.status}
                </Badge>
              }
              last={index === recentEvents.length - 1}
            />
          ))
        )}
      </Card>
    </>
  );
}
