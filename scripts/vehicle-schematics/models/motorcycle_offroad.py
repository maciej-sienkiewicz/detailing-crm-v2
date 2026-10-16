"""Motocykl cross / enduro (klasa 250-450 cm3, wersja enduro: maska z reflektorem, tablica).

Wymiary (typowe dla klasy): rozstaw osi 1480, długość ~2180, wysokość ~1270 (lusterka),
szerokość ~820 (kierownica z osłonami dłoni), siodło 960, prześwit 350 (płyta pod silnikiem).
Koła szprychowe 21" (80/100-21, R 345) i 18" (120/90-18, R 338), opony kostkowe.
Strony: tłumik, pedał hamulca, tylna tarcza, pokrywa sprzęgła - PRAWA;
łańcuch, zębatki, dźwignia zmiany biegów, stopka, przednia tarcza z zaciskiem - LEWA.
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from lib import *  # noqa: E402,F403

RA = (0, -338)      # oś tylna
RR, RRIM = 338, 229
FA = (1480, -345)   # oś przednia
FR, FRIM = 345, 267
KH = 17             # wysokość klocka bieżnika
RAKE = 27
U = (-math.sin(math.radians(RAKE)), -math.cos(math.radians(RAKE)))   # wzdłuż lagi w górę
N = (math.cos(math.radians(RAKE)), -math.sin(math.radians(RAKE)))    # prostopadle, do przodu
PIV = (590, -472)   # oś wahacza
CS = (662, -452)    # zębatka zdawcza
R_SPR, R_CS = 126, 33


def fork_pt(t, off):
    return (FA[0] + U[0] * t + N[0] * off, FA[1] + U[1] * t + N[1] * off)


def fork_segment(t0, t1, w, cls="o w", w1=None):
    w1 = w if w1 is None else w1
    pts = [fork_pt(t0, -w / 2), fork_pt(t1, -w1 / 2), fork_pt(t1, w1 / 2), fork_pt(t0, w / 2)]
    return path(poly(pts), cls)


def cr(points, steps=10, closed=False):
    """Próbkowanie krzywej Catmull-Rom (ta sama krzywa co smooth())."""
    pts = [(p[0], p[1]) for p in points]
    n = len(pts)

    def get(i):
        if closed:
            return pts[i % n]
        return pts[max(0, min(n - 1, i))]

    out = []
    for i in range(n if closed else n - 1):
        p0, p1, p2, p3 = get(i - 1), get(i), get(i + 1), get(i + 2)
        for s in range(steps):
            t = s / steps
            t2, t3 = t * t, t * t * t
            out.append(tuple(
                0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2
                       + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3)
                for k in (0, 1)
            ))
    if not closed:
        out.append(pts[-1])
    return out


def pipe(points, w0, w1=None, cls="d w", steps=10):
    """Rura o osi przez punkty (gładko), średnica w0 -> w1, końce ścięte prostopadle."""
    c = cr(points, steps)
    w1 = w0 if w1 is None else w1
    n = len(c)
    left, right = [], []
    for i, (x, y) in enumerate(c):
        a, b = c[max(0, i - 1)], c[min(n - 1, i + 1)]
        dx, dy = b[0] - a[0], b[1] - a[1]
        ln = math.hypot(dx, dy) or 1
        nx, ny = -dy / ln, dx / ln
        w = w0 + (w1 - w0) * i / (n - 1)
        left.append((x + nx * w / 2, y + ny * w / 2))
        right.append((x - nx * w / 2, y - ny * w / 2))
    return path(poly(left + right[::-1]), cls)


def sa(t, off):
    """Punkt na wahaczu: t = 0 oś wahacza, t = 1 oś koła; off > 0 w górę."""
    dx, dy = RA[0] - PIV[0], RA[1] - PIV[1]
    ln = math.hypot(dx, dy)
    ux, uy = dx / ln, dy / ln
    nx, ny = uy, -ux          # prostopadła skierowana w górę (y ujemne)
    if ny > 0:
        nx, ny = -nx, -ny
    return (PIV[0] + dx * t + nx * off, PIV[1] + dy * t + ny * off)


# ─── koła ─────────────────────────────────────────────────────────────────────
def knobs(cx, cy, r, n=36, kw=30, rot=0):
    """Klocki bieżnika na obwodzie (rysowane PRZED oponą, która zasłania ich podstawę)."""
    out = []
    rc = r - KH
    for i in range(n):
        a = rot + i * 360 / n
        ro = r if i % 2 == 0 else r - 4
        da_o = math.degrees(kw / 2 / ro)
        da_i = math.degrees(kw * 0.62 / rc)
        pts = [on_circle(cx, cy, rc - 8, a - da_i), on_circle(cx, cy, ro, a - da_o),
               on_circle(cx, cy, ro, a + da_o), on_circle(cx, cy, rc - 8, a + da_i)]
        out.append(path(poly(pts), "d w"))
    return "".join(out)


def wheel(cx, cy, r, rim, hub, rot=0, n=36):
    return knobs(cx, cy, r, n, rot=rot) + wheel_side(cx, cy, r - KH, rim, "wire", hub_r=hub, rot=rot, tread=False) \
        + circle(cx, cy, rim - 8, "t")


def wave_disc(cx, cy, r, waves=12, amp=7, band=30, windows=6, bolt_r=None, rot=0):
    """Tarcza typu „wave": falisty obwód, pas cierny z otworami, wybrania w środku."""
    out = []
    n = waves * 8
    pts = []
    for i in range(n):
        th = rot + i * 360 / n
        rr = r - amp * (0.5 - 0.5 * math.cos(math.radians((th - rot) * waves)))
        pts.append(on_circle(cx, cy, rr, th))
    out.append(path(smooth(pts), "d w"))
    ri = r - band
    pts = []
    for i in range(n):
        th = rot + i * 360 / n
        rr = ri - amp * 0.6 * (0.5 + 0.5 * math.cos(math.radians((th - rot) * waves)))
        pts.append(on_circle(cx, cy, rr, th))
    out.append(path(smooth(pts), "t"))
    for i in range(waves):
        x, y = on_circle(cx, cy, r - band * 0.5 - amp * 0.3, rot + i * 360 / waves)
        out.append(circle(x, y, 4.5, "t"))
    r1, r2 = ri - amp - 6, ri * 0.52
    for k in range(windows):
        a = rot + k * 360 / windows + 180 / windows
        wa = 360 / windows * 0.30
        out.append(path(smooth([on_circle(cx, cy, r1, a - wa), on_circle(cx, cy, r1, a + wa),
                                on_circle(cx, cy, r2, a + wa * 0.5), on_circle(cx, cy, r2, a - wa * 0.5)]), "t"))
    br = bolt_r or ri * 0.42
    for k in range(windows):
        x, y = on_circle(cx, cy, br, rot + k * 360 / windows)
        out.append(circle(x, y, 5, "d"))
    return "".join(out)


