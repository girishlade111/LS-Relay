import { auth } from "@clerk/nextjs/server";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

const features = [
  {
    title: "Auto pull requests",
    description:
      "Commit [auto-pr,main] and a PR opens against your base branch the moment you push — no context switching.",
  },
  {
    title: "Jira task sync",
    description:
      "The [taskcompleted] flag moves your Jira issue to Development Done as soon as the code lands.",
  },
  {
    title: "Team notifications",
    description:
      "Every created PR, duplicate guard, and status change is announced in Slack and logged to Notion.",
  },
];

export default async function LandingPage() {
  const { userId } = await auth();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-bg px-6 py-16">
      <div className="flex w-full max-w-3xl flex-col items-center text-center">
        <p className="text-sm font-medium text-text-muted">LS Ship</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-text">
          Turn tagged commits into pull requests, done tasks, and notifications
          — automatically.
        </h1>
        <p className="mt-5 max-w-xl text-base text-text-muted">
          Connect a GitHub repo, follow one commit-message convention, and LS
          Ship runs the rest of your shipping workflow for you.
        </p>

        <div className="mt-8 flex items-center gap-3">
          {userId ? (
            <Button href="/dashboard" variant="accent" className="px-5 py-2.5">
              Open dashboard
            </Button>
          ) : (
            <Button href="/sign-in" variant="accent" className="px-5 py-2.5">
              Get started
            </Button>
          )}
        </div>

        <div className="mt-14 grid w-full gap-4 sm:grid-cols-3">
          {features.map((feature) => (
            <Card key={feature.title} className="p-4 text-left">
              <h2 className="font-medium">{feature.title}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-text-muted">
                {feature.description}
              </p>
            </Card>
          ))}
        </div>

        <p className="mt-12 max-w-lg text-xs text-faint">
          Works with a single commit-message format:{" "}
          <code className="font-mono">TASK-123 Short message [flags]</code> —
          invalid messages are never silently dropped.
        </p>
      </div>
    </main>
  );
}
