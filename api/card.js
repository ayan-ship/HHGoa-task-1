/* Serves a tiny HTML shell whose only job is OG/Twitter meta tags pointing
   at a specific generated badge image, so pasting this link into a post
   (rather than the homepage link) unfurls with that actual photo — X reads
   these tags with a plain HTTP fetch, it never runs our client-side JS.
   Real visitors get bounced straight to the app. */

const SITE_URL = 'https://hh-goa-task-1-three.vercel.app/';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

module.exports = (req, res) => {
  const { img, name } = req.query;

  /* only ever embed images we actually generated and uploaded ourselves —
     otherwise this endpoint would be an open card-spoofing proxy for any URL */
  let imgUrl;
  try {
    imgUrl = new URL(typeof img === 'string' ? img : '');
  } catch {
    imgUrl = null;
  }
  if (!imgUrl || imgUrl.hostname !== 'res.cloudinary.com' || imgUrl.protocol !== 'https:') {
    res.writeHead(302, { Location: SITE_URL });
    res.end();
    return;
  }

  const safeName = (typeof name === 'string' ? name : '').slice(0, 60).trim();
  const title = safeName ? `${safeName} का HH Goa 2026 badge` : 'HH Goa 2026 badge';
  const description = 'frame इन गोवा — अपनी photo को Goa भेजो, बिना login.';

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  res.end(`<!doctype html>
<html lang="hi"><head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${esc(title)}</title>
<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(description)}" />
<meta property="og:image" content="${esc(imgUrl.href)}" />
<meta property="og:url" content="${esc(SITE_URL)}" />
<meta property="og:type" content="website" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${esc(title)}" />
<meta name="twitter:description" content="${esc(description)}" />
<meta name="twitter:image" content="${esc(imgUrl.href)}" />
<meta http-equiv="refresh" content="0; url=${esc(SITE_URL)}" />
</head><body>
<p>Redirecting to <a href="${esc(SITE_URL)}">${esc(SITE_URL)}</a>…</p>
</body></html>`);
};
