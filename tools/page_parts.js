// Pieces shared by build_site.js (self-hosted copy) and build_artifact.js (version published on Claude).
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');

const DESCRIPTION = 'Study the flags of all 197 countries: the story behind each flag, a five-strike quiz, flashcards and a lookalikes guide.';
const FONTS = `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@600;800&family=IBM+Plex+Mono:wght@400;500;600&family=Public+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap">`;
// Runs before the page is drawn so a saved Light choice never flashes dark first.
const THEME_BOOT = `<script>try{if(localStorage.getItem('hoistfly.theme')==='light')document.documentElement.setAttribute('data-hf-theme','light')}catch(e){}</script>`;

function parts() {
  const dataPath = path.join(root, 'data', 'data.json');
  if (!fs.existsSync(dataPath)) throw new Error('data/data.json is missing: run node tools/build_data.js first');
  return {
    css: read('src/style.css'),
    body: read('src/body.html'),
    app: read('src/app.js'),
    data: read('data/data.json').replace(/<\//g, '<\\/'),   // keep "</script>" out of the inline JSON
    meta: JSON.parse(read('data/data.json')).meta,
  };
}

module.exports = { root, read, parts, DESCRIPTION, FONTS, THEME_BOOT };
