import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getDecryptedIntegration } from "@/lib/db/queries";
import { listSharedPages } from "@/lib/notion/pages";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const notion = await getDecryptedIntegration(userId, "notion");
  if (!notion) {
    return NextResponse.json({ error: "Notion not connected" }, { status: 400 });
  }

  try {
    return NextResponse.json({
      pages: await listSharedPages(notion.accessToken),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to list pages",
      },
      { status: 502 }
    );
  }
}
