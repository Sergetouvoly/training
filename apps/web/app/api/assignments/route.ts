import { NextRequest, NextResponse } from "next/server";
import { getApiClient } from "../../../lib/api";

export async function GET(req: NextRequest) {
  try {
    const api = await getApiClient();
    const assigneeId = req.nextUrl.searchParams.get("assignee_id") ?? undefined;
    const resourceType = req.nextUrl.searchParams.get("resource_type") ?? undefined;
    const data = await api.assignment.list({ assignee_id: assigneeId, resource_type: resourceType });
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message }, { status: err?.status ?? 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const api = await getApiClient();
    const body = await req.json();
    const data = await api.assignment.create(body);
    return NextResponse.json(data, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message }, { status: err?.status ?? 500 });
  }
}
