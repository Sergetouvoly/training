// Proxy server-side — création parcours
import { NextRequest, NextResponse } from "next/server";
import { getApiClient } from "../../../../lib/api";

export async function POST(req: NextRequest) {
  const api = await getApiClient();
  try {
    const body = await req.json();
    const path = await api.learning.createPath(body);
    return NextResponse.json(path, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message }, { status: err?.status ?? 500 });
  }
}
