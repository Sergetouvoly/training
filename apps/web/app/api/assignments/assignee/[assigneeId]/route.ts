import { NextResponse } from "next/server";
import { getApiClient } from "../../../../../lib/api";

export async function GET(_req: Request, { params }: { params: Promise<{ assigneeId: string }> }) {
  try {
    const { assigneeId } = await params;
    const api = await getApiClient();
    const data = await api.assignment.listForAssignee(assigneeId);
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message }, { status: err?.status ?? 500 });
  }
}
