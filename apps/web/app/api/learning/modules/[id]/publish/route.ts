// Refs: SPEC-CONTENT.md §7.5 — proxy publish module (draft → published)
import { NextRequest, NextResponse } from "next/server";
import { getApiClient } from "../../../../../../lib/api";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const api = await getApiClient();
    const result = await (api.learning as any).publishModule(id);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message }, { status: err?.status ?? 500 });
  }
}
