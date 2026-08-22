import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: { provider: string } }
) {
  // TODO: build OAuth authorize URL and redirect
  return NextResponse.json({ todo: "connect", provider: params.provider });
}
