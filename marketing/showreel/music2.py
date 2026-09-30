"""Podkład filmu 2 (60 s, 120 BPM, takt = 2 s). Cięcia na granicach taktów, akcenty
na ćwierćnutach; timeline w index2.html używa tych samych liczb."""
import numpy as np, wave, json, sys

SR = 48000
DUR = 60.0
BPM = 120
BEAT = 60 / BPM
N = int(SR * DUR)
L = np.zeros(N); R = np.zeros(N)
rng = np.random.default_rng(7)


def add(sig, t, gain=1.0, pan=0.0):
    i = int(t * SR)
    if i >= N: return
    sig = sig[: N - i]
    l = np.cos((pan + 1) * np.pi / 4); r = np.sin((pan + 1) * np.pi / 4)
    L[i:i + len(sig)] += sig * gain * l * 1.414
    R[i:i + len(sig)] += sig * gain * r * 1.414


def env(n, a=0.002, d=0.2, curve=4.0):
    t = np.arange(n) / SR
    e = np.minimum(1, t / max(a, 1e-5)) * np.exp(-t / d * curve / 4)
    return e


from scipy.signal import lfilter
from functools import lru_cache

def lp(x, cutoff):
    # jednobiegunowy filtr dolnoprzepustowy, cutoff stały lub tablica
    if np.isscalar(cutoff):
        a = 1 - np.exp(-2 * np.pi * cutoff / SR)
        return lfilter([a], [1, -(1 - a)], x)
    y = np.zeros_like(x); s = 0.0
    c = np.broadcast_to(cutoff, x.shape)
    a = 1 - np.exp(-2 * np.pi * c / SR)
    for i in range(len(x)):
        s += a[i] * (x[i] - s); y[i] = s
    return y


def hp(x, cutoff):
    return x - lp(x, cutoff)


# ---------- instrumenty ----------
def kick(big=False):
    n = int(SR * (0.9 if big else 0.45))
    t = np.arange(n) / SR
    f = 45 + 140 * np.exp(-t * 28)
    ph = 2 * np.pi * np.cumsum(f) / SR
    s = np.sin(ph) * np.exp(-t * (3.2 if big else 7))
    click = rng.standard_normal(n) * np.exp(-t * 400) * 0.25
    return np.tanh((s + click) * 1.6)


def clap():
    n = int(SR * 0.35); t = np.arange(n) / SR
    no = rng.standard_normal(n)
    e = np.zeros(n)
    for k, off in enumerate([0, 0.011, 0.022]):
        i = int(off * SR); e[i:] += np.exp(-(t[: n - i]) * (90 if k < 2 else 18))
    s = hp(no * e, 900)
    return s * 0.7


def hat(open_=False):
    n = int(SR * (0.22 if open_ else 0.05)); t = np.arange(n) / SR
    s = hp(rng.standard_normal(n), 7000) * np.exp(-t * (14 if open_ else 90))
    return s * 0.5


def note_hz(m):
    return 440 * 2 ** ((m - 69) / 12)


def bass(m, dur):
    n = int(SR * dur); t = np.arange(n) / SR
    f = note_hz(m)
    s = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * 2 * f * t) + 0.12 * np.sign(np.sin(2 * np.pi * f * t))
    e = np.minimum(1, t / 0.005) * np.minimum(1, (dur - t) / 0.03).clip(0, 1)
    return np.tanh(s * 1.3) * e * 0.55


def saw(f, t, detune=0.0):
    ph = (f * (1 + detune)) * t
    return 2 * (ph - np.floor(ph + 0.5))


@lru_cache(None)
def pad(chord, dur):
    n = int(SR * dur); t = np.arange(n) / SR
    s = np.zeros(n)
    for m in chord:
        f = note_hz(m)
        for d in (-0.004, 0.0, 0.005):
            s += saw(f, t, d)
    s /= len(chord) * 3
    s = lp(s, 1600)
    e = np.minimum(1, t / 0.25) * np.minimum(1, (dur - t) / 0.3).clip(0, 1)
    return s * e * 0.5


@lru_cache(None)
def pluck(m, dur=0.25):
    n = int(SR * dur); t = np.arange(n) / SR
    f = note_hz(m)
    s = saw(f, t) * 0.6 + np.sin(2 * np.pi * f * t) * 0.4
    s = lp(s, 5000 * np.exp(-t * 12) + 300)
    return s * np.exp(-t * 11) * 0.5


def whoosh(dur=0.7, rev=False):
    n = int(SR * dur); t = np.arange(n) / SR
    x = t / dur
    shape = np.sin(np.pi * x) ** 2
    no = rng.standard_normal(n)
    cut = 400 + 7000 * shape
    s = lp(no, cut) - lp(no, cut * 0.25)
    s = s * shape
    return (s[::-1] if rev else s) * 1.2


