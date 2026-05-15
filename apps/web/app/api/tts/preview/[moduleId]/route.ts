import { NextRequest, NextResponse } from "next/server";
import { auth } from "../../../../../auth";

const API_URL = process.env["API_URL"] ?? "http://localhost:3001";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ moduleId: string }> }) {
  try {
    const { moduleId } = await params;
    const session = await auth();
    const token = (session as any)?.accessToken as string | undefined;

    const res = await fetch(`${API_URL}/tts/preview/${moduleId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    const body = await res.json().catch(() => ({}));
    return NextResponse.json(body, { status: res.status });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message }, { status: 500 });
  }
}
