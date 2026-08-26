import { NextResponse } from "next/server";

const KNOWN_PROVIDERS = new Set(["github", "jira", "slack", "notion"]);

export async function GET(
  _request: Request,
  { params }: { params: { provider: string } }
) {
  // Concrete provider routes handle the real flows; this catch-all only
  // exists so unknown providers fail loudly instead of hitting dead ends.
  if (!KNOWN_PROVIDERS.has(params.provider)) {
    return NextResponse.json(
      { error: `Unknown provider: ${params.provider}` },
      { status: 404 }
    );
  }
  return NextResponse.json({ todo: "connect", provider: params.provider });
}
