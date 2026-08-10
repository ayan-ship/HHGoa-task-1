/* Vanilla port of the React <ModelViewer /> component.
   Prop names kept 1:1 so the config below reads like the JSX. */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const CONFIG = {
  url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/ToyCar/glTF-Binary/ToyCar.glb',
  /* offsets are in model-units, where the fitted model is ~1.35 wide —
     your 0.5 pushed it off-frame in this square stage, so it's dialled back */
  modelXOffset: 0.08,
  modelYOffset: 0.16,
  enableMouseParallax: true,
  enableHoverRotation: true,
  environmentPreset: 'room',
  fadeIn: false,
  autoRotate: false,
  autoRotateSpeed: 0.35
};

const stage = document.getElementById('model-stage');
const canvas = document.getElementById('model-canvas');
const loadingEl = document.getElementById('model-loading');

if (stage && canvas) {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(0, 0.32, 2.15);
  camera.lookAt(0, 0, 0);

  /* drei's HDRI presets ("forest" etc.) need an .hdr download.
     RoomEnvironment gives equivalent image-based lighting with no extra request. */
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const key = new THREE.DirectionalLight(0xffffff, 2.0);
  key.position.set(3, 4, 2);
  scene.add(key);
  scene.add(new THREE.AmbientLight(0xffffff, 0.35));

  /* root = offsets + parallax drift · pivot = rotation */
  const root = new THREE.Group();
  const pivot = new THREE.Group();
  root.add(pivot);
  scene.add(root);
  root.position.set(CONFIG.modelXOffset, CONFIG.modelYOffset, 0);
  pivot.rotation.y = -0.7;

  function resize() {
    const w = stage.clientWidth;
    const h = stage.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  new ResizeObserver(resize).observe(stage);

  /* ---------- pointer ---------- */
  const pointer = { x: 0, y: 0 };   /* window-wide, drives parallax */
  const local = { x: 0, y: 0 };     /* over the stage, drives hover rotation */
  let hovering = false;

  window.addEventListener('pointermove', (e) => {
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
  }, { passive: true });

  stage.addEventListener('pointermove', (e) => {
    const r = stage.getBoundingClientRect();
    local.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    local.y = -((e.clientY - r.top) / r.height) * 2 + 1;
    hovering = true;
  }, { passive: true });

  stage.addEventListener('pointerleave', () => { hovering = false; });

  /* ---------- load ---------- */
  let model = null;
  let opacity = CONFIG.fadeIn ? 0 : 1;

  function fitModel(gltf) {
    const obj = gltf.scene;
    const box = new THREE.Box3().setFromObject(obj);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    obj.position.sub(center);              /* centre the geometry on the origin */
    const holder = new THREE.Group();      /* scale the already-centred group */
    holder.add(obj);
    /* FILL > 1 because this model's bounding box is dominated by its wide base,
       which would otherwise leave the car tiny in the middle of the frame.
       Above ~1.45 the outermost folds of the cloth bleed past the square stage —
       that's deliberate, it's what buys the car real vertical size. */
    const FILL = 1.95;
    holder.scale.setScalar(FILL / Math.max(size.x, size.y, size.z));

    if (CONFIG.fadeIn) {
      obj.traverse((n) => {
        if (n.isMesh) { n.material.transparent = true; n.material.opacity = 0; }
      });
    }

    pivot.add(holder);
    model = obj;
    loadingEl?.remove();
  }

  function load() {
    new GLTFLoader().load(
      CONFIG.url,
      fitModel,
      undefined,
      () => {
        if (loadingEl) {
          loadingEl.innerHTML =
            '<span class="rounded-full border-[3px] border-ink bg-rose-300 px-4 py-1.5 text-sm font-extrabold">मॉडल लोड नहीं हुआ</span>';
        }
      }
    );
  }

  /* only pull the 5.8 MB model once the section is actually near the viewport */
  const io = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) { io.disconnect(); load(); }
  }, { rootMargin: '300px' });
  io.observe(stage);

  /* ---------- loop ---------- */
  let visible = false;
  new IntersectionObserver((entries) => {
    visible = entries.some((e) => e.isIntersecting);
  }).observe(stage);

  const clock = new THREE.Clock();
  const PARALLAX = 0.18;
  const TILT = 0.45;

  function frame() {
    requestAnimationFrame(frame);
    if (!visible || document.hidden) { clock.getDelta(); return; }
    const dt = Math.min(clock.getDelta(), 0.05);

    if (CONFIG.enableMouseParallax && !reduced) {
      root.position.x += (CONFIG.modelXOffset + pointer.x * PARALLAX - root.position.x) * 0.05;
      root.position.y += (CONFIG.modelYOffset + pointer.y * PARALLAX * 0.6 - root.position.y) * 0.05;
    }

    if (CONFIG.autoRotate && !reduced) {
      pivot.rotation.y += CONFIG.autoRotateSpeed * dt;
    } else if (CONFIG.enableHoverRotation && !reduced) {
      const ty = -0.7 + (hovering ? local.x * TILT : 0);
      const tx = hovering ? -local.y * TILT * 0.5 : 0;
      pivot.rotation.y += (ty - pivot.rotation.y) * 0.07;
      pivot.rotation.x += (tx - pivot.rotation.x) * 0.07;
    }

    if (CONFIG.fadeIn && model && opacity < 1) {
      opacity = Math.min(1, opacity + dt * 1.2);
      model.traverse((n) => { if (n.isMesh) n.material.opacity = opacity; });
    }

    renderer.render(scene, camera);
  }
  frame();
}
