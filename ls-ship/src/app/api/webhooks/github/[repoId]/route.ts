import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: { repoId: string } }
) {
  const { repoId } = await params;
  return NextResponse.json({ received: true, repoId });
}
