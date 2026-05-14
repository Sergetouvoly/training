import { NextRequest, NextResponse } from "next/server";
import { getApiClient } from "../../../lib/api";
import type { TrashType } from "@elearning/api-client";

export async function GET(req: NextRequest) {
  const api = await getApiClient();
  const type = req.nextUrl.searchParams.get("type") as TrashType | null;
  try {
    const data = await api.trash.list(type ?? undefined);
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message }, { status: err?.status ?? 500 });
  }
}

export async function DELETE() {
  const api = await getApiClient();
  try {
    const result = await api.trash.purgeExpired();
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message }, { status: err?.status ?? 500 });
  }
}
