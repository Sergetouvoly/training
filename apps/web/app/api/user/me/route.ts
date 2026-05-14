import { NextRequest, NextResponse } from "next/server";
import { getApiClient } from "../../../../lib/api";

export async function PATCH(req: NextRequest) {
  try {
    const api = await getApiClient();
    const body = await req.json();
    const data = await api.user.updateMe(body);
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message }, { status: err?.status ?? 500 });
  }
}