def chain_loop(off, step=4):
    """Obwód łańcucha (linia podziałowa + off) wokół zębatki tylnej i zdawczej."""
    dx, dy = CS[0] - RA[0], -(CS[1] - RA[1])
    ln = math.hypot(dx, dy)
    phi = math.atan2(dy, dx)
    al = math.acos((R_SPR - R_CS) / ln)
    a_top, a_bot = phi + al, phi - al
    pts = []
    k = max(6, int(math.degrees(a_top - a_bot) / step))
    for i in range(k + 1):
        a = a_top + (a_bot - a_top) * i / k
        pts.append(on_circle(*CS, R_CS + off, math.degrees(a)))
    k = max(6, int(math.degrees(2 * math.pi - (a_top - a_bot)) / step))
    for i in range(k + 1):
        a = a_bot + ((a_top - 2 * math.pi) - a_bot) * i / k
        pts.append(on_circle(*RA, R_SPR + off, math.degrees(a)))
    return pts, (a_top, a_bot)


def tire_knobs_v(cx, w, top, bot, pitch=44):
    """Wzór bieżnika kostkowego na oponie widzianej z przodu/tyłu (pionowo)."""
    out = []
    y = bot - pitch * 0.9
    i = 0
    while y > top + pitch * 0.6:
        if i % 2 == 0:
            out.append(rect(cx - w * 0.16, y - 9, w * 0.32, 18, 3, "t"))
        else:
            out.append(rect(cx - w * 0.42, y - 9, w * 0.22, 18, 3, "t"))
            out.append(rect(cx + w * 0.20, y - 9, w * 0.22, 18, 3, "t"))
        y -= pitch
        i += 1
    return "".join(out)


def tire_knobs_h(x0, x1, cy, w, pitch=44):
    """To samo w widoku z góry (opona wzdłuż osi x)."""
    out = []
    x = x0 + pitch * 0.9
    i = 0
    while x < x1 - pitch * 0.6:
        if i % 2 == 0:
            out.append(rect(x - 9, cy - w * 0.16, 18, w * 0.32, 3, "t"))
        else:
            out.append(rect(x - 9, cy - w * 0.42, 18, w * 0.22, 3, "t"))
            out.append(rect(x - 9, cy + w * 0.20, 18, w * 0.22, 3, "t"))
        x += pitch
        i += 1
    return "".join(out)


