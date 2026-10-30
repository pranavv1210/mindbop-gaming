// Original MindBop Arena maps. The same data drives server collision, hit tests and the client meshes,
// so what you see is exactly what you collide with.

export type Solid = {
  id: string;
  minX: number; maxX: number;
  minY: number; maxY: number;
  minZ: number; maxZ: number;
  /** Visual hint only: "wall" | "crate" | "pillar" | "step" | "slab" | "container" | "dais" */
  kind: "wall" | "crate" | "pillar" | "step" | "slab" | "container" | "dais";
  tone: 0 | 1 | 2;
};

export type SpawnPoint = { x: number; z: number; yaw: number };

export type MapId = "foundry" | "atrium" | "docklands";
export const MAP_IDS: MapId[] = ["foundry", "atrium", "docklands"];

export type ArenaMap = {
  id: MapId;
  name: string;
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  solids: Solid[];
  spawns: [SpawnPoint[], SpawnPoint[]];
  theme: { floor: string; wall: string; accent: string; accent2: string; fog: string; sky: string };
};

const HALF_X = 30;
const HALF_Z = 20;
const WALL_H = 9;

type Opts = { y0?: number; kind?: Solid["kind"]; tone?: 0 | 1 | 2 };
const box = (id: string, cx: number, cz: number, w: number, d: number, h: number, o: Opts = {}): Solid => ({
  id,
  minX: cx - w / 2, maxX: cx + w / 2,
  minY: o.y0 ?? 0, maxY: (o.y0 ?? 0) + h,
  minZ: cz - d / 2, maxZ: cz + d / 2,
  kind: o.kind ?? "crate",
  tone: o.tone ?? 0,
});
const mirrorX = (s: Solid): Solid => ({ ...s, id: `${s.id}~`, minX: -s.maxX, maxX: -s.minX });
const withMirror = (list: Solid[]) => [...list, ...list.map(mirrorX)];

const outerWalls = (): Solid[] => [
  box("wall-n", 0, HALF_Z + 0.5, HALF_X * 2 + 2, 1, WALL_H, { kind: "wall" }),
  box("wall-s", 0, -HALF_Z - 0.5, HALF_X * 2 + 2, 1, WALL_H, { kind: "wall" }),
  box("wall-e", HALF_X + 0.5, 0, 1, HALF_Z * 2, WALL_H, { kind: "wall" }),
  box("wall-w", -HALF_X - 0.5, 0, 1, HALF_Z * 2, WALL_H, { kind: "wall" }),
];

const bounds = { minX: -HALF_X, maxX: HALF_X, minZ: -HALF_Z, maxZ: HALF_Z };

const spawnsFor = (zs: number[]): [SpawnPoint[], SpawnPoint[]] => [
  zs.map((z) => ({ x: -26, z, yaw: Math.PI / 2 })),
  zs.map((z) => ({ x: 26, z, yaw: -Math.PI / 2 })),
];

/** Foundry: an industrial yard with a raised centre dais, low walls to hop and tall crates for cover. */
function foundry(): ArenaMap {
  const centre: Solid[] = [
    box("dais", 0, 0, 10, 10, 0.5, { kind: "dais", tone: 1 }),
    box("core", 0, 0, 3, 3, 2.2, { y0: 0.5, tone: 2 }),
    box("lane-n", 0, 10.5, 9, 1, 2.8, { tone: 1 }),
    box("lane-s", 0, -10.5, 9, 1, 2.8, { tone: 1 }),
  ];
  const half: Solid[] = [
    box("crate-a", -10, -6, 3, 3, 1.8),
    box("crate-b", -10, 6, 3, 3, 1.8),
    box("hop-wall", -15, 0, 1.5, 7, 1.0, { tone: 1 }),
    box("stack-a", -19, -12, 5, 2, 2.4, { tone: 2 }),
    box("stack-b", -19, 12, 5, 2, 2.4, { tone: 2 }),
    box("block-a", -22, -3.5, 2, 2, 1.0),
    box("block-b", -22, 3.5, 2, 2, 1.0),
    box("pillar-a", -13, -14, 1.4, 1.4, 6, { kind: "pillar" }),
    box("pillar-b", -13, 14, 1.4, 1.4, 6, { kind: "pillar" }),
  ];
  return {
    id: "foundry", name: "Foundry", bounds,
    solids: [...outerWalls(), ...centre, ...withMirror(half)],
    spawns: spawnsFor([-15, -9, -3, 3, 9, 15]),
    theme: { floor: "#161d2e", wall: "#222c45", accent: "#ff8a4a", accent2: "#44d4ff", fog: "#0a0f1c", sky: "#0b1226" },
  };
}

