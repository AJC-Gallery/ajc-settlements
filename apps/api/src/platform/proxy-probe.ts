/** Pure. Classes only, never an address (P-13). */
export type IpClass = "loopback" | "private" | "public" | "unknown";

const IPV4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

export function ipClassOf(ip: string | undefined): IpClass {
  if (ip === undefined || ip === "") return "unknown";
  const value = ip.startsWith("::ffff:") ? ip.slice(7) : ip;
  if (value === "::1") return "loopback";
  if (/^f[cd][0-9a-f]{2}:/i.test(value) || /^fe80:/i.test(value)) return "private";
  const match = IPV4.exec(value);
  if (match === null) return value.includes(":") ? "public" : "unknown";
  const a = Number(match[1]);
  const b = Number(match[2]);
  if (a === 127) return "loopback";
  if (a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 169 && b === 254)) {
    return "private";
  }
  return "public";
}

/** Number of entries in X-Forwarded-For. 0 when the header is absent. */
export function xffCountOf(header: string | readonly string[] | undefined): number {
  const text = Array.isArray(header) ? header.join(",") : header;
  if (typeof text !== "string" || text.trim() === "") return 0;
  return text.split(",").filter((part) => part.trim() !== "").length;
}