/* Real image export + share.
   Snapshots the live preview node into a 1080x1080 PNG, then either hands it
   to the OS share sheet (mobile) or downloads it alongside a pre-filled tweet. */

(function () {
  const $ = (s) => document.querySelector(s);

  const SIZE = 1080;
  /* PFP fills more of the square — it gets cropped to a circle by X.
     Its 48px still clears the badge and sticker that overhang the node's box. */
  const PAD = { 'preview-pfp': 48, 'preview-card': 90, 'preview-team': 90 };
  const FILENAME = 'hh-goa-2026.png';
  const HASHTAGS = '#FrameInGoa #HHGoa2026';

  /* Hardcoded to the live deploy — shares should always point people there,
     not at whatever origin (localhost, preview branch) the export ran on. */
  const siteUrl = () => 'https://hh-goa-task-1-three.vercel.app/';

  const caption = (url) => [
    `मेरा HH Goa 2026 बैज तैयार है ✦ ${HASHTAGS}`,
    '',
    'create your own Builder card',
    url
  ].join('\n');
  const INTENT = 'https://x.com/intent/post?text=';

  /* Unsigned preset — safe to ship in client code, it can only accept image
     uploads, nothing account-sensitive. Lets the exported badge get a real
     public URL so X can actually unfurl the link with the photo embedded,
     instead of everyone's share linking back to the same generic homepage. */
  const CLOUDINARY_CLOUD_NAME = 'j4pvohqc';
  const CLOUDINARY_UPLOAD_PRESET = 'hhgoa_shares';
  const CARD_ENDPOINT = 'https://hh-goa-task-1-three.vercel.app/api/card';

  async function uploadToCloudinary(blob) {
    const form = new FormData();
    form.append('file', blob, FILENAME);
    form.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
      method: 'POST',
      body: form,
      signal: AbortSignal.timeout(10000)
    });
    if (!res.ok) throw new Error(`cloudinary upload failed: ${res.status}`);
    const data = await res.json();
    return data.secure_url;
  }

  /* Whatever name is currently on the visible card — used as the /api/card
     page title, purely cosmetic. */
  function shareName() {
    if (!$('#preview-card').classList.contains('hidden')) return $('#f-name').value.trim();
    if (!$('#preview-team').classList.contains('hidden')) return $('#f-team').value.trim();
    return '';
  }

  /* Falls back to the plain homepage link if the upload fails for any
     reason (offline, preset misconfigured, Cloudinary hiccup) — sharing
     should never hard-fail just because the rich-preview step did. */
  async function getShareUrl(blob) {
    try {
      const secureUrl = await uploadToCloudinary(blob);
      const params = new URLSearchParams({ img: secureUrl, name: shareName() });
      return `${CARD_ENDPOINT}?${params.toString()}`;
    } catch (err) {
      console.error(err);
      return siteUrl();
    }
  }

  /* background behind the card in the exported square, per format */
  const BG = { 'preview-pfp': '#FFF7E8', 'preview-card': '#FFF7E8', 'preview-team': '#FFF7E8' };

  const statusEl = $('#action-status');
  const btnDownload = $('#btn-download');
  const btnShare = $('#btn-share');

  let busy = false;

  function status(msg) { statusEl.textContent = msg; }

  function setBusy(on, msg) {
    busy = on;
    btnDownload.disabled = on;
    btnShare.disabled = on;
    if (msg) status(msg);
  }

  function activeNode() {
    return document.querySelector(
      '#preview-pfp:not(.hidden), #preview-card:not(.hidden), #preview-team:not(.hidden)'
    );
  }

  /* Clone the visible card into the offscreen stage, scaled to fill the square. */
  function mount(src) {
    const stage = $('#export-stage');
    const rect = src.getBoundingClientRect();
    const pad = PAD[src.id] ?? 90;
    const k = Math.min((SIZE - pad * 2) / rect.width, (SIZE - pad * 2) / rect.height);

    const wrap = document.createElement('div');
    wrap.style.cssText =
      `width:${rect.width}px;height:${rect.height}px;` +
      `transform:scale(${k});transform-origin:center center;`;

    const clone = src.cloneNode(true);
    clone.classList.remove('hidden');
    wrap.appendChild(clone);

    stage.style.background = BG[src.id] || '#FFF7E8';
    stage.replaceChildren(wrap);
    return stage;
  }

  async function renderBlob() {
    const src = activeNode();
    if (!src) throw new Error('no preview');

    const stage = mount(src);
    try {
      /* two passes: the first warms the font/image inlining cache, the second
         renders reliably — a known html-to-image quirk with webfonts */
      await htmlToImage.toPng(stage, { width: SIZE, height: SIZE, cacheBust: false });
      return await htmlToImage.toBlob(stage, {
        width: SIZE,
        height: SIZE,
        pixelRatio: 1,
        cacheBust: false
      });
    } finally {
      stage.replaceChildren();
    }
  }

  function saveBlob(blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = FILENAME;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  /* ---------- download ---------- */
  btnDownload.addEventListener('click', async () => {
    if (busy) return;
    setBusy(true, 'बन रहा है…');
    try {
      const blob = await renderBlob();
      saveBlob(blob);
      status(`डाउनलोड हो गया — ${SIZE}×${SIZE} PNG`);
    } catch (err) {
      console.error(err);
      status('कुछ गड़बड़ हो गई, दोबारा कोशिश करो');
    } finally {
      setBusy(false);
    }
  });

  /* The OS share sheet is only worth using where a real X app can receive the
     file. Desktop Safari reports canShare({files}) === true, but its sheet has
     no X target at all — so require an actual touch device. */
  function canUseShareSheet(file) {
    const touchDevice =
      window.matchMedia('(pointer: coarse)').matches && navigator.maxTouchPoints > 0;
    return touchDevice && !!navigator.canShare && navigator.canShare({ files: [file] });
  }

  /* Must run while our tab still has focus — clipboard writes are rejected
     once another window takes over, so this happens before X is opened. */
  async function copyImage(blob) {
    if (!navigator.clipboard || typeof ClipboardItem === 'undefined') return false;
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      return true;
    } catch {
      return false;
    }
  }

  /* ---------- share to X ----------
     Mobile: hand the file to the share sheet, which really does attach it.
     Desktop: X's web intent can't take an image from a URL, so there's no
     way to have the photo already sitting in the post — the file always
     gets downloaded too, so it's on disk ready to drag/attach, on top of
     being copied to the clipboard for a one-paste alternative. */
  btnShare.addEventListener('click', async () => {
    if (busy) return;
    setBusy(true, 'बन रहा है…');
    try {
      const blob = await renderBlob();
      const file = new File([blob], FILENAME, { type: 'image/png' });

      setBusy(true, 'link तैयार हो रहा है…');
      const shareUrl = await getShareUrl(blob);
      const text = caption(shareUrl);

      if (canUseShareSheet(file)) {
        try {
          await navigator.share({ files: [file], text });
          status('शेयर हो गया');
          return;
        } catch (err) {
          if (err.name === 'AbortError') { status('कैंसिल कर दिया'); return; }
          /* otherwise fall through to the desktop path */
        }
      }

      const copied = await copyImage(blob);
      saveBlob(blob);

      const url = INTENT + encodeURIComponent(text);
      const win = window.open(url, '_blank', 'noopener');

      const downloadedNote = 'photo download हो गई — X पर attach कर दो';

      if (!win) {
        /* popup blocked — give them something to click instead */
        statusEl.innerHTML =
          `<a href="${url}" target="_blank" rel="noopener" class="font-extrabold text-rose-700 underline">X पे post लिखो →</a>` +
          ` · ${downloadedNote}` + (copied ? ' (या paste ⌘V)' : '');
      } else {
        status(copied
          ? `X खुल गया — paste (⌘V) करो, या ${downloadedNote}`
          : `X खुल गया — ${downloadedNote}`);
      }
    } catch (err) {
      console.error(err);
      status('कुछ गड़बड़ हो गई, दोबारा कोशिश करो');
    } finally {
      setBusy(false);
    }
  });
})();
