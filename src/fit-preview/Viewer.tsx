import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import type { Body, PanelMesh, SimulationFrame } from "./types";

export interface ViewerOptions { body: boolean; garment: boolean; wire: boolean; strain: boolean; strainMode: "absolute" | "extension" | "compression"; seams: boolean; selected: string; camera: string }
interface Props { body: Body; meshes: PanelMesh[]; pins: number[]; frame: SimulationFrame | null; options: ViewerOptions; onSelect: (id: string) => void; onError: (message: string) => void }

function bodyMesh(body: Body) {
  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({ color: "#737e78", roughness: 0.82, metalness: 0.06 });
  const positions: number[] = [], indices: number[] = [];
  body.rings.forEach((r, row) => {
    for (let j = 0; j < 64; j++) {
      const theta = j / 64 * Math.PI * 2;
      positions.push(Math.sin(theta) * r.rx, r.y, Math.cos(theta) * r.rz);
      if (row > 0) {
        const a = (row - 1) * 64 + j, b = (row - 1) * 64 + (j + 1) % 64, c = row * 64 + j, d = row * 64 + (j + 1) % 64;
        indices.push(a, b, c, b, d, c);
      }
    }
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  material.side = THREE.DoubleSide;
  group.add(new THREE.Mesh(geometry, material));
  for (const arm of body.arms) {
    const a = new THREE.Vector3(...arm.a), b = new THREE.Vector3(...arm.b);
    const segment = new THREE.Mesh(new THREE.CylinderGeometry(arm.r1, arm.r0, a.distanceTo(b), 24), material);
    segment.position.copy(a).add(b).multiplyScalar(0.5);
    segment.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
    group.add(segment);
    const joint = new THREE.Mesh(new THREE.SphereGeometry(arm.r0, 24, 16), material);
    joint.position.copy(a); group.add(joint);
  }
  const head = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 24), material);
  head.scale.set(8, 11, 8.3); head.position.set(0, body.neckY + 15, 0); group.add(head);
  group.traverse((object) => { object.castShadow = true; object.receiveShadow = true; });
  return group;
}

