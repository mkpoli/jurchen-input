# /// script
# requires-python = ">=3.11"
# dependencies = ["fonttools[woff]==4.68.0", "brotli==1.2.1"]
# ///
"""Wrap the Alari font as WOFF2 for the site, outlines and tables untouched."""
from pathlib import Path

from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parents[1]
font = TTFont(ROOT / 'data/alari/AlariXuwasunJurchen-Regular.otf')
font.flavor = 'woff2'
out = ROOT / 'app/public/fonts/AlariXuwasunJurchen-Regular.woff2'
out.parent.mkdir(parents=True, exist_ok=True)
font.save(out)
print(out.stat().st_size, 'bytes ->', out.relative_to(ROOT))
