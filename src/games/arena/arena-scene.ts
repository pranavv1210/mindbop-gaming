import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { UniversalCamera } from "@babylonjs/core/Cameras/universalCamera";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { GlowLayer } from "@babylonjs/core/Layers/glowLayer";
import { BODY_HEIGHT, EYE_HEIGHT } from "@/arena/config";
import type { ArenaMap, Solid } from "@/arena/maps";

export type RemoteRender = {
  slot: number;
  name: string;
  team: 0 | 1;
  x: number; y: number; z: number;
  yaw: number; pitch: number;
  alive: boolean;
  cloaked: boolean;
  shield: boolean;
  protect: boolean;
};

export type SceneQuality = "auto" | "low" | "high" | "ultra";

export type ArenaScene = {
  loadMap: (map: ArenaMap) => void;
  setLocal: (x: number, y: number, z: number, yaw: number, pitch: number, fov: number) => void;
  setRemotes: (remotes: RemoteRender[]) => void;
  tracer: (from: [number, number, number], to: [number, number, number], team: 0 | 1, heavy: boolean) => void;
  muzzleFlash: () => void;
  kick: (amount: number) => void;
  setViewWeapon: (index: number) => void;
  setViewVisible: (visible: boolean) => void;
  setLocalTeam: (team: 0 | 1) => void;
  onFrame: (cb: (dtSeconds: number) => void) => void;
  fps: () => number;
  resize: () => void;
  dispose: () => void;
};

const TEAM_COLORS = ["#ff7a45", "#46b6ff"] as const;
const MAX_REMOTES = 16;
const TRACERS = 20;

