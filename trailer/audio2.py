"""BAUBC trailer v2: fast, upbeat 128 BPM score + sound design, all synthesised (no samples).
Reads trailer/out/cues2.json (written by render2.cjs) and writes trailer/out/audio2.wav (48 kHz stereo)."""
import json, numpy as np
from scipy.signal import butter, sosfilt, fftconvolve
from scipy.io import wavfile

SR = 48000
cfg = json.load(open('trailer/out/cues2.json'))
BPM = cfg.get('BPM', 128); B = 60 / BPM; BAR = 4 * B
bt = lambda bar, beat=0: (bar * 4 + beat) * B
DUR = cfg['DUR'] + 0.5
N = int(DUR * SR)
rng = np.random.default_rng(11)
music = np.zeros((N, 2)); drums = np.zeros((N, 2)); sfx = np.zeros((N, 2)); send = np.zeros((N, 2))

def lp(x, f, o=2): return sosfilt(butter(o, min(f, SR / 2 - 100), 'low', fs=SR, output='sos'), x, axis=0)
def hp(x, f, o=2): return sosfilt(butter(o, f, 'high', fs=SR, output='sos'), x, axis=0)
def bp(x, lo, hi, o=2): return sosfilt(butter(o, [lo, min(hi, SR / 2 - 100)], 'band', fs=SR, output='sos'), x, axis=0)
def tt(d): return np.arange(int(d * SR)) / SR
def noise(d): return rng.standard_normal(int(d * SR))
mtof = lambda m: 440 * 2 ** ((m - 69) / 12)
def place(buf, t0, sig, pan=0.0, g=1.0):
    i = int(round(t0 * SR))
    if i >= N or i < 0: return
    if sig.ndim == 1:
        l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
        sig = np.stack([sig * l * 1.414, sig * r * 1.414], 1)
    j = min(N, i + len(sig)); buf[i:j] += sig[: j - i] * g

# ── song map ────────────────────────────────────────────────────────────────
DROP_A = (bt(2), bt(22)); BREAK = (bt(22), bt(23)); DROP_B = (bt(23), bt(33)); BUILD2 = (bt(33), bt(34)); FINAL = (bt(34), bt(36)); OUTRO = (bt(36), bt(38))
def section(t):
    for name, (a, b) in [('intro', (0, bt(2))), ('dropA', DROP_A), ('break', BREAK), ('dropB', DROP_B), ('build', BUILD2), ('final', FINAL), ('outro', OUTRO)]:
        if a <= t < b: return name
    return None
