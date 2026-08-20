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
  name: string;
  count: number;
}

function buildPoints(snapshot: InfraSnapshot): GlobePoint[] {
  const locationsById = new Map(snapshot.nodeLocations.map((location) => [location.uuid, location]));
  const points = snapshot.nodes.flatMap((node) => {
    const location = locationsById.get(node.uuid);
    if (location) {
      const place = [location.city, location.country].filter(Boolean).join(", ");
      return [{ lat: location.lat, lng: location.lng, name: place ? `${node.name} · ${place}` : node.name, count: 1 }];
    }
    const fallback = flagToRegionInfo(node.region);
    return fallback ? [{ lat: fallback.lat, lng: fallback.lng, name: node.name, count: 1 }] : [];
  });

  if (points.length) return spreadOverlappingPoints(points);
  return snapshot.regionBreakdown.flatMap(({ flag, count }) => {
    const info = flagToRegionInfo(flag);
    return info ? [{ lat: info.lat, lng: info.lng, name: info.name, count }] : [];
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
      const radius = 0.28 + Math.floor(index / 8) * 0.12;
      return {
        ...point,
        lat: Math.max(-89.9, Math.min(89.9, point.lat + Math.sin(angle) * radius)),
        lng: point.lng + Math.cos(angle) * radius,
      };
    });
  });
}

function cssVar(name: string, fallback: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
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
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let accent = cssVar("--accent", "#3b4fa3");
  let textColor = cssVar("--text", "#f5f4f1");
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
  renderer.domElement.setAttribute("aria-label", "Interactive globe showing server regions");
  renderer.domElement.dataset.nodeCount = String(points.length);
  renderer.domElement.dataset.preciseLocationCount = String(snapshot.nodeLocations.length);

  scene.add(new THREE.AmbientLight(0xffffff, 1.1));
  const frontLight = new THREE.DirectionalLight(0xffffff, 0.65);
  frontLight.position.set(200, 180, 250);
  scene.add(frontLight);
  const fillLightLeft = new THREE.DirectionalLight(0xffffff, 0.28);
  fillLightLeft.position.set(-260, 60, 120);
  scene.add(fillLightLeft);
  const rimLight = new THREE.DirectionalLight(0xffffff, 0.22);
  rimLight.position.set(0, -120, -260);
  scene.add(rimLight);

  const globeMaterial = new THREE.MeshPhongMaterial({ color: new THREE.Color(globeBase), shininess: 14, transparent: true, opacity: 0.96 });

  const globe = new ThreeGlobe()
    .globeMaterial(globeMaterial)
    .polygonsData(countries.features)
    .polygonCapColor(() => hexToRgba(accent, 0.12))
    .polygonSideColor(() => hexToRgba(accent, 0.04))
    .polygonStrokeColor(() => hexToRgba(accent, 0.48))
    .polygonAltitude(0.004)
    .showGraticules(true)
    .showAtmosphere(true)
    .atmosphereColor(accent)
    .atmosphereAltitude(0.18)
    .pointsData(points)
    .pointLat("lat")
    .pointLng("lng")
    .pointColor(() => accent)
    .pointAltitude(0.018)
    .pointRadius(0.42);

  globe
    .labelsData(points)
    .labelLat("lat")
    .labelLng("lng")
    .labelText((d) => {
      const point = d as GlobePoint;
      return point.count > 1 ? `${point.name} · ${point.count}` : point.name;
    })
    .labelSize(1.15)
    .labelColor(() => textColor)
    .labelDotRadius(0.32)
    .labelDotOrientation("bottom")
    .labelResolution(3)
    .labelAltitude(0.022);

  if (!reduceMotion) {
    globe.ringsData(points).ringLat("lat").ringLng("lng").ringColor(() => (t: number) => hexToRgba(accent, 1 - t)).ringMaxRadius(5).ringPropagationSpeed(1.5).ringRepeatPeriod(2200);
  }
  scene.add(globe);

  function repaint(): void {
    accent = cssVar("--accent", "#3b4fa3");
    textColor = cssVar("--text", "#f5f4f1");
    globeBase = cssVar("--bg-elevated", "#1b1e26");
    globeMaterial.color.set(globeBase);
    globe
      .polygonCapColor(() => hexToRgba(accent, 0.12))
      .polygonSideColor(() => hexToRgba(accent, 0.04))
      .polygonStrokeColor(() => hexToRgba(accent, 0.48))
      .atmosphereColor(accent)
      .pointColor(() => accent)
      .labelColor(() => textColor);
    if (!reduceMotion) {
      globe.ringColor(() => (t: number) => hexToRgba(accent, 1 - t));
    }
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
    renderer.dispose();
    scene.clear();
    if (renderer.domElement.parentElement === container) container.removeChild(renderer.domElement);
  };
}
