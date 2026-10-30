import type { ArenaMap, Solid } from "./maps";

/** Ray vs axis-aligned box (slab method). Returns distance along the ray or Infinity. */
export function rayAabb(ox: number, oy: number, oz: number, dx: number, dy: number, dz: number, s: Solid, maxT: number): number {
  let tmin = 0;
  let tmax = maxT;
  // X
  if (Math.abs(dx) < 1e-9) {
    if (ox < s.minX || ox > s.maxX) return Infinity;
  } else {
    let t1 = (s.minX - ox) / dx;
    let t2 = (s.maxX - ox) / dx;
    if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
    if (t1 > tmin) tmin = t1;
    if (t2 < tmax) tmax = t2;
    if (tmin > tmax) return Infinity;
  }
  // Y
  if (Math.abs(dy) < 1e-9) {
    if (oy < s.minY || oy > s.maxY) return Infinity;
  } else {
    let t1 = (s.minY - oy) / dy;
    let t2 = (s.maxY - oy) / dy;
    if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
    if (t1 > tmin) tmin = t1;
    if (t2 < tmax) tmax = t2;
    if (tmin > tmax) return Infinity;
  }
  // Z
  if (Math.abs(dz) < 1e-9) {
    if (oz < s.minZ || oz > s.maxZ) return Infinity;
  } else {
    let t1 = (s.minZ - oz) / dz;
    let t2 = (s.maxZ - oz) / dz;
    if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
    if (t1 > tmin) tmin = t1;
    if (t2 < tmax) tmax = t2;
    if (tmin > tmax) return Infinity;
  }
  return tmin;
}

/** Nearest solid hit along a ray, or Infinity when the ray reaches maxT unobstructed. */
export function rayWorld(map: ArenaMap, ox: number, oy: number, oz: number, dx: number, dy: number, dz: number, maxT: number): number {
  let best = Infinity;
  for (const s of map.solids) {
    const t = rayAabb(ox, oy, oz, dx, dy, dz, s, Math.min(maxT, best));
    if (t < best) best = t;
  }
  return best;
}

/** Ray vs sphere. Returns distance or Infinity. Direction must be normalised. */
export function raySphere(ox: number, oy: number, oz: number, dx: number, dy: number, dz: number, cx: number, cy: number, cz: number, r: number, maxT: number): number {
  const lx = cx - ox, ly = cy - oy, lz = cz - oz;
  const tca = lx * dx + ly * dy + lz * dz;
  const d2 = lx * lx + ly * ly + lz * lz - tca * tca;
  const r2 = r * r;
  if (d2 > r2) return Infinity;
  const thc = Math.sqrt(r2 - d2);
  let t = tca - thc;
  if (t < 0) t = tca + thc;
  return t >= 0 && t <= maxT ? t : Infinity;
}

/** Ray vs a vertical cylinder (no caps) clipped to [y0, y1]. Direction must be normalised. */
export function rayCylinderY(ox: number, oy: number, oz: number, dx: number, dy: number, dz: number, cx: number, cz: number, r: number, y0: number, y1: number, maxT: number): number {
  const px = ox - cx, pz = oz - cz;
  const a = dx * dx + dz * dz;
  if (a < 1e-12) return Infinity;
  const b = 2 * (px * dx + pz * dz);
  const c = px * px + pz * pz - r * r;
  const disc = b * b - 4 * a * c;
  if (disc < 0) return Infinity;
  const sq = Math.sqrt(disc);
  let t = (-b - sq) / (2 * a);
  if (t < 0) t = (-b + sq) / (2 * a);
  if (t < 0 || t > maxT) return Infinity;
  const y = oy + dy * t;
  return y >= y0 && y <= y1 ? t : Infinity;
}

export const wrapAngle = (a: number) => {
  const tau = Math.PI * 2;
  return ((a % tau) + tau + Math.PI) % tau - Math.PI;
};
