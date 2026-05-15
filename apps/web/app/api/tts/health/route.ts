import { NextResponse } from "next/server";
import { auth } from "../../../../auth";

const API_URL = process.env["API_URL"] ?? "http://localhost:3001";

export async function GET() {
  try {
    const session = await auth();
    const token = (session as any)?.accessToken as string | undefined;

    const res = await fetch(`${API_URL}/tts/health`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    const body = await res.json().catch(() => ({}));
    return NextResponse.json(body, { status: res.status });
  } catch (err: any) {
    return NextResponse.json({ available: false, reason: err?.message ?? "Erreur réseau" }, { status: 200 });
  }
}
