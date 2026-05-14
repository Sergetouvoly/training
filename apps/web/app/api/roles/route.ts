import { NextRequest, NextResponse } from "next/server";
import { getApiClient } from "../../../lib/api";

export async function GET(_req: NextRequest) {
  const api = await getApiClient();
  try {
    const roles = await api.role.listAll();
    return NextResponse.json(roles);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message }, { status: err?.status ?? 500 });
  }
}

export async function POST(req: NextRequest) {
  const api = await getApiClient();
  try {
    const body = await req.json();
    const role = await api.role.create(body);
    return NextResponse.json(role, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message }, { status: err?.status ?? 500 });
  }
}