export default function Viewer(props: Props) {
  const host = useRef<HTMLDivElement>(null);
  const latest = useRef(props); latest.current = props;
  useEffect(() => {
    if (!host.current) return;
    const container = host.current;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true }); }
    catch { latest.current.onError("WebGL 2 is unavailable. Enable graphics acceleration or try another desktop browser."); return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor("#e1e4dc");
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    renderer.domElement.setAttribute("aria-label", "Interactive 3D garment preview. Drag to orbit, scroll to zoom, click a garment panel to select it.");
    renderer.domElement.setAttribute("role", "img");
    container.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight("#fffdf4", "#71817a", 2.2));
    const light = new THREE.DirectionalLight("#fff5df", 3);
    light.position.set(-60, 150, 100); light.castShadow = true;
    light.shadow.mapSize.set(2048, 2048);
    Object.assign(light.shadow.camera, { left: -110, right: 110, top: 110, bottom: -110, near: 0.5, far: 400 });
    light.shadow.bias = -0.0005; scene.add(light);
    const fill = new THREE.DirectionalLight("#e4f0ff", 1.3); fill.position.set(80, 50, -100); scene.add(fill);
    const mannequin = bodyMesh(props.body); scene.add(mannequin);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(2000, 2000), new THREE.MeshStandardMaterial({ color: "#e1e4dc", roughness: 1 }));
    floor.rotation.x = -Math.PI / 2; floor.position.y = -35; floor.receiveShadow = true; scene.add(floor);
    const grid = new THREE.GridHelper(250, 25, "#bac3b7", "#cbd1c7"); grid.position.y = -34.9; scene.add(grid);
    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(25, 26, 3, 64), new THREE.MeshStandardMaterial({ color: "#bcc5b9", roughness: 1 }));
    plinth.position.y = props.body.rings[0].y - 1.5; plinth.receiveShadow = true; scene.add(plinth);
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 2000);
    camera.position.set(115, 64, 210);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 17, 0); controls.enableDamping = true; controls.minDistance = 70; controls.maxDistance = 450; controls.maxPolarAngle = Math.PI * 0.85;
    const cloth = props.meshes.map((m) => {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(m.points.length * 3), 3));
      geometry.setAttribute("color", new THREE.BufferAttribute(new Float32Array(m.points.length * 3).fill(1), 3));
      geometry.setIndex(m.triangles);
      const material = new THREE.MeshStandardMaterial({ color: m.panel.color, side: THREE.DoubleSide, roughness: 0.94, metalness: 0.02 });
      const mesh = new THREE.Mesh(geometry, material); mesh.name = m.panel.id; mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false; scene.add(mesh);
      const boundaryPairs = m.edges.flatMap((edge) => edge.slice(1).flatMap((id, i) => [edge[i], id]));
      const lines = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: "#274c42", transparent: true, opacity: 0.7, depthTest: false }));
      lines.geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(boundaryPairs.length * 3), 3));
      lines.frustumCulled = false; lines.renderOrder = 2; scene.add(lines);
      return { m, mesh, lines, boundaryPairs };
    });
    const supports = props.pins.map((id) => {
      const marker = new THREE.Mesh(new THREE.SphereGeometry(0.65, 12, 8), new THREE.MeshBasicMaterial({ color: "#d88635", depthTest: false }));
      marker.renderOrder = 3; scene.add(marker); return { id, marker };
    });
    const ray = new THREE.Raycaster();
    let down: [number, number] = [0, 0];
    const onDown = (event: PointerEvent) => { down = [event.clientX, event.clientY]; };
    const onClick = (event: PointerEvent) => {
      if (Math.hypot(event.clientX - down[0], event.clientY - down[1]) > 4) return;
      const rect = renderer.domElement.getBoundingClientRect();
      ray.setFromCamera(new THREE.Vector2((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1), camera);
      const hit = ray.intersectObjects(cloth.filter((c) => c.mesh.visible).map((c) => c.mesh))[0];
      if (hit) latest.current.onSelect(hit.object.name);
    };
    renderer.domElement.addEventListener("pointerdown", onDown);
    renderer.domElement.addEventListener("pointerup", onClick);
    const contextLost = (event: Event) => { event.preventDefault(); latest.current.onError("Graphics context lost. Reload the preview to restart rendering."); };
    renderer.domElement.addEventListener("webglcontextlost", contextLost);
    const resize = new ResizeObserver(() => {
      const { width, height } = container.getBoundingClientRect();
      if (width === 0 || height === 0) return;
      renderer.setSize(width, height); camera.aspect = width / height; camera.updateProjectionMatrix();
    }); resize.observe(container);
    let lastFrame: SimulationFrame | null = null, lastStrain = false, lastStrainMode = "extension", cameraMode = "orbit";
    const neutral = new THREE.Color("#789487"), hot = new THREE.Color("#c65d39"), color = new THREE.Color();
    let request = 0;
    const render = () => {
      const { frame, options } = latest.current;
      for (const { id, marker } of supports) { marker.visible = options.garment && !!frame; if (frame) marker.position.fromArray(frame.positions, id * 3); }
      mannequin.visible = options.body;
      if (options.camera !== cameraMode) {
        cameraMode = options.camera;
        const view = cameraMode.split(":")[0];
        camera.position.set(...(view === "front" ? [0, 22, 240] : view === "back" ? [0, 22, -240] : view === "side" ? [240, 22, 0] : [115, 64, 210]) as [number, number, number]);
        controls.target.set(0, 17, 0);
      }
      for (const c of cloth) {
        c.mesh.visible = options.garment; c.lines.visible = options.garment && options.seams;
        c.mesh.material.wireframe = options.wire;
        c.mesh.material.emissive.set(c.m.panel.id === options.selected ? "#253a13" : "#000000");
        if (frame && (frame !== lastFrame || options.strain !== lastStrain || options.strainMode !== lastStrainMode)) {
          const attr = c.mesh.geometry.getAttribute("position") as THREE.BufferAttribute;
          (attr.array as Float32Array).set(frame.positions.subarray(c.m.start * 3, (c.m.start + c.m.points.length) * 3)); attr.needsUpdate = true;
          c.mesh.geometry.computeVertexNormals();
          c.mesh.geometry.computeBoundingSphere();
          const colors = c.mesh.geometry.getAttribute("color") as THREE.BufferAttribute;
          const values = options.strainMode === "absolute" ? frame.strain : frame[options.strainMode];
          for (let i = 0; i < c.m.points.length; i++) { color.copy(neutral).lerp(hot, Math.min(1, values[c.m.start + i] / 0.2)); colors.setXYZ(i, color.r, color.g, color.b); }
          colors.needsUpdate = true;
          const vertices = c.lines.geometry.getAttribute("position") as THREE.BufferAttribute;
          c.boundaryPairs.forEach((id, i) => vertices.setXYZ(i, attr.getX(id), attr.getY(id), attr.getZ(id))); vertices.needsUpdate = true;
        }
        if (c.mesh.material.vertexColors !== options.strain) { c.mesh.material.vertexColors = options.strain; c.mesh.material.color.set(options.strain ? "#ffffff" : c.m.panel.color); c.mesh.material.needsUpdate = true; }
      }
      lastFrame = frame; lastStrain = options.strain; lastStrainMode = options.strainMode;
      controls.update(); renderer.render(scene, camera); request = requestAnimationFrame(render);
    }; render();
    return () => {
      cancelAnimationFrame(request); resize.disconnect(); controls.dispose();
      renderer.domElement.removeEventListener("pointerdown", onDown); renderer.domElement.removeEventListener("pointerup", onClick); renderer.domElement.removeEventListener("webglcontextlost", contextLost);
      scene.traverse((object) => {
        const mesh = object as THREE.Mesh;
        mesh.geometry?.dispose();
        if (mesh.material) (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach((m) => m.dispose());
      });
      renderer.dispose(); renderer.domElement.remove();
    };
  }, [props.body, props.meshes, props.pins]);
  return <div ref={host} style={{ width: "100%", height: "100%" }} />;
}
