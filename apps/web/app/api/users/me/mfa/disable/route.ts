// Refs: SPEC.md §11 US-1.1 — proxy MFA disable (self avec code, ou super_admin sans code)
import { NextRequest, NextResponse } from "next/server";
import { getBearerToken } from "../_token";

const API_URL = process.env["API_URL"] ?? "http://localhost:3001";

export async function POST(req: NextRequest) {
  try {
    const token = await getBearerToken();
    const body = await req.json().catch(() => ({}));
    const res = await fetch(`${API_URL}/users/me/mfa/disable`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
