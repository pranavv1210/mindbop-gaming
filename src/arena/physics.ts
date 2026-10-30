import type { ArenaMap, Solid } from "./maps";
import {
  ABILITY, ADS_SPEED_MUL, AIR_ACCEL, BODY_HEIGHT, DT, GRAVITY, GROUND_ACCEL, GROUND_DECEL, JUMP_SPEED,
  RADIUS, SPRINT_MUL, STEP_HEIGHT, SUBSTEPS,
} from "./config";

export type Body = {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  grounded: boolean;
  /** Ticks during which a dash keeps input acceleration disabled. */
  lock: number;
};

export type MoveInput = {
  mx: number; mz: number;
  yaw: number;
  jump: boolean;
  sprint: boolean;
  ads: boolean;
  dash: boolean;
};

const EPS = 1e-4;
const H = BODY_HEIGHT;

export const newBody = (x = 0, y = 0, z = 0): Body => ({ x, y, z, vx: 0, vy: 0, vz: 0, grounded: true, lock: 0 });
export const copyBody = (from: Body, to: Body) => {
  to.x = from.x; to.y = from.y; to.z = from.z;
  to.vx = from.vx; to.vy = from.vy; to.vz = from.vz;
  to.grounded = from.grounded; to.lock = from.lock;
  return to;
};

function blocking(solids: Solid[], x: number, y: number, z: number): Solid | null {
  for (let i = 0; i < solids.length; i++) {
    const s = solids[i];
    if (
      x + RADIUS > s.minX + EPS && x - RADIUS < s.maxX - EPS &&
      z + RADIUS > s.minZ + EPS && z - RADIUS < s.maxZ - EPS &&
      y + H > s.minY + EPS && y < s.maxY - EPS
    ) return s;
  }
  return null;
}

/** True when a body standing at (x, y, z) fits without touching any solid. */
export const fitsAt = (map: ArenaMap, x: number, y: number, z: number) => blocking(map.solids, x, y, z) === null;

function moveAxis(b: Body, map: ArenaMap, axis: "x" | "z", delta: number) {
  if (delta === 0) return;
  const solids = map.solids;
  const target = (axis === "x" ? b.x : b.z) + delta;
  const nx = axis === "x" ? target : b.x;
  const nz = axis === "z" ? target : b.z;
  const hit = blocking(solids, nx, b.y, nz);
  if (!hit) {
    if (axis === "x") b.x = target; else b.z = target;
    return;
  }
  const rise = hit.maxY - b.y;
  if (b.grounded && rise > EPS && rise <= STEP_HEIGHT + EPS && blocking(solids, nx, hit.maxY, nz) === null) {
    b.y = hit.maxY;
    if (axis === "x") b.x = target; else b.z = target;
    return;
  }
  // Slide: stop against the face we hit.
  let limit = target;
  if (axis === "x") {
    limit = delta > 0 ? hit.minX - RADIUS - EPS : hit.maxX + RADIUS + EPS;
    if (blocking(solids, limit, b.y, b.z) === null) b.x = limit;
    b.vx = 0;
  } else {
    limit = delta > 0 ? hit.minZ - RADIUS - EPS : hit.maxZ + RADIUS + EPS;
    if (blocking(solids, b.x, b.y, limit) === null) b.z = limit;
    b.vz = 0;
  }
}

function moveY(b: Body, map: ArenaMap, dt: number) {
  const solids = map.solids;
  b.vy -= GRAVITY * dt;
  let ny = b.y + b.vy * dt;
  b.grounded = false;
  if (b.vy <= 0) {
    let floor = 0;
    for (let i = 0; i < solids.length; i++) {
      const s = solids[i];
      if (
        b.x + RADIUS > s.minX + EPS && b.x - RADIUS < s.maxX - EPS &&
        b.z + RADIUS > s.minZ + EPS && b.z - RADIUS < s.maxZ - EPS &&
        s.maxY <= b.y + 0.01 && s.maxY > floor
      ) floor = s.maxY;
    }
    if (ny <= floor) { ny = floor; b.vy = 0; b.grounded = true; }
  } else {
    for (let i = 0; i < solids.length; i++) {
      const s = solids[i];
      if (
        b.x + RADIUS > s.minX + EPS && b.x - RADIUS < s.maxX - EPS &&
        b.z + RADIUS > s.minZ + EPS && b.z - RADIUS < s.maxZ - EPS &&
        s.minY >= b.y + H - 0.01 && s.minY < ny + H
      ) { ny = s.minY - H; b.vy = 0; }
    }
  }
  b.y = ny;
}

const approach = (value: number, target: number, step: number) =>
  value < target ? Math.min(target, value + step) : Math.max(target, value - step);

/** Advance a body by one physics substep. */
export function stepBody(b: Body, input: MoveInput, speed: number, map: ArenaMap, dt: number) {
  let mx = input.mx, mz = input.mz;
  const len = Math.hypot(mx, mz);
  if (len > 1) { mx /= len; mz /= len; }
  const sin = Math.sin(input.yaw), cos = Math.cos(input.yaw);
  const wishX = sin * mz + cos * mx;
  const wishZ = cos * mz - sin * mx;
  const moving = len > 0.001;
  const target = speed * (input.sprint && mz > 0.5 ? SPRINT_MUL : 1) * (input.ads ? ADS_SPEED_MUL : 1);

  if (b.lock <= 0) {
    if (moving) {
      const accel = (b.grounded ? GROUND_ACCEL : AIR_ACCEL) * dt;
      b.vx = approach(b.vx, wishX * target, accel);
      b.vz = approach(b.vz, wishZ * target, accel);
    } else if (b.grounded) {
      const decel = GROUND_DECEL * dt;
      b.vx = approach(b.vx, 0, decel);
      b.vz = approach(b.vz, 0, decel);
    }
  }
  moveAxis(b, map, "x", b.vx * dt);
  moveAxis(b, map, "z", b.vz * dt);
  moveY(b, map, dt);

  const bd = map.bounds;
  if (b.x < bd.minX + RADIUS) { b.x = bd.minX + RADIUS; if (b.vx < 0) b.vx = 0; }
  if (b.x > bd.maxX - RADIUS) { b.x = bd.maxX - RADIUS; if (b.vx > 0) b.vx = 0; }
  if (b.z < bd.minZ + RADIUS) { b.z = bd.minZ + RADIUS; if (b.vz < 0) b.vz = 0; }
  if (b.z > bd.maxZ - RADIUS) { b.z = bd.maxZ - RADIUS; if (b.vz > 0) b.vz = 0; }
}

/** One full simulation tick (the unit the client sends and the server consumes). */
export function stepTick(b: Body, input: MoveInput, speed: number, map: ArenaMap) {
  const dt = DT / SUBSTEPS;
  if (input.dash) {
    b.vx = Math.sin(input.yaw) * ABILITY.dashSpeed;
    b.vz = Math.cos(input.yaw) * ABILITY.dashSpeed;
    b.lock = ABILITY.dashLockTicks;
  }
  if (input.jump && b.grounded) {
    b.vy = JUMP_SPEED;
    b.grounded = false;
  }
  for (let i = 0; i < SUBSTEPS; i++) stepBody(b, input, speed, map, dt);
  if (b.lock > 0) b.lock -= 1;
}
