"""Synthetic twin-pair decoder check (fake data only).

Decoder: L2-penalised logistic regression, C=1, unpenalised intercept, solved
by Newton with Woodbury/push-through identities (cost ~ n^2 p + n^3 per step).
Evaluation: 8-fold cross-validation by pair (pair j in fold j mod 8), with
per-fold standardisation on training rows.
"""
import json
import math
import os
import time

import numpy as np

P_DIM = 5177
B_MIX = 0.6
NOISE = 0.3
SEED_BASE = 20261030
KINDS = ["linear", "relational"]
NS = [48, 96]  # 192 removed before any grid result: about 3 h; add it only if 96 still falls short
MS = [50, 500]
SS = [0.05, 0.1, 0.2, 0.4, 0.8, 1.6]
DATASETS = 20
NULL_DATASETS = 40
DATASET_NOTE = ("20 datasets per point and 8-fold by pair instead of leave-one-pair-out, because "
                "leave-one-pair-out was estimated at 8 h; N=48 therefore trains on 42 pairs, not 47")
C = 1.0
OUT_DIR = os.path.dirname(os.path.abspath(__file__))


def sigmoid(f):
    return 0.5 * (1.0 + np.tanh(0.5 * f))


def fit_logreg(X, y, C=1.0, maxit=100, tol=1e-9):
    """Minimise sum logloss(Xw+b) + (1/(2C))||w||^2 with unpenalised b.

    Newton steps on (w, b). The w-block inverse uses the Woodbury identity
    (lam I + X^T D X)^-1 = (1/lam)(I - X^T G (I + G K G)^-1 G X), G = sqrt(D/lam),
    K = X X^T, so only n x n systems are solved. The 1x1 intercept is handled
    by a Schur complement.
    """
    n, _ = X.shape
    lam = 1.0 / C
    K = X @ X.T
    w = np.zeros(X.shape[1])
    b = 0.0

    def objective(w, b):
        f = X @ w + b
        return float(np.sum(np.logaddexp(0.0, f) - y * f) + 0.5 * lam * (w @ w))

    eye = np.eye(n)
    for _ in range(maxit):
        f = X @ w + b
        pr = sigmoid(f)
        g = pr - y
        d = pr * (1.0 - pr)
        c = lam * w + X.T @ g
        e = g.sum()
        if math.sqrt(c @ c + e * e) < tol:
            break
        Gp = np.sqrt(d / lam)
        M = eye + Gp[:, None] * K * Gp[None, :]

        def ainv(v):
            t = np.linalg.solve(M, Gp * (X @ v))
            return (v - X.T @ (Gp * t)) / lam

        Md = X.T @ d
        u = ainv(c)
        q = ainv(Md)
        schur = d.sum() - Md @ q
        db = (-e + Md @ u) / schur
        dw = -u - q * db
        slope = c @ dw + e * db
        F0 = objective(w, b)
        t = 1.0
        while True:
            wn = w + t * dw
            bn = b + t * db
            if objective(wn, bn) <= F0 + 1e-4 * t * slope or t < 1e-12:
                break
            t *= 0.5
        w, b = wn, bn
    return w, b


def primal_gradient_norm(X, y, w, b, C=1.0):
    g = sigmoid(X @ w + b) - y
    gw = w / C + X.T @ g
    return float(math.sqrt(gw @ gw + g.sum() ** 2))


def sparse_pattern(rng, p, m):
    v = np.zeros(p, dtype=np.float32)
    idx = rng.choice(p, m, replace=False)
    v[idx] = rng.choice(np.array([-1.0, 1.0], dtype=np.float32), m)
    return v


def make_dataset(kind, N, m, s, rng):
    """Return (2N, p) float32 boards: row 2k = safe board of pair k, 2k+1 = unsafe."""
    p = P_DIM
    shared = rng.standard_normal(p).astype(np.float32)
    g = rng.standard_normal((N, p)).astype(np.float32)
    base = math.sqrt(1 - B_MIX) * shared + math.sqrt(B_MIX) * g
    if kind == "linear":
        P = sparse_pattern(rng, p, m)
        sign_pat = np.broadcast_to(P, (N, p))
    else:
        P1 = sparse_pattern(rng, p, m)
        Q1 = sparse_pattern(rng, p, m)
        Q2 = sparse_pattern(rng, p, m)
        uv = rng.integers(0, 2, size=(N, 2))
        u = uv[:, 0:1]
        v = uv[:, 1:2]
        cue = s * (2 * u - 1) * Q1 + s * (2 * v - 1) * Q2
        base = base + cue.astype(np.float32)
        sign_pat = np.where(u == v, P1, -P1)
    sig = (0.5 * s * sign_pat).astype(np.float32)
    e = rng.standard_normal((2 * N, p)).astype(np.float32)
    X = np.empty((2 * N, p), dtype=np.float32)
    X[0::2] = base + sig + NOISE * e[0::2]
    X[1::2] = base - sig + NOISE * e[1::2]
    return X


