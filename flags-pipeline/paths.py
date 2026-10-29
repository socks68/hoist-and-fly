"""Shared locations for the flag pipeline. Override the TeX package location with WORLDFLAGS_DIR."""
import os
import subprocess

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HERE)


def _find_package():
    if os.environ.get('WORLDFLAGS_DIR'):
        return os.environ['WORLDFLAGS_DIR']
    try:
        sty = subprocess.run(['kpsewhich', 'worldflags.sty'], capture_output=True, text=True).stdout.strip()
        if sty:
            return os.path.dirname(sty)
    except FileNotFoundError:
        pass
    return '/usr/share/texlive/texmf-dist/tex/latex/worldflags'


PKG = _find_package()                       # the installed worldflags LaTeX package
WORK = os.path.join(HERE, 'work')            # scratch space (git-ignored)
WORK_TEX = os.path.join(WORK, 'tex')         # custom TikZ flags + the combined document
WORK_CUSTOM = os.path.join(WORK, 'custom')   # hand-drawn SVGs
RAW_SVG = os.path.join(WORK, 'raw_svg')      # straight out of pdftocairo
SVG = os.path.join(WORK, 'svg')              # optimised and cropped
RASTER = os.path.join(WORK, 'raster')        # WebP versions of the heavy flags
TMP_PNG = os.path.join(WORK, 'png')
PDF = os.path.join(WORK_TEX, 'all.pdf')
SITE_FLAGS = os.path.join(REPO, 'site', 'flags')         # final images used by the site
FLAGMETA = os.path.join(REPO, 'data', 'flagmeta.json')   # file name + intrinsic size of each image
RATIOS = os.path.join(REPO, 'data', 'ratios.tsv')        # official proportions read from the drawings
