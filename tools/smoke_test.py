#!/usr/bin/env python3
"""End-to-end checks of site/ in headless Chromium. Needs: pip install playwright && playwright install chromium

Serves site/ on a free local port and checks every view on desktop and phone sizes. Exits non-zero on failure.
Google Fonts requests are blocked so the test runs offline (the page falls back to system fonts).
"""
import functools
import http.server
import os
import sys
import threading

from playwright.sync_api import sync_playwright

SITE = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'site')
failures = []


def check(name, ok, detail=''):
    print(('PASS  ' if ok else 'FAIL  ') + name + (f'  ({detail})' if detail else ''))
    if not ok:
        failures.append(name)


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def serve():
    handler = functools.partial(QuietHandler, directory=SITE)
    server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server, f'http://127.0.0.1:{server.server_address[1]}/'


def new_page(browser, errors, **ctx):
    page = browser.new_context(**ctx).new_page()
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.route('**/fonts.googleapis.com/**', lambda r: r.abort())
    page.route('**/fonts.gstatic.com/**', lambda r: r.abort())
    return page


def main():
    server, url = serve()
    errors = []
    with sync_playwright() as p:
        browser = p.chromium.launch()
        pg = new_page(browser, errors, viewport={'width': 1280, 'height': 900}, color_scheme='light')

        pg.goto(url)
        pg.wait_for_selector('#fotd h2')
        check('home renders with a flag of the day', pg.title() == 'Hoist & Fly' and pg.inner_text('#fotd h2') != '')
        bg = lambda: pg.evaluate('getComputedStyle(document.body).backgroundColor')
        check('dark theme is the default, even on a light system', bg() == 'rgb(10, 17, 32)', bg())
        pg.click('[data-theme-set="light"]')
        pg.reload()
        pg.wait_for_selector('#fotd h2')
        check('light theme choice survives a reload', bg() == 'rgb(238, 242, 247)', bg())
        pg.click('[data-theme-set="dark"]')

        # every flag image decodes
        broken = pg.evaluate("""async () => {
            const names = Object.values(window.HF.meta).map(m => m.f);
            const results = await Promise.all(names.map(f => new Promise(res => {
                const i = new Image(); i.onload = () => res(i.naturalWidth > 0 ? null : f); i.onerror = () => res(f); i.src = 'flags/' + f;
            })));
            return results.filter(Boolean);
        }""")
        check('all flag images load', not broken, ' '.join(broken[:10]))

        pg.goto(url + '#explore')
        pg.wait_for_selector('#ex-grid .card')
        check('explore lists 197 flags', pg.inner_text('#ex-count').lower().startswith('197 of 197'))
        check('filters panel starts hidden', pg.evaluate("getComputedStyle(document.getElementById('ex-filters')).display") == 'none')
        pg.fill('#ex-q', 'japan')
        pg.wait_for_timeout(250)
        check('search finds Japan', pg.inner_text('#ex-count').lower().startswith('1 of'))
        pg.fill('#ex-q', '')
        pg.click('#ex-more')
        pg.click('[data-col="red"]')
        pg.click('[data-sym="crescent"]')
        pg.wait_for_timeout(200)
        n = int(pg.inner_text('#ex-count').split()[0])
        check('colour + symbol filters narrow the list', 0 < n < 197, f'{n} flags')
        pg.click('#ex-clear')

        pg.click('.card[data-open="fr"]')
        pg.wait_for_selector('#dlg[open]')
        check('flag details open', pg.inner_text('#dlg-name').lower() == 'france')
        pg.keyboard.press('ArrowRight')
        check('arrow key moves to the next flag', pg.inner_text('#dlg-name').lower() == 'gabon', pg.inner_text('#dlg-name'))
        pg.keyboard.press('Escape')
        pg.goto(url + '#flag-np')
        pg.wait_for_selector('#dlg[open]')
        check('#flag-xx links open a flag', pg.inner_text('#dlg-name').lower() == 'nepal')
        pg.keyboard.press('Escape')

        pg.goto(url + '#quiz')
        pg.click('[data-q="start"]')
        wrong = asked = 0
        while not pg.query_selector('.over') and asked < 400:
            pg.keyboard.press('1')
            asked += 1
            if pg.query_selector('.fb.bad'):
                wrong += 1
            pg.keyboard.press('Enter')
        check('quiz ends after exactly five wrong answers', wrong == 5 and pg.query_selector('.over') is not None, f'{asked} questions')

        pg.goto(url + '#flashcards')
        pg.click('[data-c="start"]')
        before = pg.inner_text('.fc-top .count')
        pg.keyboard.press(' ')
        pg.keyboard.press('2')
        check('flashcards flip and grade', pg.inner_text('.fc-top .count') != before, pg.inner_text('.fc-top .count'))

        pg.goto(url + '#lookalikes')
        pg.wait_for_selector('.lk')
        check('lookalike groups render', len(pg.query_selector_all('.lk')) >= 20)
        pg.goto(url + '#learn')
        pg.wait_for_selector('#gloss div')
        check('learn page renders glossary, families and records',
              len(pg.query_selector_all('#gloss div')) > 10 and len(pg.query_selector_all('#fam article')) > 5 and len(pg.query_selector_all('.rec')) > 10)

        mp = new_page(browser, errors, viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True, device_scale_factor=2)
        for view in ['start', 'explore', 'quiz', 'flashcards', 'lookalikes', 'learn']:
            mp.goto(url + '#' + view)
            mp.wait_for_timeout(300)
            overflow = mp.evaluate('document.documentElement.scrollWidth - window.innerWidth')
            check(f'phone width: no sideways scrolling on #{view}', overflow <= 0, f'{overflow}px')
        check('phone width: bottom tab bar is shown', mp.evaluate("getComputedStyle(document.querySelector('.tabbar')).display") != 'none')

        check('no JavaScript errors', not errors, '; '.join(errors[:3]))
        browser.close()
    server.shutdown()
    print(f'\n{len(failures)} failed' if failures else '\nall checks passed')
    sys.exit(1 if failures else 0)


if __name__ == '__main__':
    main()
