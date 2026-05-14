import { NextResponse } from "next/server";
import { auth } from "../../../../auth";

const API_URL = process.env["API_URL"] ?? "http://localhost:3001";

export async function GET() {
  try {
    const session = await auth();
    const token = (session as any)?.accessToken as string | undefined;
    const res = await fetch(`${API_URL}/permissions/grants`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) return NextResponse.json({}, { status: res.status });
    return NextResponse.json(await res.json());
  } catch {
    return NextResponse.json({}, { status: 500 });
  }
}
