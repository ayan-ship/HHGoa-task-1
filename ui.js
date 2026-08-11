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
    photos: [],                                   /* [{ url, file }] */
    members: ['टीम मेंबर 1', 'टीम मेंबर 2', 'टीम मेंबर 3']
  };

  const PERSON_SVG =
    '<svg class="h-1/3 w-1/3 text-ink/25" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="9" r="3.5"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0" stroke-linecap="round"/></svg>';

  /* ===================================================================
     TEAM CARD LAYOUTS
     One renderer per photo count. Each returns the FULL innerHTML of
     #preview-team, so a layout can change the header and footer too,
     not just the photo arrangement.

     `d` = { photos: [{url}], team, teamRole, members: [names] }
     `photoTile(url, i, classes)` renders one photo (or an empty slot).

     >>> These three are placeholders. Swap the bodies when the real
     >>> 1 / 2 / 3-member designs land. Nothing else needs to change —
     >>> renderTeam() picks the right one off the photo count.
     =================================================================== */

  const header = (label) => `
    <div class="flex items-center justify-between bg-rose-500 px-4 py-3">
      <div>
        <p class="font-display text-lg leading-none text-cream">HH गोवा ’26</p>
        <p class="text-[10px] font-extrabold tracking-[0.2em] text-cream/80">${esc(label)}</p>
      </div>
      <span class="rounded-md border-2 border-ink bg-neon-500 px-2 py-0.5 text-[10px] font-extrabold">2026</span>
    </div>`;

  const footer = () => `
    <div class="flex items-center justify-between border-t-[3px] border-ink bg-sun-500 px-4 py-2">
      <span class="flex items-center gap-1.5 text-[11px] font-extrabold">
        <span class="h-1.5 w-1.5 rounded-full border border-ink bg-neon-500"></span>#FrameInGoa
      </span>
      <span class="flex gap-[3px]">
        <i class="block h-3.5 w-[3px] bg-ink"></i><i class="block h-3.5 w-[2px] bg-ink"></i><i class="block h-3.5 w-[4px] bg-ink"></i><i class="block h-3.5 w-[2px] bg-ink"></i><i class="block h-3.5 w-[3px] bg-ink"></i><i class="block h-3.5 w-[2px] bg-ink"></i>
      </span>
    </div>`;

  /* A filled tile is draggable: object-position does the panning, which clamps
     itself to the cover-crop overflow so the photo can never leave a gap. */
  function photoTile(photo, idx, cls) {
    return photo
      ? `<div class="photo-slot cursor-grab touch-none overflow-hidden rounded-xl border-[3px] border-ink bg-cream ${cls}" data-idx="${idx}">
           <img src="${esc(photo.url)}" alt="" draggable="false"
             class="photo-img h-full w-full origin-center select-none object-cover"
             style="object-position:${photo.px}% ${photo.py}%" />
         </div>`
      : `<div class="photo-slot grid place-items-center overflow-hidden rounded-xl border-[3px] border-ink bg-cream ${cls}">${PERSON_SVG}</div>`;
  }

  const nameTag = (text) =>
    `<p class="mt-1.5 w-full truncate text-center text-[11px] font-bold text-ink/70">${esc(text)}</p>`;

  const TEAM_LAYOUTS = {
    /* ---------- LAYOUT: 1 MEMBER ---------- */
    1: (d) => header('TEAM PASS') + `
      <div class="flex flex-col items-center gap-3 bg-sun-100 px-5 py-6">
        <div class="flex flex-col items-center">
          ${photoTile(d.photos[0], 0, 'h-28 w-28')}
          ${nameTag(d.members[0])}
        </div>
        <p class="text-center font-display text-2xl leading-tight">${esc(d.team)}</p>
        <p class="-mt-2 text-center text-xs font-bold text-ink/60">${esc(d.teamRole)}</p>
        <span class="rounded-full border-[3px] border-ink bg-rose-300 px-3.5 py-1 text-xs font-extrabold">1 मेंबर</span>
      </div>` + footer(),

    /* ---------- LAYOUT: 2 MEMBERS ---------- */
    2: (d) => header('TEAM PASS') + `
      <div class="flex flex-col items-center gap-3 bg-sun-100 px-5 py-6">
        <div class="flex w-full items-start justify-center gap-3">
          ${[0, 1].map((i) => `
            <div class="flex min-w-0 flex-1 flex-col items-center">
              ${photoTile(d.photos[i], i, 'aspect-square w-full')}
              ${nameTag(d.members[i])}
            </div>`).join('')}
        </div>
        <p class="text-center font-display text-2xl leading-tight">${esc(d.team)}</p>
        <p class="-mt-2 text-center text-xs font-bold text-ink/60">${esc(d.teamRole)}</p>
        <span class="rounded-full border-[3px] border-ink bg-rose-300 px-3.5 py-1 text-xs font-extrabold">2 मेंबर</span>
      </div>` + footer(),

    /* ---------- LAYOUT: 3 MEMBERS ---------- */
    3: (d) => header('TEAM PASS') + `
      <div class="flex flex-col items-center gap-3 bg-sun-100 px-4 py-6">
        <div class="flex w-full items-start justify-center gap-2">
          ${[0, 1, 2].map((i) => `
            <div class="flex min-w-0 flex-1 flex-col items-center">
              ${photoTile(d.photos[i], i, 'aspect-square w-full')}
              ${nameTag(d.members[i])}
            </div>`).join('')}
        </div>
        <p class="text-center font-display text-2xl leading-tight">${esc(d.team)}</p>
        <p class="-mt-2 text-center text-xs font-bold text-ink/60">${esc(d.teamRole)}</p>
        <span class="rounded-full border-[3px] border-ink bg-rose-300 px-3.5 py-1 text-xs font-extrabold">3 मेंबर</span>
      </div>` + footer()
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

  /* one name input per uploaded photo */
  function renderMemberFields() {
    const wrap = $('#member-fields');
    const n = state.photos.length;

    $('#member-empty').classList.toggle('hidden', n > 0);
    wrap.innerHTML = Array.from({ length: n }, (_, i) => `
      <div>
        <label class="mb-1 block text-sm font-bold">मेंबर ${i + 1} का नाम</label>
        <input type="text" data-member="${i}" value="${esc(state.members[i] ?? '')}"
          class="w-full rounded-xl border-[3px] border-ink bg-cream px-3.5 py-2.5 font-semibold outline-none transition focus:bg-sun-100 focus:shadow-brutSm" />
      </div>`).join('');

    wrap.querySelectorAll('[data-member]').forEach((input) => {
      input.addEventListener('input', () => {
        state.members[Number(input.dataset.member)] = input.value;
        renderTeam();
      });
    });
  }

  /* =================== camera =================== */

  const cam = {
    modal: $('#cam-modal'),
    video: $('#cam-video'),
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

  async function openCamera() {
    if (camFull()) return;
    cam.modal.classList.remove('hidden');
    cam.modal.classList.add('flex');
    cam.error.classList.add('hidden');
    cam.error.classList.remove('grid');
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
      teamRole: $('#f-team-role').value,
      members: state.members
    });
  }

  function renderAll() {
    renderTray();
    renderMemberFields();
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

  [['#f-name', '#out-name'], ['#f-role', '#out-role'], ['#f-title', '#out-title']].forEach(([from, to]) => {
    $(from).addEventListener('input', () => { $(to).textContent = $(from).value || '—'; });
  });

  ['#f-team', '#f-team-role'].forEach((sel) => {
    $(sel).addEventListener('input', renderTeam);
  });

  /* =================== builder title dice =================== */

  const TITLES = [
    'देर रात का कोडर', 'बग का दुश्मन', 'कॉफ़ी से चलने वाला',
    'डिप्लॉय मास्टर', 'CSS जादूगर', 'लास्ट-मिनट शिपर',
    'टर्मिनल का राजा', 'susegaad बिल्डर', 'रिफैक्टर पंडित'
  ];
  let seen = 0;
  $('#dice').addEventListener('click', () => {
    seen = (seen + 1) % TITLES.length;
    $('#f-title').value = TITLES[seen];
    $('#out-title').textContent = TITLES[seen];
  });

  setFormat('pfp');
})();
