#!/usr/bin/env python3
"""Step 4: render each SVG in Chromium, find the pixels it actually paints and tighten the viewBox to the flag.

pdftocairo leaves a small, uneven margin around each drawing; without this step some flags would show a
thin transparent strip on one edge. The viewBox is inset by 0.15 units (under 0.1% of the height) so the
edge never shows a half-covered pixel. Needs Playwright with Chromium installed.
"""
import base64
import io
import os
import re
import sys

from PIL import Image
from playwright.sync_api import sync_playwright

from paths import SVG

K = 4  # CSS pixels per SVG unit while measuring


def main(names):
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(device_scale_factor=1, viewport={'width': 2000, 'height': 1000})
        for f in names:
            path = os.path.join(SVG, f)
            s = open(path, encoding='utf-8').read()
            vx, vy, vw, vh = map(float, re.search(r'viewBox="([-\d.]+) ([-\d.]+) ([-\d.]+) ([-\d.]+)"', s).groups())
            if (vx, vy) != (0.0, 0.0):
                continue                          # already cropped
            w, h = round(vw * K), round(vh * K)
            page.set_viewport_size({'width': w + 20, 'height': h + 20})
            data = base64.b64encode(s.encode()).decode()
            page.set_content(f'<html><body style="margin:0;background:transparent"><img id="i" style="display:block;'
                             f'width:{vw*K}px;height:{vh*K}px" src="data:image/svg+xml;base64,{data}"></body></html>')
            page.wait_for_function('document.getElementById("i").complete')
            png = page.screenshot(clip={'x': 0, 'y': 0, 'width': w, 'height': h}, omit_background=True)
            alpha = Image.open(io.BytesIO(png)).convert('RGBA').getchannel('A').point(lambda a: 255 if a > 127 else 0)
            x0, y0, x1, y1 = alpha.getbbox()
            inset = 0.0 if f.startswith('np') else 0.15   # Nepal's pennant is its own shape
            X0, Y0, X1, Y1 = x0 / K + inset, y0 / K + inset, x1 / K - inset, y1 / K - inset
            vb = '%.3f %.3f %.3f %.3f' % (X0, Y0, X1 - X0, Y1 - Y0)
            s = re.sub(r'<svg [^>]*>', '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" '
                       'width="%.3f" height="%.3f" viewBox="%s">' % (X1 - X0, Y1 - Y0, vb), s, count=1)
            open(path, 'w', encoding='utf-8').write(s)
        browser.close()
    print(f'measured {len(names)} SVGs')


if __name__ == '__main__':
    files = [a + '.svg' for a in sys.argv[1:]] or sorted(f for f in os.listdir(SVG) if f.endswith('.svg'))
    main(files)
