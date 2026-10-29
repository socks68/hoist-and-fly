#!/usr/bin/env python3
"""Step 5: flags with big coats of arms make heavy SVGs (Costa Rica's is several MB because of shading).
Render those pages from all.pdf at high resolution and save WebP versions, 1400 px on the long side."""
import os
import subprocess
import sys

from PIL import Image

from paths import SVG, RASTER, TMP_PNG, PDF, RATIOS

LIMIT = int(sys.argv[1]) if len(sys.argv) > 1 else 50_000   # bytes; only SVGs above this are rasterised
LONG = 1400


def main():
    os.makedirs(RASTER, exist_ok=True)
    os.makedirs(TMP_PNG, exist_ok=True)
    pages = [l.split('\t')[0] for l in open(RATIOS).read().strip().split('\n') if not l.startswith('kg\t')]
    done = []
    for i, name in enumerate(pages, start=1):
        if os.path.getsize(os.path.join(SVG, name + '.svg')) <= LIMIT:
            continue
        png = os.path.join(TMP_PNG, name)
        subprocess.run(['pdftocairo', '-png', '-transp', '-singlefile', '-r', '900', '-f', str(i), '-l', str(i), PDF, png], check=True)
        im = Image.open(png + '.png').convert('RGBA')
        x0, y0, x1, y1 = im.getchannel('A').point(lambda v: 255 if v > 127 else 0).getbbox()
        im = im.crop((x0 + 2, y0 + 2, x1 - 2, y1 - 2))        # trim antialiased edge pixels
        k = LONG / max(im.size)
        im = im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)
        rgb = Image.new('RGB', im.size, (255, 255, 255))
        rgb.paste(im, mask=im.getchannel('A'))
        rgb.save(os.path.join(RASTER, name + '.webp'), 'WEBP', quality=90, method=6)
        done.append(name)
    print(f'{len(done)} heavy flags rasterised: {" ".join(done)}')


if __name__ == '__main__':
    main()
