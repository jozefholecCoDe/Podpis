export const AUTH_COOKIE = "podpis_auth";

/**
 * Hodnota prihlasovacej cookie. Je to odtlačok hesla, nie heslo samotné —
 * z cookie sa heslo spätne nedá zistiť a po jeho zmene v `.env.local`
 * prestanú staré cookies platiť samy od seba.
 *
 * Web Crypto funguje v Node aj v proxy, takže rovnaká funkcia sa dá použiť
 * na oboch stranách.
 */
export async function sessionToken(password: string): Promise<string> {
  const data = new TextEncoder().encode(`podpis-v1:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Zabráni presmerovaniu mimo aplikácie cez parameter `next`. */
export function safeNextPath(value: unknown): string {
  if (typeof value !== "string") return "/";
  if (!value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}
