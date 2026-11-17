"""Procedural score + sound design for the BAUBC trailer.
Reads trailer/out/cues.json (written by render.cjs) and writes trailer/out/audio.wav (48 kHz, stereo)."""
import json, numpy as np
from scipy.signal import butter, sosfilt, fftconvolve
from scipy.io import wavfile

SR = 48000
cfg = json.load(open('trailer/out/cues.json'))
DUR = cfg['DUR'] + 1.0
N = int(DUR * SR)
rng = np.random.default_rng(3)
music = np.zeros((N, 2)); sfx = np.zeros((N, 2)); send = np.zeros((N, 2))

def lp(x, f, o=2): return sosfilt(butter(o, f, 'low', fs=SR, output='sos'), x, axis=0)
def hp(x, f, o=2): return sosfilt(butter(o, f, 'high', fs=SR, output='sos'), x, axis=0)
def bp(x, lo, hi, o=2): return sosfilt(butter(o, [lo, hi], 'band', fs=SR, output='sos'), x, axis=0)
def tt(d): return np.arange(int(d * SR)) / SR
def place(buf, t0, sig, pan=0.0, g=1.0):
    i = int(t0 * SR)
    if i >= N: return
    if sig.ndim == 1:
        l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
        sig = np.stack([sig * l * 1.414, sig * r * 1.414], 1)
    j = min(N, i + len(sig)); buf[i:j] += sig[: j - i] * g
def env(d, a=.005, r=None, curve=4):
    t = tt(d); e = np.minimum(1, t / max(a, 1e-4))
    return e * np.exp(-curve * t / d) if r is None else e * np.clip((d - t) / r, 0, 1)
def noise(d): return rng.standard_normal(int(d * SR))
mtof = lambda m: 440 * 2 ** ((m - 69) / 12)

# ───────────── SFX library ─────────────
def s_whoosh(d=1.0, v=1):
    t = tt(d); n = noise(d); x = np.zeros_like(n)
    # sweeping band-pass via blocks
    blocks = 24
    for b in range(blocks):
        s, e = int(len(n) * b / blocks), int(len(n) * (b + 1) / blocks)
        f = 300 + 5000 * np.sin(np.pi * (b + .5) / blocks) ** 2
        x[s:e] = bp(n[max(0, s - 2000):e], f * .5, min(f * 1.6, 20000))[-(e - s):]
    w = np.sin(np.pi * t / d) ** 2
    return x * w * .5 * v
def s_swoosh(v=1): return s_whoosh(.55, v * .9)
def s_riser(d=1.6, v=1):
    t = tt(d); n = noise(d); k = (t / d) ** 2
    x = hp(n, 800) * k * .25
    f = 200 * 2 ** (t / d * 3); ph = 2 * np.pi * np.cumsum(f) / SR
    x += (np.sin(ph) + .5 * np.sin(2.01 * ph) + .3 * np.sin(3.02 * ph)) * k * .12
    return x * v
def s_boom(v=1):
    d = 2.6; t = tt(d); f = 32 + 90 * np.exp(-t * 9); ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) * np.exp(-t * 1.6) * 1.1
    x += lp(noise(d), 1800) * np.exp(-t * 7) * .6
    return np.tanh(x * 1.4) * .9 * v
def s_impact(v=1):
    d = 1.4; t = tt(d); x = hp(noise(d), 1200) * np.exp(-t * 6) * .35
    x += np.sin(2 * np.pi * 70 * t) * np.exp(-t * 5) * .6
    return x * v
def s_tick(v=1):
    d = .07; t = tt(d); return (np.sin(2 * np.pi * 2600 * t) * .4 + hp(noise(d), 4000) * .3) * np.exp(-t * 90) * v
def s_key(v=1):
    d = .05; t = tt(d); f = 1800 + rng.random() * 900
    return (bp(noise(d), f * .7, f * 1.4) * .9 + np.sin(2 * np.pi * 180 * t) * .3) * np.exp(-t * 120) * v