# ═══ BOK: warstwa spodnia ═════════════════════════════════════════════════════
side0 = [
    wheel(*RA, RR, RRIM, 62, rot=4),
    wheel(*FA, FR, FRIM, 54, rot=-6),
]
# prawa: tylna tarcza z zaciskiem pod wahaczem
sideR0 = [
    wave_disc(*RA, 110, waves=11, amp=6, band=26, windows=5),
    caliper_side(*RA, 110, 300, span=38, inner=34, outer=16),
    circle(*RA, 40, "d w"),
]
# lewa: zębatka tylna i łańcuch, przednia tarcza z zaciskiem za lagą
sideL0 = [
    circle(*RA, R_SPR + 6, "d w"),
    circle(*RA, R_SPR - 10, "t"),
]
for k in range(6):
    a = k * 60 + 30
    sideL0.append(path(smooth([on_circle(*RA, 100, a - 17), on_circle(*RA, 100, a + 17),
                               on_circle(*RA, 66, a + 11), on_circle(*RA, 66, a - 11)]), "t"))
for k in range(6):
    x, y = on_circle(*RA, 50, k * 60)
    sideL0.append(circle(x, y, 6, "d"))
sideL0.append(circle(*RA, 34, "d w"))
sideL0.append(wave_disc(*FA, 130, waves=13, amp=7, band=30, windows=6))
sideL0.append(caliper_side(*FA, 130, 158, span=34, inner=34, outer=16))

outer, _ = chain_loop(10)
inner, (a_top, a_bot) = chain_loop(-10)
CHAIN = [path(poly(outer) + poly(inner), "d w", 'fill-rule="evenodd"')]
for a in (a_top, a_bot):
    p1 = on_circle(*RA, R_SPR, math.degrees(a))
    p2 = on_circle(*CS, R_CS, math.degrees(a))
    ln = math.hypot(p2[0] - p1[0], p2[1] - p1[1])
    ux, uy = (p2[0] - p1[0]) / ln, (p2[1] - p1[1]) / ln
    for i in range(1, int(ln / 30)):
        x, y = p1[0] + ux * i * 30, p1[1] + uy * i * 30
        CHAIN.append(line(x - uy * 9, y + ux * 9, x + uy * 9, y - ux * 9, "t"))
# ogniwa na łuku wokół zębatki tylnej
a0, a1 = math.degrees(a_bot), math.degrees(a_top) - 360
nk = int(abs(a1 - a0) * math.pi / 180 * R_SPR / 30)
for i in range(1, nk):
    a = a0 + (a1 - a0) * i / nk
    p, q = on_circle(*RA, R_SPR - 9, a), on_circle(*RA, R_SPR + 9, a)
    CHAIN.append(line(*p, *q, "t"))

# ═══ BOK: wspólne ═════════════════════════════════════════════════════════════
side = []

# amortyzator tylny (widoczny między wahaczem a tablicą boczną)
SH0, SH1 = (400, -478), (560, -862)
side.append(pipe([SH1, SH0], 44, 44, "d w"))
for i in range(9):
    t = 0.18 + i * 0.065
    x, y = SH0[0] + (SH1[0] - SH0[0]) * t, SH0[1] + (SH1[1] - SH0[1]) * t
    side.append(line(x - 34, y - 6, x + 34, y + 10, "d"))
side.append(circle(*SH0, 16, "d w"))

# wahacz
side.append(path(smooth([
    sa(-0.075, 0), sa(-0.04, 32), sa(0.05, 42), sa(0.3, 38), sa(0.65, 32), sa(0.95, 28),
    (*sa(1.07, 26), "c"), (*sa(1.07, -24), "c"),
    sa(0.95, -28), sa(0.7, -32), sa(0.4, -40), sa(0.12, -46), sa(-0.04, -34),
]), "o w"))
side.append(path(smooth([sa(0.12, 14), sa(0.5, 10), sa(0.88, 8)], closed=False), "t"))
side.append(path(poly([sa(0.9, 20), sa(1.05, 20), sa(1.05, -18), sa(0.9, -18)]), "d w"))
side.append(circle(*RA, 20, "d w"))
side.append(circle(*RA, 9, "d"))

# błotnik tylny, lampa, uchwyt tablicy
side.append(path(smooth([
    (-348, -1014, "c"), (-250, -1002), (-100, -983), (60, -967), (190, -958, "c"),
    (190, -926, "c"), (60, -934), (-100, -956), (-250, -976), (-332, -992, "c"),
]), "o w"))
side.append(path(poly([(-190, -960), (-300, -978), (-322, -905), (-306, -900), (-286, -958), (-196, -946)]), "d w"))
side.append(path(smooth([(-332, -992, "c"), (-262, -982, "c"), (-266, -962), (-320, -968, "c")]), "d l"))
side.append(path(poly([(-326, -912), (-312, -912), (-292, -764), (-306, -764)]), "o w"))

