import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: { provider: string } }
) {
  const { provider } = await params;
  return NextResponse.json({ provider, action: "connect" });
}
