/* Design-shell interactions only — no real image pipeline yet.
   Enough state to make the layout demonstrable. */

(function () {
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const MAX_PHOTOS = { pfp: 1, solo: 1, team: 3 };

  const state = {
    format: 'pfp',
    photos: []                                    /* [{ url, file }] */
  };

  const PERSON_SVG =
    '<svg class="h-1/3 w-1/3 text-ink/25" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="9" r="3.5"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0" stroke-linecap="round"/></svg>';

  /* ===================================================================
     TEAM CARD LAYOUTS — Frame-7/8/9 badge art with photos + text laid on
     top, same technique as the solo card. Hole/box rects are percentages
     of the card measured directly off each frame asset's transparent
     cutouts, so they track the art exactly regardless of render size.
     =================================================================== */

  const TEAM_ART = {
    1: {
      asset: 'assets/frame-team-1.png', ratio: '1200/1299',
      holes: [{ left: 26.58, top: 15.99, width: 50.39, height: 50.19 }],
      box: { left: 17.29, top: 66.59, width: 69.34, height: 17.7 }
    },
    2: {
      asset: 'assets/frame-team-2.png', ratio: '1400/1050',
      holes: [
        { left: 15.5, top: 14.76, width: 32.39, height: 51.57 },
        { left: 51.83, top: 14.01, width: 32.39, height: 51.57 }
      ],
      box: { left: 25.62, top: 64.3, width: 48.03, height: 17.7 }
    },
    3: {
      asset: 'assets/frame-team-3.png', ratio: '1400/1050',
      holes: [
        { left: 6.72, top: 22.53, width: 27.35, height: 48.5 },
        { left: 36.5, top: 22.53, width: 27.35, height: 41.37 },
        { left: 66.29, top: 22.43, width: 27.35, height: 48.5 }
      ],
      box: { left: 25.62, top: 64.3, width: 48.03, height: 17.7 }
    }
  };

  const rectStyle = (r) => `left:${r.left}%;top:${r.top}%;width:${r.width}%;height:${r.height}%;`;

  /* A filled hole is draggable: object-position does the panning, which
     clamps itself to the cover-crop overflow so the photo can't leave a gap. */
  function photoHole(photo, idx, rect) {
    return photo
      ? `<div class="photo-slot absolute cursor-grab touch-none overflow-hidden bg-cream" data-idx="${idx}" style="${rectStyle(rect)}">
           <img src="${esc(photo.url)}" alt="" draggable="false"
             class="photo-img h-full w-full origin-center select-none object-cover"
             style="object-position:${photo.px}% ${photo.py}%" />
         </div>`
      : `<div class="photo-slot absolute overflow-hidden bg-cream" style="${rectStyle(rect)}">
           <div class="grid h-full w-full place-items-center">${PERSON_SVG}</div>
         </div>`;
  }

  function teamCardHTML(art, d) {
    return `<div class="relative w-full" style="aspect-ratio:${art.ratio};">
      ${art.holes.map((rect, i) => photoHole(d.photos[i], i, rect)).join('')}
      <img src="${art.asset}" alt="" draggable="false"
        class="pointer-events-none absolute inset-0 h-full w-full select-none" />
      <div class="absolute flex flex-col items-center justify-center gap-1 px-3 text-center" style="${rectStyle(art.box)}">
        <p class="line-clamp-1 font-display text-lg leading-tight text-ink sm:text-xl">${esc(d.team)}</p>
        <p class="line-clamp-2 font-hand text-xs font-bold leading-tight text-ink/70 sm:text-sm">${esc(d.teamRole)}</p>
      </div>
    </div>`;
  }

  const TEAM_LAYOUTS = {
    1: (d) => teamCardHTML(TEAM_ART[1], d),
    2: (d) => teamCardHTML(TEAM_ART[2], d),
    3: (d) => teamCardHTML(TEAM_ART[3], d)
  };

  /* =================== format switching =================== */

  function setFormat(name) {
    state.format = name;

    $$('.format-btn').forEach((btn) => {
      const on = btn.dataset.format === name;
      btn.classList.toggle('bg-sun-500', on);
      btn.classList.toggle('bg-cream', !on);
      btn.classList.toggle('-translate-y-0.5', on);
      btn.classList.toggle('shadow-brut', on);
      btn.classList.toggle('shadow-brutSm', !on);
    });

    $('#preview-pfp').classList.toggle('hidden', name !== 'pfp');
    $('#preview-card').classList.toggle('hidden', name !== 'solo');
    $('#preview-team').classList.toggle('hidden', name !== 'team');

    $('#solo-fields').classList.toggle('hidden', name !== 'solo');
    $('#team-fields').classList.toggle('hidden', name !== 'team');

    const isTeam = name === 'team';
    $('#file-input').multiple = isTeam;
    $('#dropzone-title').textContent = isTeam ? 'Upload up to 3' : 'Upload here';
    $('#dropzone-hint').textContent = isTeam
      ? 'One per member — JPG · PNG · HEIC'
      : 'JPG · PNG · HEIC — any crop will do';

    /* dropping from team → solo leaves at most one photo */
    state.photos.splice(MAX_PHOTOS[name]).forEach((p) => URL.revokeObjectURL(p.url));

    renderAll();
  }

  $$('.format-btn').forEach((btn) => {
    btn.addEventListener('click', () => setFormat(btn.dataset.format));
  });

  /* =================== photos =================== */

  /* iPhone HEIC can't be decoded by <img>, so convert it before use.
     The decoder is 1.3 MB, so it's only fetched when a HEIC actually shows up. */
  const isHeic = (f) => /heic|heif/i.test(f.type) || /\.(heic|heif)$/i.test(f.name);

  let heicReady = null;
  function loadHeic() {
    heicReady ||= new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js';
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
    return heicReady;
  }

  async function decode(file) {
    if (!isHeic(file)) return file;
    await loadHeic();
    const out = await window.heic2any({ blob: file, toType: 'image/jpeg', quality: 0.92 });
    const jpg = Array.isArray(out) ? out[0] : out;
    return new File([jpg], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' });
  }

  async function addFiles(fileList) {
    const room = MAX_PHOTOS[state.format] - state.photos.length;
    const picked = Array.from(fileList).slice(0, Math.max(0, room));
    const status = $('#action-status');

    if (picked.some(isHeic)) status.textContent = 'iPhone फोटो कन्वर्ट हो रही है…';

    for (const file of picked) {
      try {
        const usable = await decode(file);
        /* px/py are the object-position crop, 50/50 = centred */
        state.photos.push({ url: URL.createObjectURL(usable), file: usable, px: 50, py: 50 });
      } catch (err) {
        console.error(err);
        status.textContent = 'ये फोटो नहीं खुली — दूसरी try करो';
      }
    }
    renderAll();
  }

  function removePhoto(i) {
    const [gone] = state.photos.splice(i, 1);
    if (gone) URL.revokeObjectURL(gone.url);
    renderAll();
  }

  $('#file-input').addEventListener('change', (e) => {
    if (e.target.files?.length) addFiles(e.target.files);
    e.target.value = '';                      /* re-selecting the same file still fires */
  });

  function renderTray() {
    const tray = $('#photo-tray');
    const max = MAX_PHOTOS[state.format];

    $('#photo-count').textContent = `${state.photos.length} / ${max}`;
    tray.classList.toggle('hidden', state.photos.length === 0);
    tray.classList.toggle('flex', state.photos.length > 0);

    tray.innerHTML = state.photos.map((p, i) => `
      <div class="relative">
        <img src="${esc(p.url)}" alt="" class="h-16 w-16 rounded-xl border-[3px] border-ink object-cover" />
        <button type="button" data-remove="${i}" aria-label="हटाओ"
          class="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full border-2 border-ink bg-rose-500 text-[10px] font-extrabold text-cream">✕</button>
      </div>`).join('');

    tray.querySelectorAll('[data-remove]').forEach((btn) => {
      btn.addEventListener('click', () => removePhoto(Number(btn.dataset.remove)));
    });

    /* hide both intake controls once full */
    const full = state.photos.length >= max;
    $('#dropzone').classList.toggle('hidden', full);
    $('#btn-camera').classList.toggle('hidden', full);
    $('#btn-camera').classList.toggle('flex', !full);
  }

  /* =================== camera =================== */

  const cam = {
    modal: $('#cam-modal'),
    stage: $('#cam-stage'),
    video: $('#cam-video'),
    overlay: $('#cam-frame-overlay'),
    error: $('#cam-error'),
    count: $('#cam-count'),
    shoot: $('#cam-shoot'),
    flash: $('#cam-flash'),
    hint:  $('#cam-hint'),
    stream: null
  };

  function camFull() {
    return state.photos.length >= MAX_PHOTOS[state.format];
  }

  function syncCam() {
    const max = MAX_PHOTOS[state.format];
    cam.count.textContent = `${state.photos.length} / ${max}`;
    cam.shoot.disabled = !cam.stream || camFull();
    cam.hint.textContent = max > 1
      ? 'Capture one photo per team member'
      : 'One photo is all you need';
  }

  /* solo shoots straight into the badge shape, so show the real frame over
     the live feed — the square crop other formats use would be misleading here */
  function syncCamFrame() {
    const isSolo = state.format === 'solo';
    cam.stage.style.aspectRatio = isSolo ? '3/4' : '1/1';
    cam.overlay.classList.toggle('hidden', !isSolo);
  }

  async function openCamera() {
    if (camFull()) return;
    cam.modal.classList.remove('hidden');
    cam.modal.classList.add('flex');
    cam.error.classList.add('hidden');
    cam.error.classList.remove('grid');
    syncCamFrame();
    syncCam();

    try {
      cam.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 1280 } },
        audio: false
      });
      cam.video.srcObject = cam.stream;
    } catch (err) {
      cam.error.textContent = err.name === 'NotAllowedError'
        ? 'Camera blocked. Allow camera access for this site and try again.'
        : 'No camera available on this device.';
      cam.error.classList.remove('hidden');
      cam.error.classList.add('grid');
    }
    syncCam();
  }

  /* Tracks must be stopped explicitly or the camera light stays on. */
  function closeCamera() {
    cam.stream?.getTracks().forEach((t) => t.stop());
    cam.stream = null;
    cam.video.srcObject = null;
    cam.modal.classList.add('hidden');
    cam.modal.classList.remove('flex');
  }

  function flash() {
    cam.flash.style.opacity = '0.9';
    setTimeout(() => { cam.flash.style.opacity = '0'; }, 120);
  }

  /* Guarded because capture is async: without it a second click can land while
     the first is still encoding, and the two runs interleave. */
  let shooting = false;

  async function capture() {
    if (shooting || !cam.stream || camFull()) return;
    const v = cam.video;
    const w = v.videoWidth, h = v.videoHeight;
    if (!w || !h) return;

    shooting = true;
    cam.shoot.disabled = true;
    try {
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const ctx = c.getContext('2d');
      /* flip to match the mirrored preview — otherwise the saved shot is
         reversed from what the user just posed for */
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(v, 0, 0, w, h);

      const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.92));
      if (!blob) return;

      flash();
      await addFiles([new File([blob], `selfie-${Date.now()}.jpg`, { type: 'image/jpeg' })]);
    } finally {
      shooting = false;
      syncCam();
    }
    if (camFull()) closeCamera();          /* nothing left to shoot */
  }

  $('#btn-camera').addEventListener('click', openCamera);
  $('#cam-close').addEventListener('click', closeCamera);
  $('#cam-done').addEventListener('click', closeCamera);
  cam.shoot.addEventListener('click', capture);
  cam.modal.addEventListener('click', (e) => { if (e.target === cam.modal) closeCamera(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && cam.stream) closeCamera();
  });

  /* =================== previews =================== */

  /* pfp + solo card share a single photo */
  function renderSingleSlots() {
    const photo = state.photos[0];
    ['#preview-pfp .photo-slot', '#preview-card .photo-slot'].forEach((sel) => {
      const slot = $(sel);
      if (!slot) return;
      slot.classList.toggle('cursor-grab', !!photo);
      slot.classList.toggle('touch-none', !!photo);
      if (photo) {
        slot.dataset.idx = '0';
        slot.innerHTML =
          `<img src="${esc(photo.url)}" alt="" draggable="false"
             class="photo-img h-full w-full origin-center select-none object-cover"
             style="object-position:${photo.px}% ${photo.py}%" />`;
      } else {
        delete slot.dataset.idx;
        slot.innerHTML = `<div class="grid h-full w-full place-items-center">${PERSON_SVG}</div>`;
      }
    });
  }

  /* =================== drag to reposition =================== */

  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

  /* How many px of the photo are hidden by the cover crop, per axis.
     Zero on an axis means that axis is already flush — nothing to drag. */
  function overflowOf(img, slot) {
    const sw = slot.clientWidth, sh = slot.clientHeight;
    const nw = img.naturalWidth, nh = img.naturalHeight;
    if (!nw || !nh || !sw || !sh) return { x: 0, y: 0 };
    const s = Math.max(sw / nw, sh / nh);
    return { x: Math.max(0, nw * s - sw), y: Math.max(0, nh * s - sh) };
  }

  /* one photo can be on screen in several slots at once (pfp + solo) */
  function applyPosition(idx) {
    const photo = state.photos[idx];
    if (!photo) return;
    $$(`.photo-slot[data-idx="${idx}"] .photo-img`).forEach((img) => {
      img.style.objectPosition = `${photo.px}% ${photo.py}%`;
    });
  }

  let drag = null;

  document.addEventListener('pointerdown', (e) => {
    const slot = e.target.closest?.('.photo-slot[data-idx]');
    if (!slot) return;
    const img = slot.querySelector('.photo-img');
    const idx = Number(slot.dataset.idx);
    const photo = state.photos[idx];
    if (!img || !photo) return;

    drag = {
      slot, idx, photo,
      x: e.clientX, y: e.clientY,
      px: photo.px, py: photo.py,
      ov: overflowOf(img, slot)
    };
    try { slot.setPointerCapture(e.pointerId); } catch { /* pointer already gone */ }
    slot.classList.add('cursor-grabbing');
    e.preventDefault();
  });

  document.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const { ov } = drag;
    /* drag right reveals more of the photo's left side, hence the minus */
    if (ov.x > 0) drag.photo.px = clamp(drag.px - (e.clientX - drag.x) / ov.x * 100, 0, 100);
    if (ov.y > 0) drag.photo.py = clamp(drag.py - (e.clientY - drag.y) / ov.y * 100, 0, 100);
    applyPosition(drag.idx);
  });

  function endDrag() {
    if (!drag) return;
    drag.slot.classList.remove('cursor-grabbing');
    drag = null;
  }
  document.addEventListener('pointerup', endDrag);
  document.addEventListener('pointercancel', endDrag);

  function renderTeam() {
    const count = Math.min(state.photos.length, 3) || 1;   /* empty state previews the 1-up */
    const render = TEAM_LAYOUTS[count] || TEAM_LAYOUTS[1];
    $('#preview-team').innerHTML = render({
      photos: state.photos,
      team: $('#f-team').value,
      teamRole: $('#f-team-role').value
    });
  }

  function renderAll() {
    renderTray();
    renderSingleSlots();
    renderTeam();
    applyTransform();
  }

  /* =================== zoom + rotate =================== */

  function applyTransform() {
    const z = $('#zoom').value / 100;
    const r = $('#rotate').value;
    $('#zoom-out').textContent = z.toFixed(1) + '×';
    $('#rotate-out').textContent = r + '°';
    $$('.photo-img').forEach((img) => {
      img.style.transform = `scale(${z}) rotate(${r}deg)`;
    });
  }

  $('#zoom').addEventListener('input', applyTransform);
  $('#rotate').addEventListener('input', applyTransform);

  /* =================== field binding =================== */

  [['#f-name', '#out-name'], ['#f-role', '#out-role']].forEach(([from, to]) => {
    $(from).addEventListener('input', () => { $(to).textContent = $(from).value || '—'; });
  });

  ['#f-team', '#f-team-role'].forEach((sel) => {
    $(sel).addEventListener('input', renderTeam);
  });

  setFormat('pfp');
})();
