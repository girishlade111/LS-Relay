import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: { provider: string } }
) {
  // TODO: exchange OAuth code for tokens and store encrypted
  return NextResponse.json({ todo: "callback", provider: params.provider });
}
