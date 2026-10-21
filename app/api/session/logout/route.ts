import { NextResponse } from "next/server";
import { STUDENT_TENANT_COOKIE, STUDENT_TOKEN_COOKIE } from "@/lib/api/session";

export const runtime = "nodejs";

export async function POST() {
  const secure = process.env.NODE_ENV === "production";
  const base = `Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure ? "; Secure" : ""}`;
  const response = NextResponse.json({ ok: true });
  response.headers.append("Set-Cookie", `${STUDENT_TOKEN_COOKIE}=; ${base}`);
  response.headers.append("Set-Cookie", `${STUDENT_TENANT_COOKIE}=; ${base}`);
  return response;
}
