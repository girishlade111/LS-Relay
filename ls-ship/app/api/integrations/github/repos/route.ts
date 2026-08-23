import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getDecryptedIntegration } from "@/lib/db/queries";
import { getGithubClient } from "@/lib/github/client";

const MAX_PAGES = 5;

// Lists the signed-in user's GitHub repositories (personal + installed org
// repos their OAuth token can reach) so the dashboard can offer a picker
// instead of asking users to type owner/name by hand.
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const github = await getDecryptedIntegration(userId, "github");
  if (!github) {
    return NextResponse.json(
      { error: "GitHub is not connected" },
      { status: 400 }
    );
  }

  const octokit = getGithubClient(github.accessToken);

  try {
    const all: {
      owner: string;
      name: string;
      defaultBranch: string;
      isPrivate: boolean;
    }[] = [];

    for (let page = 1; page <= MAX_PAGES; page++) {
      const { data } = await octokit.repos.listForAuthenticatedUser({
        per_page: 100,
        page,
        sort: "full_name",
      });

      for (const repo of data) {
        all.push({
          owner: repo.owner.login,
          name: repo.name,
          defaultBranch: repo.default_branch ?? "main",
          isPrivate: repo.private,
        });
      }

      if (data.length < 100) break;
    }

    return NextResponse.json({ repos: all });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to list repositories",
      },
      { status: 502 }
    );
  }
}
