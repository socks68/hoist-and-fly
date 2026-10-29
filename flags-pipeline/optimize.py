#!/usr/bin/env python3
"""Step 3: shrink the pdftocairo SVGs (hex colours, rounded numbers, thinner gradients) into work/svg/.

The viewBox is left as the PDF page; measure.py tightens it afterwards.
"""
import os
import re

from paths import RAW_SVG, SVG


def fmt(v, nd):
    v = round(v, nd)
    if v == int(v):
        return str(int(v))
    t = ('%.*f' % (nd, v)).rstrip('0').rstrip('.')
    if t.startswith('0.'):
        t = t[1:]
    elif t.startswith('-0.'):
        t = '-' + t[2:]
    return t


def round_in(text, nd):
    return re.sub(r'-?\d+\.\d+', lambda m: fmt(float(m.group(0)), nd), text)


def to_hex(m):
    vals = [float(v.strip().rstrip('%')) for v in m.group(1).split(',')]
    return '#%02x%02x%02x' % tuple(max(0, min(255, round(v * 2.55))) for v in vals)


def thin(m):
    """Shaded emblems arrive as gradients with 100+ stops; about ten look the same."""
    open_tag, stops, close_tag = m.group(1), re.findall(r'<stop [^>]*/>', m.group(2)), m.group(3)
    if len(stops) > 12:
        step = max(1, len(stops) // 10)
        keep = stops[::step]
        if keep[-1] != stops[-1]:
            keep.append(stops[-1])
        stops = keep
    return open_tag + ''.join(stops) + close_tag


def attr_round(m):
    name, val = m.group(1), m.group(2)
    if name == 'd':                       # path data: 2 decimals is ~1/8000 of the flag height
        val = re.sub(r' Z M -?[\d.]+ -?[\d.]+\s*$', ' Z', val)
        val = re.sub(r'\s+', ' ', round_in(val, 2)).strip()
    elif 'transform' in name.lower():     # keep transforms precise so parts stay aligned
        val = round_in(val, 5)
    elif name in ('id', 'href', 'xlink:href', 'clip-path', 'fill', 'stroke', 'xmlns', 'xmlns:xlink', 'version'):
        pass
    else:
        val = round_in(val, 3)
    return '%s="%s"' % (name, val)


def process(svg):
    s = re.sub(r'<\?xml[^>]*\?>\s*', '', svg)
    s = re.sub(r'rgb\(([-\d.%, ]+)\)', to_hex, s)
    for junk in (' fill-opacity="1"', ' stroke-opacity="1"', ' fill-rule="nonzero"', ' clip-rule="nonzero"', ' stop-opacity="1"'):
        s = s.replace(junk, '')
    s = re.sub(r'(<(?:radialGradient|linearGradient)[^>]*>)(\s*(?:<stop [^>]*/>\s*)+)(</(?:radialGradient|linearGradient)>)', thin, s)
    s = re.sub(r'([a-zA-Z:-]+)="([^"]*)"', attr_round, s)
    s = re.sub(r'>\s+<', '>\n<', s)
    return s.strip() + '\n'


if __name__ == '__main__':
    os.makedirs(SVG, exist_ok=True)
    before = after = 0
    for f in sorted(os.listdir(RAW_SVG)):
        if not f.endswith('.svg'):
            continue
        raw = open(os.path.join(RAW_SVG, f), encoding='utf-8').read()
        out = raw if f == 'kg.svg' else process(raw)   # the hand-drawn flag is already compact
        open(os.path.join(SVG, f), 'w', encoding='utf-8').write(out)
        before += len(raw)
        after += len(out)
    print('SVG total %.1f MB -> %.1f MB' % (before / 1e6, after / 1e6))
