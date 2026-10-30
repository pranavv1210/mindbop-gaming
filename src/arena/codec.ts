// Compact binary wire format for MindBop Arena. Little endian throughout.
// Shared by the server and the browser client so both sides always agree on the layout.

export const TAU = Math.PI * 2;
const PITCH_LIMIT = 1.5;

export const CMD_SIZE = 17;
export const PLAYER_RECORD_SIZE = 13;
export const SHOT_RECORD_SIZE = 8;
export const SNAP_HEADER_SIZE = 10;
export const OWN_BLOCK_SIZE = 43;
export const SNAPSHOT_TYPE = 1;

export const FLAG = {
  alive: 1, grounded: 2, shield: 4, cloak: 8, firing: 16, reloading: 32, sprint: 64, protect: 128,
} as const;

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);

export const yawToU16 = (yaw: number) => (Math.round(((yaw % TAU) + TAU) % TAU / TAU * 65536)) & 0xffff;
export const u16ToYaw = (q: number) => (q / 65536) * TAU;
export const pitchToI16 = (pitch: number) => Math.round(clamp(pitch, -PITCH_LIMIT, PITCH_LIMIT) / PITCH_LIMIT * 32767);
export const i16ToPitch = (q: number) => (q / 32767) * PITCH_LIMIT;
const axisToI8 = (v: number) => Math.round(clamp(v, -1, 1) * 127);
const i8ToAxis = (q: number) => q / 127;

/** Snap a yaw/pitch to exactly what the wire can carry, so prediction matches the server bit for bit. */
export const quantizeYaw = (yaw: number) => u16ToYaw(yawToU16(yaw));
export const quantizePitch = (pitch: number) => i16ToPitch(pitchToI16(pitch));
export const quantizeAxis = (v: number) => i8ToAxis(axisToI8(v));

export type Cmd = {
  seq: number;
  mx: number;
  mz: number;
  yaw: number;
  pitch: number;
  buttons: number;
  /** Weapon index to switch to, or 255 for "no change". */
  weaponSel: number;
  /** Server tick the player was looking at when they acted (lag compensation). */
  viewTick: number;
  /** Fraction (0..255) towards the next tick. */
  viewFrac: number;
};

export const toBytes = (data: ArrayBuffer | ArrayBufferView): Uint8Array =>
  data instanceof ArrayBuffer ? new Uint8Array(data) : new Uint8Array(data.buffer, data.byteOffset, data.byteLength);

export function encodeCmd(cmd: Cmd): Uint8Array {
  const out = new Uint8Array(CMD_SIZE);
  const v = new DataView(out.buffer);
  v.setUint32(0, cmd.seq >>> 0, true);
  v.setInt8(4, axisToI8(cmd.mx));
  v.setInt8(5, axisToI8(cmd.mz));
  v.setUint16(6, yawToU16(cmd.yaw), true);
  v.setInt16(8, pitchToI16(cmd.pitch), true);
  v.setUint8(10, cmd.buttons & 0xff);
  v.setUint8(11, cmd.weaponSel & 0xff);
  v.setUint32(12, cmd.viewTick >>> 0, true);
  v.setUint8(16, cmd.viewFrac & 0xff);
  return out;
}

/** Decode one command. Returns null for anything malformed so the caller can drop it. */
export function decodeCmd(data: unknown): Cmd | null {
  if (!(data instanceof ArrayBuffer) && !ArrayBuffer.isView(data)) return null;
  const bytes = toBytes(data as ArrayBuffer | ArrayBufferView);
  if (bytes.length !== CMD_SIZE) return null;
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const mxq = v.getInt8(4), mzq = v.getInt8(5);
  if (mxq === -128 || mzq === -128) return null;
  return {
    seq: v.getUint32(0, true),
    mx: i8ToAxis(mxq),
    mz: i8ToAxis(mzq),
    yaw: u16ToYaw(v.getUint16(6, true)),
    pitch: i16ToPitch(v.getInt16(8, true)),
    buttons: v.getUint8(10),
    weaponSel: v.getUint8(11),
    viewTick: v.getUint32(12, true),
    viewFrac: v.getUint8(16),
  };
}