# rama: płyta wahacza, belka, rura przednia
side.append(pipe([(1080, -1012), (960, -930), (860, -868), (760, -808), (690, -772)], 54, 58, "d w"))
side.append(path(smooth([
    (700, -800, "c"), (672, -700), (658, -600), (652, -510), (640, -432), (606, -406, "c"),
    (562, -420), (548, -472), (556, -560), (580, -660), (618, -770, "c"),
]), "o w"))
side.append(circle(*PIV, 22, "d w"))
side.append(circle(*PIV, 9, "d"))
side.append(pipe([(1105, -900), (1100, -760), (1086, -630), (1064, -510), (1030, -430)], 40, 40, "d w"))

# silnik: skrzynia korbowa, cylinder z żebrami, głowica
side.append(path(smooth([
    (668, -592, "c"), (760, -612), (868, -625, "c"), (1008, -625, "c"), (1034, -592), (1046, -525),
    (1032, -458), (992, -412), (900, -394), (780, -394), (700, -406), (664, -446), (654, -520),
]), "o w"))
CYL = [(872, -625), (1006, -625), (1032, -770), (898, -770)]
side.append(path(poly(CYL), "o w"))
for i in range(6):
    y = -648 - i * 22
    t = (y + 625) / (-770 + 625)
    xr = 872 + (898 - 872) * t
    xf = 1006 + (1032 - 1006) * t
    side.append(rect(xr - 16, y - 4, xf - xr + 32, 8, 3, "d w"))
side.append(path(smooth([(892, -770, "c"), (1040, -770, "c"), (1050, -805), (1044, -842, "c"),
                         (900, -842, "c"), (890, -805)]), "o w"))
for y in (-790, -812):
    side.append(line(900, y, 1040, y, "t"))
side.append(path(smooth([(906, -842, "c"), (1034, -842, "c"), (1030, -868), (1010, -878, "c"),
                         (920, -878, "c"), (906, -864)]), "d w"))

# płyta pod silnikiem
side.append(path(smooth([
    (1064, -500, "c"), (1060, -440), (1036, -392), (986, -358), (880, -350), (740, -352), (662, -366),
    (630, -394, "c"), (642, -416, "c"), (700, -400), (860, -392), (960, -398), (1010, -424), (1036, -476, "c"),
]), "o w"))
for x in (720, 880, 1000):
    side.append(circle(x, -372 if x < 950 else -380, 6, "d"))

# błotnik przedni (wysoki, pod dolną półką)
side.append(path(smooth([
    (1786, -800, "c"), (1700, -846), (1580, -884), (1440, -910), (1300, -922), (1196, -914), (1150, -896, "c"),
    (1160, -880, "c"), (1220, -894), (1300, -898), (1440, -888), (1580, -862), (1700, -826), (1770, -794),
]), "o w"))
side.append(path(smooth([(1740, -820), (1600, -868), (1440, -898), (1310, -909)], closed=False), "t"))

# zbiornik (widoczny przed siedzeniem)
side.append(path(smooth([
    (1064, -1062, "c"), (1030, -1068), (990, -1056), (960, -1030), (950, -990, "c"), (1060, -990, "c"),
]), "o w"))
side.append(path(smooth([(1052, -1068, "c"), (1052, -1084, "c"), (1090, -1084, "c"), (1090, -1066, "c")]), "d w"))

# osłona chłodnicy
SHROUD = [
    (1086, -1044, "c"), (1112, -1000), (1142, -930), (1146, -840), (1128, -760), (1100, -712, "c"),
    (1050, -744), (980, -798), (900, -862), (838, -912, "c"), (900, -956), (990, -998), (1050, -1030),
]
side.append(path(smooth(SHROUD), "o w"))
for k in range(4):
    x0, y0 = (1116 + 6 * k, -770 - 40 * k)
    ln = 120 - 12 * k
    side.append(line(x0, y0, x0 - 0.795 * ln, y0 - 0.607 * ln, "t"))
side.append(path(smooth([(1060, -1018), (990, -960), (920, -900)], closed=False), "t"))

# lagi (USD): goleń, rura dolna z osłoną, stopa z osią
side.append(fork_segment(340, 872, 62))
side.append(fork_segment(340, 362, 68, "d w"))
side.append(fork_segment(40, 345, 48, "d w"))
side.append(path(poly([fork_pt(70, -22), fork_pt(320, -26), fork_pt(330, 40), fork_pt(100, 44), fork_pt(60, 30)]), "d w"))
side.append(fork_segment(-46, 72, 72))
side.append(circle(*FA, 20, "d w"))
side.append(circle(*FA, 8, "d"))
# półki
side.append(path(poly([fork_pt(612, -86), fork_pt(652, -86), fork_pt(652, 40), fork_pt(612, 40)]), "o w"))
side.append(path(poly([fork_pt(842, -78), fork_pt(872, -78), fork_pt(872, 38), fork_pt(842, 38)]), "o w"))

