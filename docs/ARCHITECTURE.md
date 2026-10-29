# How the site works

Hoist & Fly is one HTML page with its CSS, JavaScript and data inline, plus a folder of flag images. There is no framework and nothing to install at runtime; the only external requests are Google Fonts and the images in `flags/`.

```
site/index.html
├── <head>      fonts, inline <style> (src/style.css), a 1-line theme script
├── <body>      markup from src/body.html (all six views exist in the page; five are hidden)
├── <script>    window.HF = { flags, meta, groups, families, records, glossary }   ← data/data.json
└── <script>    the app (src/app.js), one IIFE, no globals besides window.HF
site/flags/     200 images referenced as flags/<file> from data.meta
```

`tools/build_site.js` assembles this file; `tools/build_data.js` produces the data it embeds. Total size is about 230 KB for the page and 2 MB for all images; images load lazily, so a first visit downloads only what is on screen.

## Data model

`window.HF.flags` is an array of 197 entries sorted A–Z by name:

```js
{ c: 'fr', n: 'France', cap: 'Paris', r: 'eu', y: '1794', ratio: '2 : 3',
  col: ['blue','white','red'], tags: ['vstripes'],
  why: '…', tip: '…', fact: '…', like: ['nl','it','ru'], nick: 'Tricolore' }
```

`ratio` is added by the build from `data/ratios.tsv`; `like` is made symmetric by the build (if A lists B, B also lists A). The full field reference is in [CONTENT.md](CONTENT.md).

`window.HF.meta` maps an image name to its file and intrinsic size: `{ fr: { f: 'fr.svg', w: 253.2, h: 168.7 } }`. The width/height ratio drives how every flag is drawn, so flags always keep their official shape (Qatar is long, Switzerland square, Nepal a pennant). Besides the 197 countries it holds `af-alt`, `sy-old` and `kg-old`, the alternative or previous flags shown on detail pages.

`groups`, `families`, `records` and `glossary` feed the Lookalikes and Learn views.

## Views and routing

Each view is a `<section class="view" data-view="…">` in `src/body.html`; the router shows one and hides the others with the `hidden` attribute. Routes are plain URL hashes so links and the back button work and nothing needs a server:

| Hash | View |
|---|---|
| `#start` (or none) | Home |
| `#explore` | All flags |
| `#quiz` | Quiz (setup → game → results) |
| `#flashcards` | Flashcards (setup → cards → done) |
| `#lookalikes` | Lookalike groups |
| `#learn` | Glossary, families, records |
| `#flag-<code>` | Explore, with that flag's detail sheet open, e.g. `#flag-np` |

`route()` runs on load and on every `hashchange`. Views that are expensive to build (Lookalikes, Learn) render once on first visit; Home re-renders on every visit so progress is fresh.

## Main pieces of `src/app.js`

| Piece | Responsibility |
|---|---|
| Helpers | `img`, `fbox` (a flag contained in a box, kept at its true ratio), `spec` (a flag with dimension lines and its proportions), `mini` (a small clickable flag with a caption). |
| `SIM` | For each flag, the 14 most similar flags, used for Tricky quiz answers. |
| `Store` | Progress: per-flag stats, best quiz scores, games played. Saves to `localStorage` and, when hosted on Claude, to the viewer's account. |
| Router | `show(view)`, `route()`, `go(view)`. |
| Home | Flag of the day, progress panel, needs-review list, "Did you know?" card. |
| Explore | Search, filters, sort; card elements are built once and reordered, so filtering never reloads images. |
| Detail sheet | A native `<dialog>`; previous/next follow the current Explore filter. |
| `Quiz` | Setup, question generation, answering, scoring, results. |
| `Cards` | Flashcard deck building, flipping, grading and requeueing. |
| Theme | Dark by default; the header switch toggles light and remembers the choice. |

Most clicks go through one delegated listener on `document` keyed on data attributes (`data-open`, `data-act`, `data-q`, `data-c`, `data-g`, `data-i`), so re-rendered markup never needs rebinding. The explore controls and the quiz and flashcard setup buttons bind their own handlers when they render.

## Progress and mastery

Each flag gets a record the first time it is answered:

```js
{ s: seen, c: correct, w: wrong, k: correct-in-a-row, t: last-answered timestamp }
```

- **Mastered** when `k ≥ 3` (three correct answers in a row, from the quiz or flashcards).
- **Learning** when it has been seen but not mastered.
- **Needs review** when it has been missed at least once and is not yet mastered. Home lists the worst 12 (most misses, fewest correct, then most recent).
- **Best scores** are kept per quiz setup, keyed `mode|region-or-set|difficulty`, e.g. `name|eu|tricky`.

Storage:

- **Browser:** `localStorage['hoistfly.progress.v1']`, written on every answer. Wrapped in `try/catch`, so the site still works in private windows where storage is blocked (progress then lasts for the visit).
- **Claude account (only when published as a Claude artifact):** the page asks Claude's runtime for the `db` and `user` capabilities. If the viewer is signed in and allowed to write, progress is kept in one private document, `data/users/<viewer id>/progress`, which only that viewer can read. On load the two copies are merged flag by flag, keeping whichever record was answered most recently, then saved back. Writes are debounced (1.5 s) and never overlap. On any other host `window.claude` does not exist and this step is skipped silently.