def count_correct(X, N, folds=8):
    """8-fold CV by pair (pair j in fold j mod 8).

    Returns the number of pairs where safe score > unsafe score.
    """
    raw = X.astype(np.float64)
    y_all = np.tile([1.0, 0.0], N)
    pair_fold = np.arange(N) % folds
    correct = 0
    for f in range(folds):
        held = np.where(pair_fold == f)[0]
        test = np.stack([2 * held, 2 * held + 1], axis=1).ravel()
        mask = np.ones(2 * N, dtype=bool)
        mask[test] = False
        Xtr = raw[mask]
        mu = Xtr.mean(axis=0)
        sd = Xtr.std(axis=0)
        keep = sd > 0
        Xs = (Xtr[:, keep] - mu[keep]) / sd[keep]
        w, b = fit_logreg(Xs, y_all[mask], C)
        Xte = (raw[test][:, keep] - mu[keep]) / sd[keep]
        sc = Xte @ w + b
        correct += int(np.sum(sc[0::2] > sc[1::2]))
    return correct


def rng_for(kind_index, N, m, s, ds):
    ss = np.random.SeedSequence([SEED_BASE, kind_index, N, m, int(round(s * 100)), ds])
    return np.random.default_rng(ss)


def self_test():
    results = {}
    worst = 0.0
    for name, (n, p) in {"n40_p30": (40, 30), "n40_p60": (40, 60)}.items():
        rng = np.random.default_rng(np.random.SeedSequence([SEED_BASE, 99, n, p]))
        X = rng.standard_normal((n, p))
        y = rng.integers(0, 2, n).astype(np.float64)
        w, b = fit_logreg(X, y, C)
        gn = primal_gradient_norm(X, y, w, b, C)
        worst = max(worst, gn)
        results[name] = {"n": n, "p": p, "gradientNorm": gn}
    results["passed"] = bool(worst < 1e-5)
    results["gradientThreshold"] = 1e-5
    return results


def strong_linear_check():
    N, m, s = 48, 500, 1.6
    counts = []
    for ds in range(5):
        rng = np.random.default_rng(np.random.SeedSequence([SEED_BASE, 99, N, m, 160, ds, 1]))
        counts.append(count_correct(make_dataset("linear", N, m, s, rng), N))
    need = math.ceil(0.75 * N)
    pass_rate = float(np.mean([c >= need for c in counts]))
    return {"N": N, "m": m, "s": s, "datasets": 5, "correctCounts": counts,
            "passRate": pass_rate, "highThreshold": 0.8, "isHigh": bool(pass_rate >= 0.8)}


def main():
    start = time.time()
    st = self_test()
    print("self-test 1 passed:", st["passed"], flush=True)
    st2 = strong_linear_check()
    print("self-test 2 pass rate:", st2["passRate"], flush=True)
    out = {"selfTest": {"solverGradient": st, "strongLinear": st2},
           "datasetsPerPoint": DATASETS, "datasetNote": DATASET_NOTE,
           "nullDatasetsPerN": NULL_DATASETS, "passNeed": {str(N): math.ceil(0.75 * N) for N in NS},
           "rows": [], "null": {}}
    if not st["passed"]:
        out["elapsedSeconds"] = round(time.time() - start, 1)
        out["aborted"] = "self-test 1 (solver gradient) failed; grid not run"
        with open(os.path.join(OUT_DIR, "output.json"), "w") as f:
            json.dump(out, f, indent=2)
        raise SystemExit("self-test failed")

    for N in NS:
        need = math.ceil(0.75 * N)
        for ki, kind in enumerate(KINDS):
            for m in MS:
                for s in SS:
                    counts = [count_correct(make_dataset(kind, N, m, s,
                                                         rng_for(ki, N, m, s, ds)), N)
                              for ds in range(DATASETS)]
                    out["rows"].append({
                        "kind": kind, "N": N, "m": m, "s": s,
                        "meanFraction": float(np.mean(counts)) / N,
                        "passRate": float(np.mean([c >= need for c in counts])),
                        "datasets": DATASETS})
                    print(f"N={N} {kind} m={m} s={s} done, t={time.time()-start:.0f}s", flush=True)
        counts = [count_correct(make_dataset("linear", N, 50, 0.0,
                                             rng_for(0, N, 50, 0.0, ds)), N)
                  for ds in range(NULL_DATASETS)]
        out["null"][str(N)] = {"meanFraction": float(np.mean(counts)) / N,
                               "passRate": float(np.mean([c >= need for c in counts])),
                               "datasets": NULL_DATASETS}
        print(f"null N={N} done, t={time.time()-start:.0f}s", flush=True)

    out["elapsedSeconds"] = round(time.time() - start, 1)
    with open(os.path.join(OUT_DIR, "output.json"), "w") as f:
        json.dump(out, f, indent=2)
    print("wrote output.json, elapsed", out["elapsedSeconds"], flush=True)


if __name__ == "__main__":
    main()
