import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { UniversalCamera } from "@babylonjs/core/Cameras/universalCamera";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import type { SkyView } from "./types";

export type SkyScene = {
  update: (view: SkyView) => void;
  setQuality: (quality: string) => void;
  dispose: () => void;
};
export function createSkyScene(
  canvas: HTMLCanvasElement,
  localId: string,
  onStatus: (value: string) => void,
): SkyScene {
  if (!Engine.isSupported())
    throw new Error(
      "WebGL is unavailable. Enable hardware acceleration to enter the arena.",
    );
  const engine = new Engine(canvas, true, {
    powerPreference: "high-performance",
    stencil: false,
  });
  engine.setHardwareScalingLevel(innerWidth * innerHeight > 1_800_000 ? 1.5 : 1.25);
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.32, 0.62, 0.96, 1);
  scene.fogMode = Scene.FOGMODE_LINEAR;
  scene.fogStart = 55;
  scene.fogEnd = 150;
  scene.fogColor = new Color3(0.48, 0.68, 0.94);
  const camera = new UniversalCamera(
    "race-camera",
    new Vector3(0, 8, -12),
    scene,
  );
  camera.minZ = 0.1;
  camera.maxZ = 240;
  camera.fov = 0.88;
  const fill = new HemisphericLight("sky", new Vector3(0, 1, 0), scene);
  fill.intensity = 1.05;
  fill.groundColor = Color3.FromHexString("#6958a9");
  const sun = new DirectionalLight("sun", new Vector3(-0.4, -1, 0.55), scene);
  sun.intensity = 1.3;
  const mats = new Map<string, StandardMaterial>();
  const mat = (hex: string) => {
    let m = mats.get(hex);
    if (!m) {
      m = new StandardMaterial(hex, scene);
      m.diffuseColor = Color3.FromHexString(hex);
      m.specularColor = new Color3(0.25, 0.25, 0.25);
      m.freeze();
      mats.set(hex, m);
    }
    return m;
  };
  const box = (
    name: string,
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    color: string,
  ) => {
    const m = MeshBuilder.CreateBox(
      name,
      { width: w, height: h, depth: d },
      scene,
    );
    m.position.set(x, y, z);
    m.material = mat(color);
    m.isPickable = false;
    return m;
  };
  const platforms: [
    [number, number, string],
    [number, number, string],
    [number, number, string],
    [number, number, string],
  ] = [
    [0, 25, "#36c4dd"],
    [30, 26, "#ffd15c"],
    [62, 26, "#7c62e8"],
    [94, 28, "#47d4ad"],
  ];
  for (const [z, len, color] of platforms) {
    box("course", 0, 0, z + len / 2, 14, 0.9, len, color);
    for (let p = z + 4; p < z + len; p += 7)
      box("course stripe", 0, 0.48, p, 14, 0.05, 0.32, "#ffffff");
  }
  const spinners: Mesh[] = [];
  for (const z of [18, 49, 78, 106]) {
    const hub = MeshBuilder.CreateCylinder(
      `hub-${z}`,
      { diameter: 1.5, height: 2, tessellation: 12 },
      scene,
    );
    hub.position.set(0, 1.45, z);
    hub.material = mat("#6846c7");
    const arm = box(`arm-${z}`, 0, 1.45, z, 16, 0.55, 0.7, "#ff6b62");
    arm.metadata = { offset: z };
    spinners.push(arm);
  }
  for (const z of [28, 59, 91]) {
    for (const x of [-4, 0, 4]) {
      const pad = MeshBuilder.CreateCylinder(
        "bounce-pad",
        { diameter: 2.3, height: 0.35, tessellation: 20 },
        scene,
      );
      pad.position.set(x, 0.5, z);
      pad.material = mat("#ffda57");
    }
  }
  box("finish-left", -7, 4, 119, 1, 8, 1, "#fff4d5");
  box("finish-right", 7, 4, 119, 1, 8, 1, "#fff4d5");
  box("finish-top", 0, 7.5, 119, 15, 1, 1, "#ff6b62");
  for (let i = 0; i < 14; i++)
    box("rail", i % 2 ? -7.2 : 7.2, 1.3, 6 + i * 8, 0.35, 2.4, 0.35, "#5b43be");
  for (let i = 0; i < 14; i++) {
    const cloud = MeshBuilder.CreateSphere(
      "cloud",
      { diameter: 6 + Math.random() * 8, segments: 4 },
      scene,
    );
    cloud.scaling.y = 0.35;
    cloud.position.set(
      (Math.random() - 0.5) * 100,
      -5 - Math.random() * 8,
      Math.random() * 150,
    );
    cloud.material = mat("#e8f4ff");
  }
  const players = new Map<string, TransformNode>();
  const playerMeshes = new Map<string, Mesh[]>();
  const runnerParts = new Map<string, { body: Mesh; left: Mesh; right: Mesh }>();
  const colors = [
    "#ff6b62",
    "#765bdf",
    "#2fc6d8",
    "#ffd15c",
    "#50d39f",
    "#f16ec1",
    "#ff934f",
    "#5aa5ff",
  ];
  function character(id: string, index: number) {
    const root = new TransformNode(`player-${id}`, scene);
    const body = MeshBuilder.CreateCapsule(
      `body-${id}`,
      { height: 1.55, radius: 0.58, tessellation: 8 },
      scene,
    );
    body.position.y = 1.05;
    body.material = mat(colors[index % colors.length]);
    body.parent = root;
    const head = MeshBuilder.CreateSphere(
      `helmet-${id}`,
      { diameter: 1.02, segments: 8 },
      scene,
    );
    head.position.y = 1.78;
    head.scaling.y = 0.86;
    head.material = mat("#eef7ff");
    head.parent = root;
    const visor = box(`visor-${id}`, 0, 1.8, -0.45, 0.66, 0.28, 0.12, "#202a52");
    visor.parent = root;
    const left = MeshBuilder.CreateSphere(
      `foot-left-${id}`,
      { diameter: 0.48, segments: 6 },
      scene,
    );
    left.scaling.z = 1.35;
    left.position.set(-0.34, 0.2, 0.02);
    left.material = mat("#27305c");
    left.parent = root;
    const right = left.clone(`foot-right-${id}`);
    right.position.x = 0.34;
    right.parent = root;
    players.set(id, root);
    playerMeshes.set(id, [body, head, visor, left, right]);
    runnerParts.set(id, { body, left, right });
    return root;
  }
  function update(view: SkyView) {
    view.playerIds.forEach((id, i) => {
      const p = view.players[id];
      const root = players.get(id) ?? character(id, i);
      root.position.x += (p.x - root.position.x) * 0.42;
      root.position.y += (p.y - root.position.y) * 0.42;
      root.position.z += (p.z - root.position.z) * 0.42;
      root.rotation.y = p.rotation;
      root.setEnabled(view.activeIds.includes(id) || p.qualified);
      playerMeshes.get(id)?.forEach((m) => {
        m.visibility = p.eliminated ? 0.35 : 1;
      });
    });
  }
  engine.runRenderLoop(() => {
    const now = performance.now();
    for (const spinner of spinners) {
      spinner.rotation.y = now / 650 + spinner.metadata.offset;
    }
    for (const [id, parts] of runnerParts) {
      if (!players.get(id)?.isEnabled()) continue;
      const stride = Math.sin(now / 115 + id.length);
      parts.left.position.z = stride * 0.17;
      parts.right.position.z = -stride * 0.17;
      parts.body.rotation.z = Math.sin(now / 230 + id.length) * 0.025;
    }
    const local = players.get(localId);
    if (local) {
      const target = local.position.add(new Vector3(0, 2.1, 0));
      const desired = target.add(new Vector3(0, 5.8, -11));
      camera.position = Vector3.Lerp(camera.position, desired, 0.08);
      camera.setTarget(
        Vector3.Lerp(camera.getTarget(), target.add(new Vector3(0, 0, 7)), 0.1),
      );
    }
    scene.render();
  });
  const resize = () => engine.resize();
  window.addEventListener("resize", resize);
  onStatus("Scene ready — reach the finish!");
  return {
    update,
    setQuality(q) {
      engine.setHardwareScalingLevel(
        q === "low"
          ? 2
          : q === "medium"
            ? 1.5
            : q === "high"
            ? 1
            : innerWidth * innerHeight > 1_800_000
              ? 1.5
              : 1.25,
      );
      scene.fogEnd = q === "low" ? 110 : 150;
    },
    dispose() {
      window.removeEventListener("resize", resize);
      scene.dispose();
      engine.dispose();
      players.clear();
      playerMeshes.clear();
      runnerParts.clear();
      mats.clear();
    },
  };
}
