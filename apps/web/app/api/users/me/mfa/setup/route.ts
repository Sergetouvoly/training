// Refs: SPEC.md §11 US-1.1 — proxy MFA setup
import { NextResponse } from "next/server";
import { getBearerToken } from "../_token";

const API_URL = process.env["API_URL"] ?? "http://localhost:3001";

export async function POST() {
  try {
    const token = await getBearerToken();
    const res = await fetch(`${API_URL}/users/me/mfa/setup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