export type SnapPlayer = {
  slot: number; gen: number;
  x: number; y: number; z: number;
  yaw: number; pitch: number;
  hp: number; flags: number; weapon: number;
};
export type SnapShot = { shooter: number; weapon: number; x: number; y: number; z: number };
export type OwnState = {
  ackSeq: number;
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  grounded: boolean;
  lock: number;
  weapon: number;
  hero: number;
  ammo: [number, number, number, number];
  reloadMs: number;
  abilityMs: number;
  respawnMs: number;
};
export type Snapshot = {
  tick: number;
  phase: number;
  timeLeftDs: number;
  scores: [number, number];
  players: SnapPlayer[];
  shots: SnapShot[];
  own: OwnState | null;
};

const cm = (v: number) => clamp(Math.round(v * 100), -32768, 32767);

export function encodeSnapshotCommon(tick: number, phase: number, timeLeftTicks: number, timeLeftDivisor: number, scores: [number, number], players: SnapPlayer[], shots: SnapShot[]): Uint8Array {
  // Layout: header(10) | playerCount(1) | players | shotCount(1) | shots
  const out = new Uint8Array(SNAP_HEADER_SIZE + 1 + players.length * PLAYER_RECORD_SIZE + 1 + shots.length * SHOT_RECORD_SIZE);
  const v = new DataView(out.buffer);
  v.setUint8(0, SNAPSHOT_TYPE);
  v.setUint32(1, tick >>> 0, true);
  v.setUint8(5, phase);
  v.setUint16(6, clamp(Math.round(timeLeftTicks / timeLeftDivisor), 0, 65535), true);
  v.setUint8(8, clamp(scores[0], 0, 255));
  v.setUint8(9, clamp(scores[1], 0, 255));
  let o = SNAP_HEADER_SIZE;
  v.setUint8(o++, players.length);
  for (const p of players) {
    v.setUint8(o, (p.slot & 15) | ((p.gen & 15) << 4));
    v.setInt16(o + 1, cm(p.x), true);
    v.setInt16(o + 3, cm(p.y), true);
    v.setInt16(o + 5, cm(p.z), true);
    v.setUint16(o + 7, yawToU16(p.yaw), true);
    v.setInt8(o + 9, Math.round(clamp(p.pitch, -PITCH_LIMIT, PITCH_LIMIT) / PITCH_LIMIT * 127));
    v.setUint8(o + 10, clamp(Math.round(p.hp), 0, 255));
    v.setUint8(o + 11, p.flags & 0xff);
    v.setUint8(o + 12, p.weapon & 0xff);
    o += PLAYER_RECORD_SIZE;
  }
  v.setUint8(o++, shots.length);
  for (const s of shots) {
    v.setUint8(o, s.shooter & 0xff);
    v.setUint8(o + 1, s.weapon & 0xff);
    v.setInt16(o + 2, cm(s.x), true);
    v.setInt16(o + 4, cm(s.y), true);
    v.setInt16(o + 6, cm(s.z), true);
    o += SHOT_RECORD_SIZE;
  }
  return out;
}

export function encodeOwnBlock(own: OwnState): Uint8Array {
  const out = new Uint8Array(OWN_BLOCK_SIZE);
  const v = new DataView(out.buffer);
  v.setUint8(0, 1);
  v.setUint32(1, own.ackSeq >>> 0, true);
  v.setFloat32(5, own.x, true);
  v.setFloat32(9, own.y, true);
  v.setFloat32(13, own.z, true);
  v.setFloat32(17, own.vx, true);
  v.setFloat32(21, own.vy, true);
  v.setFloat32(25, own.vz, true);
  v.setUint8(29, own.grounded ? 1 : 0);
  v.setUint8(30, clamp(own.lock, 0, 255));
  v.setUint8(31, own.weapon & 0xff);
  for (let i = 0; i < 4; i++) v.setUint8(32 + i, clamp(own.ammo[i], 0, 255));
  v.setUint16(36, clamp(own.reloadMs, 0, 65535), true);
  v.setUint16(38, clamp(own.abilityMs, 0, 65535), true);
  v.setUint16(40, clamp(own.respawnMs, 0, 65535), true);
  v.setUint8(42, own.hero & 0xff);
  return out;
}

