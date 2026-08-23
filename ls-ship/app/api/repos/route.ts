import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createRepo,
  deleteRepo,
  getDecryptedIntegration,
  toggleRepoActive,
} from "@/lib/db/queries";
import { getGithubClient } from "@/lib/github/client";
import { upsertRepoWebhook } from "@/lib/github/webhooks";

const createSchema = z.object({
  owner: z.string().trim().min(1, "owner is required"),
  name: z.string().trim().min(1, "name is required"),
  defaultBaseBranch: z.string().trim().min(1).optional(),
});

const toggleSchema = z.object({
  repoId: z.string().uuid(),
  active: z.boolean(),
});

const deleteSchema = z.object({
  repoId: z.string().uuid(),
});

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return unauthorized();
  }

  const parsed = createSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { repo, plaintextWebhookSecret } = await createRepo(
    userId,
    parsed.data.owner,
    parsed.data.name,
    parsed.data.defaultBaseBranch
  );

  const origin = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
  const webhookUrl = `${origin}/api/webhooks/github/${repo.id}`;

  // Register the webhook on GitHub automatically when the user's GitHub
  // integration is available — the manual copy/paste flow is only a fallback.
  const github = await getDecryptedIntegration(userId, "github");
  let webhook: { status: string; message?: string } = {
    status: "skipped",
    message: "GitHub integration not connected — set the webhook manually",
  };
  if (github) {
    const result = await upsertRepoWebhook(getGithubClient(github.accessToken), {
      owner: parsed.data.owner,
      repo: parsed.data.name,
      url: webhookUrl,
      secret: plaintextWebhookSecret,
    });
    webhook =
      result.status === "failed"
        ? { status: "failed", message: result.reason }
        : { status: result.status };
  }

  return NextResponse.json(
    {
      repo,
      // Plaintext secret is returned exactly once, for the one-time setup card.
      webhookSecret: plaintextWebhookSecret,
      webhookUrl,
      webhook,
    },
    { status: 201 }
  );
}

export async function PATCH(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return unauthorized();
  }

  const parsed = toggleSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const updated = await toggleRepoActive(
    parsed.data.repoId,
    userId,
    parsed.data.active
  );
  if (!updated) {
    return NextResponse.json({ error: "Repo not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return unauthorized();
  }

  const parsed = deleteSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const deleted = await deleteRepo(parsed.data.repoId, userId);
  if (!deleted) {
    return NextResponse.json({ error: "Repo not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
