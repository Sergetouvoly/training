// Proxy server-side — import CSV questions
import { NextRequest, NextResponse } from "next/server";
import { getApiClient } from "../../../../../lib/api";

export async function POST(req: NextRequest) {
  const api = await getApiClient();
  try {
    const body = await req.json();
    const result = await api.assessment.importCsv(body.csv);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message }, { status: err?.status ?? 500 });
  }
}
