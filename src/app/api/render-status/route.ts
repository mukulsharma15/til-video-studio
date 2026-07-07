import { NextRequest, NextResponse } from "next/server";
import { renderJobs } from "@/lib/render/jobs";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing job id" }, { status: 400 });
  }
  const job = renderJobs.get(id);
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }
  return NextResponse.json(job);
}
