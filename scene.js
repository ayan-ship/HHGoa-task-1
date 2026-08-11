/* HH Goa 2026 — interactive background
   Particle field + floating shapes. Reacts to pointer move and click. */

import * as THREE from 'three';

(function () {
  var canvas = document.getElementById('bg-canvas');
  if (!canvas) return;

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var isSmall = window.innerWidth < 768;

  var SUN = 0xffd23f, ROSE = 0xff3f8e, ROSE_SOFT = 0xff8fc0, SUN_SOFT = 0xfff4c2;
  var NEON = 0x22d07a; /* hacker-house green — used sparingly */

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 400);
  camera.position.z = 60;

  var renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: !isSmall });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);

  /* ---------- dot sprite ---------- */
  function dotTexture() {
    var c = document.createElement('canvas');
    c.width = c.height = 64;
    var ctx = c.getContext('2d');
    ctx.beginPath();
    ctx.arc(32, 32, 26, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    var t = new THREE.CanvasTexture(c);
    return t;
  }

  /* ---------- particles ---------- */
  var COUNT = isSmall ? 380 : 900;
  var SPREAD_X = 90, SPREAD_Y = 60, SPREAD_Z = 40;

  var positions = new Float32Array(COUNT * 3);
  var home = new Float32Array(COUNT * 3);
  var vel = new Float32Array(COUNT * 3);
  var colors = new Float32Array(COUNT * 3);

  var palette = [SUN, ROSE, ROSE_SOFT, SUN_SOFT, SUN, ROSE, NEON, SUN_SOFT];
  var col = new THREE.Color();

  for (var i = 0; i < COUNT; i++) {
    var i3 = i * 3;
    var x = (Math.random() - 0.5) * SPREAD_X;
    var y = (Math.random() - 0.5) * SPREAD_Y;
    var z = (Math.random() - 0.5) * SPREAD_Z - 10;
    positions[i3] = home[i3] = x;
    positions[i3 + 1] = home[i3 + 1] = y;
    positions[i3 + 2] = home[i3 + 2] = z;

    col.setHex(palette[i % palette.length]);
    colors[i3] = col.r; colors[i3 + 1] = col.g; colors[i3 + 2] = col.b;
  }

  var pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  pGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  var pMat = new THREE.PointsMaterial({
    size: isSmall ? 0.9 : 0.75,
    map: dotTexture(),
    vertexColors: true,
    transparent: true,
    opacity: 0.5,
    alphaTest: 0.4,
    sizeAttenuation: true,
    depthWrite: false
  });

  var points = new THREE.Points(pGeo, pMat);
  scene.add(points);

  /* ---------- floating shapes ---------- */
  var shapes = [];

  function addShape(geo, color, x, y, z, scale) {
    var mat = new THREE.MeshBasicMaterial({
      color: color, transparent: true, opacity: 0.18, wireframe: false
    });
    var mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    mesh.scale.setScalar(scale);
    mesh.userData.spin = (Math.random() - 0.5) * 0.004;
    mesh.userData.tilt = (Math.random() - 0.5) * 0.003;
    mesh.userData.baseY = y;
    mesh.userData.phase = Math.random() * Math.PI * 2;
    scene.add(mesh);
    shapes.push(mesh);
  }

  var ring = new THREE.TorusGeometry(6, 1.6, 8, 28);
  var poly = new THREE.IcosahedronGeometry(5, 0);

  /* kept near the edges so the headline stays clean */
  addShape(ring, ROSE, -68, 30, -30, 1.1);
  addShape(ring, SUN, 66, -26, -28, 1.3);
  addShape(ring, ROSE_SOFT, 54, 36, -34, 0.9);
  addShape(poly, SUN, -58, -30, -26, 1.0);
  addShape(poly, NEON, 74, 14, -38, 0.8);

  if (!isSmall) {
    addShape(ring, SUN, -30, -44, -30, 0.7);
    addShape(poly, ROSE_SOFT, 26, 46, -40, 0.9);
  }

  shapes.forEach(function (s) {
    if (s.geometry === poly) {
      s.material.wireframe = true;
      s.material.opacity = 0.32;
    }
  });

  /* ---------- pointer ---------- */
  var ndc = { x: 0, y: 0 };
  var world = { x: 9999, y: 9999 };
  var parallax = { x: 0, y: 0 };
  var active = false;
  var ripple = { x: 0, y: 0, t: 0 };

  function toWorld() {
    var halfH = Math.tan((camera.fov / 2) * Math.PI / 180) * camera.position.z;
    var halfW = halfH * camera.aspect;
    world.x = ndc.x * halfW;
    world.y = ndc.y * halfH;
  }

  window.addEventListener('pointermove', function (e) {
    ndc.x = (e.clientX / window.innerWidth) * 2 - 1;
    ndc.y = -(e.clientY / window.innerHeight) * 2 + 1;
    active = true;
    toWorld();
  }, { passive: true });

  window.addEventListener('pointerleave', function () { active = false; });

  window.addEventListener('pointerdown', function (e) {
    ndc.x = (e.clientX / window.innerWidth) * 2 - 1;
    ndc.y = -(e.clientY / window.innerHeight) * 2 + 1;
    toWorld();
    ripple.x = world.x;
    ripple.y = world.y;
    ripple.t = 1;
  }, { passive: true });

  /* ---------- loop ---------- */
  var REPEL_R = 15, REPEL_R2 = REPEL_R * REPEL_R;
  var paused = false;
  document.addEventListener('visibilitychange', function () { paused = document.hidden; });

  var clock = new THREE.Clock();

  function frame() {
    requestAnimationFrame(frame);
    if (paused) return;

    var t = clock.getElapsedTime();
    var pos = pGeo.attributes.position.array;

    for (var i = 0; i < COUNT; i++) {
      var i3 = i * 3;
      var px = pos[i3], py = pos[i3 + 1];

      if (active) {
        var dx = px - world.x, dy = py - world.y;
        var d2 = dx * dx + dy * dy;
        if (d2 < REPEL_R2 && d2 > 0.01) {
          var f = (1 - d2 / REPEL_R2) * 0.9;
          var inv = 1 / Math.sqrt(d2);
          vel[i3] += dx * inv * f;
          vel[i3 + 1] += dy * inv * f;
        }
      }

      if (ripple.t > 0) {
        var rx = px - ripple.x, ry = py - ripple.y;
        var rd = Math.sqrt(rx * rx + ry * ry) + 0.001;
        if (rd < 40) {
          var rf = ripple.t * (1 - rd / 40) * 2.2;
          vel[i3] += (rx / rd) * rf;
          vel[i3 + 1] += (ry / rd) * rf;
        }
      }

      vel[i3] += (home[i3] - px) * 0.012;
      vel[i3 + 1] += (home[i3 + 1] - py) * 0.012;
      vel[i3] *= 0.90;
      vel[i3 + 1] *= 0.90;

      pos[i3] = px + vel[i3];
      pos[i3 + 1] = py + vel[i3 + 1] + Math.sin(t * 0.4 + home[i3] * 0.05) * 0.006;
    }

    if (ripple.t > 0) ripple.t = Math.max(0, ripple.t - 0.035);
    pGeo.attributes.position.needsUpdate = true;

    parallax.x += (ndc.x * 4 - parallax.x) * 0.04;
    parallax.y += (ndc.y * 3 - parallax.y) * 0.04;

    points.rotation.y = parallax.x * 0.02;
    points.rotation.x = -parallax.y * 0.02;

    for (var s = 0; s < shapes.length; s++) {
      var m = shapes[s];
      m.rotation.x += m.userData.tilt;
      m.rotation.y += m.userData.spin;
      m.position.y = m.userData.baseY + Math.sin(t * 0.5 + m.userData.phase) * 2.2;
      m.position.x += ((m.userData.baseX === undefined
        ? (m.userData.baseX = m.position.x)
        : m.userData.baseX) + parallax.x * 1.6 - m.position.x) * 0.05;
    }

    camera.position.x += (parallax.x * 0.6 - camera.position.x) * 0.05;
    camera.position.y += (parallax.y * 0.6 - camera.position.y) * 0.05;
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);
  }

  window.addEventListener('resize', function () {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  if (reduced) {
    renderer.render(scene, camera);
  } else {
    frame();
  }
})();