def s_click(v=1):
    d = .12; t = tt(d); return (np.sin(2 * np.pi * 1200 * t) * np.exp(-t * 80) * .6 + bp(noise(d), 2000, 6000) * np.exp(-t * 150) * .6) * v
def s_pop(v=1):
    d = .25; t = tt(d); f = 500 + 900 * np.exp(-t * 30); ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-t * 22) * .55 * v
def bell(f, d=1.6, v=1):
    t = tt(d); x = sum(a * np.sin(2 * np.pi * f * m * t) * np.exp(-t * (2.5 + m * 1.2)) for m, a in [(1, 1), (2.01, .45), (3.03, .22), (4.2, .12)])
    return x * np.minimum(1, t / .003) * .32 * v
def s_ding(v=1): return bell(mtof(88), 1.2, v) + bell(mtof(95), 1.2, v * .5)
def s_coin(v=1):
    d = .5; t = tt(d); return (np.sin(2 * np.pi * mtof(96) * t) * (t < .07) + np.sin(2 * np.pi * mtof(100) * t) * (t >= .07)) * np.exp(-t * 9) * .22 * v
def s_success(v=1):
    x = np.zeros(int(1.6 * SR))
    for i, m in enumerate([81, 85, 88, 93]):
        b = bell(mtof(m), 1.3, .8); s = int(i * .08 * SR); x[s:s + len(b)] += b[: len(x) - s]
    return x * v
def s_sparkle(v=1):
    d = 1.8; x = np.zeros(int(d * SR))
    for i in range(16):
        m = rng.choice([88, 91, 93, 96, 98, 100, 103]); b = bell(mtof(m), .8, .35 * (1 - i / 18)); s = int((i * .06 + rng.random() * .03) * SR)
        x[s:s + len(b)] += b[: max(0, len(x) - s)]
    return x * v
def s_zap(v=1):
    d = .5; t = tt(d); f = 400 * 2 ** (t / d * 3.5); ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.sin(np.pi * t / d) * .18 * v + hp(noise(d), 5000) * np.sin(np.pi * t / d) * .05
def s_rise(v=1):
    d = .9; t = tt(d); f = mtof(64) * 2 ** (t / d); ph = 2 * np.pi * np.cumsum(f) / SR
    return (np.sin(ph) + .3 * np.sin(2 * ph)) * np.sin(np.pi * t / d) * .18 * v
def s_shimmer(v=1, d=3.0):
    t = tt(d); x = sum(np.sin(2 * np.pi * mtof(m) * t + i) * (0.5 + .5 * np.sin(t * (3 + i))) for i, m in enumerate([81, 88, 93, 96, 100]))
    return x * np.sin(np.pi * t / d) ** 2 * .05 * v
def s_sweep(v=1):
    d = .9; t = tt(d); return hp(noise(d), 6000) * np.sin(np.pi * t / d) ** 3 * .25 * v
def s_morph(v=1):
    d = 1.3; t = tt(d); f = 900 * 2 ** (-t / d * 2); ph = 2 * np.pi * np.cumsum(f) / SR
    return (np.sin(ph) * .12 + np.sin(1.5 * ph) * .06) * np.sin(np.pi * t / d) * v + s_whoosh(d, .5 * v)

LIB = dict(whoosh=lambda v: s_whoosh(1.0, v), swoosh=s_swoosh, boom=s_boom, impact=s_impact, tick=s_tick, key=s_key, click=s_click, pop=s_pop,
           ding=s_ding, coin=s_coin, success=s_success, sparkle=s_sparkle, zap=s_zap, rise=s_rise, shimmer=s_shimmer, sweep=s_sweep, morph=s_morph)
