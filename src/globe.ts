import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import ThreeGlobe from "three-globe";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import countriesTopology from "world-atlas/countries-110m.json";
import type { InfraSnapshot } from "./komari";
import { flagToRegionInfo } from "./data/regions";
import { onThemeChange } from "./theme";

interface GlobePoint {
  lat: number;
  lng: number;
  count: number;
}

interface GlobeLight {
  lat: number;
  lng: number;
  altitude: number;
  size: number;
  kind: "core" | "spark";
}

function buildPoints(snapshot: InfraSnapshot): GlobePoint[] {
  const locationsById = new Map(snapshot.nodeLocations.map((location) => [location.uuid, location]));
  const points = snapshot.nodes.flatMap((node) => {
    const location = locationsById.get(node.uuid);
    if (location) {
      return [{ lat: location.lat, lng: location.lng, count: 1 }];
    }
    const fallback = flagToRegionInfo(node.region);
    return fallback ? [{ lat: fallback.lat, lng: fallback.lng, count: 1 }] : [];
  });

  if (points.length) return spreadOverlappingPoints(points);
  return snapshot.regionBreakdown.flatMap(({ flag, count }) => {
    const info = flagToRegionInfo(flag);
    return info ? [{ lat: info.lat, lng: info.lng, count }] : [];
  });
}

function spreadOverlappingPoints(points: GlobePoint[]): GlobePoint[] {
  const groups = new Map<string, GlobePoint[]>();
  for (const point of points) {
    const key = `${point.lat.toFixed(3)},${point.lng.toFixed(3)}`;
    const group = groups.get(key) ?? [];
    group.push(point);
    groups.set(key, group);
  }

  return Array.from(groups.values()).flatMap((group) => {
    if (group.length === 1) return group;
    return group.map((point, index) => {
      const angle = (index / group.length) * Math.PI * 2;
      const radius = 0.65 + index * 0.72;
      return {
        ...point,
        lat: Math.max(-89.9, Math.min(89.9, point.lat + Math.sin(angle) * radius)),
        lng: point.lng + Math.cos(angle) * radius,
      };
    });
  });
}

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const MAX_LIGHTS = 420;

