// Refs: SPEC.md §9 US-1.3 — proxy evaluate vers NestJS
import { NextRequest, NextResponse } from "next/server";
import { auth } from "../../../../auth";
import { getApiClient } from "../../../../lib/api";
import type { EvalAnswer } from "@elearning/api-client";

interface EvaluateBody {
  module_id: string;
  module_version_hash: string;
  answers: EvalAnswer[];
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json() as EvaluateBody;
  const api = await getApiClient();

  try {
    const result = await api.assessment.evaluate({
      learner_id: session.user?.email ?? "",
      module_id: body.module_id,
      module_version_hash: body.module_version_hash,
      answers: body.answers,
    });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "evaluate_failed" }, { status: 500 });
  }
}