# Am – F – C – G, one bar each
CH = [[57, 60, 64, 69], [53, 57, 60, 65], [48, 55, 60, 64], [55, 59, 62, 67]]
ROOT = [45, 41, 36, 43]
chord_at = lambda t: int((t // BAR) % 4)

# ── instruments ─────────────────────────────────────────────────────────────
def kick():
    d = .42; t = tt(d); f = 46 + 130 * np.exp(-t * 32); ph = 2 * np.pi * np.cumsum(f) / SR
    body = np.tanh(np.sin(ph) * np.exp(-t * 6.5) * 1.9)
    click = hp(noise(d), 2500) * np.exp(-t * 260) * .35
    return (body * .78 + click)
def clap():
    d = .34; t = tt(d); n = bp(noise(d), 1000, 4200)
    env = sum(np.exp(-np.maximum(0, t - o) * 70) * (t >= o) for o in (0, .011, .022)) * .45 + np.exp(-t * 13) * .55
    return n * env * .42
def snare():
    d = .22; t = tt(d); return (bp(noise(d), 1500, 7000) * np.exp(-t * 22) * .32 + np.sin(2 * np.pi * 190 * t) * np.exp(-t * 30) * .25)
def hat(open_=False):
    d = .26 if open_ else .05; t = tt(d); return hp(noise(d), 8000, 4) * np.exp(-t * (14 if open_ else 85)) * (.2 if open_ else .14)
def crash():
    d = 2.2; t = tt(d); return hp(noise(d), 4500, 2) * np.exp(-t * 2.2) * .22
def sub(f, d):
    t = tt(d); return (np.sin(2 * np.pi * f * t) + .18 * np.sin(4 * np.pi * f * t)) * np.minimum(1, t / .004) * np.exp(-t * 3.2)
def saw_stack(freqs, d, bright=10, detune=(-.14, -.06, 0, .07, .13)):
    t = tt(d); x = np.zeros_like(t)
    for f0 in freqs:
        for det in detune:
            f = f0 * 2 ** (det / 12)
            for h in range(1, bright + 1):
                x += np.sin(2 * np.pi * f * h * t + h * det * 7 + f0) / h * np.exp(-h * .22)
    return x / (len(freqs) * len(detune))
def pluck(m, d=.24):
    t = tt(d); f = mtof(m)
    x = (np.sin(2 * np.pi * f * t) + .45 * np.sin(4 * np.pi * f * t) * np.exp(-t * 18) + .2 * np.sin(6 * np.pi * f * t) * np.exp(-t * 30))
    return x * np.exp(-t * 13) * np.minimum(1, t / .0015)
def lead(m, d):
    t = tt(d); f = mtof(m) * (1 + .004 * np.sin(2 * np.pi * 5.5 * t) * np.minimum(1, t / .15))
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = sum(np.sin(ph * h) / h for h in range(1, 7)) * .6 + np.sin(ph * 1.005) * .3
    return lp(x * np.minimum(1, t / .01) * np.clip((d - t) / .05, 0, 1) * np.exp(-t * .8), 5200)
def stab(chord, d=.32, bright=12):
    x = saw_stack([mtof(m + 12) for m in chord], d, bright)
    t = tt(d); return x * np.exp(-t * 7) * np.minimum(1, t / .003)
def snare_roll(t0, t1, start_div=4, end_div=16, g=.9):
    t = t0
    while t < t1:
        k = (t - t0) / (t1 - t0); div = start_div + (end_div - start_div) * k * k
        place(drums, t, snare() * (.35 + .65 * k) * g, pan=.1)
        t += BAR / div
def riser(d, g=1.0):
    t = tt(d); k = (t / d) ** 2; n = noise(d)
    x = np.zeros_like(n); blocks = 30
    for bI in range(blocks):
        s, e = int(len(n) * bI / blocks), int(len(n) * (bI + 1) / blocks); f = 400 + 9000 * (bI / blocks) ** 2
        x[s:e] = bp(n[max(0, s - 1500):e], f * .6, f * 1.6)[-(e - s):]
    f = 220 * 2 ** (t / d * 3); ph = 2 * np.pi * np.cumsum(f) / SR
    return (x * k * .3 + (np.sin(ph) + .4 * np.sin(2 * ph)) * k * .1) * g

# ── arrangement ─────────────────────────────────────────────────────────────
KICK, CLAP, CRASH = kick(), clap(), crash()
duck = np.ones(N)
def duck_at(t0, depth=.6, rel=7.5):
    i = int(t0 * SR); L = int(.42 * SR); seg = np.arange(min(L, N - i)) / SR
    duck[i:i + len(seg)] = np.minimum(duck[i:i + len(seg)], 1 - depth * np.exp(-seg * rel))

# intro: four slammed hits on beats (with the logo pieces), then a roll + riser into the drop
for i in range(4):
    c = CH[0]
    place(music, bt(0, i), stab(c, .5, 14) * .9, g=1.0); place(send, bt(0, i), stab(c, .5, 14) * .5)
    place(drums, bt(0, i), KICK * 1.1); place(sfx, bt(0, i), sub(55, .6) * .6)
pad_in = saw_stack([mtof(m) for m in CH[0]], BAR * 1.05, 8)
pad_in = lp(pad_in * np.linspace(.2, 1, len(pad_in)), 2500) * .55
place(music, bt(1), pad_in); place(send, bt(1), pad_in, g=.4)
snare_roll(bt(1), bt(2) - B / 4, 4, 32, .9)
place(sfx, bt(1), riser(BAR - B / 4, 1.2))
for t0 in [i * B / 2 for i in range(4)]: place(drums, bt(1) + t0, hat() * .6, pan=.2)

def drop_bar(bar, intensity=1.0, lead_on=False, crash_on=False):
    t0 = bt(bar); ci = bar % 4; ch = CH[ci]
    if crash_on: place(drums, t0, CRASH, pan=-.2); place(send, t0, CRASH, g=.3)
    for beat in range(4):
        tb = t0 + beat * B
        place(drums, tb, KICK * intensity); duck_at(tb)
        if beat in (1, 3): place(drums, tb, CLAP * intensity); place(send, tb, CLAP, g=.35)
        place(drums, tb + B / 2, hat(True) * intensity, pan=.25)
        for s16 in (1, 3): place(drums, tb + s16 * B / 4, hat() * (.55 if s16 == 1 else .8) * intensity, pan=-.3)
        # pumping offbeat bass + octave bounce
        place(music, tb + B / 2, lp(sub(mtof(ROOT[ci] - 12), B / 2), 400) * .36 * intensity)
        place(music, tb + 3 * B / 4, sub(mtof(ROOT[ci]), B / 4) * .17 * intensity)
        # offbeat chord stabs ("future house")
        st = stab(ch, B * .7, 12) * .38 * intensity
        place(music, tb + B / 2, np.stack([st, np.roll(st, 160)], 1)); place(send, tb + B / 2, np.stack([st, st], 1), g=.35)
    # 16th-note pluck arpeggio
    notes = ch + [ch[1] + 12, ch[2] + 12]; pat = [0, 2, 4, 1, 3, 5, 2, 4, 0, 3, 5, 1, 4, 2, 5, 3]
    for s in range(16):
        pl = pluck(notes[pat[s]] + 12) * .085 * intensity
        place(music, t0 + s * B / 4, pl, pan=np.sin(s * .9) * .5); place(send, t0 + s * B / 4, pl, g=.6)
    if lead_on:   # hook: two-bar motif over the chord
        motif = [(0, 76, .75), (.75, 74, .25), (1, 72, .5), (1.5, 74, .5), (2, 76, 1), (3, 79, .5), (3.5, 76, .5)] if bar % 2 == 0 else \
                [(0, 74, .5), (.5, 72, .5), (1, 69, 1), (2, 71, .5), (2.5, 72, .5), (3, 74, 1)]
        for st_, m, d in motif:
            ld = lead(m + (0 if ci != 2 else -2) - (12 if m > 78 else 0), d * B * .95) * .11
            place(music, t0 + st_ * B, ld, pan=.08); place(send, t0 + st_ * B, ld, g=.55)

section_starts = {2, 4, 8, 12, 16, 19, 23, 25, 28, 31}
for bar in range(2, 22): drop_bar(bar, 1.0, lead_on=bar >= 4, crash_on=bar in section_starts)
# fills before each section change
for bar in [3, 7, 11, 15, 18, 21, 24, 27, 30]:
    for k in range(4): place(drums, bt(bar, 3) + k * B / 4, snare() * (.5 + k * .15), pan=.1)

# breakdown (login): filtered chords, half-time kick, roll back into drop B
bd = saw_stack([mtof(m) for m in CH[2]], BAR, 9); bd = lp(bd, 1400) * np.minimum(1, tt(BAR) / .2) * .6
place(music, bt(22), bd); place(send, bt(22), bd, g=.6)
place(drums, bt(22, 0), KICK); duck_at(bt(22, 0)); place(drums, bt(22, 2), KICK * .8); duck_at(bt(22, 2))
snare_roll(bt(22, 2), bt(23) - B / 8, 8, 32, .8); place(sfx, bt(22, 1.5), riser(BAR * .6, .8))
for bar in range(23, 33): drop_bar(bar, 1.0, lead_on=True, crash_on=bar in section_starts)

# build into the outro: roll, riser, filtered stabs, silence on the last half-beat
for beat in range(4):
    place(drums, bt(33, beat), KICK * (.8 + beat * .05)); duck_at(bt(33, beat))
    st = lp(stab(CH[3], B * .5, 10), 900 + beat * 900) * .45; place(music, bt(33, beat) + B / 2, st)
snare_roll(bt(33), bt(34) - B / 2, 4, 32, 1.0)
place(sfx, bt(33), riser(BAR - B / 2, 1.4))

# final drop (2 bars) then the outro
for bar in (34, 35): drop_bar(bar, 1.08, lead_on=True, crash_on=bar == 34)
place(drums, bt(36), CRASH * 1.2)
fin_d = BAR * 2 + .5; t = tt(fin_d)
fin = saw_stack([mtof(m) for m in [45, 57, 60, 64, 69, 76]], fin_d, 8) * .55
fin = lp(fin * np.minimum(1, t / .02) * np.exp(-t * .55), 4200)
place(music, bt(36), np.stack([fin, np.roll(fin, 300)], 1)); place(send, bt(36), np.stack([fin, fin], 1), g=.6)
place(music, bt(36), sub(55, fin_d) * .5)
for beat in range(4): place(drums, bt(36, beat), KICK * .85); duck_at(bt(36, beat), .45)
for s in range(16):  # sparkling arpeggio over the logo
    m = [81, 84, 88, 93][s % 4] + (12 if s % 8 >= 4 else 0)
    pl = pluck(m, .4) * .06 * (1 - s / 20); place(music, bt(36) + s * B / 4, pl, pan=np.sin(s) * .6); place(send, bt(36) + s * B / 4, pl, g=.8)

music[:, 0] *= duck; music[:, 1] *= duck

# ── sound effects from the timeline cues ────────────────────────────────────
def s_whoosh(d=.7, v=1):
    n = noise(d); x = np.zeros_like(n); blocks = 22
    for bI in range(blocks):
        s, e = int(len(n) * bI / blocks), int(len(n) * (bI + 1) / blocks); f = 400 + 6500 * np.sin(np.pi * (bI + .5) / blocks) ** 2
        x[s:e] = bp(n[max(0, s - 1500):e], f * .5, f * 1.7)[-(e - s):]
    return x * np.sin(np.pi * tt(d) / d) ** 2 * .45 * v
def s_impact(v=1):
    d = 1.3; t = tt(d); return (hp(noise(d), 1500) * np.exp(-t * 7) * .3 + np.sin(2 * np.pi * 62 * t) * np.exp(-t * 4.5) * .6) * v
def s_boom(v=1):
    d = 2.6; t = tt(d); f = 30 + 100 * np.exp(-t * 8); ph = 2 * np.pi * np.cumsum(f) / SR
    return np.tanh(np.sin(ph) * np.exp(-t * 1.5) * 1.6 + lp(noise(d), 1600) * np.exp(-t * 8) * .5) * .85 * v
def s_tick(v=1): d = .06; t = tt(d); return (np.sin(2 * np.pi * 2800 * t) * .4 + hp(noise(d), 5000) * .3) * np.exp(-t * 95) * v
def s_key(v=1): d = .045; t = tt(d); f = 1900 + rng.random() * 900; return bp(noise(d), f * .7, f * 1.4) * np.exp(-t * 130) * v
def s_click(v=1): d = .1; t = tt(d); return (np.sin(2 * np.pi * 1300 * t) * np.exp(-t * 85) * .55 + bp(noise(d), 2500, 7000) * np.exp(-t * 160) * .5) * v
def s_pop(v=1): d = .2; t = tt(d); f = 600 + 1100 * np.exp(-t * 32); return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 24) * .5 * v
def bell(f, d=1.2, v=1):
    t = tt(d); return sum(a * np.sin(2 * np.pi * f * m * t) * np.exp(-t * (3 + m * 1.3)) for m, a in [(1, 1), (2.01, .45), (3.03, .2), (4.2, .1)]) * np.minimum(1, t / .003) * .3 * v
def s_ding(v=1): return bell(mtof(88), 1.1, v) + bell(mtof(95), 1.1, v * .5)
def s_coin(v=1): d = .45; t = tt(d); return (np.sin(2 * np.pi * mtof(96) * t) * (t < .06) + np.sin(2 * np.pi * mtof(100) * t) * (t >= .06)) * np.exp(-t * 10) * .2 * v
def s_success(v=1):
    x = np.zeros(int(1.4 * SR))
    for i, m in enumerate([81, 85, 88, 93]): b_ = bell(mtof(m), 1.1, .8); s = int(i * .07 * SR); x[s:s + len(b_)] += b_[: len(x) - s]
    return x * v
def s_sparkle(v=1):
    d = 1.6; x = np.zeros(int(d * SR))
    for i in range(14):
        b_ = bell(mtof(rng.choice([88, 91, 93, 96, 98, 100, 103])), .7, .35 * (1 - i / 16)); s = int((i * .055 + rng.random() * .03) * SR); x[s:s + len(b_)] += b_[: max(0, len(x) - s)]
    return x * v
def s_zap(v=1): d = .45; t = tt(d); f = 420 * 2 ** (t / d * 3.5); return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / d) * .16 * v
def s_rise(v=1): d = .8; t = tt(d); f = mtof(64) * 2 ** (t / d); return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / d) * .16 * v
def s_shimmer(v=1, d=3.0):
    t = tt(d); return sum(np.sin(2 * np.pi * mtof(m) * t + i) * (.5 + .5 * np.sin(t * (3 + i))) for i, m in enumerate([81, 88, 93, 96, 100])) * np.sin(np.pi * t / d) ** 2 * .045 * v
