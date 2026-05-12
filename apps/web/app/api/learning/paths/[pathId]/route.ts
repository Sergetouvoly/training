// Proxy server-side — PATCH / DELETE parcours
import { NextRequest, NextResponse } from "next/server";
import { getApiClient } from "../../../../../lib/api";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ pathId: string }> }) {
  const { pathId } = await params;
  const api = await getApiClient();
  try {
    const body = await req.json();
    const path = await api.learning.updatePath(pathId, body);
    return NextResponse.json(path);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message }, { status: err?.status ?? 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ pathId: string }> }) {
  const { pathId } = await params;
  const api = await getApiClient();
  try {
    await api.learning.deletePath(pathId);
    return new NextResponse(null, { status: 204 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message }, { status: err?.status ?? 500 });
  }
}