# maska z reflektorem (przed lagami, tylną krawędzią na goleniach)
side.append(path(smooth([
    (*fork_pt(598, 30), "c"), (*fork_pt(592, 90), "c"), fork_pt(640, 112), fork_pt(730, 118), fork_pt(820, 106),
    fork_pt(880, 80), (*fork_pt(906, 44), "c"), (*fork_pt(900, 30), "c"),
]), "o w"))
side.append(path(smooth([(*fork_pt(690, 114), "c"), (*fork_pt(800, 108), "c"), fork_pt(796, 96), (*fork_pt(694, 102), "c")]), "d l"))
side.append(path(smooth([fork_pt(612, 82), fork_pt(700, 98), fork_pt(820, 90), fork_pt(884, 60)], closed=False), "t"))

# tablica boczna (pod siedzeniem)
side.append(path(smooth([
    (660, -912, "c"), (668, -840), (662, -760), (648, -730, "c"), (540, -742), (400, -764), (262, -794),
    (190, -814, "c"), (130, -862), (96, -905), (80, -926, "c"), (300, -920), (500, -916),
]), "o w"))
side.append(path(smooth([
    (620, -898, "c"), (628, -790, "c"), (520, -778), (380, -798), (250, -826, "c"), (190, -880), (160, -904, "c"),
]), "t"))

# siedzenie
side.append(path(smooth([
    (958, -1028, "c"), (930, -1004), (870, -980), (760, -966), (500, -962), (250, -963), (60, -966),
    (20, -967, "c"), (16, -948), (34, -932, "c"), (250, -924), (500, -918), (700, -914), (820, -922),
    (900, -946), (952, -990, "c"),
]), "o w"))
side.append(path(smooth([(940, -1000), (860, -968), (700, -955), (400, -952), (60, -955)], closed=False), "t"))

# kierownica, lusterko, osłona dłoni
side.append(path(poly([fork_pt(872, -64), fork_pt(906, -60), fork_pt(906, -10), fork_pt(872, -12)]), "d w"))
side.append(pipe([(1052, -1158), (1036, -1172), (1016, -1184)], 26, 26, "d w"))
side.append(pipe([(1046, -1178), (1030, -1210), (1016, -1236)], 10, 10, "d w"))
side.append(ellipse(1012, -1234, 12, 36, "o w"))
side.append(path(smooth([
    (1022, -1204, "c"), (1074, -1226), (1124, -1218), (1152, -1188), (1158, -1142, "c"),
    (1128, -1156), (1078, -1172), (1028, -1182, "c"),
]), "o w"))
side.append(path(smooth([(1060, -1206), (1116, -1200), (1144, -1170)], closed=False), "t"))

# ═══ tylko prawy bok: pokrywa sprzęgła, wydech, tłumik, pedał hamulca, podnóżek ═
sideR = [
    ellipse(800, -505, 96, 82, "d w"),
    ellipse(800, -505, 70, 58, "t"),
    circle(952, -478, 30, "d w"),
]
for k in range(6):
    x, y = on_circle(800, -505, 84, k * 60 + 15)
    sideR.append(circle(x, y, 5, "d"))
HEADER = [(1072, -742), (1100, -694), (1112, -626), (1096, -574), (1050, -556), (960, -572),
          (860, -598), (740, -630), (650, -666), (590, -688)]
sideR.append(pipe(HEADER, 44, 44, "d w"))
sideR.append(tube((610, -682), (470, -718), 46, 102, "d w", round_end=False))
sideR.append(tube((480, -716), (-130, -902), 102, 106, "o w"))
for t in (0.08, 0.86):
    x = 480 + (-130 - 480) * t
    y = -716 + (-902 + 716) * t
    sideR.append(path(smooth([(x + 15, y + 50), (x - 15, y - 50)], closed=False), "t"))
sideR.append(ellipse(-130, -902, 16, 44, "d w", rot=-17))
sideR.append(circle(-136, -902, 12, "d"))
sideR.append(pipe([(586, -420), (650, -412), (702, -404)], 16, 14, "d w"))
sideR.append(rect(694, -414, 30, 18, 5, "d w"))
FOOTPEG = [
    path(poly([(512, -394), (512, -416), (526, -420), (534, -412), (548, -420), (556, -412), (570, -420),
               (580, -414), (580, -394)]), "d w"),
    circle(590, -404, 9, "d w"),
]
sideR += FOOTPEG

