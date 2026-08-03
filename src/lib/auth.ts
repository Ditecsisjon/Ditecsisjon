// Enkel lösenordsinloggning för hostad version. Körs både i edge (middleware)
// och Node (API) – använder Web Crypto som finns i båda.

export const AUTH_COOKIE = "ditec_auth";

/** SHA-256 som hex-sträng. */
export async function sha256hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