def s_sweep(v=1): d = .8; t = tt(d); return hp(noise(d), 6000) * np.sin(np.pi * t / d) ** 3 * .22 * v
def s_marker(v=1):   # the highlighter: a bright felt-tip squeak sweeping up
    d = .5; t = tt(d); n = noise(d); x = np.zeros_like(n)
    for bI in range(12):
        s, e = int(len(n) * bI / 12), int(len(n) * (bI + 1) / 12); f = 1800 + 3500 * bI / 12
        x[s:e] = bp(n[max(0, s - 800):e], f * .8, f * 1.25)[-(e - s):]
    return x * np.sin(np.pi * t / d) * .35 * v
def s_blip(v=1):     # route cards: a digital blip whose pitch climbs with v
    d = .14; t = tt(d); f = 900 * 2 ** ((v - .5) * 2.2); return (np.sin(2 * np.pi * f * t) * .5 + np.sign(np.sin(2 * np.pi * f * 2 * t)) * .08) * np.exp(-t * 32) * .5
def s_morph(v=1):
    d = 1.1; t = tt(d); f = 900 * 2 ** (-t / d * 2); return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / d) * .12 * v + s_whoosh(d, .5 * v)

LIB = dict(whoosh=lambda v: s_whoosh(.65, v), swoosh=lambda v: s_whoosh(.42, v * .9), boom=s_boom, impact=s_impact, tick=s_tick, key=s_key, click=s_click,
           pop=s_pop, ding=s_ding, coin=s_coin, success=s_success, sparkle=s_sparkle, zap=s_zap, rise=s_rise, shimmer=s_shimmer, sweep=s_sweep,
           marker=s_marker, blip=s_blip, morph=s_morph)