# ═══ tylko lewy bok: pokrywa iskrownika, osłona zębatki, ślizg i prowadnica łańcucha ═
sideL = [
    circle(850, -505, 86, "d w"),
    circle(850, -505, 62, "t"),
]
for k in range(5):
    x, y = on_circle(850, -505, 74, k * 72 + 20)
    sideL.append(circle(x, y, 5, "d"))
sideL.append(path(poly([sa(-0.02, 40), sa(0.42, 36), sa(0.42, 22), sa(-0.02, 24)]), "d w"))
sideL += CHAIN
sideL.append(path(smooth([(608, -498), (690, -514), (728, -470), (712, -418), (640, -410), (604, -446)]), "d w"))
# prowadnica łańcucha pod wahaczem
sideL.append(path(smooth([
    (*sa(0.55, -26), "c"), (*sa(0.8, -24), "c"), (150, -296), (170, -262, "c"), (300, -300, "c"), (320, -334),
]), "d w"))
sideL.append(pipe([(630, -426), (735, -447)], 14, 12, "d w"))
sideL.append(circle(630, -426, 12, "d w"))
sideL.append(rect(722, -458, 34, 18, 6, "d w"))
sideL.append(pipe([(572, -398), (470, -380), (380, -366)], 18, 16, "d w"))
sideL += FOOTPEG

# ═══ PRZÓD (oś x = 0, lewa strona rysunku = PRAWA strona motocykla) ═══════════
SHROUD_END = mirror_x(path(smooth([
    (104, -1048, "c"), (170, -1030), (210, -962), (220, -862), (208, -770), (182, -702, "c"),
    (152, -728), (158, -820), (160, -910), (136, -1000),
]), "o w"))
BAR = pipe([(-392, -1182), (-280, -1178), (-150, -1164), (-60, -1156), (0, -1155), (60, -1156), (150, -1164),
            (280, -1178), (392, -1182)], 28, 28, "d w")
GRIPS = mirror_x(rect(290, -1198, 106, 34, 12, "d w"))
MIRRORS = mirror_x(pipe([(222, -1166), (232, -1196), (240, -1214)], 10, 10, "d w"), circle(244, -1240, 30, "o w"))
GUARDS = mirror_x(path(smooth([
    (296, -1208, "c"), (340, -1230), (384, -1250), (406, -1232), (410, -1164), (396, -1112, "c"),
    (356, -1116), (310, -1132), (296, -1150, "c"),
]), "o w"), path(smooth([(314, -1196), (366, -1222), (392, -1218)], closed=False), "t"))

front = []
front.append(tire_end(0, 124, 676, corner=52, lines=0))
front.append(mirror_x(rect(118, -414, 98, 24, 6, "d w")))
# silnik
front.append(path(smooth(sym([(0, -628), (110, -624), (146, -590), (152, -480), (138, -410), (100, -390), (0, -386)])), "o w"))
front.append(path(smooth([(-140, -590), (-168, -560), (-170, -460), (-146, -428)], closed=False), "d"))
front.append(path(smooth([(140, -590), (160, -560), (162, -470), (140, -436)], closed=False), "d"))
front.append(rect(-62, -770, 124, 145, 6, "o w"))
for i in range(6):
    front.append(rect(-84, -652 - i * 22, 168, 8, 3, "d w"))
# płyta pod silnikiem
front.append(path(smooth(sym([(0, -424), (100, -420), (116, -396), (106, -362), (0, -350)])), "o w"))
# chłodnice
front.append(mirror_x(rect(64, -1000, 130, 300, 8, "d w")))
for i in range(11):
    y = -980 + i * 26
    front.append(mirror_x(line(72, y, 186, y, "t")))
