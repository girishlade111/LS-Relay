import { NextResponse } from "next/server";

export async function POST(
  _request: Request,
  { params }: { params: { repoId: string } }
) {
  // TODO: verify GitHub webhook signature and process event
  return NextResponse.json({ received: true, repoId: params.repoId });
}
