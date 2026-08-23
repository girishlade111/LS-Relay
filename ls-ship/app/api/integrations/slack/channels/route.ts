import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getDecryptedIntegration } from "@/lib/db/queries";
import { listSlackChannels } from "@/lib/slack/channels";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const slack = await getDecryptedIntegration(userId, "slack");
  if (!slack) {
    return NextResponse.json({ error: "Slack not connected" }, { status: 400 });
  }

  try {
    return NextResponse.json({
      channels: await listSlackChannels(slack.accessToken),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to list channels",
      },
      { status: 502 }
    );
  }
}
