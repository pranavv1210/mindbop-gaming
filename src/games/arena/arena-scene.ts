import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { UniversalCamera } from "@babylonjs/core/Cameras/universalCamera";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import type { ArenaView } from "./types";

export type ArenaScene = {
  update: (view: ArenaView) => void;
  look: (dx: number, dy: number) => void;
  fire: () => void;
  dispose: () => void;
};
export function createArenaScene(
  canvas: HTMLCanvasElement,
  localId: string,
): ArenaScene {
  const engine = new Engine(canvas, true, {
    powerPreference: "high-performance",
    stencil: false,
  });
  engine.setHardwareScalingLevel(
    innerWidth * innerHeight > 1_800_000 ? 1.5 : 1.2,
  );
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.035, 0.055, 0.14, 1);
  scene.fogMode = Scene.FOGMODE_LINEAR;
  scene.fogStart = 28;
  scene.fogEnd = 72;
  scene.fogColor = new Color3(0.04, 0.06, 0.16);
  const camera = new UniversalCamera(
    "arena-camera",
    new Vector3(0, 2, -5),
    scene,
  );
  camera.fov = Math.PI / 2;
  camera.minZ = 0.08;
  const ambient = new HemisphericLight("ambient", new Vector3(0, 1, 0), scene);
  ambient.intensity = 0.9;
  const sun = new DirectionalLight("sun", new Vector3(-0.4, -1, 0.3), scene);
  sun.intensity = 1.1;
  const materials = new Map<string, StandardMaterial>();
  const mat = (hex: string) => {
    let m = materials.get(hex);
    if (!m) {
      m = new StandardMaterial(hex, scene);
      m.diffuseColor = Color3.FromHexString(hex);
      m.emissiveColor = m.diffuseColor.scale(0.1);
      m.freeze();
      materials.set(hex, m);
    }
    return m;
  };
  const box = (name: string, p: Vector3, size: Vector3, color: string) => {
    const mesh = MeshBuilder.CreateBox(
      name,
      { width: size.x, height: size.y, depth: size.z },
      scene,
    );
    mesh.position = p;
    mesh.material = mat(color);
    return mesh;
  };
  box("floor", new Vector3(0, -0.25, 0), new Vector3(40, 0.5, 40), "#172750");
  for (const [x, z, w, d] of [
    [0, 14, 22, 2],
    [0, -14, 22, 2],
    [14, 0, 2, 30],
    [-14, 0, 2, 30],
    [0, 3, 8, 2],
    [-7, -4, 3, 7],
    [7, -4, 3, 7],
  ] as number[][])
    box("cover", new Vector3(x, 1, z), new Vector3(w, 2, d), "#304a82");
  const zone = MeshBuilder.CreateTorus(
    "training-zone",
    { diameter: 7, thickness: 0.18, tessellation: 48 },
    scene,
  );
  zone.rotation.x = Math.PI / 2;
  zone.position.y = 0.04;
  zone.material = mat("#42e8ff");
  const dummy = box(
    "target-dummy",
    new Vector3(0, 1.4, 9),
    new Vector3(1.1, 2.8, 0.8),
    "#ff765f",
  );
  const remotes = new Map<string, Mesh>();
  let yaw = 0,
    pitch = 0,
    flash = 0;
  const weapon = box(
    "pulse-rifle",
    new Vector3(0.48, -0.38, 1.05),
    new Vector3(0.25, 0.22, 0.9),
    "#8065ff",
  );
  weapon.parent = camera;
  function update(view: ArenaView) {
    for (const id of view.playerIds) {
      const p = view.players[id];
      if (id === localId) {
        camera.position.set(p.x, p.y + 1.55, p.z);
        continue;
      }
      let mesh = remotes.get(id);
      if (!mesh) {
        mesh = MeshBuilder.CreateCapsule(
          `runner-${id}`,
          { height: 1.8, radius: 0.48, tessellation: 8 },
          scene,
        );
        mesh.material = mat("#ff9a57");
        remotes.set(id, mesh);
      }
      mesh.position.x += (p.x - mesh.position.x) * 0.35;
      mesh.position.y += (p.y + 0.9 - mesh.position.y) * 0.35;
      mesh.position.z += (p.z - mesh.position.z) * 0.35;
      mesh.rotation.y = p.rotation;
    }
  }
  engine.runRenderLoop(() => {
    camera.rotation.set(pitch, yaw, 0);
    zone.rotation.z += 0.004;
    dummy.rotation.y += 0.003;
    flash = Math.max(0, flash - 0.08);
    weapon.scaling.z = 1 + flash * 0.12;
    scene.render();
  });
  const resize = () => engine.resize();
  window.addEventListener("resize", resize);
  return {
    update,
    look(dx, dy) {
      yaw += dx * 0.0022;
      pitch = Math.max(-1.35, Math.min(1.35, pitch + dy * 0.0022));
    },
    fire() {
      flash = 1;
    },
    dispose() {
      window.removeEventListener("resize", resize);
      scene.dispose();
      engine.dispose();
      materials.clear();
      remotes.clear();
    },
  };
}
