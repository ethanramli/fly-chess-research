# Eyes v1 design evidence (2026-10-31): can each square tell the six piece pictures apart?
# Static geometry only. Reads the retina arrays and piece pictures. No graph simulation and no chess data.
# Compares point sampling (first design) against mean ink over each photoreceptor's viewing cell (adopted).
# Run from the repository root with the project venv; output is saved in compare-sampling-output.txt.
import itertools
import json

import numpy as np
from PIL import Image

z = np.load('.cache/full.npz', allow_pickle=True)
sq = z['retina_square'].astype(int)
uv = z['retina_uv']
cell = np.zeros((len(sq), 4))
for q in range(64):
    m = np.flatnonzero(sq == q)
    ux, ix = np.unique(uv[m, 0], return_inverse=True)
    uy, iy = np.unique(uv[m, 1], return_inverse=True)
    cell[m, 0], cell[m, 1] = ix / len(ux), (ix + 1) / len(ux)
    cell[m, 2], cell[m, 3] = 1 - (iy + 1) / len(uy), 1 - iy / len(uy)
TYPES = 'pnbrqk'


def alpha_set(art, n):
    out = {}
    for t in TYPES:
        im = Image.open(f'.codebase/src/browser/assets/pieces/{art}/w{t}.png').convert('RGBA')
        out[t] = np.asarray(im.split()[3].resize((n, n), Image.BOX), float) / 255
    return out


def adopted_set():
    pictures = json.load(open('.codebase/src/chess-input/eyes-v1-pictures.json', encoding='utf-8'))['pictures']
    return {t: np.array([[int(c) / 9 for c in row] for row in pictures[t]]) for t in TYPES}


def point(pic):
    n = pic.shape[0]
    col = np.minimum(((cell[:, 0] + cell[:, 1]) / 2 * n).astype(int), n - 1)
    row = np.minimum(((cell[:, 2] + cell[:, 3]) / 2 * n).astype(int), n - 1)
    return (pic >= .5)[row, col].astype(float)


def area(pic):
    n = pic.shape[0]
    out = np.zeros(len(sq))
    for k, (a, b, c, d) in enumerate(cell):
        x0, y0 = int(np.floor(a * n)), int(np.floor(c * n))
        x1, y1 = min(n, max(int(np.ceil(b * n)), x0 + 1)), min(n, max(int(np.ceil(d * n)), y0 + 1))
        out[k] = pic[y0:y1, x0:x1].mean()
    return out


def report(name, pics, sample):
    s = {t: sample(pics[t]) for t in TYPES}
    res = sorted((float(np.abs(s[a][sq == q] - s[b][sq == q]).mean()), q, a, b)
                 for q in range(64) for a, b in itertools.combinations(TYPES, 2))
    v = np.array([r[0] for r in res])
    print(f'{name}: identical square/pair cases {int((v == 0).sum())} of {len(v)}; mean difference '
          f'min {v.min():.4f} p5 {np.percentile(v, 5):.4f} median {np.median(v):.4f}; worst {res[0][1:]}')


for art in ('classic', 'neo', 'ocean'):
    report(f'{art} silhouette, 16x16 thresholded, point', alpha_set(art, 16), point)
    report(f'{art} silhouette, 32x32 thresholded, point', alpha_set(art, 32), point)
    report(f'{art} silhouette, 32x32 grey, viewing cell', alpha_set(art, 32), area)
report('DejaVu glyphs, frozen 32x32, point', adopted_set(), point)
report('DejaVu glyphs, frozen 32x32, viewing cell (adopted)', adopted_set(), area)
