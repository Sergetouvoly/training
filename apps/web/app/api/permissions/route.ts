import { NextResponse } from "next/server";
import { getApiClient } from "../../../lib/api";

export async function GET() {
  try {
    const api = await getApiClient();
    const data = await api.permission.listAll();
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Erreur" }, { status: err?.status ?? 500 });
  }
}
