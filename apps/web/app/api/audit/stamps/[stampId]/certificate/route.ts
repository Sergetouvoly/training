import { NextRequest, NextResponse } from "next/server";
import { auth } from "../../../../../../auth";

const API_URL = process.env["API_URL"] ?? "http://localhost:3001";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ stampId: string }> }) {
  try {
    const { stampId } = await params;
    const session = await auth();
    const token = (session as any)?.accessToken as string | undefined;

    const res = await fetch(`${API_URL}/audit/stamps/${stampId}/certificate`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return NextResponse.json(body, { status: res.status });
    }

    const pdf = await res.arrayBuffer();
    return new NextResponse(pdf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=certificate-${stampId}.pdf`,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message }, { status: 500 });
  }
}
