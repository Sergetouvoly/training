import { NextRequest, NextResponse } from "next/server";
import { getApiClient } from "../../../../../../lib/api";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string; roleId: string }> },
) {
  const { userId, roleId } = await params;
  const api = await getApiClient();
  try {
    await api.role.grantRole(userId, roleId);
    return new NextResponse(null, { status: 204 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message }, { status: err?.status ?? 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string; roleId: string }> },
) {
  const { userId, roleId } = await params;
  const api = await getApiClient();
  try {
    await api.role.revokeRole(userId, roleId);
    return new NextResponse(null, { status: 204 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message }, { status: err?.status ?? 500 });
  }
}