front.append(SHROUD_END)
# rura przednia ramy, kolektor wydechu (prawa = -x)
front.append(rect(-22, -900, 44, 420, 10, "d w"))
front.append(pipe([(-20, -790), (-58, -760), (-80, -700), (-82, -620), (-110, -572), (-150, -552)], 44, 44, "d w"))
# piasta, tarcza (lewa = +x), opona
front.append(rect(-62, -390, 124, 90, 10, "d w"))
front.append(rect(60, -475, 7, 260, 2, "d w"))
front.append(tire_end(0, 88, 690, corner=40, lines=0))
front.append(tire_knobs_v(0, 88, -690, 0))
# błotnik przedni
front.append(path(smooth(sym([(0, -922), (74, -918), (88, -896, "c"), (64, -840), (38, -806), (0, -798)])), "o w"))
front.append(path(smooth([(-46, -818), (0, -828), (46, -818)], closed=False), "t"))
# lagi
front.append(mirror_x(
    rect(81, -720, 48, 380, 6, "d w"),
    rect(74, -650, 62, 260, 10, "d w"),
    rect(72, -398, 66, 104, 10, "o w"),
    rect(74, -1112, 62, 400, 6, "o w"),
    rect(71, -724, 68, 18, 4, "d w"),
))
front.append(rect(-150, -936, 300, 40, 8, "o w"))
front.append(rect(-146, -1136, 292, 30, 8, "o w"))
# maska z reflektorem
front.append(path(smooth(sym([
    (0, -1166), (82, -1162), (122, -1134, "c"), (128, -1040), (120, -960), (96, -912, "c"), (0, -904),
])), "o w"))
front.append(path(smooth(sym([(0, -1150), (70, -1146), (104, -1124), (110, -1050), (104, -980), (82, -930), (0, -924)])), "t"))
front.append(path(smooth(sym([(0, -1070), (54, -1066), (64, -1030), (54, -996), (0, -992)])), "d l"))
front.append(path(smooth(sym([(0, -1056), (34, -1052), (40, -1030), (34, -1008), (0, -1006)])), "t"))
# kierownica, lusterka, osłony dłoni
front.append(MIRRORS)
front.append(BAR)
front.append(GRIPS)
front.append(mirror_x(rect(30, -1172, 40, 40, 6, "d w")))
front.append(GUARDS)

# ═══ TYŁ (prawa strona rysunku = PRAWA strona motocykla) ══════════════════════
rear = []
rear.append(tire_end(0, 88, 690, corner=40, lines=0))
rear.append(MIRRORS)
rear.append(BAR)
rear.append(GRIPS)
rear.append(GUARDS)
rear.append(path(smooth(sym([(0, -1166), (82, -1162), (122, -1134, "c"), (126, -1060), (0, -1056)])), "o w"))
rear.append(SHROUD_END)
# zbiornik
rear.append(path(smooth(sym([(0, -1074), (70, -1068), (104, -1030), (110, -980), (0, -976)])), "o w"))
# silnik
rear.append(path(smooth(sym([(0, -628), (110, -624), (146, -590), (152, -480), (138, -410), (100, -390), (0, -386)])), "o w"))
rear.append(path(smooth([(140, -590), (168, -560), (170, -460), (146, -428)], closed=False), "d"))
rear.append(mirror_x(rect(118, -414, 98, 24, 6, "d w")))
# rama (płyty wahacza), amortyzator
rear.append(mirror_x(path(smooth([(70, -820, "c"), (118, -812), (128, -600), (122, -420, "c"), (74, -420, "c"), (66, -600)]), "d w")))
rear.append(rect(-26, -880, 52, 240, 8, "d w"))
for i in range(8):
    y = -850 + i * 26
    rear.append(path(smooth([(-40, y + 6), (0, y - 4), (40, y + 6)], closed=False), "d"))
# wahacz, zębatka z łańcuchem (lewa = -x), tarcza (prawa = +x)
rear.append(mirror_x(path(smooth([(66, -520, "c"), (100, -520, "c"), (102, -320, "c"), (66, -310, "c")]), "d w")))
rear.append(rect(-74, -488, 12, 276, 3, "d w"))
rear.append(rect(58, -448, 7, 220, 2, "d w"))
rear.append(tire_end(0, 120, 676, corner=56, lines=0))
rear.append(tire_knobs_v(0, 120, -676, 0))
rear.append(mirror_x(rect(100, -352, 18, 28, 4, "d w")))
# tablice boczne, siedzenie, błotnik
rear.append(mirror_x(path(smooth([
    (92, -930, "c"), (160, -924), (178, -880), (172, -780), (150, -724, "c"), (108, -732), (96, -800),
]), "o w")))
rear.append(path(smooth(sym([(0, -968), (90, -964), (116, -944, "c"), (100, -926), (0, -924)])), "o w"))
rear.append(path(smooth(sym([(0, -1016), (44, -1013), (84, -986), (110, -944, "c"), (0, -934)])), "o w"))
rear.append(path(smooth(sym([(0, -996), (40, -994), (44, -974), (0, -970)])), "d l"))
rear.append(path(poly([(-40, -952), (40, -952), (30, -900), (-30, -900)]), "d w"))
rear.append(rect(-96, -900, 192, 140, 8, "o w"))
rear.append(rect(-86, -890, 172, 120, 5, "t"))
# kolektor i tłumik (prawa = +x)
rear.append(pipe([(150, -560), (146, -640), (140, -700)], 44, 44, "d w"))
rear.append(pipe([(140, -712), (168, -900)], 100, 104, "o w"))
rear.append(circle(168, -900, 52, "d w"))
rear.append(circle(168, -900, 20, "d"))

