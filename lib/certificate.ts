/** Codes are issued by the database as WIU-XXXX-XXXX (hex). */
export const CERT_CODE_RE = /^WIU-[0-9A-F]{4}-[0-9A-F]{4}$/;

export function normaliseCode(input: string): string | null {
  const code = input.trim().toUpperCase();
  return CERT_CODE_RE.test(code) ? code : null;
}
