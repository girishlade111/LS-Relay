import { auth } from "@clerk/nextjs/server";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

const features = [
  {
    title: "Auto pull requests",
    description:
      "Commit [auto-pr,main] and a pull request opens against your chosen base branch the moment you push. LS Ship checks your repository for an existing open PR between the same branches before creating anything, so you never get duplicates. Pull requests are created through the official GitHub API using your own connected account — authorship, reviewers, and history stay correct.",
  },
  {
    title: "Jira task sync",
    description:
      "The [taskcompleted] flag transitions your referenced Jira issue straight to Development Done as soon as the code lands. Task keys matching the standard Jira format (PROJ-101) are parsed from every commit message and resolved against your Jira Cloud instance, so PROJ-101 in your message is always linked to real, verifiable work.",
  },
  {
    title: "Team notifications",
    description:
      "Every created PR, detected duplicate, skipped commit, and Jira status change is announced in your configured Slack channel and appended as a structured activity entry to your Notion page automatically. Your team sees what shipped without a single standup update or copy-pasted changelog.",
  },
  {
    title: "Smart branch targeting",
    description:
      "Name the target branch right in the commit — [auto-pr,staging], [develop], even release/v1.0-style names. If you omit it, LS Ship resolves the base through a four-level fallback: commit flag, then repository default, then your account-wide default, then main. You set defaults once on the Repos and Settings pages and stop thinking about them.",
  },
  {
    title: "Duplicate-safe automation",
    description:
      "Before opening any pull request, LS Ship queries GitHub for an existing open PR between the same source and base branches. If one already exists, the push is recorded as a duplicate instead of spamming your team with redundant PRs — automation stays idempotent no matter how many times you re-push.",
  },
  {
    title: "Complete audit trail",
    description:
      "Every push, created PR, duplicate check, skipped commit, and parse failure is written to an immutable event log you can browse on the Logs page. When something looks off, you read the event history with human-readable reasons instead of digging through CI output.",
  },
];

const steps = [
  {
    title: "1. Connect your accounts",
    description:
      "Sign in with Clerk and link GitHub, Jira Cloud, Slack, and Notion through standard OAuth 2.0 flows protected by CSRF state parameters. Every integration is scoped to your own account — tokens are never shared across tenants, and you can connect or disconnect each provider independently from the Integrations page.",
  },
  {
    title: "2. Add a repository",
    description:
      "Pick any repo you have access to from the Repos page. LS Ship provisions its webhook on GitHub automatically and verifies every delivery by comparing the x-hub-signature-256 header against your repo's unique secret before a single commit is processed. Optionally set the repo's default base branch here.",
  },
  {
    title: "3. Push tagged commits",
    description:
      "Keep committing exactly like you do today — just follow one message convention. On every push, LS Ship parses each commit in the batch, fires pull request creation, Jira transitions, and Slack/Notion notifications in parallel, and logs the outcome of each action. You keep coding; the ceremony runs itself.",
  },
];

const audiences = [
  {
    title: "For developers",
    description:
      "Stop being the glue between Git, Jira, and Slack. Write the code, tag the commit, and move on to the next task — no tab switching to open a PR, no forgetting to update the ticket, no pinging the team about what just merged.",
  },
  {
    title: "For tech leads",
    description:
      "Get consistent PR hygiene across the whole team: every feature lands through a reviewable pull request against the intended branch, and the review queue reflects reality. Automation behaves identically for everyone because it follows one shared convention, not personal habits.",
  },
  {
    title: "For project managers",
    description:
      "The Jira board finally tells the truth. Tasks move to Development Done when code actually ships, and every transition, PR, and skip is visible in Slack, Notion, and the built-in log — status meetings shrink to reading the feed.",
  },
];

const integrations = [
  {
    title: "GitHub",
    description:
      "Connect via a GitHub OAuth app, choose repositories, and LS Ship provisions webhooks for you automatically. Incoming pushes are authenticated with HMAC-SHA256 signatures verified in constant time over raw request bytes, and pull requests are created through the official GitHub API.",
  },
  {
    title: "Jira Cloud",
    description:
      "Link Atlassian Jira Cloud through 3-legged OAuth. LS Ship resolves your site's cloud ID, refreshes access tokens automatically so the connection never silently expires, verifies each referenced issue exists, and transitions it to Development Done when flagged.",
  },
  {
    title: "Slack",
    description:
      "Connect a workspace, pick a channel, and receive richly formatted announcements for every meaningful event: PRs opened, duplicates detected, tasks completed, and commits skipped — so the team channel becomes a live shipping feed.",
  },
  {
    title: "Notion",
    description:
      "Connect a Notion integration and share any page with it. LS Ship discovers your accessible pages and appends structured activity blocks, giving you a permanent, searchable record of your team's shipping history alongside your docs.",
  },
];

