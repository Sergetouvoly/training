// Proxy server-side — upload multipart vers l'API NestJS
// Refs: SPEC-CONTENT.md §3.1
import { NextRequest, NextResponse } from "next/server";
import { getBearerToken } from "@lib/token";

const API_URL = process.env["API_URL"] ?? "http://localhost:3001";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ moduleId: string }> },
) {
  const { moduleId } = await params;
  const token = await getBearerToken();

  const formData = await req.formData();

  const res = await fetch(`${API_URL}/media/upload/${moduleId}`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  const data = await res.json().catch(() => ({ error: "Réponse invalide" }));
  return NextResponse.json(data, { status: res.status });
}

// Désactiver le body parser Next.js — on passe le multipart brut
export const config = { api: { bodyParser: false } };
