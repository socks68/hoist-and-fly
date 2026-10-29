#!/usr/bin/env python3
"""Step 2: typeset every flag with pdfLaTeX (one page per flag) and convert each page to SVG with pdftocairo.

Writes work/tex/all.pdf, work/raw_svg/<code>.svg and data/ratios.tsv (height:length of each drawing).
"""
import os
import re
import shutil
import subprocess
import sys
from fractions import Fraction

from paths import PKG, WORK_TEX, WORK_CUSTOM, RAW_SVG, RATIOS

# Our codes are ISO 3166-1 alpha-2 in lower case, plus xk for Kosovo.
CODES = """af al dz ad ao ag ar am au at az bs bh bd bb by be bz bj bt bo ba bw br bn bg bf bi cv kh cm ca cf td cl cn
co km cg cr ci hr cu cy cz cd dk dj dm do ec eg sv gq er ee sz et fj fi fr ga gm ge de gh gr gd gt gn gw gy ht hn hu is
in id ir iq ie il it jm jp jo kz ke ki kp kr kw kg la lv lb ls lr ly li lt lu mg mw my mv ml mt mh mr mu mx fm md mc mn
me ma mz mm na nr np nl nz ni ne ng mk no om pk pw pa pg py pe ph pl pt qa ro ru rw kn lc vc ws sm st sa sn rs sc sl sg
sk si sb so za ss es lk sd sr se ch sy tj tz th tl tg to tt tn tr tm tv ug ua ae gb us uy uz vu ve vn ye zm zw va ps xk
tw""".split()
PKGCODE = {c: c.upper() for c in CODES}
PKGCODE.update({'af': 'AFX', 'sy': 'SYX', 'sl': 'SLX', 'xk': 'KO'})    # custom versions / package's own code
PICOPTS = {'ES': ',emblem'}                     # Spain: draw the coat of arms (the package's default omits it)
HAND_DRAWN = {'kg': os.path.join(WORK_CUSTOM, 'kg.svg')}
EXTRA = {'af-alt': 'AF', 'sy-old': 'SY', 'kg-old': 'KG'}  # previous / alternative designs shown on detail pages


def ratio_of(pkg):
    """Height:length from the \\begin{flagdescription}{ratio} line of a flag definition."""
    for d in (WORK_TEX, PKG):
        p = os.path.join(d, f'worldflag_{pkg}.tex')
        if os.path.exists(p):
            m = re.search(r'\\begin\{flagdescription\}\{([^}]*)\}', open(p, encoding='utf-8', errors='replace').read())
            num, _, den = m.group(1).strip().partition('/')
            return Fraction(num.strip()) / (Fraction(den.strip()) if den else 1)
    sys.exit(f'no definition for {pkg}; run make_custom.py first')


def main():
    os.makedirs(RAW_SVG, exist_ok=True)
    jobs = [(c, PKGCODE[c]) for c in CODES if c not in HAND_DRAWN] + list(EXTRA.items())
    lines = [r'\documentclass[tikz,border=0pt]{standalone}', r'\usepackage{worldflags}',
             r'\flagsdefault[width=6cm,framewidth=0mm]',
             # fixed bounding box = the flag itself, so stray clipped strokes cannot enlarge the page
             r'\newcommand\flagpage[3][]{\begin{tikzpicture}\useasboundingbox (-#3*3cm,-3cm) rectangle (#3*3cm,3cm);'
             r'\pic[country=#2#1]{worldflag};\end{tikzpicture}}',
             r'\newcommand\flagpagenat[1]{\begin{tikzpicture}\pic[country=#1]{worldflag};\end{tikzpicture}}',
             r'\begin{document}']
    meta = []
    for name, pkg in jobs:
        r = ratio_of(pkg)
        if pkg == 'NP':   # Nepal is not a rectangle: keep TikZ's natural bounding box
            lines.append(r'\flagpagenat{NP}')
        else:
            lines.append(r'\flagpage[%s]{%s}{%.6f}' % (PICOPTS.get(pkg, ''), pkg, float(1 / r)))
        meta.append((name, pkg, r))
    lines.append(r'\end{document}')
    open(os.path.join(WORK_TEX, 'all.tex'), 'w').write('\n'.join(lines) + '\n')

    print(f'typesetting {len(jobs)} flags with pdflatex ...', flush=True)
    res = subprocess.run(['pdflatex', '-interaction=nonstopmode', '-halt-on-error', 'all.tex'], cwd=WORK_TEX,
                         stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    if res.returncode != 0:
        print(res.stdout[-3000:])
        sys.exit('pdflatex failed')
    pdf = os.path.join(WORK_TEX, 'all.pdf')
    for i, (name, _, _) in enumerate(meta, start=1):
        subprocess.run(['pdftocairo', '-svg', '-f', str(i), '-l', str(i), pdf, os.path.join(RAW_SVG, name + '.svg')], check=True)
    for name, path in HAND_DRAWN.items():
        shutil.copy(path, os.path.join(RAW_SVG, name + '.svg'))
    with open(RATIOS, 'w') as f:          # page order matters: rasterize.py uses it to find pages in all.pdf
        for name, pkg, r in meta:
            f.write(f'{name}\t{pkg}\t{r.numerator}\t{r.denominator}\n')
        f.write('kg\tKGX\t3\t5\n')
    print(f'{len(meta) + len(HAND_DRAWN)} raw SVGs in {os.path.relpath(RAW_SVG)}')


if __name__ == '__main__':
    main()
