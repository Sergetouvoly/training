// Proxy server-side — CRUD utilisateurs
import { NextRequest, NextResponse } from "next/server";
import { getApiClient } from "../../../lib/api";

export async function GET(req: NextRequest) {
  const api = await getApiClient();
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? undefined;
  const role = searchParams.get("role") ?? undefined;
  const status = searchParams.get("status") as "active" | "inactive" | undefined;
  try {
    const users = await api.admin.listUsers({ q, role, status });
    return NextResponse.json(users);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message }, { status: err?.status ?? 500 });
  }
}

export async function POST(req: NextRequest) {
  const api = await getApiClient();
  try {
    const body = await req.json();
    const user = await api.admin.createUser(body);
    return NextResponse.json(user, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message }, { status: err?.status ?? 500 });
  }
}
