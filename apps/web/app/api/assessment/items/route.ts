// Proxy server-side — CRUD banque de questions
import { NextRequest, NextResponse } from "next/server";
import { getApiClient } from "../../../../lib/api";

export async function GET() {
  const api = await getApiClient();
  try {
    const items = await api.assessment.listItems();
    return NextResponse.json(items);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message }, { status: err?.status ?? 500 });
  }
}

export async function POST(req: NextRequest) {
  const api = await getApiClient();
  try {
    const body = await req.json();
    const item = await api.assessment.createItem(body);
    return NextResponse.json(item, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message }, { status: err?.status ?? 500 });
  }
}