def riser(dur):
    n = int(SR * dur); t = np.arange(n) / SR; x = t / dur
    no = rng.standard_normal(n)
    s = hp(lp(no, 300 + 9000 * x ** 2), 200) * x ** 2
    f = 200 + 900 * x ** 2
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.15 * x ** 3
    return (s * 0.5 + tone)


def impact():
    n = int(SR * 2.5); t = np.arange(n) / SR
    k = np.zeros(n); kk = kick(True); k[: len(kk)] = kk
    no = lp(rng.standard_normal(n), 2500) * np.exp(-t * 2.2) * 0.5
    sub = np.sin(2 * np.pi * 38 * t) * np.exp(-t * 1.4) * 0.6
    return np.tanh((k + no + sub) * 1.2)


def ding(m=88, dur=1.2):
    n = int(SR * dur); t = np.arange(n) / SR
    f = note_hz(m)
    s = (np.sin(2 * np.pi * f * t) + 0.4 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t * 6)
         + 0.2 * np.sin(2 * np.pi * f * 5.4 * t) * np.exp(-t * 12))
    return s * np.exp(-t * 3.5) * np.minimum(1, t / 0.002) * 0.35


def tick():
    n = int(SR * 0.03); t = np.arange(n) / SR
    return hp(rng.standard_normal(n), 3000) * np.exp(-t * 300) * 0.35


def pop():
    n = int(SR * 0.12); t = np.arange(n) / SR
    f = 900 * np.exp(-t * 20) + 300
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 35) * 0.5


def scribble(dur):
    n = int(SR * dur); t = np.arange(n) / SR
    no = rng.standard_normal(n)
    mod = 0.5 + 0.5 * np.sin(2 * np.pi * 7 * t) * np.sin(2 * np.pi * 2.3 * t)
    return (lp(no, 3500) - lp(no, 1200)) * mod * 0.6


# ---------- aranżacja ----------
# Dm – Bb – F – C, po jednym takcie (2 s) każdy
prog = [(50, [62, 65, 69]), (46, [62, 65, 70]), (53, [60, 65, 69]), (48, [60, 64, 67])]
arp_pat = [0, 12, 7, 12, 3, 12, 7, 19]

bars = int(DUR / (4 * BEAT))
for b in range(bars):
    t0 = b * 4 * BEAT
    root, chord = prog[b % 4]
    intro = t0 < 4
    brk = 38 <= t0 < 40            # przed „Wydaj pojazd”: napięcie
    finale = t0 >= 48              # plansza z możliwościami: bez klaśnięć, lżej
    outro = t0 >= 58
    add(pad(tuple(chord), 4 * BEAT + 0.3), t0, 0.55 if not intro else 0.35)
    if outro:
        continue
    for q in range(4):
        tb = t0 + q * BEAT
        if intro:
            if q in (0, 2) or (b == 1 and q == 3):
                add(kick(), tb, 0.55)
            continue
        if brk:
            step = BEAT / 2 if q < 2 else BEAT / 4
            k = 0
            while k * step < BEAT:
                add(clap(), tb + k * step, 0.18 + 0.12 * q, pan=0.1)
                k += 1
            continue
        add(kick(), tb, 0.9 if not finale else 0.7)
        if q in (1, 3) and not finale:
            add(clap(), tb, 0.55)
        add(hat(True), tb + BEAT / 2, 0.22, pan=0.3)
        for s16 in (1, 3):
            add(hat(), tb + s16 * BEAT / 4, 0.18, pan=-0.3)
        add(bass(root - 12 if q % 2 == 0 else root, BEAT / 2 - 0.02), tb + BEAT / 2, 0.8)
        add(bass(root - 12, BEAT / 2 - 0.05), tb, 0.35)
    if not intro and not brk:
        for k in range(16):
            m = root + 12 + arp_pat[k % 8]
            add(pluck(m), t0 + k * BEAT / 4, 0.28 if not finale else 0.2, pan=0.4 if k % 2 else -0.4)

# ---------- przejścia i akcenty (sekundy) ----------
add(riser(3.8), 0.2, 0.55)
for t in (4.0, 40.0, 48.0):
    add(impact(), t, 0.9)
for t in (12, 16, 20, 26, 32, 36, 46.8):
    add(whoosh(0.8), t - 0.45, 0.9)
add(whoosh(0.6), 42.9 - 0.3, 0.45)
add(riser(1.9), 38.1, 0.6)
add(riser(1.4), 46.6, 0.35)
def buzz(dur=0.35):
    n = int(SR * dur); t = np.arange(n) / SR
    return np.sin(2 * np.pi * 150 * t) * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 22 * t))) * np.minimum(1, (dur - t) / 0.05) * 0.35
