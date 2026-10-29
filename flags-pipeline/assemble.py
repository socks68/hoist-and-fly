#!/usr/bin/env python3
"""Step 6: for each flag keep the WebP if it is clearly lighter than the SVG, otherwise the SVG.
Writes the final images to site/flags/ and their sizes to data/flagmeta.json."""
import json
import os
import re
import shutil

from PIL import Image

from paths import SVG, RASTER, SITE_FLAGS, FLAGMETA


def main():
    if os.path.exists(SITE_FLAGS):
        shutil.rmtree(SITE_FLAGS)
    os.makedirs(SITE_FLAGS)
    meta = {}
    for f in sorted(os.listdir(SVG)):
        if not f.endswith('.svg'):
            continue
        name, svg_path = f[:-4], os.path.join(SVG, f)
        webp = os.path.join(RASTER, name + '.webp')
        if os.path.exists(webp) and os.path.getsize(webp) < 0.7 * os.path.getsize(svg_path):
            shutil.copy(webp, os.path.join(SITE_FLAGS, name + '.webp'))
            w, h = Image.open(webp).size
            meta[name] = {'f': name + '.webp', 'w': w, 'h': h}
        else:
            shutil.copy(svg_path, os.path.join(SITE_FLAGS, f))
            vb = re.search(r'viewBox="([-\d.]+) ([-\d.]+) ([-\d.]+) ([-\d.]+)"', open(svg_path).read(800))
            meta[name] = {'f': f, 'w': float(vb.group(3)), 'h': float(vb.group(4))}
    json.dump(meta, open(FLAGMETA, 'w'), separators=(',', ':'))
    total = sum(os.path.getsize(os.path.join(SITE_FLAGS, x)) for x in os.listdir(SITE_FLAGS))
    webps = sorted(k for k, v in meta.items() if v['f'].endswith('.webp'))
    print(f'{len(meta)} images in site/flags ({total / 1e6:.2f} MB); WebP for: {" ".join(webps)}')


if __name__ == '__main__':
    main()
