"""Skuter wodny stojący (stand-up), sylwetka w klasie SX-R / SuperJet, bez cech marki.

Wymiary: kadłub 2550 (pawęż x = 0, dziób x = 2550), dysza wystaje ~120 za pawęż,
szerokość 770 (odbojnik), kadłub z pokrywą silnika ~700, z drążkiem uniesionym
do jazdy ~1100. y = 0 = stępka / płyta ślizgowa.
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from lib import *  # noqa: E402,F403

# ─── wymiary główne ─────────────────────────────────────────────────────────────
TRAY_HW = 238       # pół szerokości wanny (wnętrze)
TRAY_FRONT = 1350   # przednia ściana wanny = tył pokrywy silnika
TRAY_FLOOR = -300   # podłoga wanny przy rufie
GUN_TOP = -440      # góra burt wanny przy rufie
GUN_HW = 305        # pół szerokości burt wanny przy rufie (zewnątrz)
HOOD_TOP = -705     # najwyższy punkt pokrywy silnika

# drążek kierownicy: oś obrotu na dziobie, uniesiony o PA stopni nad poziom
PIVOT = (2310, -700)
PA = 27
PLEN = 740
_ca, _sa = math.cos(math.radians(PA)), math.sin(math.radians(PA))
PU = (-_ca, -_sa)      # wzdłuż drążka, do tyłu i w górę
PN = (-_sa, _ca)       # prostopadle, pod drążek


def pole_pt(t, off=0.0):
    return (PIVOT[0] + PU[0] * t + PN[0] * off, PIVOT[1] + PU[1] * t + PN[1] * off)


def pole_band(t0, t1, w0, w1=None, cls="o w"):
    w1 = w0 if w1 is None else w1
    pts = [pole_pt(t0, -w0 / 2), pole_pt(t1, -w1 / 2), pole_pt(t1, w1 / 2), pole_pt(t0, w0 / 2)]
    return path(poly(pts), cls)


def strip(pts, w0, w1=None, cls="d w"):
    """Pas o osi przez punkty `pts`, szerokość w0 -> w1, końce ścięte."""
    w1 = w0 if w1 is None else w1
    n = len(pts)
    left, right = [], []
    for i, (x, y) in enumerate(pts):
        a = pts[max(0, i - 1)]
        b = pts[min(n - 1, i + 1)]
        dx, dy = b[0] - a[0], b[1] - a[1]
        ln = math.hypot(dx, dy)
        nx, ny = -dy / ln, dx / ln
        w = (w0 + (w1 - w0) * i / (n - 1)) / 2
        left.append((x + nx * w, y + ny * w))
        right.append((x - nx * w, y - ny * w))
    left[0] = (*left[0], "c")
    left[-1] = (*left[-1], "c")
    right[0] = (*right[0], "c")
    right[-1] = (*right[-1], "c")
    return path(smooth(left + list(reversed(right))), cls)


def sample(points, n=14):
    """Punkty na gładkiej krzywej otwartej - ta sama interpolacja co smooth()."""
    pts = list(points)
    m = len(pts)
    get = lambda i: pts[max(0, min(m - 1, i))]
    k = 0.5 / 3.0
    out = [pts[0][:2]]
    for i in range(m - 1):
        p0, p1, p2, p3 = get(i - 1), get(i), get(i + 1), get(i + 2)
        c1 = (p1[0] + (p2[0] - p0[0]) * k, p1[1] + (p2[1] - p0[1]) * k)
        c2 = (p2[0] - (p3[0] - p1[0]) * k, p2[1] - (p3[1] - p1[1]) * k)
        for j in range(1, n + 1):
            t = j / n
            a, b, c, d = (1 - t) ** 3, 3 * (1 - t) ** 2 * t, 3 * (1 - t) * t ** 2, t ** 3
            out.append((a * p1[0] + b * c1[0] + c * c2[0] + d * p2[0],
                        a * p1[1] + b * c1[1] + c * c2[1] + d * p2[1]))
    return out


def rail_band(center, half, cls="d w"):
    """Odbojnik: pas stałej grubości wzdłuż krzywej, zaokrąglony na końcu (dziób)."""
    c = sample(center)
    up, dn = [], []
    for i, (x, y) in enumerate(c):
        a = c[max(0, i - 1)]
        b = c[min(len(c) - 1, i + 1)]
        dx, dy = b[0] - a[0], b[1] - a[1]
        ln = math.hypot(dx, dy)
        nx, ny = dy / ln, -dx / ln          # w górę dla krzywej biegnącej w +x
        up.append((x + nx * half, y + ny * half))
        dn.append((x - nx * half, y - ny * half))
    ex, ey = c[-1]
    dx, dy = c[-1][0] - c[-2][0], c[-1][1] - c[-2][1]
    a0 = math.degrees(math.atan2(-(dy), dx))   # kierunek stycznej (y w górę)
    cap = [on_circle(ex, ey, half, a0 + 90 - 180 * j / 8) for j in range(1, 8)]
    return path(poly(up + cap + list(reversed(dn))), cls)


PE = pole_pt(PLEN)          # koniec drążka = środek głowicy kierownicy
BAR_Y = PE[1] - 34          # oś poprzeczki kierownicy
GRIP_Y = BAR_Y - 10         # oś manetek (lekki wznios)

# ─── BOK (prawy bok, dziób w +x) ────────────────────────────────────────────────
RAIL = [(0, -280), (600, -290), (1200, -306), (1700, -334), (2100, -378), (2400, -428), (2554, -470)]
RT = 18

side0 = []
# płyta ślizgowa i dysza odrzutu (wystają za pawęż, reszta pod kadłubem)
side0.append(path(poly([(-60, -16), (420, -16), (420, 0), (-60, 0)]), "d w"))
side0.append(path(poly([(10, -56), (-52, -64), (-52, -196), (10, -204)]), "d w"))
side0.append(path(smooth([(-52, -70, "c"), (-118, -80, "c"), (-126, -130), (-118, -180, "c"), (-52, -190, "c")]), "o w"))
side0.append(line(-90, -76, -90, -184, "t"))

side = []
# kadłub pod odbojnikiem
side.append(path(smooth([
    (0, -280, "c"), *RAIL[1:-1], (2554, -470, "c"),
    (2546, -424), (2516, -364), (2450, -284), (2340, -190), (2180, -102), (1990, -38),
    (1810, -7), (1640, 0, "c"), (0, 0, "c"),
]), "o w"))
# krawędź (china) i listwa rozbryzgowa
side.append(path(smooth([(0, -96), (700, -100), (1400, -114), (1900, -150), (2200, -226), (2400, -330), (2500, -412)], closed=False), "d"))
side.append(path(smooth([(0, -46), (900, -48), (1650, -54), (2050, -96), (2300, -180), (2440, -262)], closed=False), "t"))
# ucho holownicze na dziobnicy
side.append(path(smooth([(2492, -350, "c"), (2522, -350), (2536, -334), (2522, -318), (2470, -320, "c")]), "d w"))

# pokład: burty wanny, pokrywa silnika i nos jako jedna sylwetka
UPPER = [
    (14, GUN_TOP, "c"), (500, -446), (1000, -452), (TRAY_FRONT - 8, -458, "c"),
    (TRAY_FRONT + 4, -536), (TRAY_FRONT + 50, -596), (1520, -636), (1750, -668), (1950, -694),
    (2090, -705), (2200, -694), (2300, -664), (2390, -622), (2470, -566), (2530, -508), (2554, -470, "c"),
]
side.append(path(smooth([(0, -280, "c"), (-6, -380), (-2, -424), *UPPER, *reversed(RAIL[1:-1])]), "o w"))
# krawędź grzbietu burty wanny
side.append(path(smooth([(12, -420), (500, -426), (1000, -432), (TRAY_FRONT - 20, -438)], closed=False), "t"))
# linia podziału pokrywy silnika (dół i przód)
side.append(path(smooth([
    (TRAY_FRONT - 8, -458), (1700, -498), (2000, -538), (2170, -572), (2226, -620), (2242, -683),
], closed=False), "d"))
# przetłoczenie pokrywy i kratka wentylacyjna
side.append(path(smooth([(1440, -580), (1650, -612), (1900, -636), (2080, -642), (2170, -628)], closed=False), "t"))
side.append(path(smooth([(1720, -552, "c"), (1920, -574, "c"), (1912, -608, "c"), (1720, -588, "c")]), "d w"))
for i in range(1, 5):
    x = 1720 + i * 40
    side.append(line(x, -588 - i * 4 + 4, x - 4, -552 - i * 4.4 - 4, "t"))

# odbojnik
side.append(rail_band([(-10, -280), *RAIL[1:]], RT))

# drążek kierownicy (zaokrąglony koniec na osi obrotu)
side.append(circle(*PIVOT, 38, "o w"))
side.append(pole_band(0, PLEN - 52, 76, 60))
side.append(path(smooth([pole_pt(70, -14), pole_pt(PLEN - 80, -10)], closed=False), "t"))
# wspornik osi drążka (policzek widełek po stronie oglądającego)
side.append(path(smooth([(2250, -684, "c"), (2272, -712), (2296, -736), (2332, -734), (2350, -706), (2366, -652, "c")]), "d w"))
side.append(circle(*PIVOT, 16, "d w"))
side.append(circle(*PIVOT, 6, "t"))
# głowica kierownicy na końcu drążka
side.append(path(smooth([
    (*pole_pt(PLEN - 60, -39), "c"), (*pole_pt(PLEN + 24, -39), "c"), (*pole_pt(PLEN + 24, 39), "c"),
    (*pole_pt(PLEN - 60, 39), "c"),
]), "d w"))
# osłona (poduszka) na poprzeczce kierownicy
side.append(path(smooth([
    (PE[0] - 58, BAR_Y + 24, "c"), (PE[0] - 64, BAR_Y - 8), (PE[0] - 44, BAR_Y - 30), (PE[0] + 50, BAR_Y - 30),
    (PE[0] + 72, BAR_Y - 8), (PE[0] + 66, BAR_Y + 24, "c"),
]), "o w"))
side.append(path(smooth([(PE[0] - 50, BAR_Y - 6), (PE[0] + 58, BAR_Y - 6)], closed=False), "t"))
# koniec kierownicy z manetką (cofnięty za poduszkę)
GX = PE[0] - 62
GRIP = [circle(GX, GRIP_Y, 22, "d w"), circle(GX, GRIP_Y, 10, "t")]
sideR = list(GRIP)
sideL = GRIP + [
    # wylot wydechu na lewej burcie przy rufie
    ellipse(240, -200, 34, 22, "d w"),
    ellipse(240, -200, 20, 12, "k"),
]


# ─── KIEROWNICA w widoku przód / tył ───────────────────────────────────────────
def handlebar(right_sign):
    """right_sign: strona rysunku z prawą stroną skutera (-1 przód, +1 tył)."""
    out = []
    out.append(rect(-44, PE[1] - 30, 88, 64, 12, "d w"))
    for s in (-1, 1):
        out.append(strip([(s * 30, BAR_Y), (s * 120, BAR_Y), (s * 200, GRIP_Y), (s * 300, GRIP_Y)], 26))
    # przełącznik start/stop (lewa) i obudowa gazu (prawa)
    out.append(rect(-right_sign * 222 - 16, GRIP_Y - 24, 32, 46, 8, "d w"))
    out.append(rect(right_sign * 222 - 16, GRIP_Y - 22, 32, 42, 8, "d w"))
    for s in (-1, 1):
        x0 = 238 if s > 0 else -358
        out.append(rect(x0, GRIP_Y - 20, 120, 40, 14, "d w"))
        for i in range(1, 4):
            xx = x0 + 120 * i / 4
            out.append(line(xx, GRIP_Y - 13, xx, GRIP_Y + 13, "t"))
    out.append(rect(-122, BAR_Y - 30, 244, 54, 18, "o w"))
    out.append(line(-100, BAR_Y - 8, 100, BAR_Y - 8, "t"))
    return out


POLE_END = path(poly([(-38, PIVOT[1] + 10), (-30, PE[1] + 10), (30, PE[1] + 10), (38, PIVOT[1] + 10)]), "o w")
BRACKET_END = path(smooth(sym([(0, -734), (34, -728), (50, -704), (54, -672, "c"), (0, -672)])), "d w")

# ─── PRZÓD (oś x = 0; prawa strona skutera po LEWEJ stronie rysunku) ───────────
# największy przekrój: kadłub w kształcie V, odbojnik, boki pokładu, barki przy pokrywie
SECTION = sym([
    (0, -520), (296, -520, "c"), (324, -492), (344, -466), (360, -430), (370, -390), (374, -350),
    (386, -330, "c"), (386, -300, "c"), (370, -230), (350, -160), (332, -112, "c"), (230, -50), (120, 0, "c"), (0, 0),
])
HOOD_DOME = sym([(0, HOOD_TOP), (140, -698), (236, -668), (290, -612), (306, -540), (306, -510, "c"), (0, -510)])
HOOD_DOME_R = sym([(0, HOOD_TOP), (140, -698), (236, -668), (290, -612), (306, -540), (304, -490), (282, -462, "c"), (0, -462)])
# odbojnik od największej szerokości do dzioba
FR_RAIL = [(386, -315), (380, -334), (352, -378), (300, -410), (220, -436), (120, -456), (0, -470)]


def band_sym(center, t):
    """Symetryczny pas grubości t wzdłuż połówkowej krzywej `center` (od burty do osi)."""
    up = [(x, y - t / 2) for x, y in center]
    dn = [(x, y + t / 2) for x, y in center]
    full_up = up + [(-x, y) for x, y in reversed(up[:-1])]
    full_dn = dn + [(-x, y) for x, y in reversed(dn[:-1])]
    full_up[0] = (*full_up[0], "c")
    full_up[-1] = (*full_up[-1], "c")
    full_dn[0] = (*full_dn[0], "c")
    full_dn[-1] = (*full_dn[-1], "c")
    return path(smooth(full_up + list(reversed(full_dn))), "d w")


front = []
front.append(path(smooth(SECTION), "o w"))
front.append(path(smooth(HOOD_DOME), "o w"))
# nos i boki pokładu przed pokrywą (zasłaniają dolną część pokrywy)
NOSE_EDGE = [(306, -510), (298, -536), (280, -566), (238, -608), (180, -646), (100, -673), (0, -683)]
front.append(path(smooth(sym(list(reversed(NOSE_EDGE)) + [(324, -492), (344, -466), (360, -430), (370, -390), (374, -350), *FR_RAIL[:-1], (0, -470)])), "w ns"))
front.append(path(smooth(NOSE_EDGE + [(-x, y) for x, y in reversed(NOSE_EDGE[:-1])], closed=False), "d"))
front.append(band_sym(FR_RAIL, 2 * RT))
# krawędzie (chiny), listwy, dziobnica, ucho holownicze
front.append(mirror_x(path(smooth([(332, -112), (316, -160), (250, -236), (140, -334), (60, -410)], closed=False), "d")))
front.append(mirror_x(path(smooth([(230, -50), (190, -100), (110, -196), (40, -280)], closed=False), "t")))
front.append(mirror_x(path(smooth([(150, -630), (110, -604), (54, -552)], closed=False), "t")))
front.append(line(0, -454, 0, -6, "t"))
front.append(ellipse(0, -336, 17, 20, "d w"))
front.append(ellipse(0, -336, 6, 9, "t"))
front.append(BRACKET_END)
front.append(POLE_END)
front.append(line(0, PIVOT[1] - 30, 0, PE[1] + 40, "t"))
front += handlebar(-1)

# ─── TYŁ (prawa strona skutera po prawej stronie rysunku) ───────────────────────
rear = []
rear.append(BRACKET_END)
rear.append(POLE_END)
rear.append(line(0, PIVOT[1] - 30, 0, PE[1] + 40, "t"))
rear += handlebar(+1)
rear.append(path(smooth(SECTION), "o w"))
rear.append(path(smooth(HOOD_DOME_R), "o w"))
rear.append(path(smooth([(-292, -560), (-200, -600), (0, -616), (200, -600), (292, -560)], closed=False), "t"))
# pawęż z burtami wanny (kształt U); przez otwartą rufę widać przednią ścianę wanny
TRANSOM = [
    (-TRAY_HW, TRAY_FLOOR, "c"), (-TRAY_HW, GUN_TOP + 10, "c"), (-250, GUN_TOP), (-GUN_HW + 12, GUN_TOP),
    (-GUN_HW, GUN_TOP + 14, "c"), (-312, -295, "c"), (-306, -200), (-296, -96, "c"), (-200, -40), (-150, -16, "c"),
    (150, -16, "c"), (200, -40), (296, -96, "c"), (306, -200), (312, -295, "c"),
    (GUN_HW, GUN_TOP + 14, "c"), (GUN_HW - 12, GUN_TOP), (250, GUN_TOP), (TRAY_HW, GUN_TOP + 10, "c"), (TRAY_HW, TRAY_FLOOR, "c"),
]
# podłoga wanny wznosi się ku przodowi: widać jej pas i przednią ścianę pod pokrywą
rear.append(line(-TRAY_HW, -336, TRAY_HW, -336, "t"))
rear.append(path(smooth(TRANSOM), "o w"))
rear.append(mirror_x(line(TRAY_HW + 12, GUN_TOP + 22, GUN_HW - 10, GUN_TOP + 22, "t")))
# odbojnik wokół pawęży (pod otwartą wanną)
rear.append(path(smooth([(-338, -298, "c"), (-338, -262, "c"), (338, -262, "c"), (338, -298, "c")]), "d w"))
# płyta ślizgowa, dysza odrzutu
rear.append(rect(-150, -16, 300, 16, 3, "d w"))
rear.append(circle(0, -130, 66, "o w"))
rear.append(circle(0, -130, 52, "d"))
rear.append(circle(0, -130, 38, "k"))
# korki spustowe
rear.append(mirror_x(circle(214, -220, 12, "d w")))

# ─── GÓRA (dziób w +x, prawa strona skutera po +y) ─────────────────────────────
RAIL_OUT = sym_y([
    (2558, 0), (2546, -46), (2470, -128), (2360, -214), (2200, -296), (2000, -352), (1800, -378),
    (1500, -386), (1200, -384), (900, -376), (600, -362), (300, -348), (40, -338), (-14, -322, "c"), (-14, 0),
])
RAIL_IN = sym_y([
    (2522, 0), (2504, -40), (2430, -114), (2330, -190), (2180, -268), (2000, -324), (1800, -350),
    (1500, -358), (1200, -356), (900, -348), (600, -334), (300, -320), (40, -310), (14, -296, "c"), (14, 0),
])
top = []
# płyta ślizgowa i dysza (wystają za pawęż)
top.append(rect(-60, -150, 100, 300, 4, "d w"))
top.append(path(smooth(sym_y([(-126, 0), (-120, -52, "c"), (-52, -62, "c"), (-52, -68, "c"), (10, -72, "c"), (10, 0)])), "o w"))
top.append(line(-90, -56, -90, 56, "t"))
top.append(path(smooth(RAIL_OUT), "o w"))
top.append(path(smooth(RAIL_IN), "d w"))
# wanna: grzbiety burt i podłoga z matami
TRAY = [(14, -TRAY_HW, "c"), (1280, -TRAY_HW), (TRAY_FRONT + 4, -224, "c"),
        (TRAY_FRONT + 4, 224, "c"), (1280, TRAY_HW), (14, TRAY_HW, "c")]
top.append(path(smooth(TRAY), "d w"))
top.append(mirror_y(path(smooth([(14, -270), (600, -278), (1000, -284), (1300, -292)], closed=False), "t")))
top.append(mirror_y(rect(70, -204, 1160, 176, 44, "t")))
# pokrywa silnika
HOOD_T = sym_y([
    (2265, 0), (2262, -90), (2230, -170), (2140, -238), (2000, -282), (1800, -304), (1600, -308),
    (1440, -300), (TRAY_FRONT + 10, -276, "c"), (TRAY_FRONT, 0),
])
top.append(path(smooth(HOOD_T), "o w"))
top.append(mirror_y(path(smooth([(1440, -226), (1650, -248), (1900, -236), (2100, -190), (2230, -100)], closed=False), "t")))
top.append(mirror_y(path(smooth([(1720, -268, "c"), (1920, -266, "c"), (1912, -292, "c"), (1720, -298, "c")]), "d w")))
# nos: przetłoczenie
top.append(mirror_y(path(smooth([(2280, -150), (2380, -110), (2460, -50)], closed=False), "t")))
# wspornik osi drążka
top.append(rect(2258, -56, 90, 112, 20, "d w"))
top.append(line(PIVOT[0], -64, PIVOT[0], 64, "d"))
# drążek
top.append(path(poly([(PIVOT[0] + 22, -38), (PE[0] + 40, -30), (PE[0] + 40, 30), (PIVOT[0] + 22, 38)]), "o w"))
top.append(line(PIVOT[0] - 50, 0, PE[0] + 70, 0, "t"))
# kierownica
top.append(rect(PE[0] - 46, -44, 92, 88, 14, "d w"))
for s in (-1, 1):
    top.append(strip([(PE[0], s * 30), (PE[0], s * 120), (GX, s * 200), (GX, s * 300)], 26))
for s in (-1, 1):
    y0 = 238 if s > 0 else -358
    top.append(rect(GX - 20, y0, 40, 120, 14, "d w"))
    top.append(rect(GX - 18, s * 222 - 16, 36, 32, 8, "d w"))
# dźwignia gazu (prawa strona = +y)
top.append(path(smooth([(GX + 14, 240, "c"), (GX + 56, 246, "c"), (GX + 56, 268, "c"), (GX + 14, 274, "c")]), "d w"))
top.append(rect(PE[0] - 66, -122, 132, 244, 22, "o w"))
top.append(line(PE[0] - 8, -100, PE[0] - 8, 100, "t"))


def group(id_, parts, extra=""):
    return f'<g id="{id_}"{extra}>' + "".join(parts) + "</g>"


print(group("side0", side0))
print(group("side", side, ' data-axles=""'))
print(group("sideR", sideR))
print(group("sideL", sideL))
print(group("front", front))
print(group("rear", rear))
print(group("top", top))
