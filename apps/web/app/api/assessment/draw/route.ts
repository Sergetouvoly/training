// Refs: SPEC.md §9 US-1.3 — proxy draw items vers NestJS
import { NextRequest, NextResponse } from "next/server";
import { getApiClient } from "../../../../lib/api";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const bankId = searchParams.get("bank_id") ?? "";
  const count = Number(searchParams.get("count") ?? "10");

  const api = await getApiClient();
  try {
    const items = await api.assessment.drawItems(bankId, count);
    return NextResponse.json(items);
  } catch {
    return NextResponse.json({ error: "draw_failed" }, { status: 500 });
  }
}