/** Atrium: a two-level hall. Stairs lead to long catwalks over the north and south edges. */
function atrium(): ArenaMap {
  const centre: Solid[] = [
    box("hall", 0, 0, 13, 8, 1.0, { kind: "dais", tone: 1 }),
    box("hall-core", 0, 0, 2.4, 2.4, 1.6, { y0: 1.0, tone: 2 }),
  ];
  const half: Solid[] = [
    box("hall-step", -7.5, 0, 2, 8, 0.5, { kind: "step" }),
    box("pillar-n", -7, 8, 1.2, 1.2, 6, { kind: "pillar" }),
    box("pillar-s", -7, -8, 1.2, 1.2, 6, { kind: "pillar" }),
    box("cover-w", -16, 0, 2, 6, 1.8),
    box("cover-lo", -20.5, 5.5, 1.6, 1.6, 1.0),
    box("cover-lo2", -20.5, -5.5, 1.6, 1.6, 1.0),
    box("walk-cover-n", -4, 13.2, 2.4, 1, 1.0, { y0: 3.0, tone: 2 }),
    box("walk-cover-s", -4, -13.2, 2.4, 1, 1.0, { y0: 3.0, tone: 2 }),
    // Stairs up to the catwalks (5 steps of 0.5 m, each wide enough to climb).
    ...[0, 1, 2, 3, 4].flatMap((i) => [
      box(`stair-n${i}`, -17.5 + i, 14, 1, 4, 0.5 * (i + 1), { kind: "step", tone: 1 }),
      box(`stair-s${i}`, -17.5 + i, -14, 1, 4, 0.5 * (i + 1), { kind: "step", tone: 1 }),
    ]),
  ];
  const catwalks: Solid[] = [
    box("walk-n", 0, 14, 26, 4, 0.4, { y0: 2.6, kind: "slab", tone: 1 }),
    box("walk-s", 0, -14, 26, 4, 0.4, { y0: 2.6, kind: "slab", tone: 1 }),
    box("rail-n", 0, 15.6, 18, 0.5, 1.0, { y0: 3.0 }),
    box("rail-s", 0, -15.6, 18, 0.5, 1.0, { y0: 3.0 }),
  ];
  return {
    id: "atrium", name: "Atrium", bounds,
    solids: [...outerWalls(), ...centre, ...catwalks, ...withMirror(half)],
    spawns: spawnsFor([-11, -7, -3, 3, 7, 11]),
    theme: { floor: "#1b2236", wall: "#2a3555", accent: "#7a8bff", accent2: "#5effc4", fog: "#0a1020", sky: "#0d1530" },
  };
}

/** Docklands: shipping-container lanes. Step blocks lead onto the container tops. */
function docklands(): ArenaMap {
  const centre: Solid[] = [
    box("crane-base", 0, 0, 3, 3, 1.0, { tone: 2 }),
    box("mid-n", 0, 9, 2, 2, 1.4),
    box("mid-s", 0, -9, 2, 2, 1.4),
  ];
  const half: Solid[] = [
    box("cont-a", -9, -12, 8, 2.4, 2.6, { kind: "container", tone: 0 }),
    box("cont-b", -9, -4, 8, 2.4, 2.6, { kind: "container", tone: 1 }),
    box("cont-c", -9, 4, 8, 2.4, 2.6, { kind: "container", tone: 2 }),
    box("cont-d", -9, 12, 8, 2.4, 2.6, { kind: "container", tone: 0 }),
    box("cont-e", -20, -9, 6, 2.4, 2.6, { kind: "container", tone: 2 }),
    box("cont-f", -20, 9, 6, 2.4, 2.6, { kind: "container", tone: 1 }),
    // Steps up onto cont-b and cont-c (4 steps of 0.6 m).
    ...[0, 1, 2, 3].flatMap((i) => [
      box(`step-b${i}`, -15.5 + i, -4, 1, 2.4, 0.6 * (i + 1), { kind: "step", tone: 1 }),
      box(`step-c${i}`, -15.5 + i, 4, 1, 2.4, 0.6 * (i + 1), { kind: "step", tone: 1 }),
    ]),
    box("barrier-a", -14, -8, 0.8, 3, 1.0, { tone: 1 }),
    box("barrier-b", -14, 8, 0.8, 3, 1.0, { tone: 1 }),
    box("bollard-a", -22.5, 0, 1.2, 1.2, 1.2, { tone: 2 }),
  ];
  return {
    id: "docklands", name: "Docklands", bounds,
    solids: [...outerWalls(), ...centre, ...withMirror(half)],
    spawns: spawnsFor([-15, -10, -3, 3, 10, 15]),
    theme: { floor: "#1a2330", wall: "#2d3a4d", accent: "#ffcc4a", accent2: "#ff6b8a", fog: "#0b121c", sky: "#0e1828" },
  };
}

const cache = new Map<MapId, ArenaMap>();
export function getMap(id: MapId): ArenaMap {
  let map = cache.get(id);
  if (!map) {
    map = id === "foundry" ? foundry() : id === "atrium" ? atrium() : docklands();
    cache.set(id, map);
  }
  return map;
}
