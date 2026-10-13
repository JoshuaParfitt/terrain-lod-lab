import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import './style.css';

const TILE_COUNT = 7;
const TILE_SIZE = 18;
const RESOLUTIONS = [48, 16, 4]; // Each grid produces 2 * segments^2 triangles.
const LOD_DISTANCES = [42, 91]; // World-space camera-to-tile-center thresholds.

const scene = new THREE.Scene();
scene.background = new THREE.Color('#0b1827');
scene.fog = new THREE.FogExp2('#0b1827', 0.009);

const camera = new THREE.PerspectiveCamera(57, innerWidth / innerHeight, 0.1, 500);
camera.position.set(65, 63, 78);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.querySelector('#viewport').appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.maxDistance = 220;
controls.minDistance = 8;
controls.target.set(0, 7, 0);
controls.update();

scene.add(new THREE.HemisphereLight('#cce8ff', '#314252', 2.2));
const sun = new THREE.DirectionalLight('#fff5da', 2.6);
sun.position.set(-55, 100, 45);
scene.add(sun);

// Continuous height function ensures tile edges line up at every resolution.
function heightAt(x, z) {
  const hills = 10 * Math.sin(x * 0.037 + 0.4) * Math.cos(z * 0.052);
  const ridges = 5.8 * Math.sin(x * 0.095 + z * 0.047) * Math.sin(z * 0.081 - x * 0.023);
  const micro = 1.1 * Math.sin(x * 0.29) * Math.cos(z * 0.24);
  return hills + ridges + micro + 9;
}

function makeTileGeometry(cx, cz, segments) {
  const geometry = new THREE.PlaneGeometry(TILE_SIZE, TILE_SIZE, segments, segments);
  geometry.rotateX(-Math.PI / 2);
  const positions = geometry.attributes.position;
  const colors = [];
  const low = new THREE.Color('#1c717d');
  const high = new THREE.Color('#d9c7a4');
  const peak = new THREE.Color('#eef4f7');
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i) + cx;
    const z = positions.getZ(i) + cz;
    const y = heightAt(x, z);
    positions.setY(i, y);
    const t = THREE.MathUtils.clamp((y - 4) / 21, 0, 1);
    const c = low.clone().lerp(high, t);
    if (t > 0.75) c.lerp(peak, (t - 0.75) * 2.0);
    colors.push(c.r, c.g, c.b);
  }
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  return geometry;
}

const material = new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.93 });
const tiles = [];
for (let z = 0; z < TILE_COUNT; z++) {
  for (let x = 0; x < TILE_COUNT; x++) {
    const cx = (x - (TILE_COUNT - 1) / 2) * TILE_SIZE;
    const cz = (z - (TILE_COUNT - 1) / 2) * TILE_SIZE;
    const meshes = RESOLUTIONS.map(segments => {
      const mesh = new THREE.Mesh(makeTileGeometry(cx, cz, segments), material);
      mesh.position.set(cx, 0, cz);
      mesh.visible = false;
      scene.add(mesh);
      return mesh;
    });
    tiles.push({ cx, cz, meshes, level: -1 });
  }
}

const fullTriangles = tiles.length * (2 * RESOLUTIONS[0] ** 2);
document.querySelector('#baseline').textContent = fullTriangles.toLocaleString();
const modeInput = document.querySelector('#mode');
document.querySelector('#wireframe').addEventListener('change', e => { material.wireframe = e.target.checked; });
document.querySelector('#rotate').addEventListener('change', e => { controls.autoRotate = e.target.checked; });

// Our own distance-to-resolution policy. Geometry is prebuilt; only its visibility changes.
function chooseLevel(tile) {
  if (modeInput.value === 'high') return 0;
  if (modeInput.value === 'low') return 2;
  const dx = camera.position.x - tile.cx;
  const dy = camera.position.y - heightAt(tile.cx, tile.cz);
  const dz = camera.position.z - tile.cz;
  const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
  return distance < LOD_DISTANCES[0] ? 0 : distance < LOD_DISTANCES[1] ? 1 : 2;
}

let lastFrame = performance.now();
let frameCounter = 0;
let measuredFps = 0;
let statsTime = lastFrame;
function animate(now) {
  requestAnimationFrame(animate);
  controls.update();
  const counts = [0, 0, 0];
  for (const tile of tiles) {
    const level = chooseLevel(tile);
    counts[level]++;
    if (tile.level !== level) {
      tile.meshes.forEach((mesh, index) => { mesh.visible = index === level; });
      tile.level = level;
    }
  }
  renderer.render(scene, camera);
  frameCounter++;
  if (now - statsTime > 400) {
    measuredFps = Math.round((frameCounter * 1000) / (now - statsTime));
    frameCounter = 0;
    statsTime = now;
    // Include ONLY terrain triangles. No frustum-culling correction is attempted.
    const triangles = counts.reduce((sum, count, i) => sum + count * 2 * RESOLUTIONS[i] ** 2, 0);
    document.querySelector('#triangles').textContent = triangles.toLocaleString();
    document.querySelector('#reduction').textContent = `${((1 - triangles / fullTriangles) * 100).toFixed(1)}%`;
    document.querySelector('#fps').textContent = String(measuredFps);
    document.querySelector('#levels').textContent = counts.join(' / ');
  }
  lastFrame = now;
}
requestAnimationFrame(animate);
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
