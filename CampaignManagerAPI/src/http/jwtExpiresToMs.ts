/** Map `jsonwebtoken` / env style expiry (`7d`, `24h`, `3600`) to cookie `maxAge` ms. */
export function jwtExpiresToMs(expiresIn: string): number {
  const s = expiresIn.trim();
  const m = /^(\d+)([smhd])$/i.exec(s);
  if (!m) {
    return 7 * 24 * 60 * 60 * 1000;
  }
  const n = Number.parseInt(m[1], 10);
  const unit = m[2].toLowerCase();
  const mult: Record<string, number> = {
    s: 1000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  };
  const factor = mult[unit];
  if (factor === undefined) {
    return 7 * 24 * 60 * 60 * 1000;
  }
  return n * factor;
}
