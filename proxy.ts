import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE, sessionToken } from "@/lib/auth";

/**
 * Cesty dostupné bez hesla. Odkaz na podpis musí otvoriť ktokoľvek, komu ho
 * pošleme — heslo chráni len časť pre majiteľa dokumentov.
 */
const PUBLIC_PREFIXES = ["/sign", "/api/sign", "/prihlasenie", "/api/prihlasenie"];

function isPublic(pathname: string) {
  return PUBLIC_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export async function proxy(request: NextRequest) {
  const password = process.env.APP_PASSWORD;
  // Bez nastaveného hesla beží aplikácia otvorene (na úvodnej stránke o tom
  // upozorní), aby sa po čerstvom stiahnutí dala rovno používať.
  if (!password) return NextResponse.next();

  const { pathname } = request.nextUrl;
  if (isPublic(pathname)) return NextResponse.next();

  const cookie = request.cookies.get(AUTH_COOKIE)?.value;
  if (cookie && cookie === (await sessionToken(password))) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Nie ste prihlásený." }, { status: 401 });
  }

  const url = request.nextUrl.clone();
  url.pathname = "/prihlasenie";
  url.search = "";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
