import { NextResponse } from "next/server";
import { AUTH_COOKIE, sessionToken } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const password = process.env.APP_PASSWORD;
  if (!password) {
    return NextResponse.json({ ok: true });
  }

  const body = await request.json().catch(() => null);
  if (typeof body?.password !== "string" || body.password !== password) {
    // Malé zdržanie sťažuje skúšanie hesiel hrubou silou.
    await new Promise((resolve) => setTimeout(resolve, 600));
    return NextResponse.json({ error: "Nesprávne heslo." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(AUTH_COOKIE, await sessionToken(password), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    secure: request.headers.get("x-forwarded-proto") === "https",
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(AUTH_COOKIE);
  return response;
}
