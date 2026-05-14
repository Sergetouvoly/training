import { NextRequest, NextResponse } from "next/server";
import { getApiClient } from "../../../../../../lib/api";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ learnerId: string }> }) {
  try {
    const { learnerId } = await params;
    const api = await getApiClient();
    const data = await api.audit.exportLearnerBundle(learnerId);
    return NextResponse.json(data, {
      headers: {
        "Content-Disposition": `attachment; filename=audit-${learnerId}.json`,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message }, { status: err?.status ?? 500 });
  }
}
