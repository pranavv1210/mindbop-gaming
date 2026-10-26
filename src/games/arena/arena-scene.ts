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
  setInput: (x: number, z: number, sprint: boolean) => void;
  dispose: () => void;
};

export function createArenaScene(canvas: HTMLCanvasElement, localId: string): ArenaScene {
  const engine = new Engine(canvas, true, { powerPreference: "high-performance", stencil: false, preserveDrawingBuffer: false });
  const mobile = matchMedia("(max-width: 700px)").matches;
  engine.setHardwareScalingLevel(mobile ? 1.45 : innerWidth * innerHeight > 2_000_000 ? 1.15 : 1);
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
      m.specularColor = new Color3(0.45, 0.5, 0.68);
      m.freeze();
      materials.set(key, m);
    }
    return m;
  };
  const box = (name: string, p: Vector3, size: Vector3, color: string, emissive = 0.06) => {
    const mesh = MeshBuilder.CreateBox(name, { width: size.x, height: size.y, depth: size.z }, scene);
    mesh.position = p;
    mesh.material = mat(color, emissive);
    return mesh;
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
  zone.rotation.x = Math.PI / 2;
  zone.position.y = 0.09;
  zone.material = mat("#42e8ff", 1);
  const zoneCore = MeshBuilder.CreateCylinder("capture-core", { diameter: 7.6, height: 0.05, tessellation: 64 }, scene);
  zoneCore.position.y = 0.04;
  zoneCore.material = mat("#42e8ff", 0.16);
  zoneCore.visibility = 0.25;

  const weapon = box("pulse-rifle", new Vector3(0.46, -0.38, 1.05), new Vector3(0.24, 0.2, 0.95), "#7f6cff", 0.25);
  weapon.parent = camera;
  const weaponGlow = box("rifle-core", new Vector3(0.46, -0.38, 0.72), new Vector3(0.1, 0.08, 0.45), "#42e8ff", 0.9);
  weaponGlow.parent = camera;

  const remotes = new Map<string, Mesh>();
  let yaw = 0;
  let pitch = 0;
  let flash = 0;
  let recoil = 0;
  let inputX = 0;
  let inputZ = 0;
  let sprint = false;
  let lastFrame = performance.now();
  let authoritative = new Vector3(0, 2.55, -8);
  const predicted = authoritative.clone();

  function update(view: ArenaView) {
    const local = view.players[localId];
    if (local) {
      authoritative.set(local.x, local.y + 1.55, local.z);
      if (Vector3.Distance(predicted, authoritative) > 3.5) predicted.copyFrom(authoritative);
      else {
        predicted.x += (authoritative.x - predicted.x) * 0.14;
        predicted.y += (authoritative.y - predicted.y) * 0.2;
        predicted.z += (authoritative.z - predicted.z) * 0.14;
      }
      if (Math.abs(local.rotation - yaw) > 0.75) yaw = local.rotation;
      pitch = local.pitch;
    }

    for (const [id, mesh] of remotes) {
      if (!view.playerIds.includes(id) || !view.players[id] || view.players[id].hp <= 0) {
        mesh.dispose();
        remotes.delete(id);
      }
    }
    for (const id of view.playerIds) {
      if (id === localId) continue;
      const p = view.players[id];
      if (!p || p.hp <= 0) continue;
      let mesh = remotes.get(id);
      if (!mesh) {
        mesh = MeshBuilder.CreateCapsule(`runner-${id}`, { height: 1.9, radius: 0.45, tessellation: 10 }, scene);
        remotes.set(id, mesh);
      }
      mesh.material = mat(p.team === "ember" ? "#ff5e87" : "#42e8ff", 0.28);
      const target = new Vector3(p.x, p.y + 0.9, p.z);
      mesh.position = Vector3.Lerp(mesh.position, target, 0.18);
      mesh.rotation.y = p.rotation;
    }

    const zoneColor = view.zone.owner === "ember" ? "#ff5e87" : view.zone.owner === "azure" ? "#42e8ff" : "#a58cff";
    zone.material = mat(zoneColor, 1);
    zoneCore.material = mat(zoneColor, 0.12);
    zone.position.x += (view.zone.x - zone.position.x) * 0.12;
    zone.position.z += (view.zone.z - zone.position.z) * 0.12;
    zoneCore.position.x = zone.position.x;
    zoneCore.position.z = zone.position.z;
  }

  engine.runRenderLoop(() => {
    const now = performance.now();
    const dt = Math.min(0.05, Math.max(0, (now - lastFrame) / 1000));
    lastFrame = now;
    const length = Math.hypot(inputX, inputZ);
    if (length > 0) {
      const speed = sprint ? 11.5 : 9.5;
      predicted.x += (inputX / length) * speed * dt;
      predicted.z += (inputZ / length) * speed * dt;
      predicted.x = Math.max(-18, Math.min(18, predicted.x));
      predicted.z = Math.max(-18, Math.min(18, predicted.z));
    }
    camera.position.copyFrom(predicted);
    camera.rotation.set(pitch, yaw, 0);
    zone.rotation.z += 0.006;
    zoneCore.rotation.y -= 0.003;
    flash = Math.max(0, flash - dt * 8);
    recoil = Math.max(0, recoil - dt * 10);
    weapon.scaling.z = 1 + flash * 0.18;
    weapon.position.z = 1.05 - recoil * 0.055;
    weaponGlow.scaling.z = 1 + flash * 0.3;
    scene.render();
  });

  const resize = () => engine.resize();
  window.addEventListener("resize", resize);
  return {
    update,
    look(dx, dy) {
      yaw += dx * 0.0022;
      pitch = Math.max(-1.3, Math.min(1.3, pitch + dy * 0.0022));
    },
    fire() { flash = 1; recoil = 1; },
    setWeapon(next) {
      const color = next === "scatter" ? "#ff9a57" : next === "rail" ? "#74ffbd" : "#7f6cff";
      weapon.material = mat(color, 0.3);
      weaponGlow.material = mat(color, 0.9);
    },
    setHero(_hero) {},
    getAim() { return { yaw, pitch }; },
    setInput(x, z, nextSprint) { inputX = x; inputZ = z; sprint = nextSprint; },
    dispose() {
      window.removeEventListener("resize", resize);
      for (const mesh of remotes.values()) mesh.dispose();
      remotes.clear();
      scene.dispose();
      engine.dispose();
      materials.clear();
    },
  };
}
