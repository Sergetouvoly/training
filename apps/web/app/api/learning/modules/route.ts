// Refs: SPEC-CONTENT.md §6.2 — proxy server-side POST /learning/modules
import { NextRequest, NextResponse } from "next/server";
import { getApiClient } from "../../../../lib/api";

export async function POST(req: NextRequest) {
  console.log("[POST /api/learning/modules] cookies:", [...req.cookies.getAll().map(c => c.name)]);
  const api = await getApiClient();
  try {
    const body = await req.json();
    const module = await api.learning.createModule(body);
    return NextResponse.json(module, { status: 201 });
  } catch (err: any) {
    console.error("[POST /api/learning/modules]", err);
    return NextResponse.json(
      { error: "creation_failed", detail: err?.message, status: err?.status },
      { status: 500 },
    );
  }
}
