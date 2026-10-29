#!/usr/bin/env node
// Build site/index.html: the complete, self-hostable page (doctype, head, credit footer).
// Images are expected in site/flags/ (written there by flags-pipeline/assemble.py).
const fs = require('fs');
const path = require('path');
const { root, parts, DESCRIPTION, FONTS, THEME_BOOT } = require('./page_parts');

const { css, body, app, data, meta } = parts();
const footer = `  <footer class="site-foot wrap"><p>Flag artwork rendered from Wilhelm Haager's worldflags collection, with Afghanistan, Kyrgyzstan and Syria redrawn for their current flags.</p></footer>\n</main>`;
const logo = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect x="4" y="3" width="2.4" height="27" rx="1.2" fill="#e6ebf4"/><path d="M7.5 5h20l-5 6.5 5 6.5h-20z" fill="#FFC21A"/><path d="M7.5 5h11.5v13H7.5z" fill="#1F4E9C"/></svg>';

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Hoist &amp; Fly</title>
<meta name="description" content="${DESCRIPTION}">
<meta name="theme-color" content="#0a1120">
<meta property="og:title" content="Hoist &amp; Fly">
<meta property="og:description" content="${DESCRIPTION}">
<link rel="icon" href="data:image/svg+xml,${encodeURIComponent(logo)}">
${FONTS}
<style>
:root { padding-top: env(safe-area-inset-top, 0px); padding-bottom: env(safe-area-inset-bottom, 0px); }
body { margin: 0; }
[hidden] { display: none !important; }
${css}
.site-foot { margin-top: 56px; padding-top: 16px; border-top: 1px solid var(--line); color: var(--ink-3); font-size: 13px; }
</style>
${THEME_BOOT}
</head>
<body>
${body.replace('</main>', footer)}
<script>window.HF=${data};</script>
<script>
${app}
</script>
</body>
</html>
`;

const missing = Object.values(meta).map(m => m.f).filter(f => !fs.existsSync(path.join(root, 'site', 'flags', f)));
if (missing.length) { console.error('missing images in site/flags:', missing.join(' ')); process.exit(1); }
fs.writeFileSync(path.join(root, 'site', 'index.html'), html);
console.log(`site/index.html written (${(html.length / 1024).toFixed(0)} KB), ${Object.keys(meta).length} images checked`);
