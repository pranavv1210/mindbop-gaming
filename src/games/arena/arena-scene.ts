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
import type { ArenaView, ArenaWeapon } from "./types";

export type ArenaScene = {
  update: (view: ArenaView) => void;
  look: (dx: number, dy: number) => void;
  fire: () => void;
  setWeapon: (weapon: ArenaWeapon) => void;
  setHero: (hero: string) => void;
  getAim: () => { yaw: number; pitch: number };
  dispose: () => void;
};

export function createArenaScene(canvas: HTMLCanvasElement, localId: string): ArenaScene {
  const engine = new Engine(canvas, true, { powerPreference: "high-performance", stencil: false, preserveDrawingBuffer: false });
  engine.setHardwareScalingLevel(Math.min(1.35, Math.max(1, (innerWidth * innerHeight) > 2_000_000 ? 1.2 : 1)));
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.018, 0.026, 0.07, 1);
  scene.fogMode = Scene.FOGMODE_EXP2;
  scene.fogDensity = 0.008;
  scene.fogColor = new Color3(0.02, 0.03, 0.09);

  const camera = new UniversalCamera("arena-camera", new Vector3(0, 2.6, -8), scene);
  camera.fov = Math.PI / 2.25;
  camera.minZ = 0.08;
  const ambient = new HemisphericLight("ambient", new Vector3(0, 1, 0), scene);
  ambient.intensity = 0.65;
  ambient.diffuse = new Color3(0.42, 0.5, 1);
  const sun = new DirectionalLight("key", new Vector3(-0.45, -1, 0.35), scene);
  sun.intensity = 1.15;
  sun.diffuse = new Color3(0.8, 0.87, 1);
  const glow = new GlowLayer("arena-glow", scene);
  glow.intensity = 0.65;

  const materials = new Map<string, StandardMaterial>();
  const mat = (hex: string, emissive = 0.08) => {
    const key = `${hex}:${emissive}`;
    let m = materials.get(key);
    if (!m) {
      m = new StandardMaterial(key, scene);
      m.diffuseColor = Color3.FromHexString(hex);
      m.emissiveColor = m.diffuseColor.scale(emissive);
      m.specularColor = new Color3(0.55, 0.6, 0.75);
      materials.set(key, m);
    }
    return m;
  };
  const box = (name: string, p: Vector3, size: Vector3, color: string, emissive = 0.06) => {
    const mesh = MeshBuilder.CreateBox(name, { width: size.x, height: size.y, depth: size.z }, scene);
    mesh.position = p; mesh.material = mat(color, emissive); return mesh;
  };

  box("floor", new Vector3(0, -0.3, 0), new Vector3(42, 0.6, 42), "#101a39");
  box("floor-inlay", new Vector3(0, 0.02, 0), new Vector3(38, 0.08, 38), "#16234a", 0.12);
  for (const [x, z, w, d, c] of [
    [0, 19, 40, 1.2, "#243a70"], [0, -19, 40, 1.2, "#243a70"], [19, 0, 1.2, 40, "#243a70"], [-19, 0, 1.2, 40, "#243a70"],
    [0, 8, 10, 1.4, "#2d477f"], [0, -8, 10, 1.4, "#2d477f"], [-9, 0, 1.4, 12, "#2d477f"], [9, 0, 1.4, 12, "#2d477f"],
  ] as (number | string)[][]) box("cover", new Vector3(x as number, 1.2, z as number), new Vector3(w as number, 2.4, d as number), c as string);

  for (const [x, z, c] of [[-16, -16, "#42e8ff"], [16, -16, "#ff5e87"], [-16, 16, "#ff5e87"], [16, 16, "#42e8ff"]] as [number, number, string][]) {
    const pillar = box("beacon", new Vector3(x, 2.8, z), new Vector3(0.7, 5.6, 0.7), c, 0.9);
    pillar.rotation.y = Math.PI / 4;
  }

  const zone = MeshBuilder.CreateTorus("capture-zone", { diameter: 9.5, thickness: 0.16, tessellation: 64 }, scene);
  zone.rotation.x = Math.PI / 2; zone.position.y = 0.09; zone.material = mat("#42e8ff", 1);
  const zoneCore = MeshBuilder.CreateCylinder("capture-core", { diameter: 7.6, height: 0.05, tessellation: 64 }, scene);
  zoneCore.position.y = 0.04; zoneCore.material = mat("#42e8ff", 0.16); zoneCore.visibility = 0.25;

  const weapon = box("pulse-rifle", new Vector3(0.46, -0.38, 1.05), new Vector3(0.24, 0.2, 0.95), "#7f6cff", 0.25);
  weapon.parent = camera;
  const weaponGlow = box("rifle-core", new Vector3(0.46, -0.38, 0.72), new Vector3(0.1, 0.08, 0.45), "#42e8ff", 0.9);
  weaponGlow.parent = camera;

  const remotes = new Map<string, Mesh>();
  let yaw = 0; let pitch = 0; let flash = 0; let selectedWeapon: ArenaWeapon = "pulse";
  let localView: ArenaView | null = null;

  function update(view: ArenaView) {
    localView = view;
    const local = view.players[localId];
    if (local) {
      camera.position.set(local.x, local.y + 1.55, local.z);
      if (Math.abs(local.rotation - yaw) > 0.5) yaw = local.rotation;
      pitch = local.pitch;
      selectedWeapon = local.weapon;
    }
    for (const [id, mesh] of remotes) if (!view.playerIds.includes(id)) { mesh.dispose(); remotes.delete(id); }
    for (const id of view.playerIds) {
      const p = view.players[id];
      if (id === localId || p.hp <= 0) continue;
      let mesh = remotes.get(id);
      if (!mesh) {
        mesh = MeshBuilder.CreateCapsule(`runner-${id}`, { height: 1.9, radius: 0.45, tessellation: 12 }, scene);
        remotes.set(id, mesh);
      }
      mesh.material = mat(p.team === "ember" ? "#ff5e87" : "#42e8ff", 0.28);
      mesh.position.x += (p.x - mesh.position.x) * 0.28;
      mesh.position.y += (p.y + 0.9 - mesh.position.y) * 0.28;
      mesh.position.z += (p.z - mesh.position.z) * 0.28;
      mesh.rotation.y = p.rotation;
    }
    const zoneColor = view.zone.owner === "ember" ? "#ff5e87" : view.zone.owner === "azure" ? "#42e8ff" : "#a58cff";
    zone.material = mat(zoneColor, 1); zoneCore.material = mat(zoneColor, 0.12);
    zone.position.x += (view.zone.x - zone.position.x) * 0.12;
    zone.position.z += (view.zone.z - zone.position.z) * 0.12;
    zoneCore.position.x = zone.position.x; zoneCore.position.z = zone.position.z;
  }

  engine.runRenderLoop(() => {
    camera.rotation.set(pitch, yaw, 0);
    zone.rotation.z += 0.006;
    zoneCore.rotation.y -= 0.003;
    flash = Math.max(0, flash - 0.075);
    weapon.scaling.z = 1 + flash * 0.18;
    weaponGlow.scaling.z = 1 + flash * 0.3;
    scene.render();
  });
  const resize = () => engine.resize(); window.addEventListener("resize", resize);
  return {
    update,
    look(dx, dy) { yaw += dx * 0.002; pitch = Math.max(-1.25, Math.min(1.25, pitch + dy * 0.002)); },
    fire() { flash = 1; },
    setWeapon(weaponName) { selectedWeapon = weaponName; },
    setHero(_hero) {},
    getAim() { return { yaw, pitch }; },
    dispose() { window.removeEventListener("resize", resize); localView = null; scene.dispose(); engine.dispose(); materials.clear(); remotes.clear(); },
  };
}
