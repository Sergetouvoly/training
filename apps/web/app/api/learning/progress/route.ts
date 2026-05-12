import { NextRequest, NextResponse } from "next/server";
import { getApiClient } from "../../../../lib/api";

export async function POST(req: NextRequest) {
  const api = await getApiClient();
  const body = await req.json();
  try {
    const result = await api.learning.saveProgress(body);
    return NextResponse.json(result ?? {});
  } catch {
    return NextResponse.json({}, { status: 200 });
  }
}
