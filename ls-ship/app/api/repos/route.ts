import { NextResponse } from "next/server";

export async function GET() {
  // TODO: list connected repos for the signed-in user
  return NextResponse.json({ repos: [] });
}