PAN = dict(key=.25, tick=0, click=.15, pop=0, coin=.3, zap=-.3, ding=.2)
for c in cfg['CUES']:
    t0, ty, v = c['t'], c['type'], c.get('v', 1)
    if ty == 'riser': place(sfx, t0, s_riser(v, 1.0), 0, 1); place(send, t0, s_riser(v, .4)); continue
    if ty in ('drone', 'music', 'tail'): continue
    s = LIB[ty](v); pan = PAN.get(ty, 0) * (rng.random() * 2 - 1)
    if ty in ('whoosh', 'swoosh', 'morph'):  # stereo sweep L->R
        g = np.linspace(-.7, .7, len(s)); st = np.stack([s * np.cos((g + 1) * np.pi / 4), s * np.sin((g + 1) * np.pi / 4)], 1) * 1.414
        place(sfx, t0, st); place(send, t0, st, g=.5); continue
    place(sfx, t0, s, pan); place(send, t0, s, pan, g=.6 if ty in ('ding', 'sparkle', 'success', 'shimmer', 'coin', 'impact', 'boom') else .25)

# ───────────── Score ─────────────
BPM = 100; BEAT = 60 / BPM; M0 = 6.05
# progression (A minor / C major): F  C  G  Am   — 2 bars each
CH = [[53, 57, 60, 64], [48, 55, 60, 64], [55, 59, 62, 67], [57, 60, 64, 69]]
ROOT = [41, 36, 43, 45]
def chord_at(t): return int(((t - M0) / (BEAT * 8)) % 4)
t_all = np.arange(N) / SR

# intro drone 0-6
d = 6.4; t = tt(d); dr = (np.sin(2 * np.pi * 55 * t) * .5 + np.sin(2 * np.pi * 82.4 * t + .3) * .3 + np.sin(2 * np.pi * 110.3 * t) * .15) * np.minimum(1, t / 2.5) * np.clip((d - t) / .6, 0, 1)
place(music, 0, dr * .55); place(music, .2, s_shimmer(1.2, 5.6)); place(send, .2, s_shimmer(1.2, 5.6))

def supersaw(freq, d, bright=8):
    t = tt(d); x = np.zeros_like(t)
    for det in (-.12, -.05, 0, .06, .11):
        f = freq * 2 ** (det / 12)
        for h in range(1, bright + 1):
            x += np.sin(2 * np.pi * f * h * t + h * det * 9) / h * np.exp(-h * .28)
    return x / 5
# sections: (start, end, intensity)
SECT = [(6.05, 25.6, 1.0), (25.6, 31.4, .55), (31.4, 54.6, 1.0)]
def intensity(t):
    for a, b, k in SECT:
        if a <= t < b: return k
    return 0
# pad + bass per chord
bar = BEAT * 4
cstart = M0
while cstart < 56.9:
    ci = chord_at(cstart + .01); d = bar * 2
    k = intensity(cstart + .01)
    if k > 0:
        pad = sum(supersaw(mtof(m), d + .6) for m in CH[ci]) * .045
        e = np.minimum(1, tt(d + .6) / .35) * np.clip((d + .6 - tt(d + .6)) / .6, 0, 1)
        pad = pad * e * k
        place(music, cstart, np.stack([pad * .95, np.roll(pad, 240)], 1))
        place(send, cstart, np.stack([pad, pad], 1), g=.35)
        # bass: eighth-note pulse
        for b8 in range(16):
            tb = cstart + b8 * BEAT / 2
            if tb >= 54.6: break
            dd = BEAT / 2; tq = tt(dd); f = mtof(ROOT[ci] - 12 + (12 if b8 % 4 == 3 else 0))
            bs = (np.sin(2 * np.pi * f * tq) + .25 * np.sin(4 * np.pi * f * tq)) * np.minimum(1, tq / .01) * np.exp(-tq * 4)
            place(music, tb, bs * .32 * k)
    cstart += d

# drums
def kick():
    d = .45; t = tt(d); f = 45 + 110 * np.exp(-t * 35); ph = 2 * np.pi * np.cumsum(f) / SR
    return np.tanh(np.sin(ph) * np.exp(-t * 7) * 1.6) * .75 + hp(noise(d), 3000) * np.exp(-t * 200) * .15
def hat(o=False):
    d = .2 if o else .06; t = tt(d); return hp(noise(d), 7000, 4) * np.exp(-t * (18 if o else 70)) * .16
