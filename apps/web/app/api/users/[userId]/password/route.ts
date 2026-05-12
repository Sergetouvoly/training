// Proxy server-side — reset mot de passe utilisateur
import { NextRequest, NextResponse } from "next/server";
import { getApiClient } from "../../../../../lib/api";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const api = await getApiClient();
  try {
    const body = await req.json();
    await api.admin.resetPassword(userId, { password: body.password });
    return new NextResponse(null, { status: 204 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message }, { status: err?.status ?? 500 });
  }
}