export function createArenaScene(canvas: HTMLCanvasElement, quality: SceneQuality): ArenaScene {
  const engine = new Engine(canvas, true, { powerPreference: "high-performance", stencil: false, preserveDrawingBuffer: false });
  const mobile = typeof matchMedia === "function" && matchMedia("(max-width: 800px), (pointer: coarse)").matches;
  const low = quality === "low" || (quality === "auto" && mobile);
  const high = quality === "high" || quality === "ultra";
  engine.setHardwareScalingLevel(low ? 1.6 : mobile ? 1.3 : quality === "ultra" ? 0.85 : high ? 0.95 : 1);

  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.02, 0.03, 0.06, 1);
  scene.fogMode = Scene.FOGMODE_EXP2;
  scene.fogDensity = low ? 0.018 : 0.011;
  scene.autoClear = true;
  scene.skipPointerMovePicking = true;

  const camera = new UniversalCamera("arena-cam", new Vector3(0, EYE_HEIGHT, 0), scene);
  camera.minZ = 0.05;
  camera.maxZ = 220;
  camera.inputs.clear();

  const hemi = new HemisphericLight("hemi", new Vector3(0, 1, 0), scene);
  hemi.intensity = 0.85;
  const sun = new DirectionalLight("sun", new Vector3(-0.4, -1, 0.3), scene);
  sun.intensity = 0.9;

  let glow: GlowLayer | null = null;
  if (!low) {
    glow = new GlowLayer("glow", scene, { blurKernelSize: high ? 40 : 24 });
    glow.intensity = high ? 0.7 : 0.45;
  }

  const materials = new Map<string, StandardMaterial>();
  const material = (hex: string, emissive = 0, alpha = 1) => {
    const key = `${hex}|${emissive}|${alpha}`;
    let m = materials.get(key);
    if (!m) {
      m = new StandardMaterial(`m-${key}`, scene);
      const c = Color3.FromHexString(hex);
      m.diffuseColor = c;
      m.emissiveColor = c.scale(emissive);
      m.specularColor = new Color3(0.08, 0.08, 0.08);
      m.alpha = alpha;
      m.freeze();
      materials.set(key, m);
    }
    return m;
  };

  // ---------- map ----------
  let mapRoot: TransformNode | null = null;
  const shade = (hex: string, f: number) => {
    const c = Color3.FromHexString(hex);
    return new Color3(Math.min(1, c.r * f), Math.min(1, c.g * f), Math.min(1, c.b * f)).toHexString();
  };

  function loadMap(map: ArenaMap) {
    mapRoot?.dispose(false, false);
    mapRoot = new TransformNode("map", scene);
    scene.clearColor = Color4.FromHexString(`${map.theme.sky}ff`);
    scene.fogColor = Color3.FromHexString(map.theme.fog);

    const groups = new Map<string, Mesh[]>();
    const addSolid = (s: Solid) => {
      const w = s.maxX - s.minX, h = s.maxY - s.minY, d = s.maxZ - s.minZ;
      const box = MeshBuilder.CreateBox(s.id, { width: w, height: h, depth: d }, scene);
      box.position.set((s.minX + s.maxX) / 2, (s.minY + s.maxY) / 2, (s.minZ + s.maxZ) / 2);
      const base = s.kind === "wall" ? map.theme.wall : s.tone === 1 ? shade(map.theme.wall, 1.7) : s.tone === 2 ? shade(map.theme.accent2, 0.55) : shade(map.theme.wall, 1.25);
      const key = `${base}|${s.kind === "wall" ? 0 : 0.05}`;
      const list = groups.get(key) ?? [];
      list.push(box);
      groups.set(key, list);
    };
    for (const s of map.solids) addSolid(s);
    for (const [key, list] of groups) {
      const [hex, emissive] = key.split("|");
      const merged = Mesh.MergeMeshes(list, true, true, undefined, false, false);
      if (merged) {
        merged.material = material(hex, Number(emissive));
        merged.parent = mapRoot;
        merged.freezeWorldMatrix();
        merged.isPickable = false;
      }
    }
    // glowing accent strips along the tops of solids with tone 2 and along wall bases
    const strips: Mesh[] = [];
    for (const s of map.solids) {
      if (s.kind === "wall" || s.tone !== 2) continue;
      const strip = MeshBuilder.CreateBox(`${s.id}-strip`, { width: s.maxX - s.minX + 0.04, height: 0.06, depth: s.maxZ - s.minZ + 0.04 }, scene);
      strip.position.set((s.minX + s.maxX) / 2, s.maxY + 0.01, (s.minZ + s.maxZ) / 2);
      strips.push(strip);
    }
    if (strips.length) {
      const merged = Mesh.MergeMeshes(strips, true, true, undefined, false, false);
      if (merged) { merged.material = material(map.theme.accent, 0.95); merged.parent = mapRoot; merged.isPickable = false; }
    }
    // floor with a procedural grid
    const tex = new DynamicTexture("floor-grid", { width: 512, height: 512 }, scene, true);
    const ctx = tex.getContext() as CanvasRenderingContext2D;
    ctx.fillStyle = map.theme.floor;
    ctx.fillRect(0, 0, 512, 512);
    ctx.strokeStyle = shade(map.theme.accent, 0.35);
    ctx.lineWidth = 3;
    ctx.strokeRect(0, 0, 512, 512);
    ctx.strokeStyle = shade(map.theme.floor, 1.9);
    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(i * 128, 0); ctx.lineTo(i * 128, 512); ctx.moveTo(0, i * 128); ctx.lineTo(512, i * 128); ctx.stroke(); }
    tex.update();
    tex.wrapU = tex.wrapV = 1;
    tex.uScale = 30;
    tex.vScale = 20;
    const floorMat = new StandardMaterial("floor", scene);
    floorMat.diffuseTexture = tex;
    floorMat.specularColor = new Color3(0.05, 0.05, 0.05);
    const width = map.bounds.maxX - map.bounds.minX, depth = map.bounds.maxZ - map.bounds.minZ;
    const floor = MeshBuilder.CreateGround("floor", { width, height: depth }, scene);
    floor.material = floorMat;
    floor.parent = mapRoot;
    floor.isPickable = false;
    // team base pads
    for (const team of [0, 1] as const) {
      const pad = MeshBuilder.CreateGround(`pad-${team}`, { width: 6, height: depth - 4 }, scene);
      pad.position.set(team === 0 ? map.bounds.minX + 3.2 : map.bounds.maxX - 3.2, 0.012, 0);
      pad.material = material(TEAM_COLORS[team], 0.35, 0.28);
      pad.parent = mapRoot;
      pad.isPickable = false;
    }
    hemi.diffuse = Color3.FromHexString(shade(map.theme.accent2, 0.9));
    hemi.groundColor = Color3.FromHexString(map.theme.floor);
    sun.diffuse = Color3.FromHexString(shade(map.theme.accent, 0.5));
  }

  // ---------- remote players ----------
  type Avatar = { root: TransformNode; body: Mesh; head: Mesh; gun: Mesh; visor: Mesh; tag: Mesh; tagTexture: DynamicTexture; name: string; team: 0 | 1 };
  const avatars: Avatar[] = [];
  const ghostMat = material("#9fb4c9", 0.1, 0.22);
  const shieldMat = material("#7df2ff", 0.8, 0.38);
  const teamMat = (team: 0 | 1) => material(TEAM_COLORS[team], 0.18);
  const darkMat = material("#10151f", 0.05);
  for (let i = 0; i < MAX_REMOTES; i++) {
    const root = new TransformNode(`avatar-${i}`, scene);
    const body = MeshBuilder.CreateCapsule(`body-${i}`, { height: 1.4, radius: 0.34, tessellation: low ? 8 : 12, subdivisions: 1 }, scene);
    body.parent = root; body.position.y = 0.7;
    const head = MeshBuilder.CreateSphere(`head-${i}`, { diameter: 0.5, segments: low ? 6 : 10 }, scene);
    head.parent = root; head.position.y = 1.62;
    const visor = MeshBuilder.CreateBox(`visor-${i}`, { width: 0.34, height: 0.1, depth: 0.12 }, scene);
    visor.parent = root; visor.position.set(0, 1.64, 0.2);
    visor.material = material("#bff6ff", 1);
    const gun = MeshBuilder.CreateBox(`gun-${i}`, { width: 0.1, height: 0.14, depth: 0.7 }, scene);
    gun.parent = root; gun.position.set(0.3, 1.1, 0.4);
    gun.material = darkMat;
    const tag = MeshBuilder.CreatePlane(`tag-${i}`, { width: 1.6, height: 0.4 }, scene);
    tag.parent = root; tag.position.y = 2.25; tag.billboardMode = Mesh.BILLBOARDMODE_ALL;
    const tagTexture = new DynamicTexture(`tag-tex-${i}`, { width: 256, height: 64 }, scene, false);
    const tagMat = new StandardMaterial(`tag-mat-${i}`, scene);
    tagMat.diffuseTexture = tagTexture; tagMat.emissiveColor = new Color3(1, 1, 1); tagMat.opacityTexture = tagTexture; tagMat.disableLighting = true;
    tag.material = tagMat;
    tag.isPickable = false;
    root.setEnabled(false);
    avatars.push({ root, body, head, gun, visor, tag, tagTexture, name: "", team: 0 });
  }
  const drawTag = (a: Avatar, name: string, team: 0 | 1) => {
    a.name = name; a.team = team;
    const ctx = a.tagTexture.getContext() as CanvasRenderingContext2D;
    ctx.clearRect(0, 0, 256, 64);
    ctx.font = "700 30px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.lineWidth = 6; ctx.strokeStyle = "rgba(0,0,0,.75)";
    ctx.strokeText(name, 128, 42);
    ctx.fillStyle = TEAM_COLORS[team];
    ctx.fillText(name, 128, 42);
    a.tagTexture.update();
  };

  let localTeam: 0 | 1 = 0;
  function setRemotes(list: RemoteRender[]) {
    const used = new Set<number>();
    for (const r of list.slice(0, MAX_REMOTES)) {
      const a = avatars[r.slot];
      if (!a) continue;
      used.add(r.slot);
      a.root.setEnabled(r.alive);
      if (!r.alive) continue;
      a.root.position.set(r.x, r.y, r.z);
      a.root.rotation.y = r.yaw;
      a.gun.rotation.x = r.pitch * 0.8;
      if (a.name !== r.name || a.team !== r.team) drawTag(a, r.name, r.team);
      const mat = r.cloaked ? ghostMat : r.shield ? shieldMat : teamMat(r.team);
      a.body.material = mat; a.head.material = r.cloaked ? ghostMat : material("#d8dde6", 0.1);
      a.visor.isVisible = !r.cloaked;
      a.tag.isVisible = !r.cloaked && r.team === localTeam;
      a.body.visibility = r.protect ? 0.55 : 1;
    }
    for (let i = 0; i < avatars.length; i++) if (!used.has(i)) avatars[i].root.setEnabled(false);
  }

  // ---------- tracers, flashes, viewmodel ----------
  const tracers: { mesh: Mesh; life: number }[] = [];
  for (let i = 0; i < TRACERS; i++) {
    const mesh = MeshBuilder.CreateBox(`tracer-${i}`, { width: 0.025, height: 0.025, depth: 1 }, scene);
    mesh.isPickable = false; mesh.setEnabled(false);
    tracers.push({ mesh, life: 0 });
  }
  let tracerIndex = 0;
  const tracer: ArenaScene["tracer"] = (from, to, team, heavy) => {
    const t = tracers[tracerIndex++ % TRACERS];
    const dx = to[0] - from[0], dy = to[1] - from[1], dz = to[2] - from[2];
    const len = Math.hypot(dx, dy, dz) || 0.01;
    t.mesh.position.set(from[0] + dx / 2, from[1] + dy / 2, from[2] + dz / 2);
    t.mesh.scaling.set(heavy ? 2.2 : 1, heavy ? 2.2 : 1, len);
    t.mesh.lookAt(new Vector3(to[0], to[1], to[2]));
    t.mesh.material = material(TEAM_COLORS[team], 1);
    t.mesh.setEnabled(true);
    t.life = 0.09;
  };

  const view = new TransformNode("viewmodel", scene);
  view.parent = camera;
  view.position.set(0.28, -0.26, 0.55);
  const weaponMeshes: Mesh[] = [];
  const addView = (w: number, h: number, d: number, z: number, hex: string) => {
    const m = MeshBuilder.CreateBox("vm", { width: w, height: h, depth: d }, scene);
    m.parent = view; m.position.set(0, 0, z); m.material = material(hex, 0.08); m.isPickable = false; m.renderingGroupId = 1;
    return m;
  };
  const vmSets: Mesh[][] = [
    [addView(0.1, 0.14, 0.62, 0.1, "#2c3447"), addView(0.04, 0.04, 0.2, 0.52, "#8ea3c4")],
    [addView(0.14, 0.15, 0.5, 0.05, "#3a2f2f"), addView(0.1, 0.1, 0.3, 0.42, "#c4895b")],
    [addView(0.07, 0.11, 0.85, 0.2, "#24324a"), addView(0.05, 0.05, 0.3, 0.8, "#7df2ff")],
    [addView(0.09, 0.13, 0.4, 0.05, "#312844"), addView(0.05, 0.05, 0.16, 0.34, "#b79cff")],
  ];
  for (const set of vmSets) weaponMeshes.push(...set);
  const flash = MeshBuilder.CreateSphere("flash", { diameter: 0.16, segments: 6 }, scene);
  flash.parent = view; flash.position.set(0, 0.02, 0.85); flash.material = material("#ffe9a8", 1, 0.9); flash.renderingGroupId = 1; flash.setEnabled(false);
  let flashLife = 0, kickValue = 0;
  const setViewWeapon = (index: number) => vmSets.forEach((set, i) => set.forEach((m) => m.setEnabled(i === index)));
  setViewWeapon(0);
  const setViewVisible = (visible: boolean) => { view.setEnabled(visible); };

  // ---------- frame loop ----------
  const frameCallbacks: Array<(dt: number) => void> = [];
  engine.runRenderLoop(() => {
    const dt = Math.min(0.1, engine.getDeltaTime() / 1000);
    for (const cb of frameCallbacks) cb(dt);
    for (const t of tracers) if (t.life > 0) { t.life -= dt; if (t.life <= 0) t.mesh.setEnabled(false); }
    if (flashLife > 0) { flashLife -= dt; if (flashLife <= 0) flash.setEnabled(false); }
    kickValue = Math.max(0, kickValue - dt * 6);
    view.position.z = 0.55 - kickValue * 0.12;
    view.rotation.x = -kickValue * 0.22;
    scene.render();
  });

  return {
    loadMap,
    setLocal(x, y, z, yaw, pitch, fov) {
      camera.position.set(x, y + EYE_HEIGHT, z);
      camera.rotation.set(pitch, yaw, 0);
      camera.fov = fov;
    },
    setRemotes,
    tracer,
    muzzleFlash() { flash.setEnabled(true); flashLife = 0.05; },
    kick(amount) { kickValue = Math.min(1.4, kickValue + amount); },
    setViewWeapon,
    setViewVisible,
    setLocalTeam(team) { localTeam = team; },
    onFrame(cb) { frameCallbacks.push(cb); },
    fps: () => engine.getFps(),
    resize: () => engine.resize(),
    dispose() { engine.stopRenderLoop(); scene.dispose(); engine.dispose(); },
  };
}

export const AVATAR_HEIGHT = BODY_HEIGHT;
