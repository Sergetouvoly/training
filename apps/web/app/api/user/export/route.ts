// Refs: SPEC.md §9 US-1.4 — export RGPD JSON
import { NextResponse } from "next/server";
import { getApiClient } from "../../../../lib/api";

export async function GET() {
  const api = await getApiClient();
  try {
    const data = await api.user.exportGdpr();
    return NextResponse.json(data, {
      headers: {
        "Content-Disposition": `attachment; filename="export-rgpd-${Date.now()}.json"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "export_failed" }, { status: 500 });
  }
}
