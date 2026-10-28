import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { UniversalCamera } from "@babylonjs/core/Cameras/universalCamera";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { PointLight } from "@babylonjs/core/Lights/pointLight";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { GlowLayer } from "@babylonjs/core/Layers/glowLayer";
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

type Theme = { accent: string; secondary: string; floor: string; wall: string; glow: string };

const MAP_THEME: Record<ArenaMapId, Theme> = {
  "neon-yard": { accent: "#42e8ff", secondary: "#7f6cff", floor: "#101a36", wall: "#172650", glow: "#42e8ff" },
  skyline: { accent: "#74ffbd", secondary: "#42a5ff", floor: "#101d34", wall: "#183552", glow: "#74ffbd" },
  reactor: { accent: "#ff9a57", secondary: "#ff5e87", floor: "#241526", wall: "#3b1d35", glow: "#ff9a57" },
};

export function createArenaScene(canvas: HTMLCanvasElement, localId: string): ArenaScene {
  const engine = new Engine(canvas, true, { powerPreference: "high-performance", stencil: false, preserveDrawingBuffer: false });
  const quality = localStorage.getItem("mindbop-arena-quality") ?? "auto";
  const mobile = matchMedia("(max-width: 700px)").matches;
  const lowPower = quality === "low" || (quality === "auto" && mobile);
  const highQuality = quality === "high" || quality === "ultra";
  engine.setHardwareScalingLevel(quality === "low" ? 1.55 : mobile ? 1.32 : highQuality ? 0.9 : innerWidth * innerHeight > 2_000_000 ? 1.04 : 1);

  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.006, 0.009, 0.025, 1);
  scene.fogMode = Scene.FOGMODE_EXP2;
  scene.fogDensity = lowPower ? 0.014 : 0.0065;
  scene.fogColor = new Color3(0.015, 0.025, 0.065);

  const camera = new UniversalCamera("arena-camera", new Vector3(0, 2.6, -8), scene);
  camera.minZ = 0.06;
  let baseFov = Math.PI / 2.22;
  camera.fov = baseFov;
  let sensitivity = Number(localStorage.getItem("mindbop-arena-sensitivity") ?? "1");

  const ambient = new HemisphericLight("ambient", new Vector3(0, 1, 0), scene);
  ambient.intensity = 0.64;
  ambient.diffuse = new Color3(0.5, 0.58, 1);
  ambient.groundColor = new Color3(0.02, 0.025, 0.07);
  const sun = new DirectionalLight("key", new Vector3(-0.45, -1, 0.35), scene);
  sun.intensity = 1.35;
  sun.diffuse = new Color3(0.84, 0.91, 1);

  const glow = new GlowLayer("arena-glow", scene);
  glow.intensity = lowPower ? 0.3 : highQuality ? 0.85 : 0.58;
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
      m.specularPower = 72;
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
  const sphere = (name: string, p: Vector3, diameter: number, color: string, emissive = 0.05) => {
    const mesh = MeshBuilder.CreateSphere(name, { diameter, segments: lowPower ? 8 : 16 }, scene);
    mesh.position.copyFrom(p);
    mesh.material = mat(color, emissive);
    return mesh;
  };

  const mapRoot = new TransformNode("map-root", scene);
  const mapGroups: Record<ArenaMapId, Mesh[]> = { "neon-yard": [], skyline: [], reactor: [] };
  const mapLights: Record<ArenaMapId, PointLight[]> = { "neon-yard": [], skyline: [], reactor: [] };
  const add = (map: ArenaMapId, mesh: Mesh) => { mesh.parent = mapRoot; mapGroups[map].push(mesh); return mesh; };
  const addLight = (map: ArenaMapId, light: PointLight) => { light.parent = mapRoot; mapLights[map].push(light); return light; };

  const makeWall = (map: ArenaMapId, name: string, p: Vector3, size: Vector3) => add(map, box(`${map}-${name}`, p, size, MAP_THEME[map].wall, 0.025));
  const makeLight = (map: ArenaMapId, p: Vector3, color: string, intensity = 1.5) => {
    const light = new PointLight(`${map}-light-${mapLights[map].length}`, p, scene);
    light.diffuse = Color3.FromHexString(color);
    light.specular = light.diffuse;
    light.intensity = lowPower ? intensity * 0.45 : intensity;
    light.range = lowPower ? 9 : 13;
    return addLight(map, light);
  };

  // Shared arena shell: deliberately architectural rather than a flat box-and-grid prototype.
  for (const map of Object.keys(MAP_THEME) as ArenaMapId[]) {
    const theme = MAP_THEME[map];
    add(map, box(`${map}-floor`, new Vector3(0, -0.32, 0), new Vector3(42, 0.64, 42), theme.floor, 0.025));
    add(map, box(`${map}-floor-panel`, new Vector3(0, 0.02, 0), new Vector3(38, 0.08, 38), "#15223f", 0.06));
    makeWall(map, "north", new Vector3(0, 2.6, 19.5), new Vector3(40, 5.2, 1));
    makeWall(map, "south", new Vector3(0, 2.6, -19.5), new Vector3(40, 5.2, 1));
    makeWall(map, "east", new Vector3(19.5, 2.6, 0), new Vector3(1, 5.2, 40));
    makeWall(map, "west", new Vector3(-19.5, 2.6, 0), new Vector3(1, 5.2, 40));

    for (let i = -18; i <= 18; i += 6) {
      add(map, box(`${map}-lane-x-${i}`, new Vector3(i, 0.075, 0), new Vector3(0.025, 0.025, 36), theme.secondary, 0.16));
      add(map, box(`${map}-lane-z-${i}`, new Vector3(0, 0.078, i), new Vector3(36, 0.025, 0.025), theme.secondary, 0.16));
    }
    for (const [x, z] of [[-15, -15], [15, -15], [-15, 15], [15, 15]]) {
      add(map, box(`${map}-light-strip-${x}-${z}`, new Vector3(x, 0.16, z), new Vector3(2.6, 0.06, 0.08), theme.accent, 0.7));
      makeLight(map, new Vector3(x, 2.4, z), theme.accent, 1.15);
    }
  }

  // NEON YARD — asymmetric lanes, central plaza, flank routes, elevated corners.
  const ny = MAP_THEME["neon-yard"];
  const nyCovers: [number, number, number, number, number][] = [
    [-10, -1, 3.2, 6.4, 2.8], [10, 1, 3.2, 6.4, 2.8],
    [-4, 8, 5.8, 1.6, 2.2], [4, -8, 5.8, 1.6, 2.2],
    [-12, 10, 2.2, 3.8, 3.4], [12, -10, 2.2, 3.8, 3.4],
    [-5, -5, 2.5, 2.5, 2.0], [5, 5, 2.5, 2.5, 2.0],
  ];
  for (const [x, z, w, d, h] of nyCovers) {
    add("neon-yard", box("ny-cover", new Vector3(x, h / 2, z), new Vector3(w, h, d), "#20365d", 0.035));
    add("neon-yard", box("ny-edge", new Vector3(x, h - 0.06, z), new Vector3(w * 0.86, 0.09, d * 0.86), ny.accent, 0.24));
  }
  for (const [x, z] of [[-13, -13], [13, -13], [-13, 13], [13, 13]]) {
    add("neon-yard", cylinder("ny-tower", new Vector3(x, 2.4, z), 1.15, 4.8, "#192b50", 0.06, 12));
    add("neon-yard", cylinder("ny-tower-core", new Vector3(x, 2.4, z), 0.28, 4.95, ny.accent, 0.82, 10));
  }
  for (const [x, z, rot] of [[0, -15, 0], [0, 15, 0], [-15, 0, Math.PI / 2], [15, 0, Math.PI / 2]]) {
    const gate = add("neon-yard", box("ny-gate", new Vector3(x, 3.3, z), new Vector3(rot ? 6.8 : 2.2, 6.6, rot ? 2.2 : 6.8), "#1b3159", 0.04));
    gate.rotation.y = rot;
    add("neon-yard", box("ny-gate-light", new Vector3(x, 5.8, z), new Vector3(rot ? 5.8 : 0.12, 0.12, rot ? 0.12 : 5.8), ny.accent, 0.62));
  }

  // SKYLINE — rooftop arena with tall cover, catwalks and a central tower.
  const sky = MAP_THEME.skyline;
  for (const [x, z, w, d, h] of [
    [-11, -8, 3, 7, 3.8], [11, 8, 3, 7, 3.8], [-4, 12, 7, 2, 2.2], [4, -12, 7, 2, 2.2],
    [-12, 9, 2.2, 3, 4.6], [12, -9, 2.2, 3, 4.6],
  ] as const) {
    add("skyline", box("sky-block", new Vector3(x, h / 2, z), new Vector3(w, h, d), "#203a5e", 0.035));
    add("skyline", box("sky-cap", new Vector3(x, h - 0.06, z), new Vector3(w * 0.84, 0.09, d * 0.84), sky.accent, 0.3));
  }
  for (const [x, z] of [[-7, 0], [7, 0]]) {
    add("skyline", box("sky-catwalk", new Vector3(x, 2.0, z), new Vector3(3.8, 0.3, 10), "#29496f", 0.04));
    add("skyline", box("sky-rail-a", new Vector3(x - 1.8, 2.55, z), new Vector3(0.08, 1.0, 10), sky.accent, 0.28));
    add("skyline", box("sky-rail-b", new Vector3(x + 1.8, 2.55, z), new Vector3(0.08, 1.0, 10), sky.accent, 0.28));
  }
  add("skyline", box("sky-tower", new Vector3(0, 3.2, 0), new Vector3(3.8, 6.4, 3.8), "#172f52", 0.06));
  add("skyline", box("sky-tower-window", new Vector3(0, 4.0, -1.94), new Vector3(2.4, 1.6, 0.06), sky.secondary, 0.7));
  add("skyline", box("sky-bridge", new Vector3(0, 1.55, 7), new Vector3(8.5, 0.22, 2.1), "#2b4c72", 0.05));

  // REACTOR — industrial power facility with tanks, pipes, barriers and a hot central core.
  const reactor = MAP_THEME.reactor;
  for (const [x, z, w, d, h] of [
    [-8, -10, 7, 2.4, 3.5], [8, 10, 7, 2.4, 3.5], [-12, 5, 2.4, 6.5, 3], [12, -5, 2.4, 6.5, 3],
    [-5, 5, 3.0, 3.0, 2.6], [5, -5, 3.0, 3.0, 2.6],
  ] as const) {
    add("reactor", box("reactor-barrier", new Vector3(x, h / 2, z), new Vector3(w, h, d), "#3a263d", 0.04));
    add("reactor", box("reactor-edge", new Vector3(x, h - 0.06, z), new Vector3(w * 0.88, 0.1, d * 0.88), reactor.accent, 0.32));
  }
  for (const [x, z] of [[-7, 6], [7, -6], [-7, -6], [7, 6]]) {
    add("reactor", cylinder("reactor-tank", new Vector3(x, 2.5, z), 3.0, 5.0, "#462c40", 0.04, 20));
    add("reactor", cylinder("reactor-tank-core", new Vector3(x, 2.5, z), 2.15, 5.1, reactor.accent, 0.16, 20));
    add("reactor", cylinder("reactor-tank-ring", new Vector3(x, 4.4, z), 3.15, 0.12, reactor.secondary, 0.75, 24));
  }
  add("reactor", cylinder("reactor-core", new Vector3(0, 2.8, 0), 2.8, 5.6, "#301d35", 0.08, 24));
  add("reactor", cylinder("reactor-core-light", new Vector3(0, 2.8, 0), 1.65, 5.75, reactor.accent, 0.8, 20));
  for (const z of [-12, -4, 4, 12]) {
    add("reactor", cylinder("reactor-pipe", new Vector3(0, 4.4, z), 0.22, 5.8, reactor.secondary, 0.62, 12));
  }

  const beacons: { pillar: Mesh; cap: Mesh }[] = [];
  const beaconSpots = [[-16, -16], [16, -16], [-16, 16], [16, 16]] as const;
  for (const [x, z] of beaconSpots) {
    const pillar = box("beacon", new Vector3(x, 2.8, z), new Vector3(0.72, 5.6, 0.72), ny.accent, 0.72);
    const cap = box("beacon-cap", new Vector3(x, 5.72, z), new Vector3(1.5, 0.12, 1.5), ny.secondary, 0.82);
    pillar.rotation.y = Math.PI / 4; cap.rotation.y = Math.PI / 4;
    beacons.push({ pillar, cap });
  }

  const zone = MeshBuilder.CreateTorus("capture-zone", { diameter: 9.5, thickness: 0.16, tessellation: lowPower ? 32 : 64 }, scene);
  zone.rotation.x = Math.PI / 2; zone.position.y = 0.09;
  const zoneCore = MeshBuilder.CreateCylinder("capture-core", { diameter: 7.6, height: 0.05, tessellation: lowPower ? 32 : 64 }, scene);
  zoneCore.position.y = 0.04; zoneCore.visibility = 0.28;
  const zonePillar = MeshBuilder.CreateCylinder("zone-beam", { diameter: 0.22, height: 6, tessellation: 12 }, scene);
  zonePillar.position.y = 3; zonePillar.visibility = 0.2;
  const zoneHalo = MeshBuilder.CreateTorus("zone-halo", { diameter: 12, thickness: 0.045, tessellation: lowPower ? 24 : 48 }, scene);
  zoneHalo.rotation.x = Math.PI / 2; zoneHalo.position.y = 0.12;

  const weaponRoot = new TransformNode("weapon-root", scene); weaponRoot.parent = camera;
  const weaponBody = box("weapon-body", new Vector3(0.46, -0.38, 1.05), new Vector3(0.28, 0.22, 0.88), "#7f6cff", 0.28); weaponBody.parent = weaponRoot;
  const weaponUpper = box("weapon-upper", new Vector3(0.46, -0.27, 0.79), new Vector3(0.18, 0.12, 0.62), "#28385d", 0.08); weaponUpper.parent = weaponRoot;
  const weaponBarrel = cylinder("weapon-barrel", new Vector3(0.46, -0.38, 0.55), 0.09, 0.5, "#42e8ff", 0.65, 12); weaponBarrel.rotation.x = Math.PI / 2; weaponBarrel.parent = weaponRoot;
  const weaponCore = box("weapon-core", new Vector3(0.46, -0.38, 0.75), new Vector3(0.1, 0.07, 0.4), "#42e8ff", 0.95); weaponCore.parent = weaponRoot;
  const weaponSight = box("weapon-sight", new Vector3(0.46, -0.21, 0.68), new Vector3(0.055, 0.055, 0.26), "#eef4ff", 0.9); weaponSight.parent = weaponRoot;
  const hand = cylinder("weapon-hand", new Vector3(0.46, -0.55, 0.92), 0.18, 0.35, "#a56e56", 0.02, 12); hand.rotation.x = Math.PI / 2; hand.parent = weaponRoot;
  const muzzle = sphere("weapon-muzzle", new Vector3(0.46, -0.38, 0.26), 0.16, "#ffffff", 1); muzzle.parent = weaponRoot; muzzle.visibility = 0;

  type Avatar = { root: Mesh; parts: Mesh[]; material: StandardMaterial };
  const remotes = new Map<string, Avatar>();
  let yaw = 0, pitch = 0, flash = 0, recoil = 0, inputX = 0, inputZ = 0, sprint = false, aiming = false;
  let lastFrame = performance.now();
  const authoritative = new Vector3(0, 2.55, -8);
  const predicted = authoritative.clone();

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
      if (!view.playerIds.includes(id) || !p || p.hp <= 0) {
        avatar.parts.forEach((part) => part.dispose()); avatar.root.dispose(); remotes.delete(id);
      }
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
    for (const id of Object.keys(mapGroups) as ArenaMapId[]) {
      const enabled = id === view.mapId;
      mapGroups[id].forEach((mesh) => mesh.setEnabled(enabled));
      mapLights[id].forEach((light) => { light.setEnabled(enabled); });
    }
    for (const pair of beacons) { pair.pillar.material = mat(activeTheme.accent, 0.72); pair.cap.material = mat(activeTheme.secondary, 0.82); }
    const zoneColor = view.zone.owner === "ember" ? "#ff5e87" : view.zone.owner === "azure" ? "#42e8ff" : activeTheme.secondary;
    zone.material = mat(zoneColor, 1); zoneCore.material = mat(zoneColor, 0.14); zonePillar.material = mat(zoneColor, 0.48); zoneHalo.material = mat(zoneColor, 0.72);
    zone.position.x += (view.zone.x - zone.position.x) * 0.14; zone.position.z += (view.zone.z - zone.position.z) * 0.14;
    zoneCore.position.x = zone.position.x; zoneCore.position.z = zone.position.z; zonePillar.position.x = zone.position.x; zonePillar.position.z = zone.position.z; zoneHalo.position.x = zone.position.x; zoneHalo.position.z = zone.position.z;
  }

  engine.runRenderLoop(() => {
    const now = performance.now(); const dt = Math.min(0.05, Math.max(0, (now - lastFrame) / 1000)); lastFrame = now;
    const length = Math.hypot(inputX, inputZ);
    if (length > 0) {
      const speed = sprint ? 11.5 : 9.5;
      predicted.x += (inputX / length) * speed * dt;
      predicted.z += (inputZ / length) * speed * dt;
      predicted.x = Math.max(-18, Math.min(18, predicted.x)); predicted.z = Math.max(-18, Math.min(18, predicted.z));
    }
    camera.position.copyFrom(predicted); camera.rotation.set(pitch, yaw, 0);
    const targetFov = aiming ? baseFov * 0.82 : baseFov; camera.fov += (targetFov - camera.fov) * Math.min(1, dt * 14);
    zone.rotation.z += 0.006; zoneCore.rotation.y -= 0.003; zoneHalo.rotation.z -= 0.004; zonePillar.scaling.y = 0.88 + Math.sin(now * 0.002) * 0.08;
    flash = Math.max(0, flash - dt * 8); recoil = Math.max(0, recoil - dt * 10);
    weaponRoot.position.z = -recoil * 0.055; weaponRoot.position.y = recoil * 0.025; weaponRoot.rotation.x = recoil * 0.045;
    weaponCore.scaling.z = 1 + flash * 0.35; weaponBarrel.scaling.z = 1 + flash * 0.2; muzzle.visibility = flash > 0.04 ? 1 : 0; muzzle.scaling.setAll(0.7 + flash * 1.4);
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