const securityPoints = [
  {
    title: "Encrypted credentials",
    description:
      "OAuth tokens, refresh tokens, and webhook secrets are encrypted at rest with AES-256-GCM — each value gets a unique initialization vector and authentication tag, and a zero-plaintext policy means webhook secrets are shown once, at creation, never again.",
  },
  {
    title: "Verified deliveries",
    description:
      "Every GitHub webhook payload is authenticated by comparing the x-hub-signature-256 header against your repo's decrypted secret using crypto.timingSafeEqual over the exact untouched raw body — forged or replayed deliveries never reach your workflow.",
  },
  {
    title: "Isolated multi-tenant accounts",
    description:
      "Each user connects their own integrations through OAuth with CSRF-protected state binding to their Clerk session. Repositories, settings, defaults, and logs are scoped per account — no cross-tenant data ever mixes.",
  },
  {
    title: "Nothing lost silently",
    description:
      "Commits that don't match the convention are logged as invalid events with a readable reason — short SHA, original message, and the specific failure — and processing continues immediately for the remaining valid commits in the same push batch.",
  },
];

const eventStatuses = [
  {
    name: "pr_created",
    meaning:
      "a pull request was opened from the pushed branch against the resolved base branch, and notifications went out.",
  },
  {
    name: "pr_exists",
    meaning:
      "an open PR already existed between the same branches, so creation was safely skipped instead of duplicated.",
  },
  {
    name: "task_updated",
    meaning:
      "the referenced Jira issue was verified and transitioned to Development Done.",
  },
  {
    name: "skipped",
    meaning:
      "the commit matched the convention but carried no automation flags — tracked for the record, no actions taken.",
  },
  {
    name: "invalid",
    meaning:
      "the commit failed parsing (missing task key, lowercase prefix, empty description) and was logged with an exact, readable reason.",
  },
];

