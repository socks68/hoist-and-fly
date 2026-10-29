# Flag artwork

The site shows 200 images: one per country plus three alternative or previous designs (`af-alt`, `sy-old`, `kg-old`). They are in `site/flags/` and are committed, so you only need this pipeline when a flag changes.

Most are rendered from **[worldflags](https://ctan.org/pkg/worldflags)**, a LaTeX/TikZ package by Wilhelm Haager that draws the flags of the world, coats of arms included, in their official proportions (LaTeX Project Public License 1.3). TeX Live ships it, so the pipeline runs anywhere TeX Live is installed.

## Requirements

- TeX Live with the `worldflags` package (`kpsewhich worldflags.sty` should print a path). If it lives somewhere unusual, set `WORLDFLAGS_DIR` to the folder that holds `worldflags.sty`.
- `pdflatex` and `pdftocairo` (poppler-utils).
- Python 3 with Pillow and Playwright: `pip install pillow playwright && playwright install chromium`.

## Running it

```sh
npm run flags        # or: sh flags-pipeline/run_all.sh
npm run build        # re-embed the image sizes in site/index.html
npm run sheets       # optional: contact sheets in build/sheets/ to eyeball every flag
```

It takes 1–2 minutes and is deterministic: running it again produces identical files. Scratch files go to `flags-pipeline/work/`, which git ignores.

## The steps

| Step | Script | What it does |
|---|---|---|
| 1 | `make_custom.py` | Writes the flags the package lacks or has outdated (see below) into `work/tex/` and `work/custom/`. |
| 2 | `render.py` | Builds one LaTeX document with one page per flag (6 cm high, no frame, the page cropped exactly to the flag) and typesets it with `pdflatex` into `work/tex/all.pdf`. Converts each page to SVG with `pdftocairo` into `work/raw_svg/`, and records each flag's height:length in `data/ratios.tsv`. |
| 3 | `optimize.py` | Shrinks the SVGs about 45%: `rgb(…%)` colours become hex, path coordinates are rounded to 2 decimals (transforms kept at 5 so emblem parts stay aligned), default attributes are dropped, and gradients with 100+ stops are thinned to about ten. |
| 4 | `measure.py` | Renders each SVG in headless Chromium, finds the pixels it actually paints and tightens the `viewBox` to the flag, inset by 0.15 units. pdftocairo leaves a small uneven margin; without this some flags would show a hairline gap on one edge. |
| 5 | `rasterize.py` | Flags with big coats of arms make heavy SVGs (Costa Rica's is several MB because its shading becomes thousands of tiny shapes). Any SVG over 50 KB is also rendered from the PDF at 900 dpi, cropped and saved as WebP, 1400 px on the long side, quality 90. |
| 6 | `assemble.py` | Keeps the WebP when it is less than 70% of the SVG's size, otherwise the SVG (vector, crisp at any size). Copies the winners to `site/flags/` and writes `data/flagmeta.json` (file name and intrinsic width and height). |

Result: 183 SVG and 17 WebP files, about 2 MB in total. The WebP ones are Andorra, Belize, Costa Rica, Croatia, the Dominican Republic, Ecuador, El Salvador, Fiji, Guatemala, Haiti, Mexico, Montenegro, Nicaragua, San Marino, Serbia, Spain and Afghanistan's former tricolour.

Options passed to the package: `\flagsdefault[width=6cm,framewidth=0mm]`; Spain is drawn with `emblem` because the package's default leaves out its coat of arms. Kosovo's package code is `KO`. Nepal keeps TikZ's natural bounding box because it is not a rectangle.

## Flags that are not straight from the package

`make_custom.py` writes these before rendering:

| Flag | Why | How |
|---|---|---|
| Afghanistan (`af`) | The package has the 2004–2021 tricolour. The flag flown since 2021 is white with the Shahada in black. | Takes the Shahada calligraphy from the package's Saudi Arabian flag (`worldflag_SA.tex`, lines 8–628), recolours it black, drops the sword, scales it 1.5× and centres it on white. The script stops with a message if that file ever changes shape. |
| Syria (`sy`) | The package has the 1980–2024 flag. | A new TikZ definition: green (0,122,61), white, black stripes; three red (206,17,38) five-pointed stars at 28%, 50% and 72% of the length, outer radius 0.105 of the height. |
| Sierra Leone (`sl`) | The package uses an olive green and pale blue. | The package drawing with green (30,181,58) and blue (0,114,198). |
| Kyrgyzstan (`kg`) | The package has the 1992–2023 flag with wavy rays. | Drawn directly as SVG (500 × 300): 40 straight rays from radius 59 to 90 around a sun disc of radius 54, and the tunduk as a red ring with four laths each way, drawn as arcs. |

The package's own Afghanistan, Syria and Kyrgyzstan drawings are rendered too, as `af-alt`, `sy-old` and `kg-old`, for the detail pages.

## When a country changes its flag

1. **Check whether the package already has it.** If TeX Live's `worldflags` has been updated with the new design, re-render (step 4 below) and you are done.
2. **Otherwise add a custom definition** in `flags-pipeline/make_custom.py`:
   - For a simple design, add a TikZ `flagdescription` like `SYRIA`, using the package's helpers (`\hstripesIII`, `\vstripesIII`, `\starV`, `\moon`, …). The ratio in `\begin{flagdescription}{2/3}` is height/length. Write it to `work/tex/worldflag_<NEW>.tex`.
   - For a complex emblem, draw an SVG in `work/custom/` as with Kyrgyzstan.
3. **Point the country at it** in `flags-pipeline/render.py`: `PKGCODE['xx'] = '<NEW>'` for TikZ, or add it to `HAND_DRAWN` for an SVG. To keep the old flag as a "previous design", add `'xx-old': 'XX'` to `EXTRA`.
4. **Re-render:** `npm run flags`, then `npm run sheets` and look at the new flag.
5. **Update the words** in `content/`: `y`, `why`, `tip`, `fact`, and an `alt: {f: 'xx-old', cap: '…'}` line if you kept the old design.
6. `npm run build && npm test`, commit, and redeploy `site/`.
