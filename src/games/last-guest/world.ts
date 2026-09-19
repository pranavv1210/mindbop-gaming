// Shared physical layout only. Evidence text, prerequisites, and the solution stay on the server.
export type Point = { x: number; z: number };
export type Rect = Point & { w: number; d: number };
export const PLAYER_RADIUS = 0.25;
export const SPEED = 3.6;
export const areas = [
  {
    id: "lobby",
    name: "Lobby",
    x: -4.5,
    z: 5.5,
    w: 15,
    d: 7,
    color: "#53454a",
  },
  { id: "hall", name: "Hallway", x: 0, z: -3.5, w: 6, d: 11, color: "#42444e" },
  {
    id: "study",
    name: "Study",
    x: -7.5,
    z: -3.5,
    w: 9,
    d: 11,
    color: "#3c5550",
  },
  {
    id: "guest",
    name: "Guest room",
    x: 7.5,
    z: -4.5,
    w: 9,
    d: 9,
    color: "#51455f",
  },
  {
    id: "dining",
    name: "Dining room",
    x: 7.5,
    z: 4.5,
    w: 9,
    d: 9,
    color: "#615044",
  },
] as const;
export const walls: Rect[] = [
  { x: -12, z: 0, w: 0.3, d: 18 },
  { x: 12, z: 0, w: 0.3, d: 18 },
  { x: 0, z: -9, w: 24, d: 0.3 },
  { x: 0, z: 9, w: 24, d: 0.3 },
  { x: -3, z: -5.5, w: 0.25, d: 7 },
  { x: -3, z: 1, w: 0.25, d: 2 },
  { x: -7.5, z: 2, w: 9, d: 0.25 },
  { x: 3, z: -7, w: 0.25, d: 4 },
  { x: 3, z: 0.5, w: 0.25, d: 7 },
  { x: 3, z: 7.5, w: 0.25, d: 3 },
  { x: 7.5, z: 0, w: 9, d: 0.25 },
];
export const furniture = [
  { id: "reception", kind: "desk", x: -7.5, z: 4, w: 4.5, d: 1.1, h: 1.15 },
  { id: "study-desk", kind: "desk", x: -8, z: -5.8, w: 3.5, d: 1.5, h: 0.95 },
  { id: "study-shelf", kind: "shelf", x: -11, z: -4, w: 0.7, d: 5, h: 2.5 },
  { id: "bed", kind: "bed", x: 8, z: -6.5, w: 3, d: 3.4, h: 0.65 },
  { id: "nightstand", kind: "desk", x: 10.4, z: -6.5, w: 1, d: 1, h: 0.8 },
  { id: "dining-table", kind: "table", x: 8, z: 4.5, w: 3.4, d: 2.6, h: 0.85 },
  { id: "sideboard", kind: "shelf", x: 10.8, z: 1.5, w: 1.2, d: 1, h: 1.3 },
  { id: "sofa", kind: "sofa", x: -8, z: 7.4, w: 3.4, d: 1.1, h: 0.8 },
] as const;
export const hotspots = [
  {
    id: "register",
    name: "Reception register",
    area: "lobby",
    x: -6.4,
    z: 5.1,
    kind: "document",
  },
  {
    id: "body",
    name: "Examine the study",
    area: "study",
    x: -6,
    z: -3.7,
    kind: "scene",
  },
  {
    id: "ledger",
    name: "Open account ledger",
    area: "study",
    x: -8,
    z: -4.5,
    kind: "document",
  },
  {
    id: "clock",
    name: "Hallway clock",
    area: "hall",
    x: 1.8,
    z: -7.4,
    kind: "clock",
  },
  {
    id: "breaker",
    name: "Maintenance panel",
    area: "hall",
    x: -1.8,
    z: 0.8,
    kind: "panel",
  },
  {
    id: "glass",
    name: "Tray and glass",
    area: "dining",
    x: 8,
    z: 2.4,
    kind: "glass",
  },
  {
    id: "letter",
    name: "Unsent letter",
    area: "guest",
    x: 6.4,
    z: -3.5,
    kind: "document",
  },
  {
    id: "key",
    name: "Inspect the service key",
    area: "lobby",
    x: -9,
    z: 5.1,
    kind: "key",
  },
  {
    id: "receipt",
    name: "Laundry receipt",
    area: "guest",
    x: 10.4,
    z: -4.5,
    kind: "document",
  },
  {
    id: "mara",
    name: "Mara Vale · hotel manager",
    area: "lobby",
    x: -4.5,
    z: 7.1,
    kind: "suspect",
  },
  {
    id: "eli",
    name: "Eli Ward · electrician",
    area: "hall",
    x: 1.2,
    z: -1.5,
    kind: "suspect",
  },
  {
    id: "june",
    name: "June Ash · guest",
    area: "dining",
    x: 5,
    z: 7.3,
    kind: "suspect",
  },
] as const;
export type HotspotId = (typeof hotspots)[number]["id"];
export const distance = (a: Point, b: Point) =>
  Math.hypot(a.x - b.x, a.z - b.z);
export function walkable(p: Point) {
  return (
    Math.abs(p.x) < 11.6 &&
    Math.abs(p.z) < 8.6 &&
    ![...walls, ...furniture].some(
      (r) =>
        Math.abs(p.x - r.x) < r.w / 2 + PLAYER_RADIUS &&
        Math.abs(p.z - r.z) < r.d / 2 + PLAYER_RADIUS,
    )
  );
}
export function movePoint(from: Point, dx: number, dz: number): Point {
  const next = { ...from };
  // Substeps prevent crossing a thin wall even after a slow server frame.
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.12));
  for (let i = 0; i < steps; i++) {
    if (walkable({ x: next.x + dx / steps, z: next.z })) next.x += dx / steps;
    if (walkable({ x: next.x, z: next.z + dz / steps })) next.z += dz / steps;
  }
  return next;
}
export function reachable(from: Point, to: Point) {
  if (distance(from, to) > 1.8) return false;
  for (let i = 1; i <= 12; i++)
    if (
      !walkable({
        x: from.x + ((to.x - from.x) * i) / 12,
        z: from.z + ((to.z - from.z) * i) / 12,
      })
    )
      return false;
  return true;
}
export function areaAt(p: Point) {
  return (
    areas.find(
      (a) => Math.abs(p.x - a.x) <= a.w / 2 && Math.abs(p.z - a.z) <= a.d / 2,
    )?.name ?? "Hotel"
  );
}
export const spawnPoint = (index: number): Point => ({
  x: -0.9 + (index % 3) * 0.9,
  z: 6.4 + Math.floor(index / 3) * 0.8,
});