for c in cfg['CUES']:
    t0, ty, v = c['t'], c['type'], c.get('v', 1)
    if ty in ('song', 'tail', 'riser'): continue       # the score covers these
    s = LIB[ty](v)
    if ty in ('whoosh', 'swoosh', 'morph'):
        g = np.linspace(-.8, .8, len(s)); st = np.stack([s * np.cos((g + 1) * np.pi / 4), s * np.sin((g + 1) * np.pi / 4)], 1) * 1.414
        place(sfx, t0, st); place(send, t0, st, g=.4); continue
    place(sfx, t0, s, pan=(rng.random() - .5) * .5); place(send, t0, s, g=.5 if ty in ('ding', 'sparkle', 'success', 'shimmer', 'coin', 'impact', 'boom', 'marker') else .2)

# ── reverb, mix, master ─────────────────────────────────────────────────────
ir_len = int(2.2 * SR); ti = np.arange(ir_len) / SR
ir = np.stack([rng.standard_normal(ir_len), rng.standard_normal(ir_len)], 1) * np.exp(-ti * 3.1)[:, None]
ir = lp(ir, 7000); ir[:int(.015 * SR)] = 0; ir /= np.sqrt((ir ** 2).sum(0))
wet = np.stack([fftconvolve(send[:, c], ir[:, c])[:N] for c in range(2)], 1)
mix = music * .9 + drums * .85 + sfx * .85 + wet * .45
mix = hp(mix, 28)
t_all = np.arange(N) / SR
mix *= np.clip(t_all / .05, 0, 1)[:, None] * np.clip((cfg['DUR'] - t_all) / 1.4, 0, 1)[:, None]
# glue: gentle bus compression via soft clip, then normalise
pk = np.percentile(np.abs(mix), 99.95); mix = np.tanh(mix / pk * 1.2) / np.tanh(1.2) * .95
wavfile.write('trailer/out/audio2.wav', SR, (mix * 32767).astype(np.int16))
print('audio2 ok', mix.shape)
