// Proxy server-side — GET + DELETE module
import { NextRequest, NextResponse } from "next/server";
import { getApiClient } from "../../../../../lib/api";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const api = await getApiClient();
  try {
    const module = await api.learning.getModule(id);
    return NextResponse.json(module);
  } catch {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const api = await getApiClient();
  try {
    await api.learning.deleteModule(id);
    return new NextResponse(null, { status: 204 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message }, { status: err?.status ?? 500 });
  }
}
