#!/usr/bin/env node
// Build build/artifact/index.html: the flavour published as a Claude artifact. Claude wraps the page in its own
// <html>/<head>/<body> skeleton, so this file starts with <title> and has no doctype. Publish it together with
// every file in site/flags/ (as flags/<name>) and the capabilities {"db": {}, "user": {}} so progress can be
// saved to the viewer's account.
const fs = require('fs');
const path = require('path');
const { root, parts, DESCRIPTION, FONTS, THEME_BOOT } = require('./page_parts');

const { css, body, app, data } = parts();
const html = `<title>Hoist &amp; Fly</title>
<meta name="claude:viewport-fit-sides" content="cover">
<meta name="description" content="${DESCRIPTION}">
${FONTS}
<style>
${css}
</style>
${THEME_BOOT}
${body}
<script>window.HF=${data};</script>
<script>
${app}
</script>
`;
const out = path.join(root, 'build', 'artifact');
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'index.html'), html);
console.log(`build/artifact/index.html written (${(html.length / 1024).toFixed(0)} KB)`);