function seededNoise(seed: number): number {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

function wrapLongitude(lng: number): number {
  return ((lng + 540) % 360) - 180;
}

function buildLightField(points: GlobePoint[]): GlobeLight[] {
  const sparkCount = points.length <= 12 ? 10 : points.length <= 50 ? 8 : points.length <= 90 ? 5 : 2;
  const lights: GlobeLight[] = [];

  for (const [pointIndex, point] of points.entries()) {
    if (lights.length >= MAX_LIGHTS) break;
    lights.push({ lat: point.lat, lng: point.lng, altitude: 0.006, size: 3.1, kind: "core" });

    const densityBoost = Math.min(4, Math.max(0, Math.round(point.count) - 1));
    const clusterSize = sparkCount + densityBoost;
    const seed = Math.abs(Math.round((point.lat + 90) * 997 + (point.lng + 180) * 619 + pointIndex * 7919));
    const longitudeScale = Math.max(0.35, Math.cos(THREE.MathUtils.degToRad(point.lat)));

    for (let index = 0; index < clusterSize && lights.length < MAX_LIGHTS; index += 1) {
      const noise = seededNoise(seed + index * 17);
      const angle = index * GOLDEN_ANGLE + noise * 0.8;
      const radius = 0.9 + Math.sqrt((index + 0.5) / clusterSize) * (4.2 + noise * 0.85);
      lights.push({
        lat: THREE.MathUtils.clamp(point.lat + Math.cos(angle) * radius, -89.8, 89.8),
        lng: wrapLongitude(point.lng + (Math.sin(angle) * radius) / longitudeScale),
        altitude: 0.0035 + noise * 0.002,
        size: 1.75 + noise * 0.75,
        kind: "spark",
      });
    }
  }

  return lights;
}

function createGlowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const context = canvas.getContext("2d");
  if (!context) return new THREE.CanvasTexture(canvas);

  const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
  gradient.addColorStop(0.18, "rgba(255, 255, 255, 0.96)");
  gradient.addColorStop(0.44, "rgba(255, 255, 255, 0.42)");
  gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 64, 64);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function cssVar(name: string, fallback: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

function lightColor(accent: string): THREE.Color {
  return new THREE.Color(accent).lerp(new THREE.Color(cssVar("--text", "#f5f4f1")), 0.38);
}

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function sizeOf(container: HTMLElement): { width: number; height: number } {
  const rect = container.getBoundingClientRect();
  return { width: Math.max(1, Math.round(rect.width || 320)), height: Math.max(1, Math.round(rect.height || 320)) };
}

export function mountGlobe(container: HTMLElement, snapshot: InfraSnapshot): () => void {
  const points = buildPoints(snapshot);
  const lights = buildLightField(points);
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let accent = cssVar("--accent", "#3b4fa3");
  let globeBase = cssVar("--bg-elevated", "#1b1e26");
  const topology = countriesTopology as unknown as Topology;
  const countries = feature(topology, topology.objects.countries as GeometryCollection);
  const initialSize = sizeOf(container);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, initialSize.width / initialSize.height, 0.1, 2000);
  camera.position.set(0, 0, 280);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(initialSize.width, initialSize.height);
  renderer.setClearColor(0x000000, 0);
  container.replaceChildren(renderer.domElement);
  renderer.domElement.style.cursor = "grab";
  renderer.domElement.setAttribute("aria-label", "Interactive globe visualizing global infrastructure distribution");
  renderer.domElement.dataset.nodeCount = String(points.length);
  renderer.domElement.dataset.visualLightCount = String(lights.length);
  renderer.domElement.dataset.preciseLocationCount = String(snapshot.nodeLocations.length);

  scene.add(new THREE.AmbientLight(0xffffff, 0.82));
  const frontLight = new THREE.DirectionalLight(0xffffff, 0.58);
  frontLight.position.set(200, 180, 250);
  scene.add(frontLight);
  const fillLightLeft = new THREE.DirectionalLight(0xffffff, 0.28);
  fillLightLeft.position.set(-260, 60, 120);
  scene.add(fillLightLeft);
  const rimLight = new THREE.DirectionalLight(0xffffff, 0.22);
  rimLight.position.set(0, -120, -260);
  scene.add(rimLight);

  const globeMaterial = new THREE.MeshPhongMaterial({
    color: new THREE.Color(globeBase),
    emissive: new THREE.Color(accent),
    emissiveIntensity: 0.045,
    shininess: 9,
    transparent: true,
    opacity: 0.98,
  });
  const glowTexture = createGlowTexture();
  const coreLightMaterial = new THREE.SpriteMaterial({
    map: glowTexture,
    color: lightColor(accent),
    transparent: true,
    opacity: 0.98,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const sparkLightMaterial = new THREE.SpriteMaterial({
    map: glowTexture,
    color: lightColor(accent),
    transparent: true,
    opacity: 0.86,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const globe = new ThreeGlobe()
    .globeMaterial(globeMaterial)
    .polygonsData(countries.features)
    .polygonCapColor(() => hexToRgba(accent, 0.075))
    .polygonSideColor(() => hexToRgba(accent, 0.018))
    .polygonStrokeColor(() => hexToRgba(accent, 0.24))
    .polygonAltitude(0.0025)
    .showGraticules(true)
    .showAtmosphere(true)
    .atmosphereColor(accent)
    .atmosphereAltitude(0.14);

  globe
    .customLayerData(lights)
    .customThreeObject((datum) => {
      const light = datum as GlobeLight;
      const sprite = new THREE.Sprite(light.kind === "core" ? coreLightMaterial : sparkLightMaterial);
      sprite.scale.setScalar(light.size);
      return sprite;
    })
    .customThreeObjectUpdate((object, datum) => {
      const light = datum as GlobeLight;
      const { x, y, z } = globe.getCoords(light.lat, light.lng, light.altitude);
      object.position.set(x, y, z);
    });
  scene.add(globe);
  const initialView = globe.getCoords(24, 110, 1.8);
  camera.position.set(initialView.x, initialView.y, initialView.z);
  camera.lookAt(0, 0, 0);

  function repaint(): void {
    accent = cssVar("--accent", "#3b4fa3");
    globeBase = cssVar("--bg-elevated", "#1b1e26");
    globeMaterial.color.set(globeBase);
    globeMaterial.emissive.set(accent);
    coreLightMaterial.color.copy(lightColor(accent));
    sparkLightMaterial.color.copy(lightColor(accent));
    globe
      .polygonCapColor(() => hexToRgba(accent, 0.075))
      .polygonSideColor(() => hexToRgba(accent, 0.018))
      .polygonStrokeColor(() => hexToRgba(accent, 0.24))
      .atmosphereColor(accent);
  }
  const unsubscribeTheme = onThemeChange(repaint);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableZoom = false;
  controls.enablePan = false;
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.rotateSpeed = 0.55;
  controls.autoRotate = !reduceMotion;
  controls.autoRotateSpeed = 0.45;
  controls.minDistance = 180;
  controls.maxDistance = 400;

  let frameId = 0;
  const animate = () => {
    frameId = requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  };
  animate();

  const resizeObserver = new ResizeObserver(() => {
    const { width, height } = sizeOf(container);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  });
  resizeObserver.observe(container);

  const handlePointerDown = () => {
    renderer.domElement.style.cursor = "grabbing";
  };
  const handlePointerUp = () => {
    renderer.domElement.style.cursor = "grab";
  };
  renderer.domElement.addEventListener("pointerdown", handlePointerDown);
  renderer.domElement.addEventListener("pointerup", handlePointerUp);

  return () => {
    cancelAnimationFrame(frameId);
    resizeObserver.disconnect();
    unsubscribeTheme();
    renderer.domElement.removeEventListener("pointerdown", handlePointerDown);
    renderer.domElement.removeEventListener("pointerup", handlePointerUp);
    controls.dispose();
    globe._destructor();
    globeMaterial.dispose();
    coreLightMaterial.dispose();
    sparkLightMaterial.dispose();
    glowTexture.dispose();
    renderer.dispose();
    scene.clear();
    if (renderer.domElement.parentElement === container) container.removeChild(renderer.domElement);
  };
}
