import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { Camera } from "@babylonjs/core/Cameras/camera";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { RoomView } from "@/lib/protocol";
import { areas, walls, furniture, hotspots, type Point } from "./world";

export type HotelScene = {
  update: (room: RoomView) => void;
  setQuality: (low: boolean) => void;
  setActive: (active: boolean) => void;
  dispose: () => void;
};
export function createHotel(
  canvas: HTMLCanvasElement,
  localId: string,
  onPick: (id: string) => void,
  onStatus: (status: string) => void,
): HotelScene {
  if (!Engine.isSupported())
    throw new Error(
      "WebGL is unavailable. Enable hardware acceleration or use a supported browser.",
    );
  const engine = new Engine(canvas, true, {
    preserveDrawingBuffer: true,
    stencil: false,
    powerPreference: "low-power",
  });
  engine.setHardwareScalingLevel(Math.max(1, window.devicePixelRatio / 1.5));
  const scene = new Scene(engine);
  scene.useRightHandedSystem = true;
  scene.clearColor = new Color4(0.035, 0.047, 0.072, 1);
  const camera = new ArcRotateCamera(
    "hotel-camera",
    Math.PI / 2,
    0.72,
    36,
    Vector3.Zero(),
    scene,
  );
  camera.mode = Camera.ORTHOGRAPHIC_CAMERA;
  camera.minZ = 0.1;
  camera.maxZ = 100;
  const light = new HemisphericLight("night-fill", new Vector3(0, 1, 0), scene);
  light.intensity = 0.85;
  light.groundColor = Color3.FromHexString("#30384b");
  const moon = new DirectionalLight(
    "moonlight",
    new Vector3(-0.5, -1, -0.3),
    scene,
  );
  moon.intensity = 0.65;
  moon.diffuse = Color3.FromHexString("#c7dafa");
  const materials = new Map<string, StandardMaterial>();
  const staticMeshes: Mesh[] = [];
  function material(color: string, emissive = false) {
    const key = color + emissive;
    let m = materials.get(key);
    if (!m) {
      m = new StandardMaterial(key, scene);
      m.diffuseColor = Color3.FromHexString(color);
      m.specularColor = new Color3(0.12, 0.12, 0.12);
      if (emissive) {
        m.disableLighting = true;
        m.diffuseColor = Color3.Black();
        m.emissiveColor = Color3.FromHexString(color);
      }
      materials.set(key, m);
    }
    return m;
  }
  function box(
    name: string,
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    color: string,
    glow = false,
  ) {
    const m = MeshBuilder.CreateBox(
      name,
      { width: w, height: h, depth: d },
      scene,
    );
    m.position.set(x, y, z);
    m.material = material(color, glow);
    m.isPickable = false;
    staticMeshes.push(m);
    return m;
  }
  function cylinder(
    name: string,
    x: number,
    y: number,
    z: number,
    diameter: number,
    height: number,
    color: string,
  ) {
    const m = MeshBuilder.CreateCylinder(
      name,
      { diameter, height, tessellation: 12 },
      scene,
    );
    m.position.set(x, y, z);
    m.material = material(color);
    m.isPickable = false;
    staticMeshes.push(m);
    return m;
  }
  function label(text: string, x: number, y: number, z: number, width = 3) {
    const texture = new DynamicTexture(
      `label-${text}`,
      { width: 512, height: 96 },
      scene,
      false,
    );
    texture.hasAlpha = true;
    texture.drawText(
      text,
      null,
      64,
      "bold 36px sans-serif",
      "#f0e3ca",
      "transparent",
      true,
    );
    const mat = new StandardMaterial(`label-material-${text}`, scene);
    mat.diffuseTexture = texture;
    mat.emissiveColor = Color3.White();
    mat.disableLighting = true;
    mat.useAlphaFromDiffuseTexture = true;
    mat.backFaceCulling = false;
    const plane = MeshBuilder.CreatePlane(
      text,
      { width, height: (width * 96) / 512 },
      scene,
    );
    plane.position.set(x, y, z);
    plane.material = mat;
    plane.billboardMode = Mesh.BILLBOARDMODE_ALL;
    plane.isPickable = false;
    return plane;
  }
  // A cutaway hotel: raised plinth, patterned floors, interior partitions, open roof.
  box("hotel foundation", 0, -0.32, 0, 24.6, 0.55, 18.6, "#192129");
  for (const a of areas) {
    box(`${a.name} floor`, a.x, 0, a.z, a.w, 0.12, a.d, a.color);
    for (let x = a.x - a.w / 2 + 0.7; x < a.x + a.w / 2; x += 1.4)
      box("floor seam", x, 0.067, a.z, 0.016, 0.008, a.d, "#8a7764");
    label(a.name.toUpperCase(), a.x, 0.18, a.z + a.d / 2 - 1.1, 3.6);
  }
  box("hall runner", 0, 0.08, -3.3, 2.5, 0.025, 10.4, "#7c3940");
  box("lobby rug", -2, 0.08, 5.5, 5.3, 0.025, 4.9, "#7c3940");
  for (const x of [-1.1, 1.1])
    box("runner brass edge", x, 0.1, -3.3, 0.035, 0.025, 10.4, "#bd9d61");
  walls.forEach((w, i) => {
    const h = w.z === -9 ? 3.7 : 1.05;
    box(`partition ${i}`, w.x, h / 2, w.z, w.w, h, w.d, "#344348");
    box(
      "wall cap",
      w.x,
      h + 0.035,
      w.z,
      w.w + 0.06,
      0.07,
      w.d + 0.06,
      "#c0a372",
    );
    box("skirting", w.x, 0.15, w.z, w.w + 0.05, 0.2, w.d + 0.05, "#202c32");
  });
  for (const x of [-10, -6, -1.5, 1.5, 6, 10]) {
    box("window frame", x, 2.2, -8.78, 1.5, 2, 0.11, "#aa8e62");
    box("storm glass", x, 2.2, -8.69, 1.32, 1.82, 0.05, "#263f58", true);
    box("window mullion", x, 2.2, -8.64, 0.055, 1.85, 0.04, "#a48e6a");
    box("window crossbar", x, 2.2, -8.63, 1.3, 0.055, 0.04, "#a48e6a");
    for (let j = 0; j < 4; j++) {
      const rain = box(
        "rain on glass",
        x - 0.45 + j * 0.29,
        2 + (j % 2) * 0.35,
        -8.6,
        0.014,
        0.45,
        0.01,
        "#7496b0",
        true,
      );
      rain.rotation.z = -0.18;
    }
  }
  for (const f of furniture) {
    if (f.kind === "desk" || f.kind === "table") {
      box(f.id, f.x, f.h, f.z, f.w, 0.15, f.d, "#76513e");
      for (const dx of [-1, 1])
        for (const dz of [-1, 1])
          box(
            "furniture leg",
            f.x + dx * (f.w / 2 - 0.18),
            f.h / 2,
            f.z + dz * (f.d / 2 - 0.18),
            0.14,
            f.h,
            0.14,
            "#302b2b",
          );
      if (f.kind === "desk")
        box(
          "drawer",
          f.x,
          f.h - 0.3,
          f.z,
          f.w * 0.8,
          0.4,
          f.d * 0.8,
          "#624436",
        );
    } else if (f.kind === "bed") {
      box("bed frame", f.x, 0.3, f.z, f.w, 0.5, f.d, "#78533e");
      box("linen", f.x, 0.62, f.z, f.w - 0.1, 0.25, f.d - 0.1, "#d6c6b7");
      box("velvet blanket", f.x, 0.79, f.z + 0.5, f.w, 0.06, 2.2, "#655473");
      box(
        "headboard",
        f.x,
        1.1,
        f.z - f.d / 2,
        f.w + 0.15,
        1.6,
        0.18,
        "#6b4a3b",
      );
      for (const dx of [-0.75, 0.75])
        box("pillow", f.x + dx, 0.83, f.z - 1.05, 1.1, 0.18, 0.65, "#f0e3ca");
    } else if (f.kind === "sofa") {
      box("sofa base", f.x, 0.4, f.z, f.w, 0.7, f.d, "#3e685d");
      box("sofa back", f.x, 0.9, f.z + 0.4, f.w, 0.8, 0.25, "#31544e");
      for (const dx of [-1.45, 1.45])
        box("sofa arm", f.x + dx, 0.65, f.z, 0.35, 0.8, f.d, "#31544e");
    } else {
      box(f.id, f.x, f.h / 2, f.z, f.w, f.h, f.d, "#5d473a");
      if (f.id === "study-shelf")
        for (let i = 0; i < 14; i++)
          box(
            "book spine",
            f.x + 0.38,
            0.65 + (i % 3) * 0.65,
            f.z - 2 + (i % 7) * 0.62,
            0.08,
            0.48,
            0.3,
            ["#95805c", "#6e444d", "#466064"][i % 3],
          );
    }
  }
  // Authored scene props: desk documents, brass opener, tray, cups, and covered victim.
  box("ledger pages", -8, 0.99, -5.5, 0.65, 0.04, 0.7, "#d9cfb4");
  box("ledger cover", -8, 0.96, -5.5, 0.7, 0.04, 0.76, "#243c39");
  box("letter opener blade", -6.3, 0.12, -4, 0.08, 0.025, 0.65, "#bbaa7a");
  box("letter opener handle", -6.3, 0.15, -3.6, 0.12, 0.07, 0.24, "#74513a");
  const victim = box(
    "covered victim",
    -5.4,
    0.22,
    -5.2,
    0.7,
    0.26,
    1.8,
    "#b5b1a6",
  );
  victim.rotation.y = -0.2;
  box("letter paper", 6.4, 0.12, -3.5, 0.5, 0.035, 0.7, "#e2d2b3");
  cylinder("tray", 8, 0.99, 4.5, 1.2, 0.05, "#bd9d61");
  for (const x of [7.7, 8.3])
    cylinder("glass", x, 1.2, 4.5, 0.19, 0.32, "#bbcfcd");
  cylinder("clock rim", 1.8, 1.85, -7.4, 0.66, 0.12, "#bd9d61").rotation.x =
    Math.PI / 2;
  box("breaker cabinet", -2.65, 1, 0.8, 0.35, 1, 0.65, "#6b7882");
  for (const [x, z] of [
    [-10.8, 7.7],
    [10.8, 7.7],
    [-10.8, -7.8],
  ]) {
    cylinder("planter", x, 0.32, z, 0.6, 0.6, "#ac7955");
    for (let k = 0; k < 3; k++) {
      const leaf = MeshBuilder.CreateSphere(
        "leaves",
        { diameter: 0.8, segments: 5 },
        scene,
      );
      leaf.position.set(x + Math.sin(k * 2) * 0.2, 0.95 + k * 0.2, z);
      leaf.scaling.y = 1.4;
      leaf.material = material("#426858");
      leaf.isPickable = false;
      staticMeshes.push(leaf);
    }
  }
  for (const [x, z] of [
    [-7.5, 4],
    [10.4, -6.5],
  ]) {
    cylinder("lamp stand", x, 1.45, z, 0.06, 0.7, "#bd9d61");
    const shade = MeshBuilder.CreateCylinder(
      "lamp shade",
      { diameterTop: 0.3, diameterBottom: 0.7, height: 0.4, tessellation: 12 },
      scene,
    );
    shade.position.set(x, 1.9, z);
    shade.material = material("#e8c98a", true);
    shade.isPickable = false;
    staticMeshes.push(shade);
  }
  const groups = new Map<StandardMaterial, Mesh[]>();
  for (const mesh of staticMeshes) {
    const mat = mesh.material as StandardMaterial;
    groups.set(mat, [...(groups.get(mat) ?? []), mesh]);
  }
  for (const group of groups.values()) {
    const merged = Mesh.MergeMeshes(group, true, true, undefined, false, false);
    merged?.freezeWorldMatrix();
    if (merged) merged.isPickable = false;
  }
  const markers = new Map<string, Mesh>();
  for (const h of hotspots) {
    const marker = MeshBuilder.CreateTorus(
      h.name,
      { diameter: 0.65, thickness: 0.09, tessellation: 16 },
      scene,
    );
    marker.position.set(h.x, 0.16, h.z);
    marker.material = material(
      h.kind === "suspect" ? "#a98ee8" : "#eac88a",
      true,
    );
    marker.metadata = { target: h.id };
    markers.set(h.id, marker);
    if (h.kind === "suspect") {
      cylinder(`suspect ${h.id}`, h.x, 0.65, h.z, 0.46, 1.1, "#806d76");
      const head = MeshBuilder.CreateSphere(
        "suspect head",
        { diameter: 0.36, segments: 8 },
        scene,
      );
      head.position.set(h.x, 1.37, h.z);
      head.material = material("#c49c83");
      head.metadata = { target: h.id };
      label(h.name.split(" · ")[0], h.x, 1.95, h.z, 2.1);
    }
  }
  const avatars = new Map<
    string,
    { root: TransformNode; tag: Mesh; target: Point }
  >();
  const palette = [
    "#b19aee",
    "#efa675",
    "#80b9a3",
    "#e4be68",
    "#db8999",
    "#83b2d4",
  ];
  let localPosition: Point = { x: 0, z: 6 };
  let frame = 0;
  let low = false;
  let automatic = true;
  let slowFrames = 0;
  let active = true;
  function resize() {
    engine.resize();
    const aspect = canvas.clientWidth / Math.max(1, canvas.clientHeight);
    const half = canvas.clientWidth < 650 ? 8.5 : 14;
    camera.orthoLeft = -half;
    camera.orthoRight = half;
    camera.orthoTop = half / aspect;
    camera.orthoBottom = -half / aspect;
  }
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();
  const pick = (e: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    const hit = scene.pick(e.clientX - rect.left, e.clientY - rect.top);
    if (hit?.pickedMesh?.metadata?.target)
      onPick(hit.pickedMesh.metadata.target);
  };
  canvas.addEventListener("pointerup", pick);
  const lost = (e: Event) => {
    e.preventDefault();
    onStatus("Graphics context lost. Retry the scene to continue.");
  };
  canvas.addEventListener("webglcontextlost", lost);
  let lastRender = 0;
  let renderRequest = 0;
  engine.runRenderLoop(() => {
    if (document.hidden || !active) return;
    renderRequest++;
    if (low && renderRequest % 4 !== 0) return;
    const now = performance.now();
    if (now - lastRender < 33) return;
    lastRender = now;
    for (const { root, target } of avatars.values()) {
      root.position.x += (target.x - root.position.x) * 0.35;
      root.position.z += (target.z - root.position.z) * 0.35;
    }
    if (canvas.clientWidth < 650)
      camera.target = Vector3.Lerp(
        camera.target,
        new Vector3(localPosition.x, 0, localPosition.z - 1),
        0.08,
      );
    else camera.target = Vector3.Lerp(camera.target, Vector3.Zero(), 0.08);
    scene.render();
    frame++;
    if (automatic && frame > 120 && !low) {
      if (engine.getFps() < 28) slowFrames++;
      else slowFrames = Math.max(0, slowFrames - 1);
      if (slowFrames > 90) {
        low = true;
        engine.setHardwareScalingLevel(2);
        onStatus("Scene ready · reduced resolution");
      }
    }
    if (frame === 2) onStatus("Scene ready");
  });
  return {
    update(room) {
      const positions = room.game?.positions ?? {};
      for (const p of room.players) {
        const pos = positions[p.id];
        if (!pos) continue;
        let avatar = avatars.get(p.id);
        if (!avatar) {
          const root = new TransformNode(p.id, scene);
          root.position.set(pos.x, 0, pos.z);
          const torso = MeshBuilder.CreateCylinder(
            "investigator coat",
            {
              height: 0.82,
              diameterTop: 0.4,
              diameterBottom: 0.58,
              tessellation: 10,
            },
            scene,
          );
          torso.position.y = 0.68;
          torso.parent = root;
          torso.material = material(palette[p.avatar]);
          torso.isPickable = false;
          const head = MeshBuilder.CreateSphere(
            "investigator head",
            { diameter: 0.35, segments: 8 },
            scene,
          );
          head.position.y = 1.3;
          head.parent = root;
          head.material = material("#d5b596");
          head.isPickable = false;
          for (const x of [-0.13, 0.13]) {
            const leg = MeshBuilder.CreateBox(
              "leg",
              { width: 0.16, height: 0.3, depth: 0.18 },
              scene,
            );
            leg.position.set(x, 0.17, 0);
            leg.parent = root;
            leg.material = material("#1b2734");
            leg.isPickable = false;
          }
          const ring = MeshBuilder.CreateTorus(
            "player ring",
            { diameter: 0.8, thickness: 0.035, tessellation: 16 },
            scene,
          );
          ring.position.y = 0.1;
          ring.parent = root;
          ring.material = material(
            p.id === localId ? "#ffffff" : "#ae9ccb",
            true,
          );
          ring.isPickable = false;
          const tag = label(
            p.name + (p.id === localId ? " · you" : ""),
            0,
            1.8,
            0,
            2.2,
          );
          tag.parent = root;
          avatar = { root, tag, target: pos };
          avatars.set(p.id, avatar);
        }
        avatar.target = pos;
        avatar.tag.setEnabled(p.connected);
        if (p.id === localId) localPosition = pos;
      }
      for (const [id, a] of avatars)
        if (!room.players.some((p) => p.id === id)) {
          a.root.dispose();
          avatars.delete(id);
        }
      for (const h of hotspots) {
        const found = room.game?.evidence.some((e) => e.id === h.id);
        markers.get(h.id)!.material = material(
          found ? "#78c4a0" : h.kind === "suspect" ? "#a98ee8" : "#eac88a",
          true,
        );
      }
    },
    setQuality(reduced) {
      automatic = false;
      low = reduced;
      engine.setHardwareScalingLevel(
        reduced ? 2 : Math.max(1, window.devicePixelRatio / 1.5),
      );
      onStatus(reduced ? "Scene ready · reduced resolution" : "Scene ready");
    },
    setActive(next) {
      active = next;
    },
    dispose() {
      observer.disconnect();
      canvas.removeEventListener("pointerup", pick);
      canvas.removeEventListener("webglcontextlost", lost);
      engine.stopRenderLoop();
      scene.dispose();
      engine.dispose();
    },
  };
}
