import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { UniversalCamera } from "@babylonjs/core/Cameras/universalCamera";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { GlowLayer } from "@babylonjs/core/Layers/glowLayer";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import type { ArenaMapId, ArenaView, ArenaWeapon } from "./types";

export type ArenaScene = {
  update: (view: ArenaView) => void;
  look: (dx: number, dy: number) => void;
  fire: () => void;
  setWeapon: (weapon: ArenaWeapon) => void;
  setHero: (hero: string) => void;
  getAim: () => { yaw: number; pitch: number };
  setInput: (x: number, z: number, sprint: boolean) => void;
  setAimMode: (active: boolean) => void;
  dispose: () => void;
};

const MAP_THEME: Record<ArenaMapId, { accent: string; secondary: string }> = {
  "neon-yard": { accent: "#42e8ff", secondary: "#7f6cff" },
  skyline: { accent: "#74ffbd", secondary: "#42a5ff" },
  reactor: { accent: "#ff9a57", secondary: "#ff5e87" },
};

export function createArenaScene(canvas: HTMLCanvasElement, localId: string): ArenaScene {
  const engine = new Engine(canvas, true, { powerPreference: "high-performance", stencil: false, preserveDrawingBuffer: false });
  const quality = localStorage.getItem("mindbop-arena-quality") ?? "auto";
  const mobile = matchMedia("(max-width: 700px)").matches;
  const lowPower = quality === "low" || (quality === "auto" && mobile);
  const highQuality = quality === "high" || quality === "ultra";
  engine.setHardwareScalingLevel(quality === "low" ? 1.65 : mobile ? 1.4 : highQuality ? 0.92 : innerWidth * innerHeight > 2_000_000 ? 1.08 : 1);
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.012, 0.018, 0.055, 1);
  scene.fogMode = Scene.FOGMODE_EXP2;
  scene.fogDensity = lowPower ? 0.012 : 0.008;
  scene.fogColor = new Color3(0.018, 0.028, 0.08);
  const camera = new UniversalCamera("arena-camera", new Vector3(0, 2.6, -8), scene);
  camera.fov = Math.PI / 2.25; camera.minZ = 0.08;
  const ambient = new HemisphericLight("ambient", new Vector3(0, 1, 0), scene);
  ambient.intensity = 0.68; ambient.diffuse = new Color3(0.44, 0.52, 1);
  const sun = new DirectionalLight("key", new Vector3(-0.45, -1, 0.35), scene);
  sun.intensity = 1.1; sun.diffuse = new Color3(0.82, 0.9, 1);
  const glow = new GlowLayer("arena-glow", scene); glow.intensity = lowPower ? 0.38 : highQuality ? 0.8 : 0.58;

  const materials = new Map<string, StandardMaterial>();
  const mat = (hex: string, emissive = 0.08) => {
    const key = `${hex}:${emissive}`; let m = materials.get(key);
    if (!m) { m = new StandardMaterial(key, scene); m.diffuseColor = Color3.FromHexString(hex); m.emissiveColor = m.diffuseColor.scale(emissive); m.specularColor = new Color3(0.36, 0.43, 0.62); m.freeze(); materials.set(key, m); }
    return m;
  };
  const box = (name: string, p: Vector3, size: Vector3, color: string, emissive = 0.05) => {
    const mesh = MeshBuilder.CreateBox(name, { width: size.x, height: size.y, depth: size.z }, scene); mesh.position.copyFrom(p); mesh.material = mat(color, emissive); return mesh;
  };
  const platform = (x: number, z: number, w: number, d: number, h: number, color: string) => {
    box("platform", new Vector3(x, h / 2, z), new Vector3(w, h, d), color);
    box("platform-edge", new Vector3(x, h + 0.04, z), new Vector3(w * 0.94, 0.08, d * 0.94), color, 0.12);
  };

  box("floor", new Vector3(0, -0.3, 0), new Vector3(42, 0.6, 42), "#0c1430");
  box("floor-inlay", new Vector3(0, 0.02, 0), new Vector3(38, 0.08, 38), "#121e40", 0.11);
  for (let i = -18; i <= 18; i += 6) { box("lane-line-x", new Vector3(i, 0.075, 0), new Vector3(0.035, 0.025, 36), "#23335f", 0.15); box("lane-line-z", new Vector3(0, 0.078, i), new Vector3(36, 0.025, 0.035), "#23335f", 0.15); }
  box("north-wall", new Vector3(0, 2.5, 19.4), new Vector3(40, 5, 1), "#18264d"); box("south-wall", new Vector3(0, 2.5, -19.4), new Vector3(40, 5, 1), "#18264d"); box("east-wall", new Vector3(19.4, 2.5, 0), new Vector3(1, 5, 40), "#18264d"); box("west-wall", new Vector3(-19.4, 2.5, 0), new Vector3(1, 5, 40), "#18264d");

  const coverLayout = [[-9, 0, 3.8, 1.2, 2.8], [9, 0, 3.8, 1.2, 2.8], [0, -8, 8, 1.2, 2.3], [0, 8, 8, 1.2, 2.3], [-5, -5, 2.8, 2.8, 2.2], [5, 5, 2.8, 2.8, 2.2], [-13, 7, 2.2, 4.6, 2.8], [13, -7, 2.2, 4.6, 2.8]] as const;
  for (const [x, z, w, d, h] of coverLayout) box("cover", new Vector3(x, h / 2, z), new Vector3(w, h, d), "#1c2e58");
  const mapVariants: Record<Exclude<ArenaMapId, "neon-yard">, Mesh[]> = { skyline: [], reactor: [] };
  const addVariant = (id: Exclude<ArenaMapId, "neon-yard">, x: number, z: number, w: number, d: number, h: number, color = "#1c315b") => {
    const m = box(`${id}-cover`, new Vector3(x, h / 2, z), new Vector3(w, h, d), color);
    mapVariants[id].push(m);
  };
  addVariant("skyline", -11, -8, 2.5, 7, 3.4); addVariant("skyline", 11, 8, 2.5, 7, 3.4); addVariant("skyline", 0, 0, 3.2, 3.2, 3.8); addVariant("skyline", -3, 13, 7, 1.8, 2.1);
  addVariant("reactor", -7, -10, 7, 2.2, 3.2); addVariant("reactor", 7, 10, 7, 2.2, 3.2); addVariant("reactor", 0, 0, 2.4, 7, 2.8); addVariant("reactor", 0, 13, 9, 1.5, 2.0);
  if (!lowPower) { platform(-12, -11, 6, 4, 0.9, "#1b2b50"); platform(12, 11, 6, 4, 0.9, "#1b2b50"); platform(-12, 11, 4, 6, 0.65, "#1b2b50"); platform(12, -11, 4, 6, 0.65, "#1b2b50"); }

  const beaconSpots = [[-16, -16], [16, -16], [-16, 16], [16, 16]] as const;
  const beaconMaterials = new Map<ArenaMapId, { pillar: StandardMaterial; cap: StandardMaterial }>();
  for (const id of Object.keys(MAP_THEME) as ArenaMapId[]) beaconMaterials.set(id, { pillar: mat(MAP_THEME[id].accent, 0.72), cap: mat(MAP_THEME[id].secondary, 0.75) });
  const beacons: { pillar: Mesh; cap: Mesh }[] = [];
  for (const [x, z] of beaconSpots) { const pillar = box("beacon", new Vector3(x, 2.8, z), new Vector3(0.72, 5.6, 0.72), themeColor("neon-yard", true), 0.72); pillar.rotation.y = Math.PI / 4; const cap = box("beacon-cap", new Vector3(x, 5.72, z), new Vector3(1.5, 0.12, 1.5), themeColor("neon-yard", false), 0.75); cap.rotation.y = Math.PI / 4; beacons.push({ pillar, cap }); }
  function themeColor(id: ArenaMapId, primary: boolean) { return primary ? MAP_THEME[id].accent : MAP_THEME[id].secondary; }

  const zone = MeshBuilder.CreateTorus("capture-zone", { diameter: 9.5, thickness: 0.16, tessellation: lowPower ? 32 : 64 }, scene); zone.rotation.x = Math.PI / 2; zone.position.y = 0.09;
  const zoneCore = MeshBuilder.CreateCylinder("capture-core", { diameter: 7.6, height: 0.05, tessellation: lowPower ? 32 : 64 }, scene); zoneCore.position.y = 0.04; zoneCore.visibility = 0.28;
  const zonePillar = MeshBuilder.CreateCylinder("zone-beam", { diameter: 0.22, height: 6, tessellation: 12 }, scene); zonePillar.position.y = 3; zonePillar.visibility = 0.2;
  zone.material = mat(MAP_THEME["neon-yard"].accent, 1); zoneCore.material = mat(MAP_THEME["neon-yard"].accent, 0.13); zonePillar.material = mat(MAP_THEME["neon-yard"].accent, 0.45);

  const weapon = box("weapon-body", new Vector3(0.46, -0.38, 1.05), new Vector3(0.24, 0.2, 0.95), "#7f6cff", 0.25); weapon.parent = camera;
  const weaponCore = box("weapon-core", new Vector3(0.46, -0.38, 0.72), new Vector3(0.1, 0.08, 0.45), "#42e8ff", 0.9); weaponCore.parent = camera;
  const weaponSight = box("weapon-sight", new Vector3(0.46, -0.23, 0.68), new Vector3(0.055, 0.055, 0.28), "#eef4ff", 0.8); weaponSight.parent = camera;

  const remotes = new Map<string, Mesh>(); let yaw = 0; let pitch = 0; let flash = 0; let recoil = 0; let inputX = 0; let inputZ = 0; let sprint = false; let aiming = false; let lastFrame = performance.now();
  const authoritative = new Vector3(0, 2.55, -8); const predicted = authoritative.clone();
  function buildRemote(id: string) { const body = MeshBuilder.CreateCapsule(`runner-${id}`, { height: 1.9, radius: 0.45, tessellation: lowPower ? 6 : 10 }, scene); remotes.set(id, body); return body; }

  function update(view: ArenaView) {
    const local = view.players[localId];
    if (local) { authoritative.set(local.x, local.y + 1.55, local.z); const correction = Vector3.Distance(predicted, authoritative); if (correction > 4) predicted.copyFrom(authoritative); else Vector3.LerpToRef(predicted, authoritative, Math.min(1, correction > 0.8 ? 0.28 : 0.12), predicted); if (Math.abs(local.rotation - yaw) > 0.75) yaw = local.rotation; pitch = local.pitch; }
    for (const [id, mesh] of remotes) { const p = view.players[id]; if (!view.playerIds.includes(id) || !p || p.hp <= 0) { mesh.dispose(); remotes.delete(id); } }
    for (const id of view.playerIds) { if (id === localId) continue; const p = view.players[id]; if (!p || p.hp <= 0) continue; const mesh = remotes.get(id) ?? buildRemote(id); const cloaked = p.cloakedUntil > Date.now(); mesh.material = mat(cloaked ? "#7f6cff" : p.team === "ember" ? "#ff5e87" : "#42e8ff", cloaked ? 0.08 : 0.3); mesh.visibility = cloaked ? 0.12 : 1; Vector3.LerpToRef(mesh.position, new Vector3(p.x, p.y + 0.9, p.z), 0.22, mesh.position); mesh.rotation.y = p.rotation; mesh.scaling.y = p.shieldUntil > Date.now() ? 1.12 : 1; }
    const activeTheme = MAP_THEME[view.mapId];
    for (const [id, meshes] of Object.entries(mapVariants)) for (const mesh of meshes) mesh.setEnabled(id === view.mapId);
    const beacon = beaconMaterials.get(view.mapId) ?? beaconMaterials.get("neon-yard")!;
    for (const pair of beacons) { pair.pillar.material = beacon.pillar; pair.cap.material = beacon.cap; }
    const zoneColor = view.zone.owner === "ember" ? "#ff5e87" : view.zone.owner === "azure" ? "#42e8ff" : activeTheme.secondary;
    zone.material = mat(zoneColor, 1); zoneCore.material = mat(zoneColor, 0.12); zonePillar.material = mat(zoneColor, 0.45);
    zone.position.x += (view.zone.x - zone.position.x) * 0.14; zone.position.z += (view.zone.z - zone.position.z) * 0.14; zoneCore.position.x = zone.position.x; zoneCore.position.z = zone.position.z; zonePillar.position.x = zone.position.x; zonePillar.position.z = zone.position.z;
  }

  engine.runRenderLoop(() => { const now = performance.now(); const dt = Math.min(0.05, Math.max(0, (now - lastFrame) / 1000)); lastFrame = now; const length = Math.hypot(inputX, inputZ); if (length > 0) { const speed = sprint ? 11.5 : 9.5; predicted.x += (inputX / length) * speed * dt; predicted.z += (inputZ / length) * speed * dt; predicted.x = Math.max(-18, Math.min(18, predicted.x)); predicted.z = Math.max(-18, Math.min(18, predicted.z)); } camera.position.copyFrom(predicted); camera.rotation.set(pitch, yaw, 0); const targetFov = aiming ? Math.PI / 2.75 : Math.PI / 2.25; camera.fov += (targetFov - camera.fov) * Math.min(1, dt * 14); zone.rotation.z += 0.006; zoneCore.rotation.y -= 0.003; zonePillar.scaling.y = 0.88 + Math.sin(now * 0.002) * 0.08; flash = Math.max(0, flash - dt * 8); recoil = Math.max(0, recoil - dt * 10); weapon.scaling.z = 1 + flash * 0.18; weapon.position.z = 1.05 - recoil * 0.055; weapon.position.y = -0.38 + recoil * 0.025; weaponCore.scaling.z = 1 + flash * 0.3; scene.render(); });

  const resize = () => engine.resize(); window.addEventListener("resize", resize);
  return { update, look(dx, dy) { yaw += dx * 0.0022; pitch = Math.max(-1.3, Math.min(1.3, pitch + dy * 0.0022)); }, fire() { flash = 1; recoil = 1; }, setWeapon(next) { const color = next === "scatter" ? "#ff9a57" : next === "rail" ? "#74ffbd" : "#7f6cff"; weapon.material = mat(color, 0.3); weaponCore.material = mat(color, 0.9); weaponSight.material = mat(next === "rail" ? "#74ffbd" : "#eef4ff", 0.8); }, setHero(_hero) {}, getAim() { return { yaw, pitch }; }, setInput(x, z, nextSprint) { inputX = x; inputZ = z; sprint = nextSprint; }, setAimMode(active) { aiming = active; }, dispose() { window.removeEventListener("resize", resize); for (const mesh of remotes.values()) mesh.dispose(); remotes.clear(); scene.dispose(); engine.dispose(); materials.clear(); } };
}
