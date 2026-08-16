import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db/client";
import { repos, webhookEvents } from "@/lib/db/schema";
import { eq, and, gte, desc, sql } from "drizzle-orm";
import Card from "@/components/ui/Card";
import Row from "@/components/ui/Row";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Link from "next/link";

export default async function OverviewPage() {
  const { userId } = await auth();

  if (!userId) {
    return null;
  }

  // Query: total active repos
  const activeReposCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(repos)
    .where(and(eq(repos.userId, userId), eq(repos.active, true)))
    .then((rows) => Number(rows[0]?.count ?? 0));

  // Query: webhook events in last 7 days grouped by status
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const eventsByStatus = await db
    .select({
      status: webhookEvents.status,
      count: sql<number>`count(*)`,
    })
    .from(webhookEvents)
    .innerJoin(repos, eq(webhookEvents.repoId, repos.id))
    .where(
      and(
        eq(repos.userId, userId),
        gte(webhookEvents.createdAt, sevenDaysAgo)
      )
    )
    .groupBy(webhookEvents.status);

  // Build a map of status -> count
  const statusCounts: Record<string, number> = {};
  let totalEventsThisWeek = 0;
  for (const row of eventsByStatus) {
    statusCounts[row.status] = Number(row.count);
    totalEventsThisWeek += Number(row.count);
  }

  const prsCreated = statusCounts["pr_created"] ?? 0;
  const errors = statusCounts["error"] ?? 0;

  // Query: 5 most recent webhook events for this user's repos
  const recentEventsRaw = await db
    .select({
      id: webhookEvents.id,
      repoName: repos.name,
      repoOwner: repos.owner,
      jiraKey: webhookEvents.jiraKey,
      status: webhookEvents.status,
      createdAt: webhookEvents.createdAt,
      prUrl: webhookEvents.prUrl,
    })
    .from(webhookEvents)
    .innerJoin(repos, eq(webhookEvents.repoId, repos.id))
    .where(eq(repos.userId, userId))
    .orderBy(desc(webhookEvents.createdAt))
    .limit(5);

  const recentEvents = recentEventsRaw.filter(
    (r): r is typeof r & { createdAt: Date } => r.createdAt !== null
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <div className="px-4 py-3">
            <div className="text-[12.5px] text-text-muted mb-1">Active Repos</div>
            <div className="text-[22px] font-semibold text-text">{activeReposCount}</div>
          </div>
        </Card>
        <Card>
          <div className="px-4 py-3">
            <div className="text-[12.5px] text-text-muted mb-1">Events This Week</div>
            <div className="text-[22px] font-semibold text-text">{totalEventsThisWeek}</div>
          </div>
        </Card>
        <Card>
          <div className="px-4 py-3">
            <div className="text-[12.5px] text-text-muted mb-1">PRs Created</div>
            <div className="text-[22px] font-semibold text-text">{prsCreated}</div>
          </div>
        </Card>
        <Card>
          <div className="px-4 py-3">
            <div className="text-[12.5px] text-text-muted mb-1">Errors</div>
            <div className="text-[22px] font-semibold text-text">{errors}</div>
          </div>
        </Card>
      </div>

      {/* Recent Activity or Empty State */}
      {recentEvents.length === 0 && activeReposCount === 0 ? (
        <Card>
          <div className="px-6 py-8 flex flex-col items-center text-center gap-3">
            <div className="text-[16px] font-medium text-text">No repos connected yet</div>
            <p className="text-[12.5px] text-text-muted max-w-[320px]">
              Connect your first GitHub repository to start tracking webhook events and automations.
            </p>
            <Button variant="accent" asChild>
              <Link href="/repos">Connect Repository</Link>
            </Button>
          </div>
        </Card>
      ) : (
        <Card>
          <div className="px-4 py-3 border-b border-border">
            <div className="text-[13.5px] font-medium text-text">Recent Activity</div>
          </div>
          <div className="flex flex-col">
            {recentEvents.map((event, index) => (
              <Row
                key={event.id}
                title={`${event.repoOwner}/${event.repoName}${event.jiraKey ? ` · ${event.jiraKey}` : ""}`}
                description={`${event.status} · ${event.createdAt.toLocaleString()}`}
                action={<Badge variant={event.status === "error" ? "danger" : event.status === "pr_created" ? "success" : "neutral"}>{event.status}</Badge>}
                last={index === recentEvents.length - 1}
              />
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
