# /// script
# requires-python = ">=3.11"
# dependencies = ["fonttools[woff]==4.68.0", "brotli==1.2.1"]
# ///
"""Wrap Noto Sans Mongolian as WOFF2 for the Manchu words beside the numerals."""
from pathlib import Path

from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parents[1]
font = TTFont(ROOT / 'data/manchu/NotoSansMongolian-Regular.ttf')
font.flavor = 'woff2'
out = ROOT / 'app/public/fonts/NotoSansMongolian-Regular.woff2'
out.parent.mkdir(parents=True, exist_ok=True)
font.save(out)
print(out.stat().st_size, 'bytes ->', out.relative_to(ROOT))
