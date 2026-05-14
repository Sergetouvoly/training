import { NextRequest, NextResponse } from "next/server";
import { getApiClient } from "../../../../lib/api";

export async function GET() {
  try {
    const api = await getApiClient();
    const data = await api.user.checkOnboarding();
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message }, { status: err?.status ?? 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const api = await getApiClient();
    const { job_role } = await req.json();
    await api.user.completeOnboarding(job_role);
    return new NextResponse(null, { status: 204 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message }, { status: err?.status ?? 500 });
  }
}