# ═══ GÓRA (przód w +x, prawa strona motocykla po +y) ══════════════════════════
top = []
top.append(rect(FA[0] - FR, -44, 2 * FR, 88, 44, "x g"))
top.append(tire_knobs_h(FA[0] - FR, FA[0] + FR, 0, 88))
top.append(rect(-RR, -60, 2 * RR, 120, 58, "x g"))
top.append(tire_knobs_h(-RR, RR, 0, 120))
top.append(mirror_y(rect(-40, -100, 640, 34, 12, "d w")))
top.append(mirror_y(rect(512, -216, 70, 96, 10, "d w")))
top.append(rect(600, 150, 110, 24, 8, "d w"))
top.append(rect(620, -190, 120, 22, 8, "d w"))
# silnik
top.append(path(smooth(sym_y([(1046, 0), (1040, -120), (980, -150), (760, -156), (664, -140), (650, 0)])), "o w"))
# wydech (prawa = +y)
top.append(pipe([(1060, 40), (1094, 86), (1070, 124), (960, 138), (800, 142), (640, 146), (600, 148)], 44, 44, "d w"))
# lagi, błotnik przedni, maska
top.append(mirror_y(rect(1080, -136, 420, 62, 10, "d w")))
top.append(path(smooth(sym_y([(1790, 0), (1780, -28), (1680, -50), (1500, -72), (1300, -80), (1190, -74), (1150, -50, "c"), (1150, 0)])), "o w"))
top.append(path(smooth([(1750, -20), (1500, -40), (1250, -44)], closed=False), "t"))
top.append(path(smooth([(1750, 20), (1500, 40), (1250, 44)], closed=False), "t"))
top.append(path(smooth(sym_y([(1296, 0), (1290, -70), (1262, -116), (1214, -132, "c"), (1198, -112), (1222, -64), (1228, 0)])), "o w"))
# osłony chłodnic i zbiornik
top.append(mirror_y(path(smooth([
    (1140, -100, "c"), (1150, -168), (1122, -210), (1020, -222), (920, -208), (846, -168, "c"), (900, -104, "c"),
]), "o w")))
top.append(path(smooth(sym_y([(1070, 0), (1064, -84), (1030, -106), (980, -106), (956, 0)])), "o w"))
top.append(circle(1040, 0, 20, "d w"))
# tablice boczne
top.append(mirror_y(path(smooth([(664, -118, "c"), (650, -166), (500, -174), (260, -168), (110, -144), (80, -112, "c")]), "o w")))
# błotnik tylny, tablica, siedzenie
top.append(rect(-330, -96, 20, 192, 4, "o w"))
top.append(path(smooth(sym_y([(200, 0), (190, -110, "c"), (40, -108), (-100, -98), (-260, -74), (-336, -46), (-348, 0)])), "o w"))
top.append(path(smooth(sym_y([(980, 0), (972, -60), (930, -96), (820, -116), (600, -122), (300, -118), (100, -104), (40, -82), (26, 0)])), "o w"))
top.append(mirror_y(path(smooth([(940, -70), (700, -96), (300, -94), (80, -78)], closed=False), "t")))
# tłumik
top.append(tube((610, 148), (470, 150), 46, 102, "d w", round_end=False))
top.append(tube((480, 150), (-130, 172), 102, 106, "o w"))
top.append(ellipse(-130, 172, 14, 50, "d w"))
# kierownica, lusterka, osłony dłoni
top.append(rect(1046, -80, 50, 160, 10, "o w"))
top.append(pipe([(1018, -392), (1036, -280), (1058, -150), (1066, 0), (1058, 150), (1036, 280), (1018, 392)], 28, 28, "d w"))
top.append(mirror_y(rect(1000, -398, 38, 108, 12, "d w")))
top.append(mirror_y(pipe([(1046, -222), (1022, -240)], 10, 10, "d w"), ellipse(1012, -244, 14, 30, "o w")))
top.append(mirror_y(path(smooth([
    (1040, -296, "c"), (1104, -302), (1148, -336), (1154, -386), (1118, -408), (1030, -410, "c"),
]), "o w"), path(smooth([(1060, -316), (1110, -328), (1130, -366), (1114, -394)], closed=False), "t")))


def group(id_, parts, extra=""):
    return f'<g id="{id_}"{extra}>' + "".join(parts) + "</g>"


print(group("side0", side0))
print(group("sideR0", sideR0))
print(group("sideL0", sideL0))
print(group("side", side, f' data-axles="{RA[0]},{RA[1]};{FA[0]},{FA[1]}"'))
print(group("sideR", sideR))
print(group("sideL", sideL))
print(group("front", front))
print(group("rear", rear))
print(group("top", top))
