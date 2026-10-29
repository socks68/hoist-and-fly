#!/usr/bin/env python3
"""Visual QA: render every image in site/flags/ onto contact sheets (build/sheets/sheetN.png), 50 per sheet."""
import json
import os

from playwright.sync_api import sync_playwright

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
OUT = os.path.join(ROOT, 'build', 'sheets')


def main(per=50):
    meta = json.load(open(os.path.join(ROOT, 'data', 'flagmeta.json')))
    names = sorted(meta)
    os.makedirs(OUT, exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={'width': 1400, 'height': 900})
        for k in range(0, len(names), per):
            cells = ''.join(f'<figure><div class="box"><img src="file://{ROOT}/site/flags/{meta[n]["f"]}"></div>'
                            f'<figcaption>{n}</figcaption></figure>' for n in names[k:k + per])
            html = ('<html><head><style>body{margin:8px;background:#9aa;font:13px sans-serif}'
                    '.g{display:grid;grid-template-columns:repeat(10,1fr);gap:8px}figure{margin:0}'
                    '.box{height:84px;display:flex;align-items:center;justify-content:center;background:#ccd}'
                    'img{max-width:100%;max-height:84px}figcaption{text-align:center}</style></head>'
                    f'<body><div class="g">{cells}</div></body></html>')
            tmp = os.path.join(OUT, 'sheet.html')
            open(tmp, 'w').write(html)
            page.goto('file://' + tmp)
            page.wait_for_timeout(800)
            page.screenshot(path=os.path.join(OUT, f'sheet{k // per + 1}.png'), full_page=True)
        browser.close()
    print('contact sheets written to build/sheets/')


if __name__ == '__main__':
    main()