const faqs = [
  {
    question: "Do I have to change how my team works?",
    answer:
      "No. Your workflow stays the same — feature branches, regular commits, normal pushes. The only requirement is a lightweight commit-message convention: start messages with the Jira key and append optional flags in trailing brackets. Everything else, including which branch PRs target, has sensible defaults you configure once.",
  },
  {
    question: "What happens if someone forgets the flags?",
    answer:
      "Nothing breaks. A well-formed commit without flags is recorded as skipped in your event log — useful history, zero side effects. A malformed commit (for example, a lowercase Jira key or a missing description) is recorded as invalid with the exact failure reason, and the rest of the push continues processing normally.",
  },
  {
    question: "Can two pushes create the same pull request?",
    answer:
      "No. Before opening a PR, LS Ship asks GitHub whether an open pull request already exists between the same source and base branches. If it does, the event is recorded as pr_exists and no duplicate is created — even across repeated pushes or overlapping commits in the same batch.",
  },
  {
    question: "Which branch does the PR target by default?",
    answer:
      "The base branch resolves through a four-level hierarchy: the branch named explicitly in the commit flags wins first; otherwise the repository's default base branch (set on the Repos page); otherwise your account-wide default (set on the Settings page); and finally main as the system fallback.",
  },
  {
    question: "Where are my credentials stored?",
    answer:
      "Access tokens, refresh tokens, and per-repository webhook secrets are encrypted at rest using AES-256-GCM authenticated encryption with unique IVs, backed by a 32-byte server-side encryption key. Secrets are never exposed in plaintext after initial setup, and every inbound webhook delivery is signature-verified before processing.",
  },
  {
    question: "Is it safe for a whole team to use one installation?",
    answer:
      "Yes — LS Ship is multi-tenant by design. Every member authenticates through Clerk and links their own integrations via OAuth, with connection state bound to their session during setup. Each account sees only its own repos, defaults, events, and notification targets; there is no shared credential pool.",
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
          handle the ceremony. No bots to babysit, no pipelines to configure,
          no scripts to maintain.
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

        {/* Features */}
        <section className="mt-20 w-full">
          <h2 className="text-xl font-semibold text-text">
            What LS Ship automates
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-text-muted">
            One tagged commit triggers a chain of coordinated actions across
            your entire toolchain — each one checked, deduplicated, and logged.
          </p>
          <div className="mt-6 grid w-full gap-4 sm:grid-cols-2">
            {features.map((feature) => (
              <Card key={feature.title} className="p-4 text-left">
                <h3 className="font-medium">{feature.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-text-muted">
                  {feature.description}
                </p>
              </Card>
            ))}
          </div>
        </section>

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
            in any order — whitespace around them is trimmed automatically.
          </p>
          <Card className="mt-6 p-5">
            <p className="text-sm text-text-muted">The format:</p>
            <code className="mt-2 block font-mono text-base text-text">
              TASK-123 Short description [flags]
            </code>
            <ul className="mt-4 space-y-2.5 text-sm leading-relaxed text-text-muted">
              <li>
                <code className="font-mono text-text">TASK-123</code> — the
                uppercase Jira issue key this work belongs to. It must match
                the standard pattern of uppercase letters, a hyphen, and a
                number.
              </li>
              <li>
                <code className="font-mono text-text">Short description</code>{" "}
                — what the commit does, in plain words. Required, and kept
                alongside every automated action for context.
              </li>
              <li>
                <code className="font-mono text-text">[auto-pr]</code> — opens
                a pull request from the pushed branch when you push.
              </li>
              <li>
                <code className="font-mono text-text">[taskcompleted]</code> —
                moves the referenced Jira issue to Development Done.
              </li>
              <li>
                <code className="font-mono text-text">[main]</code>,{" "}
                <code className="font-mono text-text">[staging]</code>,{" "}
                <code className="font-mono text-text">[develop]</code> — any
                other flag is treated as the base branch name for the PR.
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
            <p>
              PROJ-106 Flag order never matters{" "}
              <span className="text-text">[taskcompleted,auto-pr,develop]</span>{" "}
              → same result, any arrangement
            </p>
          </div>
          <p className="mt-4 text-center text-xs text-faint">
            If no branch flag is given, LS Ship falls back to your repository
            default, then account default, then main — configurable from your
            dashboard.
          </p>
        </section>

        {/* Who it's for */}
        <section className="mt-20 w-full">
          <h2 className="text-xl font-semibold text-text">
            Built for everyone who ships software
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-text-muted">
            The same automation serves three sides of a team without asking
            anyone to change tools.
          </p>
          <div className="mt-6 grid w-full gap-4 sm:grid-cols-3">
            {audiences.map((audience) => (
              <Card key={audience.title} className="p-4 text-left">
                <h3 className="font-medium">{audience.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-text-muted">
                  {audience.description}
                </p>
              </Card>
            ))}
          </div>
        </section>

        {/* Integrations */}
        <section className="mt-20 w-full">
          <h2 className="text-xl font-semibold text-text">
            Deep integrations, real connections
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-text-muted">
            LS Ship talks to each platform through official APIs and OAuth —
            not screen scraping or fragile scripts.
          </p>
          <div className="mt-6 grid w-full gap-4 sm:grid-cols-2">
            {integrations.map((integration) => (
              <Card key={integration.title} className="p-4 text-left">
                <h3 className="font-medium">{integration.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-text-muted">
                  {integration.description}
                </p>
              </Card>
            ))}
          </div>
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
          <p className="mx-auto mt-2 max-w-lg text-sm text-text-muted">
            Every push, created PR, duplicate check, skipped commit, and parse
            error is recorded to your Logs page in real time. When something
            looks off, you don&apos;t dig through CI logs — you read the event
            history.
          </p>
          <Card className="mt-6 w-full p-5 text-left">
            <p className="text-sm text-text-muted">
              Every logged event carries one of five clear statuses:
            </p>
            <ul className="mt-4 space-y-2.5 text-sm leading-relaxed text-text-muted">
              {eventStatuses.map((status) => (
                <li key={status.name}>
                  <code className="font-mono text-text">{status.name}</code> —{" "}
                  {status.meaning}
                </li>
              ))}
            </ul>
          </Card>
        </section>

        {/* FAQ */}
        <section className="mt-20 w-full">
          <h2 className="text-xl font-semibold text-text">
            Frequently asked questions
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-text-muted">
            The details teams usually ask about before switching their shipping
            workflow over.
          </p>
          <div className="mt-6 grid w-full gap-4 sm:grid-cols-2">
            {faqs.map((faq) => (
              <Card key={faq.question} className="p-4 text-left">
                <h3 className="font-medium">{faq.question}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-text-muted">
                  {faq.answer}
                </p>
              </Card>
            ))}
          </div>
        </section>

        <div className="mt-14 flex items-center gap-3">
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
