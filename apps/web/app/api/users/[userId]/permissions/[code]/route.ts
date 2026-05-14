import { NextResponse } from "next/server";
import { getApiClient } from "../../../../../../lib/api";

export async function PUT(req: Request, { params }: { params: Promise<{ userId: string; code: string }> }) {
  try {
    const { userId, code } = await params;
    const body = await req.json();
    const api = await getApiClient();
    const data = await api.userPermission.upsert(userId, decodeURIComponent(code), body);
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Erreur" }, { status: err?.status ?? 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ userId: string; code: string }> }) {
  try {
    const { userId, code } = await params;
    const api = await getApiClient();
    await api.userPermission.remove(userId, decodeURIComponent(code));
    return new NextResponse(null, { status: 204 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Erreur" }, { status: err?.status ?? 500 });
  }
}
