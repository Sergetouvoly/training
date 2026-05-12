// Proxy server-side — sauvegarde contenu module (éditeur)
import { NextRequest, NextResponse } from "next/server";
import { getApiClient } from "../../../../../../lib/api";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const api = await getApiClient();
  try {
    const body = await req.json();
    const module = await api.learning.updateModuleContent(id, body.content_fr);
    return NextResponse.json(module);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message }, { status: err?.status ?? 500 });
  }
}
