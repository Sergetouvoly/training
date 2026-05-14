import { NextResponse } from "next/server";
import { getApiClient } from "../../../../lib/api";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const api = await getApiClient();
    const data = await api.assignment.remove(id);
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message }, { status: err?.status ?? 500 });
  }
}
