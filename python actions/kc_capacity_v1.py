"""KC representation capacity test (journal item 25). Oracle question, not learning.

Does ANY linear readout of all KC endpoint rates make a safe non-king capture score above every other legal move on a board?
Margin_j(w) = w . (r_s - r_j) for the best safe move s against every failing move j. Two weight domains:
  signed:   w in [-1, 1]^K
  positive: w in [0, 1]^K (excitatory KC-to-MBON synapses), written as w = 0.5 + 0.5 y, y in [-1, 1].
Solved with solve() from solve_oracle_lp_v1.py (box half-width 0.8 there, so inputs are rescaled by 1/0.8).
A positive lower bound is an existence witness for the linear readout; a negative upper bound is a certificate that none exists.
Usage: python kc_capacity_v1.py ALL_KC.json
"""
import json
import sys

import numpy as np

from solve_oracle_lp_v1 import solve


def main(path):
    D = json.load(open(path, encoding='utf-8'))
    for d in D['dumps']:
        R = np.array(d['allKc'])
        R = R / (np.abs(R).max() or 1.0)  # scale-free: margins are relative to the largest KC rate on the board
        safe = [m for m, u in enumerate(d['moves']) if d['outcomes'][u]]
        fail = [m for m, u in enumerate(d['moves']) if not d['outcomes'][u]]
        best = {}
        for kind in ('signed', 'positive'):
            top = (-np.inf, np.inf, None)
            for i in safe:
                C = R[i][None, :] - R[fail]
                if kind == 'signed':
                    upper, lower, _ = solve(np.zeros(len(fail)), C / 0.8, iters=4000)
                else:
                    upper, lower, _ = solve(0.5 * C.sum(axis=1), 0.5 * C / 0.8, iters=4000)
                if lower > top[0]:
                    top = (lower, upper, d['moves'][i])
            best[kind] = {'bestLower': top[0], 'upper': top[1], 'safe': top[2]}
        active = float((R > 1e-6).mean())
        print(json.dumps({'theta': d['theta'], 'board': d['boardId'], 'moves': len(d['moves']), 'activeFrac': round(active, 4), **best}))


if __name__ == '__main__':
    main(sys.argv[1])