export function joinSnapshot(common: Uint8Array, own: Uint8Array | null): Uint8Array {
  const out = new Uint8Array(common.length + (own ? own.length : 1));
  out.set(common, 0);
  if (own) out.set(own, common.length);
  else out[common.length] = 0;
  return out;
}

/** Decode a snapshot. Returns null when the payload is malformed or truncated. */
export function decodeSnapshot(data: ArrayBuffer | ArrayBufferView): Snapshot | null {
  const bytes = toBytes(data);
  if (bytes.length < SNAP_HEADER_SIZE + 2) return null;
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (v.getUint8(0) !== SNAPSHOT_TYPE) return null;
  const tick = v.getUint32(1, true);
  const phase = v.getUint8(5);
  const timeLeftDs = v.getUint16(6, true);
  const scores: [number, number] = [v.getUint8(8), v.getUint8(9)];
  let o = SNAP_HEADER_SIZE;
  const count = v.getUint8(o++);
  if (bytes.length < o + count * PLAYER_RECORD_SIZE + 1) return null;
  const players: SnapPlayer[] = [];
  for (let i = 0; i < count; i++) {
    const idByte = v.getUint8(o);
    players.push({
      slot: idByte & 15,
      gen: idByte >> 4,
      x: v.getInt16(o + 1, true) / 100,
      y: v.getInt16(o + 3, true) / 100,
      z: v.getInt16(o + 5, true) / 100,
      yaw: u16ToYaw(v.getUint16(o + 7, true)),
      pitch: (v.getInt8(o + 9) / 127) * PITCH_LIMIT,
      hp: v.getUint8(o + 10),
      flags: v.getUint8(o + 11),
      weapon: v.getUint8(o + 12),
    });
    o += PLAYER_RECORD_SIZE;
  }
  const shotCount = v.getUint8(o++);
  if (bytes.length < o + shotCount * SHOT_RECORD_SIZE + 1) return null;
  const shots: SnapShot[] = [];
  for (let i = 0; i < shotCount; i++) {
    shots.push({
      shooter: v.getUint8(o), weapon: v.getUint8(o + 1),
      x: v.getInt16(o + 2, true) / 100, y: v.getInt16(o + 4, true) / 100, z: v.getInt16(o + 6, true) / 100,
    });
    o += SHOT_RECORD_SIZE;
  }
  let own: OwnState | null = null;
  if (v.getUint8(o) === 1) {
    if (bytes.length < o + OWN_BLOCK_SIZE) return null;
    own = {
      ackSeq: v.getUint32(o + 1, true),
      x: v.getFloat32(o + 5, true), y: v.getFloat32(o + 9, true), z: v.getFloat32(o + 13, true),
      vx: v.getFloat32(o + 17, true), vy: v.getFloat32(o + 21, true), vz: v.getFloat32(o + 25, true),
      grounded: v.getUint8(o + 29) === 1,
      lock: v.getUint8(o + 30),
      weapon: v.getUint8(o + 31),
      hero: v.getUint8(o + 42),
      ammo: [v.getUint8(o + 32), v.getUint8(o + 33), v.getUint8(o + 34), v.getUint8(o + 35)],
      reloadMs: v.getUint16(o + 36, true),
      abilityMs: v.getUint16(o + 38, true),
      respawnMs: v.getUint16(o + 40, true),
    };
  }
  return { tick, phase, timeLeftDs, scores, players, shots, own };
}
