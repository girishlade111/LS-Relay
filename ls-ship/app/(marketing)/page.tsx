import { auth } from "@clerk/nextjs/server";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

const features = [
  {
    title: "Auto pull requests",
    description:
      "Commit [auto-pr,main] and a pull request opens against your chosen base branch the moment you push. LS Ship checks for open PRs first, so you never get duplicates — no tab switching, no manual compare-and-create.",
  },
  {
    title: "Jira task sync",
    description:
      "The [taskcompleted] flag transitions your referenced Jira issue straight to Development Done as soon as the code lands. Task keys are parsed from every commit, so PROJ-101 in your message is always linked to real work.",
  },
  {
    title: "Team notifications",
    description:
      "Every created PR, detected duplicate, skipped commit, and Jira status change is announced in your Slack channel and appended to your Notion page automatically — your team stays informed without a single standup update.",
  },
];

const steps = [
  {
    title: "1. Connect your accounts",
    description:
      "Sign in and link GitHub, Jira, Slack, and Notion through secure OAuth. Every integration is scoped to your own account — nothing is shared across tenants.",
  },
  {
    title: "2. Add a repository",
    description:
      "Pick a repo from the Repos page. LS Ship provisions its webhook on GitHub automatically and verifies every delivery with HMAC signatures before processing a single commit.",
  },
  {
    title: "3. Push tagged commits",
    description:
      "Keep committing like you already do — just follow one message convention. Pull requests, Jira transitions, and notifications fire themselves while you keep coding.",
  },
];

const securityPoints = [
  {
    title: "Encrypted credentials",
    description:
      "OAuth tokens and webhook secrets are encrypted at rest with AES-256-GCM, each with unique initialization vectors and authentication tags.",
  },
  {
    title: "Verified deliveries",
    description:
      "Every GitHub webhook payload is authenticated by comparing x-hub-signature-256 against your repo's secret using timing-safe comparison over exact raw bytes.",
  },
  {
    title: "Duplicate protection",
    description:
      "Before opening any PR, LS Ship checks your repository for an existing open PR between the same branches — automation never spams your team.",
  },
  {
    title: "Nothing lost silently",
    description:
      "Commits that don't match the convention are logged as invalid events with a readable reason, and processing continues for the rest of the batch.",
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
          Ship runs the rest of your shipping workflow for you. Built for teams
          who live in Git, Jira, and Slack but are tired of being the glue
          between them — write the code, tag the commit, and let automation
          handle the ceremony.
        </p>

        <div className="mt-8 flex items-center gap-3">
          {userId ? (
            <Button href="/dashboard" variant="accent" className="px-5 py-2.5">
              Open dashboard
            </Button>
          ) : (
            <Button href="/sign-up" variant="accent" className="px-5 py-2.5">
              Get started free
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

        {/* How it works */}
        <section className="mt-20 w-full">
          <h2 className="text-xl font-semibold text-text">How it works</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-text-muted">
            Three steps between you and a fully automated shipping pipeline —
            setup takes minutes, not sprints.
          </p>
          <div className="mt-6 grid w-full gap-4 sm:grid-cols-3">
            {steps.map((step) => (
              <Card key={step.title} className="p-4 text-left">
                <h3 className="font-medium">{step.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-text-muted">
                  {step.description}
                </p>
              </Card>
            ))}
          </div>
        </section>

        {/* Commit convention */}
        <section className="mt-20 w-full text-left">
          <h2 className="text-center text-xl font-semibold text-text">
            One commit format powers everything
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-center text-sm text-text-muted">
            Flags live in trailing square brackets and can be combined freely,
            in any order.
          </p>
          <Card className="mt-6 p-5">
            <p className="text-sm text-text-muted">The format:</p>
            <code className="mt-2 block font-mono text-base text-text">
              TASK-123 Short description [flags]
            </code>
            <ul className="mt-4 space-y-2.5 text-sm leading-relaxed text-text-muted">
              <li>
                <code className="font-mono text-text">TASK-123</code> — the
                uppercase Jira issue key this work belongs to.
              </li>
              <li>
                <code className="font-mono text-text">Short description</code>{" "}
                — what the commit does, in plain words.
              </li>
              <li>
                <code className="font-mono text-text">[auto-pr]</code> — opens a
                pull request when you push.
              </li>
              <li>
                <code className="font-mono text-text">[taskcompleted]</code> —
                moves the Jira issue to Development Done.
              </li>
              <li>
                <code className="font-mono text-text">[main]</code>,{" "}
                <code className="font-mono text-text">[staging]</code>,{" "}
                <code className="font-mono text-text">[develop]</code> — names
                the base branch for the PR.
              </li>
            </ul>
          </Card>
          <div className="mt-4 space-y-2 font-mono text-xs leading-relaxed text-text-muted">
            <p>
              PROJ-102 Add dark mode toggle{" "}
              <span className="text-text">[auto-pr,main]</span> → PR opened
              against main
            </p>
            <p>
              PROJ-104 Fix CSS overflow bug{" "}
              <span className="text-text">[taskcompleted]</span> → Jira moved to
              Development Done
            </p>
            <p>
              PROJ-105 Full release flow{" "}
              <span className="text-text">[auto-pr,staging,taskcompleted]</span>{" "}
              → PR + task done together
            </p>
          </div>
          <p className="mt-4 text-center text-xs text-faint">
            If no branch flag is given, LS Ship falls back to your repository
            default, then account default, then main — configurable from your
            dashboard.
          </p>
        </section>

        {/* Security & reliability */}
        <section className="mt-20 w-full">
          <h2 className="text-xl font-semibold text-text">
            Secure by design, reliable by default
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-text-muted">
            Your credentials and code events get first-class treatment.
          </p>
          <div className="mt-6 grid w-full gap-4 sm:grid-cols-2">
            {securityPoints.map((point) => (
              <Card key={point.title} className="p-4 text-left">
                <h3 className="font-medium">{point.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-text-muted">
                  {point.description}
                </p>
              </Card>
            ))}
          </div>
        </section>

        {/* Auditability */}
        <section className="mt-20 w-full">
          <h2 className="text-xl font-semibold text-text">
            A complete audit trail, always
          </h2>
          <p className="mx-auto mt-2 mb-6 max-w-lg text-sm text-text-muted">
            Every push, created PR, duplicate check, skipped commit, and parse
            error is recorded to your Logs page in real time. When something
            looks off, you don&apos;t dig through CI logs — you read the event
            history.
          </p>
        </section>

        <div className="mt-8 flex items-center gap-3">
          {userId ? (
            <Button href="/dashboard" variant="accent" className="px-5 py-2.5">
              Open dashboard
            </Button>
          ) : (
            <Button href="/sign-up" variant="accent" className="px-5 py-2.5">
              Get started free
            </Button>
          )}
        </div>

        <p className="mt-12 max-w-lg text-xs text-faint">
          Works with GitHub, Atlassian Jira Cloud, Slack, Notion, and Clerk
          authentication. Invalid commit messages are never silently dropped —
          every event is logged, searchable, and auditable.
        </p>
      </div>
    </main>
  );
}
