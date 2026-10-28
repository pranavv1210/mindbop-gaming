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
import type { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { ArenaMapId, ArenaView, ArenaWeapon } from "./types";

export type ArenaScene = {
  update: (view: ArenaView) => void;
  look: (dx: number, dy: number) => void;
  fire: () => void;
  setWeapon: (weapon: ArenaWeapon) => void;
  setHero: (hero: string) => void;
  setSensitivity: (value: number) => void;
  setFov: (value: number) => void;
  getAim: () => { yaw: number; pitch: number };
  setInput: (x: number, z: number, sprint: boolean) => void;
  setAimMode: (active: boolean) => void;
  dispose: () => void;
};

const MAP_THEME: Record<ArenaMapId, { accent: string; secondary: string; floor: string }> = {
  "neon-yard": { accent: "#42e8ff", secondary: "#7f6cff", floor: "#101a36" },
  skyline: { accent: "#74ffbd", secondary: "#42a5ff", floor: "#101d34" },
  reactor: { accent: "#ff9a57", secondary: "#ff5e87", floor: "#241526" },
};

export function createArenaScene(canvas: HTMLCanvasElement, localId: string): ArenaScene {
  const engine = new Engine(canvas, true, { powerPreference: "high-performance", stencil: false, preserveDrawingBuffer: false });
  const quality = localStorage.getItem("mindbop-arena-quality") ?? "auto";
  const mobile = matchMedia("(max-width: 700px)").matches;
  const lowPower = quality === "low" || (quality === "auto" && mobile);
  const highQuality = quality === "high" || quality === "ultra";
  engine.setHardwareScalingLevel(quality === "low" ? 1.55 : mobile ? 1.32 : highQuality ? 0.9 : innerWidth * innerHeight > 2_000_000 ? 1.04 : 1);
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.008, 0.012, 0.035, 1);
  scene.fogMode = Scene.FOGMODE_EXP2;
  scene.fogDensity = lowPower ? 0.013 : 0.007;
  scene.fogColor = new Color3(0.015, 0.025, 0.07);

  const camera = new UniversalCamera("arena-camera", new Vector3(0, 2.6, -8), scene);
  camera.minZ = 0.06;
  let baseFov = Math.PI / 2.22;
  camera.fov = baseFov;
  let sensitivity = Number(localStorage.getItem("mindbop-arena-sensitivity") ?? "1");

  const ambient = new HemisphericLight("ambient", new Vector3(0, 1, 0), scene);
  ambient.intensity = 0.72;
  ambient.diffuse = new Color3(0.48, 0.55, 1);
  ambient.groundColor = new Color3(0.025, 0.035, 0.09);
  const sun = new DirectionalLight("key", new Vector3(-0.45, -1, 0.35), scene);
  sun.intensity = 1.15;
  sun.diffuse = new Color3(0.84, 0.91, 1);
  const glow = new GlowLayer("arena-glow", scene);
  glow.intensity = lowPower ? 0.32 : highQuality ? 0.92 : 0.62;
  glow.blurKernelSize = highQuality ? 48 : 32;

  const materials = new Map<string, StandardMaterial>();
  const mat = (hex: string, emissive = 0.08, metallic = 0.45) => {
    const key = `${hex}:${emissive}:${metallic}`;
    let m = materials.get(key);
    if (!m) {
      m = new StandardMaterial(key, scene);
      m.diffuseColor = Color3.FromHexString(hex);
      m.emissiveColor = m.diffuseColor.scale(emissive);
      m.specularColor = new Color3(metallic, metallic, metallic);
      m.specularPower = 64;
      m.freeze();
      materials.set(key, m);
    }
    return m;
  };
  const box = (name: string, p: Vector3, size: Vector3, color: string, emissive = 0.05) => {
    const mesh = MeshBuilder.CreateBox(name, { width: size.x, height: size.y, depth: size.z }, scene);
    mesh.position.copyFrom(p);
    mesh.material = mat(color, emissive);
    return mesh;
  };
  const cylinder = (name: string, p: Vector3, diameter: number, height: number, color: string, emissive = 0.05, tessellation = 16) => {
    const mesh = MeshBuilder.CreateCylinder(name, { diameter, height, tessellation }, scene);
    mesh.position.copyFrom(p);
    mesh.material = mat(color, emissive);
    return mesh;
  };

  const floor = box("arena-floor", new Vector3(0, -0.3, 0), new Vector3(42, 0.6, 42), MAP_THEME["neon-yard"].floor, 0.02);
  floor.material = mat(MAP_THEME["neon-yard"].floor, 0.02, 0.7);
  box("floor-inlay", new Vector3(0, 0.025, 0), new Vector3(38, 0.08, 38), "#162344", 0.08);
  for (let i = -18; i <= 18; i += 6) {
    box("lane-x", new Vector3(i, 0.075, 0), new Vector3(0.035, 0.025, 36), "#30457b", 0.2);
    box("lane-z", new Vector3(0, 0.078, i), new Vector3(36, 0.025, 0.035), "#30457b", 0.2);
  }
  box("north-wall", new Vector3(0, 2.5, 19.4), new Vector3(40, 5, 1), "#1a2b52");
  box("south-wall", new Vector3(0, 2.5, -19.4), new Vector3(40, 5, 1), "#1a2b52");
  box("east-wall", new Vector3(19.4, 2.5, 0), new Vector3(1, 5, 40), "#1a2b52");
  box("west-wall", new Vector3(-19.4, 2.5, 0), new Vector3(1, 5, 40), "#1a2b52");

  const coverLayout = [[-9, 0, 3.8, 1.2, 2.8], [9, 0, 3.8, 1.2, 2.8], [0, -8, 8, 1.2, 2.3], [0, 8, 8, 1.2, 2.3], [-5, -5, 2.8, 2.8, 2.2], [5, 5, 2.8, 2.8, 2.2], [-13, 7, 2.2, 4.6, 2.8], [13, -7, 2.2, 4.6, 2.8]] as const;
  for (const [x, z, w, d, h] of coverLayout) {
    box("cover", new Vector3(x, h / 2, z), new Vector3(w, h, d), "#213761", 0.03);
    if (!lowPower) box("cover-strip", new Vector3(x, h - 0.05, z), new Vector3(w * 0.88, 0.08, d * 0.88), "#395994", 0.12);
  }
  const mapVariants: Record<Exclude<ArenaMapId, "neon-yard">, Mesh[]> = { skyline: [], reactor: [] };
  const addVariant = (id: Exclude<ArenaMapId, "neon-yard">, x: number, z: number, w: number, d: number, h: number, color = "#22395f") => {
    const m = box(`${id}-cover`, new Vector3(x, h / 2, z), new Vector3(w, h, d), color, 0.03);
    mapVariants[id].push(m);
    if (!lowPower) mapVariants[id].push(box(`${id}-edge`, new Vector3(x, h - 0.05, z), new Vector3(w * 0.9, 0.08, d * 0.9), "#4b6ea6", 0.1));
  };
  addVariant("skyline", -11, -8, 2.5, 7, 3.4); addVariant("skyline", 11, 8, 2.5, 7, 3.4); addVariant("skyline", 0, 0, 3.2, 3.2, 3.8); addVariant("skyline", -3, 13, 7, 1.8, 2.1);
  addVariant("reactor", -7, -10, 7, 2.2, 3.2); addVariant("reactor", 7, 10, 7, 2.2, 3.2); addVariant("reactor", 0, 0, 2.4, 7, 2.8); addVariant("reactor", 0, 13, 9, 1.5, 2.0);
  if (!lowPower) {
    box("platform-a", new Vector3(-12, 0.45, -11), new Vector3(6, 0.9, 4), "#1c3159");
    box("platform-b", new Vector3(12, 0.45, 11), new Vector3(6, 0.9, 4), "#1c3159");
    box("platform-c", new Vector3(-12, 0.33, 11), new Vector3(4, 0.65, 6), "#1c3159");
    box("platform-d", new Vector3(12, 0.33, -11), new Vector3(4, 0.65, 6), "#1c3159");
  }

  const beaconSpots = [[-16, -16], [16, -16], [-16, 16], [16, 16]] as const;
  const beacons: { pillar: Mesh; cap: Mesh }[] = [];
  for (const [x, z] of beaconSpots) {
    const pillar = box("beacon", new Vector3(x, 2.8, z), new Vector3(0.72, 5.6, 0.72), MAP_THEME["neon-yard"].accent, 0.72);
    const cap = box("beacon-cap", new Vector3(x, 5.72, z), new Vector3(1.5, 0.12, 1.5), MAP_THEME["neon-yard"].secondary, 0.82);
    pillar.rotation.y = Math.PI / 4;
    cap.rotation.y = Math.PI / 4;
    beacons.push({ pillar, cap });
  }

  const zone = MeshBuilder.CreateTorus("capture-zone", { diameter: 9.5, thickness: 0.16, tessellation: lowPower ? 32 : 64 }, scene);
  zone.rotation.x = Math.PI / 2; zone.position.y = 0.09;
  const zoneCore = MeshBuilder.CreateCylinder("capture-core", { diameter: 7.6, height: 0.05, tessellation: lowPower ? 32 : 64 }, scene);
  zoneCore.position.y = 0.04; zoneCore.visibility = 0.28;
  const zonePillar = MeshBuilder.CreateCylinder("zone-beam", { diameter: 0.22, height: 6, tessellation: 12 }, scene);
  zonePillar.position.y = 3; zonePillar.visibility = 0.2;

  const weaponRoot = new TransformNode("weapon-root", scene); weaponRoot.parent = camera;
  const weaponBody = box("weapon-body", new Vector3(0.46, -0.38, 1.05), new Vector3(0.28, 0.22, 0.88), "#7f6cff", 0.28); weaponBody.parent = weaponRoot;
  const weaponUpper = box("weapon-upper", new Vector3(0.46, -0.27, 0.79), new Vector3(0.18, 0.12, 0.62), "#28385d", 0.08); weaponUpper.parent = weaponRoot;
  const weaponBarrel = cylinder("weapon-barrel", new Vector3(0.46, -0.38, 0.55), 0.09, 0.5, "#42e8ff", 0.65, 12); weaponBarrel.rotation.x = Math.PI / 2; weaponBarrel.parent = weaponRoot;
  const weaponCore = box("weapon-core", new Vector3(0.46, -0.38, 0.75), new Vector3(0.1, 0.07, 0.4), "#42e8ff", 0.95); weaponCore.parent = weaponRoot;
  const weaponSight = box("weapon-sight", new Vector3(0.46, -0.21, 0.68), new Vector3(0.055, 0.055, 0.26), "#eef4ff", 0.9); weaponSight.parent = weaponRoot;
  const hand = cylinder("weapon-hand", new Vector3(0.46, -0.55, 0.92), 0.18, 0.35, "#a56e56", 0.02, 12); hand.rotation.x = Math.PI / 2; hand.parent = weaponRoot;

  type Avatar = { root: Mesh; parts: Mesh[]; material: StandardMaterial };
  const remotes = new Map<string, Avatar>();
  let yaw = 0, pitch = 0, flash = 0, recoil = 0, inputX = 0, inputZ = 0, sprint = false, aiming = false;
  let lastFrame = performance.now();
  const authoritative = new Vector3(0, 2.55, -8); const predicted = authoritative.clone();

  const buildAvatar = (id: string, team: string): Avatar => {
    const root = MeshBuilder.CreateBox(`avatar-root-${id}`, { width: 0.01, height: 0.01, depth: 0.01 }, scene);
    root.isVisible = false;
    const color = team === "ember" ? "#ff5e87" : "#42e8ff";
    const material = mat(color, 0.24, 0.55);
    const parts: Mesh[] = [];
    const body = MeshBuilder.CreateCapsule(`avatar-body-${id}`, { height: 1.55, radius: 0.38, tessellation: lowPower ? 6 : 12 }, scene); body.parent = root; body.position.y = 0.9; body.material = material; parts.push(body);
    const head = MeshBuilder.CreateSphere(`avatar-head-${id}`, { diameter: 0.58, segments: lowPower ? 8 : 14 }, scene); head.parent = root; head.position.y = 1.9; head.material = mat("#dbe7ff", 0.08, 0.65); parts.push(head);
    const visor = box(`avatar-visor-${id}`, new Vector3(0, 1.93, 0.26), new Vector3(0.42, 0.11, 0.05), color, 0.8); visor.parent = root; parts.push(visor);
    const shoulderL = box(`avatar-shoulder-l-${id}`, new Vector3(-0.48, 1.18, 0), new Vector3(0.22, 0.3, 0.42), color, 0.18); shoulderL.parent = root; parts.push(shoulderL);
    const shoulderR = box(`avatar-shoulder-r-${id}`, new Vector3(0.48, 1.18, 0), new Vector3(0.22, 0.3, 0.42), color, 0.18); shoulderR.parent = root; parts.push(shoulderR);
    const backpack = box(`avatar-pack-${id}`, new Vector3(0, 1.02, -0.36), new Vector3(0.45, 0.55, 0.16), "#1a2747", 0.08); backpack.parent = root; parts.push(backpack);
    const weapon = box(`avatar-weapon-${id}`, new Vector3(0.38, 1.1, 0.38), new Vector3(0.08, 0.08, 0.55), color, 0.65); weapon.parent = root; weapon.rotation.x = 0.12; parts.push(weapon);
    remotes.set(id, { root, parts, material });
    return { root, parts, material };
  };

  function update(view: ArenaView) {
    const local = view.players[localId];
    if (local) {
      authoritative.set(local.x, local.y + 1.55, local.z);
      const correction = Vector3.Distance(predicted, authoritative);
      if (correction > 4) predicted.copyFrom(authoritative);
      else Vector3.LerpToRef(predicted, authoritative, Math.min(1, correction > 0.8 ? 0.28 : 0.12), predicted);
      if (Math.abs(local.rotation - yaw) > 0.75) yaw = local.rotation;
      pitch = local.pitch;
    }
    for (const [id, avatar] of remotes) {
      const p = view.players[id];
      if (!view.playerIds.includes(id) || !p || p.hp <= 0) { avatar.parts.forEach((part) => part.dispose()); avatar.root.dispose(); remotes.delete(id); }
    }
    for (const id of view.playerIds) {
      if (id === localId) continue;
      const p = view.players[id]; if (!p || p.hp <= 0) continue;
      const avatar = remotes.get(id) ?? buildAvatar(id, p.team);
      const cloaked = p.cloakedUntil > Date.now();
      const color = p.team === "ember" ? "#ff5e87" : "#42e8ff";
      avatar.parts.forEach((part) => { part.visibility = cloaked ? 0.12 : 1; });
      avatar.material.diffuseColor = Color3.FromHexString(cloaked ? "#7f6cff" : color);
      avatar.material.emissiveColor = avatar.material.diffuseColor.scale(cloaked ? 0.1 : 0.24);
      Vector3.LerpToRef(avatar.root.position, new Vector3(p.x, p.y, p.z), 0.22, avatar.root.position);
      avatar.root.rotation.y = p.rotation;
      avatar.root.scaling.y = p.shieldUntil > Date.now() ? 1.08 : 1;
    }
    const activeTheme = MAP_THEME[view.mapId];
    for (const [id, meshes] of Object.entries(mapVariants)) for (const mesh of meshes) mesh.setEnabled(id === view.mapId);
    for (const pair of beacons) { pair.pillar.material = mat(activeTheme.accent, 0.72); pair.cap.material = mat(activeTheme.secondary, 0.82); }
    const zoneColor = view.zone.owner === "ember" ? "#ff5e87" : view.zone.owner === "azure" ? "#42e8ff" : activeTheme.secondary;
    zone.material = mat(zoneColor, 1); zoneCore.material = mat(zoneColor, 0.14); zonePillar.material = mat(zoneColor, 0.48);
    zone.position.x += (view.zone.x - zone.position.x) * 0.14; zone.position.z += (view.zone.z - zone.position.z) * 0.14;
    zoneCore.position.x = zone.position.x; zoneCore.position.z = zone.position.z; zonePillar.position.x = zone.position.x; zonePillar.position.z = zone.position.z;
  }

  engine.runRenderLoop(() => {
    const now = performance.now(); const dt = Math.min(0.05, Math.max(0, (now - lastFrame) / 1000)); lastFrame = now;
    const length = Math.hypot(inputX, inputZ);
    if (length > 0) { const speed = sprint ? 11.5 : 9.5; predicted.x += (inputX / length) * speed * dt; predicted.z += (inputZ / length) * speed * dt; predicted.x = Math.max(-18, Math.min(18, predicted.x)); predicted.z = Math.max(-18, Math.min(18, predicted.z)); }
    camera.position.copyFrom(predicted); camera.rotation.set(pitch, yaw, 0);
    const targetFov = aiming ? baseFov * 0.82 : baseFov; camera.fov += (targetFov - camera.fov) * Math.min(1, dt * 14);
    zone.rotation.z += 0.006; zoneCore.rotation.y -= 0.003; zonePillar.scaling.y = 0.88 + Math.sin(now * 0.002) * 0.08;
    flash = Math.max(0, flash - dt * 8); recoil = Math.max(0, recoil - dt * 10);
    weaponRoot.position.z = -recoil * 0.055; weaponRoot.position.y = recoil * 0.025; weaponRoot.rotation.x = recoil * 0.045;
    weaponCore.scaling.z = 1 + flash * 0.35; weaponBarrel.scaling.z = 1 + flash * 0.2;
    scene.render();
  });

  const resize = () => engine.resize(); window.addEventListener("resize", resize);
  return {
    update,
    look(dx, dy) { yaw += dx * 0.0022 * sensitivity; pitch = Math.max(-1.3, Math.min(1.3, pitch + dy * 0.0022 * sensitivity)); },
    fire() { flash = 1; recoil = 1; },
    setWeapon(next) { const color = next === "scatter" ? "#ff9a57" : next === "rail" ? "#74ffbd" : "#7f6cff"; weaponBody.material = mat(color, 0.3); weaponCore.material = mat(color, 0.95); weaponBarrel.material = mat(color, 0.75); weaponSight.material = mat(next === "rail" ? "#74ffbd" : "#eef4ff", 0.9); },
    setHero(_hero) {},
    setSensitivity(value) { sensitivity = Math.max(0.5, Math.min(2, value)); },
    setFov(value) { baseFov = Math.max(Math.PI / 3.2, Math.min(Math.PI / 1.75, value * Math.PI / 180)); camera.fov = baseFov; },
    getAim() { return { yaw, pitch }; },
    setInput(x, z, nextSprint) { inputX = x; inputZ = z; sprint = nextSprint; },
    setAimMode(active) { aiming = active; },
    dispose() { window.removeEventListener("resize", resize); for (const avatar of remotes.values()) { avatar.parts.forEach((part) => part.dispose()); avatar.root.dispose(); } remotes.clear(); scene.dispose(); engine.dispose(); materials.clear(); },
  };
}
