import { NextRequest, NextResponse } from "next/server";
import { getApiClient } from "../../../../../lib/api";
import type { TrashType } from "@elearning/api-client";

type Params = { params: Promise<{ type: string; id: string }> };

export async function POST(_req: NextRequest, { params }: Params) {
  const { type, id } = await params;
  const api = await getApiClient();
  try {
    const result = await api.trash.restore(type as TrashType, id);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message }, { status: err?.status ?? 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { type, id } = await params;
  const api = await getApiClient();
  try {
    await api.trash.purgeOne(type as TrashType, id);
    return new NextResponse(null, { status: 204 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message }, { status: err?.status ?? 500 });
  }
}
