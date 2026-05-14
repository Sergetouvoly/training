import { NextResponse } from "next/server";
import { getApiClient } from "../../../../../lib/api";

export async function GET(_req: Request, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const { userId } = await params;
    const api = await getApiClient();
    const data = await api.userPermission.list(userId);
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Erreur" }, { status: err?.status ?? 500 });
  }
}
