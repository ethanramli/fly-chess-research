# One-off generator for Eyes v1 (2026-10-31). Renders the six chess piece glyphs from the DejaVu Sans
# font bundled with matplotlib 3.11.1 into 32 x 32 pictures, one ink digit 0-9 per pixel.
# Writes .codebase/src/chess-input/eyes-v1-pictures.json and copies the font licence beside it.
# The pictures are an engineered, fixed rendering. They are not a measured model of fly vision.
# Run once: <venv>\Scripts\python.exe .codebase\scripts\chess-input\build-eyes-v1-pictures.py
import hashlib
import json
import os
import shutil

import matplotlib
import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
FONT_DIR = os.path.join(matplotlib.get_data_path(), 'fonts', 'ttf')
path = os.path.join(FONT_DIR, 'DejaVuSans.ttf')
G = {'p': '♟', 'n': '♞', 'b': '♝', 'r': '♜', 'q': '♛', 'k': '♚'}
N = 32
S = 1024
font = ImageFont.truetype(path, S // 2)

pictures = {}
for t, g in G.items():
    im = Image.new('L', (S, S), 0)
    ImageDraw.Draw(im).text((S // 4, S // 8), g, fill=255, font=font)
    c = im.crop(im.getbbox())
    w, h = c.size
    k = N * 16 * .875 / max(w, h)  # glyph fills 87.5% of the tile, centred, at 16x
    c = c.resize((round(w * k), round(h * k)), Image.BOX)
    t2 = Image.new('L', (N * 16, N * 16), 0)
    t2.paste(c, ((N * 16 - c.size[0]) // 2, (N * 16 - c.size[1]) // 2))
    a = np.asarray(t2.resize((N, N), Image.BOX), float) / 255
    digits = np.round(a * 9).astype(int)  # one digit 0-9 per pixel, row 0 is the top of the picture
    pictures[t] = [''.join(str(int(d)) for d in row) for row in digits]

sha = hashlib.sha256(open(path, 'rb').read()).hexdigest()
out = {
    'schema': 'eyes-v1-pictures', 'size': N, 'ink': 'digit/9', 'pictures': pictures,
    'source': {'font': 'DejaVu Sans', 'file': 'matplotlib 3.11.1 mpl-data/fonts/ttf/DejaVuSans.ttf', 'sha256': sha,
               'licence': 'eyes-v1-pictures-LICENSE.txt', 'glyphs': {t: 'U+%04X' % ord(g) for t, g in G.items()}},
}
src_dir = os.path.join(ROOT, '.codebase', 'src', 'chess-input')
with open(os.path.join(src_dir, 'eyes-v1-pictures.json'), 'w', encoding='utf-8', newline='\n') as f:
    json.dump(out, f, indent=1)
    f.write('\n')
shutil.copyfile(os.path.join(FONT_DIR, 'LICENSE_DEJAVU'), os.path.join(src_dir, 'eyes-v1-pictures-LICENSE.txt'))
