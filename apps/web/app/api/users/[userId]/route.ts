// Proxy server-side — PATCH / DELETE utilisateur
import { NextRequest, NextResponse } from "next/server";
import { getApiClient } from "../../../../lib/api";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const api = await getApiClient();
  try {
    const body = await req.json();
    const user = await api.admin.updateUser(userId, body);
    return NextResponse.json(user);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message }, { status: err?.status ?? 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const api = await getApiClient();
  try {
    await api.admin.deleteUser(userId);
    return new NextResponse(null, { status: 204 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message }, { status: err?.status ?? 500 });
  }
}
