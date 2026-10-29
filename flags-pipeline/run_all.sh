#!/bin/sh
# Rebuild every flag image from the worldflags LaTeX package. Takes 2-3 minutes.
set -e
cd "$(dirname "$0")"
python3 make_custom.py
python3 render.py
python3 optimize.py
python3 measure.py
python3 rasterize.py
python3 assemble.py
