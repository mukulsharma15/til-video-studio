import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST() {
  return NextResponse.json(
    { error: "Server-side rendering is disabled. Client-side WebAssembly rendering is active." },
    { status: 400 }
  );
}
