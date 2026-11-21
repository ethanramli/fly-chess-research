# Independent reference for the replay diary's random streams (design section 4.8).
# Written separately from replay-diary-v1.mjs, in Python with only the standard library, so the two can disagree.
# Output: replay-diary-reference-normals.json, the first eight normals of the "features" stream per registered seed.
import hashlib, json, math, os

M = (1 << 64) - 1

def rotl(x, k):
    return ((x << k) | (x >> (64 - k))) & M

def stream_seed(run_seed, label):
    return int.from_bytes(hashlib.sha256(f"{run_seed}|{label}".encode("utf-8")).digest()[:8], "big")

def splitmix(state):
    nxt = (state + 0x9E3779B97F4A7C15) & M
    z = ((nxt ^ (nxt >> 30)) * 0xBF58476D1CE4E5B9) & M
    z = ((z ^ (z >> 27)) * 0x94D049BB133111EB) & M
    return nxt, (z ^ (z >> 31)) & M

class Xo:
    def __init__(self, run_seed, label):
        sm = stream_seed(run_seed, label)
        self.s = []
        for _ in range(4):
            sm, v = splitmix(sm)
            self.s.append(v)

    def next(self):
        s = self.s
        result = (rotl((s[1] * 5) & M, 7) * 9) & M
        t = (s[1] << 17) & M
        s[2] ^= s[0]; s[3] ^= s[1]; s[1] ^= s[2]; s[0] ^= s[3]; s[2] ^= t
        s[3] = rotl(s[3], 45)
        return result

    def uniform_real(self):
        return (self.next() >> 11) / 2 ** 53

    def normal(self):
        u1 = self.uniform_real() or 2 ** -53
        u2 = self.uniform_real()
        return math.sqrt(-2 * math.log(u1)) * math.cos(2 * math.pi * u2)

seeds = [4101, 4102, 4103, 4104, 4105, 4106, 20261201, 20261202, 20261203]
out = {}
for seed in seeds:
    stream = Xo(seed, "features")  # one stream per seed, drawn eight times
    out[str(seed)] = [stream.normal() for _ in range(8)]
path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "replay-diary-reference-normals.json")
with open(path, "w", encoding="utf-8") as f:
    json.dump(out, f, indent=2)
print("wrote", path)