def clap():
    d = .35; t = tt(d); n = bp(noise(d), 900, 3500)
    e = sum(np.exp(-np.maximum(0, t - o) * 60) * (t >= o) for o in (0, .012, .024)) * .5 + np.exp(-t * 14) * .5
    return n * e * .3
KICK = kick(); duck = np.ones(N)
beat_t = M0; bi = 0
while beat_t < 54.6:
    k = intensity(beat_t)
    half = 25.6 <= beat_t < 31.4
    if k > 0:
        if (not half) or bi % 2 == 0:
            place(music, beat_t, KICK * (.8 if half else 1)); i = int(beat_t * SR); L = int(.35 * SR)
            duck[i:i + L] = np.minimum(duck[i:i + L], 1 - .55 * np.exp(-np.arange(min(L, N - i)) / SR * 9))
        if not half:
            place(music, beat_t + BEAT / 2, hat(bi % 4 == 3), pan=.3)
            place(music, beat_t + BEAT / 4, hat() * .5, pan=-.3); place(music, beat_t + 3 * BEAT / 4, hat() * .5, pan=-.2)
            if bi % 2 == 1 and beat_t > 12: place(music, beat_t, clap()); place(send, beat_t, clap(), g=.4)
    beat_t += BEAT; bi += 1
# arp plucks from 12s
step = BEAT / 4; ta = 12.05; j = 0
while ta < 54.4:
    if intensity(ta) == 1.0:
        ci = chord_at(ta); notes = CH[ci] + [CH[ci][1] + 12, CH[ci][2] + 12]
        pat = [0, 2, 4, 1, 3, 5, 2, 4]; m = notes[pat[j % 8]] + 12
        d = .35; t = tt(d); f = mtof(m)
        pl = (np.sin(2 * np.pi * f * t) + .3 * np.sin(4 * np.pi * f * t) * np.exp(-t * 20)) * np.exp(-t * 11) * np.minimum(1, t / .002)
        pan = np.sin(j * .7) * .6
        place(music, ta, pl * .09, pan); place(send, ta, pl * .09, pan, g=.7)
    ta += step; j += 1
music[:, 0] *= duck; music[:, 1] *= duck

# outro: big final chord from the boom
d = 9.0; t = tt(d)
fin = sum(supersaw(mtof(m), d, 6) for m in [45, 52, 57, 60, 64, 69, 76]) * .05
fin *= np.minimum(1, t / .08) * np.exp(-t * .28) * np.clip((d - t) / 2.5, 0, 1)
fin = lp(fin, 3500)
place(music, 56.9, np.stack([fin, np.roll(fin, 300)], 1)); place(send, 56.9, np.stack([fin, fin], 1), g=.5)
place(music, 57.9, s_shimmer(1.5, 7.5)); place(send, 57.9, s_shimmer(1.5, 7.5))
sub = np.sin(2 * np.pi * 55 * t) * np.exp(-t * .5) * .3
place(music, 56.9, sub)

# reverb
ir_len = int(2.6 * SR); ti = np.arange(ir_len) / SR
ir = np.stack([rng.standard_normal(ir_len), rng.standard_normal(ir_len)], 1) * np.exp(-ti * 2.6)[:, None]
ir = lp(ir, 6000); ir[:int(.012 * SR)] = 0; ir /= np.sqrt((ir ** 2).sum(0))
wet = np.stack([fftconvolve(send[:, c], ir[:, c])[:N] for c in range(2)], 1)

mix = music * .9 + sfx * .85 + wet * .55
mix = hp(mix, 25)
# fades
mix *= np.clip(t_all / .3, 0, 1)[:, None]
fade_out = np.clip((cfg['DUR'] - t_all) / 1.6, 0, 1)
mix *= fade_out[:, None]
# master: soft-knee limiter
pk = np.max(np.abs(mix)); mix = mix / pk * 1.25
mix = np.tanh(mix) / np.tanh(1.25) * .93
wavfile.write('trailer/out/audio.wav', SR, (mix * 32767).astype(np.int16))
print('audio ok', mix.shape, 'peak', np.max(np.abs(mix)))