# intro: uderzenia słów
for t in (0.5, 1.0, 1.5, 2.0, 2.5):
    add(pop(), t, 0.55)
add(ding(81, 0.9), 3.0, 0.35)
# 01 rezerwacja: klik, pisanie tytułu (27 znaków), pola, zapis
add(pop(), 5.5, 0.55)
for i in range(27):
    add(tick(), 6.1 + i * 0.048, 0.55, pan=0.2)
for t in (7.68, 7.86, 8.02, 8.44, 8.94, 9.04, 9.26, 9.42, 9.62, 9.74, 9.86):
    add(tick(), t, 0.7)
add(pop(), 10.4, 0.6)
add(ding(84, 0.8), 10.45, 0.5)
# 02 szablony: strony wlatują, skan wypełnia protokół
for i in range(4):
    add(whoosh(0.35), 12.25 + i * 0.12, 0.3, pan=-0.4 + i * 0.27)
add(riser(0.9), 14.3, 0.35)
for i in range(4):
    add(pluck(74 + [0, 3, 7, 10][i], 0.2), 14.4 + i * 0.18, 0.3)
# 03 przyjęcie: punkt uszkodzenia, zaznaczenia, przełącznik
add(pop(), 17.9, 0.55)
for t in (18.3, 18.45, 18.6):
    add(pop(), t, 0.35)
add(tick(), 19.1, 0.8); add(tick(), 19.42, 0.8)
# 04 telefon: e-mail, stuknięcie, SMS, stuknięcie
add(ding(88), 20.25, 0.7); add(buzz(), 20.25, 0.55)
add(pop(), 20.95, 0.45)
add(ding(93), 23.05, 0.8); add(ding(88), 23.17, 0.5); add(buzz(), 23.05, 0.6)
add(pop(), 23.8, 0.45)
# 05 podpis
add(pop(), 27.95, 0.45)
add(scribble(1.5), 28.38, 0.7)
add(pop(), 30.35, 0.5)
add(ding(86, 0.9), 30.4, 0.5)
# 06 odhaczanie: rosnące „pip” przy każdym ptaszku
for i, t in enumerate((33.25, 33.72, 34.17)):
    add(pop(), t, 0.4); add(pluck(81 + 4 * i, 0.25), t, 0.35)
add(ding(93, 0.9), 34.5, 0.45)
# 07 wydanie i KSeF
add(pop(), 37.2, 0.5)
add(ding(88, 0.6), 38.4, 0.35)
add(pop(), 39.95, 0.9)
for i in range(5):
    add(pluck(76 + 2 * i, 0.15), 43.95 + i * 0.2 + 0.6, 0.18)
add(ding(91), 45.0, 0.7); add(ding(95), 45.12, 0.5); add(ding(98), 45.24, 0.4)
# plansza: każdy skok listy na ćwierćnucie
for k in range(1, 10):
    t = 49.6 + (k - 1) * 0.95
    add(tick(), t, 0.5); add(pluck(69 + [0, 2, 3, 5, 7, 8, 10, 12, 15][k - 1], 0.3), t + 0.2, 0.22)
add(ding(93, 1.4), 57.7, 0.6); add(ding(98, 1.4), 57.82, 0.4)

# ---------- master ----------
# prosta pompa sidechain od stopy
pump = np.ones(N)
for b in range(int(DUR / BEAT)):
    tb = b * BEAT
    if tb < 4 or 38 <= tb < 40 or tb >= 58: continue
    i = int(tb * SR); n = int(0.3 * SR)
    tt = np.arange(n) / SR
    pump[i:i + n] = np.minimum(pump[i:i + n], 0.55 + 0.45 * np.minimum(1, tt / 0.3) ** 0.6)
# pompujemy tylko instrumenty tonalne — uproszczenie: całość lekko
L *= 0.85 + 0.15 * pump; R *= 0.85 + 0.15 * pump
# fade out
fo = int(3.0 * SR)
L[-fo:] *= np.linspace(1, 0, fo) ** 1.5; R[-fo:] *= np.linspace(1, 0, fo) ** 1.5
mx = max(np.abs(L).max(), np.abs(R).max())
L = np.tanh(L / mx * 1.4) / np.tanh(1.4) * 0.92
R = np.tanh(R / mx * 1.4) / np.tanh(1.4) * 0.92
out = np.stack([L, R], 1)
with wave.open(sys.argv[1] if len(sys.argv) > 1 else 'music.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((out * 32767).astype('<i2').tobytes())
print('ok')