Reset progress (Home) asks for confirmation inside the page, because browser `confirm()` dialogs are not available everywhere.

## The quiz

- **Pool:** all flags, one continent, or a custom set (a lookalike group, a flag and its lookalikes, or your needs-review list).
- **Order:** the pool is shuffled into a deck and dealt without repeats; when it runs out it is reshuffled ("another round") and the last flag is never repeated immediately.
- **Modes:** *Name the flag* (a flag, four country names), *Find the flag* (a country, four flags), *Mixed* (a coin toss per question).
- **Wrong answers:**
  - *Standard* picks random countries, from the same continent when one is selected.
  - *Tricky* picks three of the seven flags most similar to the right answer. Similarity between two flags is `6 × (listed as lookalikes) + 3 × colour overlap + 1.5 × layout overlap + 1 × symbol overlap + 0.6 × (same continent)`, where overlaps are Jaccard indices of the `col` and `tags` lists.
  - In a custom set, the other members of the set are used first.
- **Lives:** five pennants. Each wrong answer removes one; the fifth ends the game. There is no timer.
- **After each answer:** the right and wrong choices are marked, a tip for recognising the flag is shown, and *Next* gets focus. On phones the page scrolls just enough to show the feedback and *Next* above the tab bar.
- **Results:** score, new-best badge, accuracy, longest streak, questions asked, flags mastered overall, and each missed flag with what you picked. Missed flags can go straight into a flashcard deck.

## Flashcards

- Decks: any continent combined with *All*, *Not yet mastered* or *Needs review*, or a custom set (a lookalike group, quiz misses, needs-review list).
- Front: the flag (or the country name, in reverse mode). Tapping the card or pressing Space flips it.
- *Got it* records a correct answer and removes the card; *Still learning* records a miss and puts the card back three places later. The deck is done when every card has been marked *Got it*, or you end the session.
- Flipping is a 3D rotation; with *reduce motion* switched on in the OS it becomes an instant swap.

## Flag of the day

Deterministic, so everyone sees the same flag on the same date: the A–Z list is shuffled once with a fixed seed (1848) and indexed by the number of days since 1 January 2026. Every flag comes up once every 197 days.

## Theming

- Colours are CSS custom properties defined in `:root` at the top of `src/style.css`. The bare `:root` holds the **dark** palette (the default); `:root[data-hf-theme="light"]` overrides it with the light palette.
- The header switch sets `data-hf-theme` on `<html>` and saves the choice in `localStorage['hoistfly.theme']`. A one-line script in `<head>` applies a saved light choice before anything is drawn, so there is no flash of the wrong theme.
- The site deliberately ignores the operating system's light/dark setting and Claude's theme: dark is the default until the visitor picks light.
- Palette: a cool navy "drafting paper" ground, light ink and a signal-yellow accent, with green and red reserved for right and wrong. The flags supply all other colour.
- Type: Big Shoulders Display for headings, Public Sans for text, IBM Plex Mono for labels and numbers (proportions, counts), each with system fallbacks.

## Responsive layout

| Width | Changes |
|---|---|
| > 980 px | Two-column layouts (home panels, quiz setup, detail sheet, learn). |
| ≤ 980 px | Everything stacks into one column. |
| ≤ 760 px | The header nav is replaced by a bottom tab bar (Home, Explore, Quiz, Cards, Lookalikes, Learn); the theme switch moves to the right of the header. |
| ≤ 640 px | Phone sizing: quiz answers in a 2×2 grid, the detail sheet goes full screen, smaller paddings. Key hints are hidden on touch screens. |

Safe-area insets (`env(safe-area-inset-*)`) keep content clear of notches and home indicators. The smoke test checks every view for horizontal overflow at 390 px.

## Accessibility and keyboard

- Real buttons and links throughout, a visible focus ring, `aria-pressed` on toggles, `aria-current` on the active section, `role="status"` on quiz feedback and toasts, and an accessible name for each lives indicator and progress bar.
- Quiz images never give the answer away in their alt text; options in *Find the flag* are labelled "Flag 1…4" until answered.
- Keyboard shortcuts:

| Where | Keys |
|---|---|
| Quiz | `1`–`4` answer, `Enter` next question |
| Flashcards | `Space` flip, `1` or `←` still learning, `2` or `→` got it |
| Flag details | `←` `→` previous / next flag, `Esc` close |
| Explore | `/` jumps to the search box |

## Testing

`tools/smoke_test.py` serves `site/` on a random local port and checks, in headless Chromium: home renders; dark default and the saved light choice; all 200 images decode; explore count, search and filters; the detail sheet and its arrow keys; `#flag-` links; the quiz ending after exactly five wrong answers; flashcards; lookalikes and learn content; no horizontal scrolling on any view at phone width; no JavaScript errors. Google Fonts requests are blocked during the test so it runs offline.
