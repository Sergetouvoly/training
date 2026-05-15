import { NextRequest, NextResponse } from "next/server";
import { auth } from "../../../../../auth";

const API_URL = process.env["API_URL"] ?? "http://localhost:3001";

export async function POST(req: NextRequest, { params }: { params: Promise<{ moduleId: string }> }) {
  try {
    const { moduleId } = await params;
    const session = await auth();
    const token = (session as any)?.accessToken as string | undefined;
    const body = await req.json().catch(() => ({}));

    // Timeout généreux côté Next.js — la synthèse peut prendre quelques minutes
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5 * 60 * 1000);

    const res = await fetch(`${API_URL}/tts/generate/${moduleId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timer);

    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    const message = err?.name === "AbortError" ? "TTS request timeout" : err?.message;
    return NextResponse.json({ error: message ?? "TTS error" }, { status: 500 });
  }
}
