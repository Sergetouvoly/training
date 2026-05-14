import { NextRequest, NextResponse } from "next/server";
import { getApiClient } from "../../../../../../lib/api";

export async function GET(req: NextRequest) {
  try {
    const teamId = req.nextUrl.searchParams.get("team_id") ?? "";
    const api = await getApiClient();
    const data = await api.simulator.getTeamModuleProgress(teamId);
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message }, { status: err?.status ?? 500 });
  }
}
