import { NextRequest, NextResponse } from "next/server";
import { getApiClient } from "../../../../lib/api";

export async function POST(req: NextRequest) {
  try {
    const { json } = await req.json();
    const api = await getApiClient();
    const data = await api.assessment.importJson(json);
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message }, { status: err?.status ?? 500 });
  }
}
