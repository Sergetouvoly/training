// Proxy server-side — DELETE question
import { NextRequest, NextResponse } from "next/server";
import { getApiClient } from "../../../../../lib/api";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ itemId: string }> }) {
  const { itemId } = await params;
  const api = await getApiClient();
  try {
    await api.assessment.deleteItem(itemId);
    return new NextResponse(null, { status: 204 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message }, { status: err?.status ?? 500 });
  }
}
