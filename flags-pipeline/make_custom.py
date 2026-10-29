#!/usr/bin/env python3
"""Step 1 of the flag pipeline: write the flags that the worldflags package does not have (or has an older
version of) into work/.

  * Afghanistan: the white flag with the Shahada flown since 2021. The calligraphy is taken from the package's
    Saudi Arabian flag, recoloured black, with the sword removed, enlarged and centred.
  * Syria: the green-white-black flag with three red stars, official since March 2025.
  * Sierra Leone: the package's drawing with the commonly used brighter green and blue.
  * Kyrgyzstan: the December 2023 design (straight rays, four laths each way in the tunduk), drawn as SVG.

The package's own Afghanistan, Syria and Kyrgyzstan drawings are still rendered as the "previous design" images.
"""
import math
import os
import sys

from paths import PKG, WORK_TEX, WORK_CUSTOM

os.makedirs(WORK_TEX, exist_ok=True)
os.makedirs(WORK_CUSTOM, exist_ok=True)


def afghanistan():
    lines = open(os.path.join(PKG, 'worldflag_SA.tex'), encoding='utf-8').read().split('\n')
    body = lines[7:628]  # the scopes holding the Shahada calligraphy; the sword follows on line 629
    if not body[0].startswith('\\begin{scope}[xshift=0.5\\flaglength,fill=white]') or body[-1].strip() != '\\end{scope}':
        sys.exit('worldflag_SA.tex has changed; update the line range in make_custom.py')
    body[0] = body[0].replace('fill=white', 'fill=black')
    out = ['% Afghanistan, de facto flag since 2021: white field with the Shahada in black',
           '% (calligraphy reused from the Saudi definition, sword removed, centred and enlarged)',
           '\\begin{flagdescription}{2/3}',
           '\\fill [white] (0,0) rectangle (\\flaglength,1);',
           # move the text's centre (0.7475, 0.6234) to the flag's centre and scale it up 1.5x
           '\\begin{scope}[shift={(0.75,0.5)},scale=1.5,shift={(-0.7475,-0.6234)}]']
    out += body + ['\\end{scope}'] * 4 + ['\\framecode{}', '\\end{flagdescription}', '']
    open(os.path.join(WORK_TEX, 'worldflag_AFX.tex'), 'w', encoding='utf-8').write('\n'.join(out))


SYRIA = r'''% Syria, national flag since 2025 (independence flag of 1932 restored)
\begin{flagdescription}{2/3}
\definecolor{sygreen}{RGB}{0,122,61}
\definecolor{syred}{RGB}{206,17,38}
\hstripesIII{sygreen}{white}{black}
\starV{syred}{(0.28*\flaglength,0.5)}{0.105}{0}
\starV{syred}{(0.5*\flaglength,0.5)}{0.105}{0}
\starV{syred}{(0.72*\flaglength,0.5)}{0.105}{0}
\framecode{}
\end{flagdescription}
'''


def sierra_leone():
    s = open(os.path.join(PKG, 'worldflag_SL.tex'), encoding='utf-8').read()
    s = s.replace('\\definecolor{green}{RGB}{122,154,1}', '\\definecolor{green}{RGB}{30,181,58}')
    s = s.replace('\\definecolor{blue}{RGB}{65,143,222}', '\\definecolor{blue}{RGB}{0,114,198}')
    open(os.path.join(WORK_TEX, 'worldflag_SLX.tex'), 'w', encoding='utf-8').write(s)


def kyrgyzstan():
    W, H = 500, 300
    cx, cy = 250, 150
    red, yel = '#E8112D', '#FFD800'
    r_tip, r_base, r_disc = 90, 59, 54          # rays start a little outside the sun's disc
    n, half = 40, math.radians(9 * 0.62 / 2)    # 40 straight rays
    rays = []
    for i in range(n):
        a = math.radians(i * 9) - math.pi / 2
        p1 = (cx + r_tip * math.cos(a), cy + r_tip * math.sin(a))
        p2 = (cx + r_base * math.cos(a - half), cy + r_base * math.sin(a - half))
        p3 = (cx + r_base * math.cos(a + half), cy + r_base * math.sin(a + half))
        rays.append('M%.2f %.2fL%.2f %.2fL%.2f %.2fZ' % (p1 + p2 + p3))
    r_out, r_in = 47.0, 41.0                     # the tunduk's red ring
    off, lw = 0.973 * r_in, 0.085 * r_in
    arcs = []
    for k in (1.74, 1.88, 2.02, 2.16):           # four laths in each direction, drawn as arcs
        for sx in (1, -1):
            arcs.append('<circle cx="%.2f" cy="%.2f" r="%.2f"/>' % (cx + sx * off, cy + off, k * r_in))
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">
<rect width="{W}" height="{H}" fill="{red}"/>
<path fill="{yel}" d="{''.join(rays)}"/>
<circle cx="{cx}" cy="{cy}" r="{r_disc}" fill="{yel}"/>
<clipPath id="kgt"><circle cx="{cx}" cy="{cy}" r="{r_in+0.3}"/></clipPath>
<g clip-path="url(#kgt)" fill="none" stroke="{red}" stroke-width="{lw:.2f}">{''.join(arcs)}</g>
<circle cx="{cx}" cy="{cy}" r="{(r_out+r_in)/2}" fill="none" stroke="{red}" stroke-width="{r_out-r_in}"/>
</svg>
'''
    open(os.path.join(WORK_CUSTOM, 'kg.svg'), 'w').write(svg)


if __name__ == '__main__':
    afghanistan()
    open(os.path.join(WORK_TEX, 'worldflag_SYX.tex'), 'w').write(SYRIA)
    sierra_leone()
    kyrgyzstan()
    print('custom flags written to', os.path.relpath(WORK_TEX), 'and', os.path.relpath(WORK_CUSTOM))
