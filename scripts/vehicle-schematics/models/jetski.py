"""Skuter wodny rekreacyjny 3-osobowy (klasa Sea-Doo GTX / Yamaha VX / Kawasaki Ultra).

Wymiary: długość ~3410 (z noskiem odbojnika), szerokość 1256 (odbojnik), wysokość 1198 (lusterka),
kierownica ~1110, osłona kolumny 1150.
Układ: x = 0 rufa (krawędź platformy), x = 3400 dziób; y = 0 stępka (najniższy punkt kadłuba).
Kadłub: odbojnik 405..470 nad stępką (platforma 470), krawędź (china) ~170, stopień burty ~290,
burta podestu na stopy ~710, siedzenie 878 (kierowca) / 948 (pasażerowie), kaptur 1062.
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from lib import *  # noqa: E402,F403


# ─── pomocniki lokalne ─────────────────────────────────────────────────────────


def sample(points, closed=False, n=14, tension=0.5):
    """Próbkuje tę samą krzywą co smooth() (Catmull-Rom -> Bezier) jako listę punktów."""
    pts = [(p[0], p[1], len(p) > 2 and p[2] == "c") for p in points]
    m = len(pts)

    def get(i):
        if closed:
            return pts[i % m]
        return pts[max(0, min(m - 1, i))]

    k = tension / 3.0
    out = [(pts[0][0], pts[0][1])]
    segs = m if closed else m - 1
    for i in range(segs):
        p0, p1, p2, p3 = get(i - 1), get(i), get(i + 1), get(i + 2)
        c1 = (p1[0], p1[1]) if p1[2] else (p1[0] + (p2[0] - p0[0]) * k, p1[1] + (p2[1] - p0[1]) * k)
        c2 = (p2[0], p2[1]) if p2[2] else (p2[0] - (p3[0] - p1[0]) * k, p2[1] - (p3[1] - p1[1]) * k)
        for j in range(1, n + 1):
            t = j / n
            a, b, c, d = (1 - t) ** 3, 3 * (1 - t) ** 2 * t, 3 * (1 - t) * t * t, t ** 3
            out.append((a * p1[0] + b * c1[0] + c * c2[0] + d * p2[0],
                        a * p1[1] + b * c1[1] + c * c2[1] + d * p2[1]))
    return out


def at(curve, x):
    """Wartość krzywej (punkty monotoniczne w x) w danym x - interpolacja po próbkach smooth()."""
    s = sample(curve, n=24)
    if s[0][0] > s[-1][0]:
        s = s[::-1]
    if x <= s[0][0]:
        return s[0][1]
    for (x0, y0), (x1, y1) in zip(s, s[1:]):
        if x0 <= x <= x1:
            return y0 if x1 == x0 else y0 + (y1 - y0) * (x - x0) / (x1 - x0)
    return s[-1][1]


def bar(points, w, cls="d w", caps=True):
    """Pręt / uchwyt o stałej szerokości wzdłuż gładkiej krzywej, z zaokrąglonymi końcami."""
    s = sample(points, n=10)
    left, right = [], []
    for i, (x, y) in enumerate(s):
        a = s[max(0, i - 1)]
        b = s[min(len(s) - 1, i + 1)]
        dx, dy = b[0] - a[0], b[1] - a[1]
        ln = math.hypot(dx, dy) or 1
        nx, ny = -dy / ln, dx / ln
        left.append((x + nx * w / 2, y + ny * w / 2))
        right.append((x - nx * w / 2, y - ny * w / 2))

    def cap(p, c):
        r = w / 2
        a0 = math.atan2(p[1] - c[1], p[0] - c[0])
        return [(c[0] + r * math.cos(a0 - math.pi * j / 8), c[1] + r * math.sin(a0 - math.pi * j / 8))
                for j in range(1, 8)]

    body = left[:]
    if caps:
        body += cap(left[-1], s[-1])
    body += right[::-1]
    if caps:
        body += cap(right[0], s[0])
    return path(poly(body), cls)


def proj(curve_w, curve_h, xs):
    """Punkty widoku przód/tył: (półszerokość z widoku z góry, wysokość z boku) dla danych x."""
    return [(at(curve_w, x), at(curve_h, x)) for x in xs]


def rng(a, b, n):
    return [a + (b - a) * i / (n - 1) for i in range(n)]


def group(id_, parts, extra=""):
    return f'<g id="{id_}"{extra}>' + "".join(parts) + "</g>"


# ─── definicje bryły (wspólne dla wszystkich widoków) ──────────────────────────
# odbojnik: górna i dolna krawędź w widoku z boku (od rufy do dziobu)
BT = [(0, -470), (500, -470), (1200, -472), (1900, -480), (2400, -498), (2800, -530),
      (3100, -580), (3300, -640), (3392, -700)]
BB = [(0, -405), (500, -405), (1200, -407), (1900, -415), (2400, -432), (2800, -462),
      (3100, -510), (3300, -570), (3394, -632)]
# półszerokość odbojnika (widok z góry, zewnętrzna krawędź)
BW = [(0, 480), (12, 540), (80, 568), (300, 590), (700, 612), (1200, 628), (1800, 628),
      (2250, 615), (2600, 570), (2900, 490), (3120, 390), (3270, 270), (3360, 150),
      (3398, 60), (3405, 0)]
# stępka i dziobnica (od dziobu do rufy)
KEEL = [(3400, -632), (3382, -560), (3332, -470), (3260, -380), (3150, -280), (2980, -170),
        (2750, -80), (2450, -20), (2100, -2), (1200, 0), (118, 0, "c")]
# krawędź (china): wysokość z boku i półszerokość; schodzi się z dziobnicą
CH = [(104, -170), (700, -172), (1500, -176), (2200, -188), (2600, -212), (2900, -252),
      (3080, -298), (3200, -345), (3260, -380)]
CW = [(104, 470), (800, 505), (1500, 520), (2200, 512), (2600, 470), (2900, 385),
      (3080, 280), (3200, 150), (3260, 0)]
# stopień na burcie
ST = [(90, -290), (1000, -292), (1800, -300), (2400, -318), (2800, -354), (3080, -408),
      (3260, -478), (3380, -560)]
SW = [(90, 512), (800, 548), (1500, 564), (2200, 558), (2600, 522), (2900, 440),
      (3080, 340), (3260, 190), (3380, 0)]
# szew pokrywy dziobowej: wysokość z boku i półszerokość z góry
HS = [(2385, -962), (2600, -936), (2850, -880), (3100, -800), (3300, -735), (3394, -704)]
HW = [(2385, 395), (2480, 398), (2700, 380), (2950, 330), (3150, 250), (3290, 150),
      (3345, 70), (3364, 0)]
# górna krawędź burty pokładu: podest na stopy, potem bark przy konsoli (z boku)
G = [(470, -470, "c"), (560, -560), (700, -682), (900, -702), (1600, -708), (2050, -716),
     (2160, -758), (2262, -850), (2332, -920), (2385, -962, "c")]
# ta sama krawędź z góry (półszerokość), od rufy do szwu kaptura
GW = [(470, 575), (560, 552), (700, 545), (1600, 545), (2100, 545), (2250, 528),
      (2385, 486), (2550, 425), (2700, 382)]


# ─── BOK (prawy bok, dziób w +x) ───────────────────────────────────────────────
side = []

# --- rufa pod platformą: dysza, klapa cofania, płyta ślizgowa, drabinka
side.append(path(smooth([(112, -60, "c"), (112, -220, "c"), (40, -200, "c"), (40, -80, "c")]), "d w"))
side.append(line(76, -70, 76, -210, "t"))
side.append(path(smooth([
    (58, -244, "c"), (24, -238), (6, -208), (0, -140), (10, -76, "c"),
    (24, -78, "c"), (18, -142), (24, -198), (40, -222), (58, -228, "c"),
]), "d w"))
side.append(rect(26, -32, 92, 24, 6, "d w"))
side.append(bar([(34, -405), (34, -290)], 24))
side.append(rect(6, -362, 58, 18, 6, "d w"))
side.append(rect(6, -308, 58, 18, 6, "d w"))

# --- siedzisko: podstawa, ucho holownicze, poduszka, uchwyt pasażera
side.append(path(smooth([(600, -470, "c"), (612, -700), (640, -764, "c"), (2050, -764, "c"), (2050, -470, "c")]), "d w"))
side.append(path(smooth([(614, -742, "c"), (540, -742), (516, -724), (540, -706), (614, -706, "c")]), "d w"))
side.append(circle(542, -724, 9, "t"))
SEAT = [
    (668, -762, "c"), (640, -820), (636, -890), (660, -935), (720, -948), (1000, -948),
    (1300, -942), (1420, -934), (1474, -916), (1506, -888), (1556, -876), (1760, -872),
    (1930, -878), (2010, -882), (2046, -866), (2060, -826), (2050, -762, "c"),
]
side.append(path(smooth(SEAT), "o w"))
side.append(path(smooth([(662, -910), (720, -922), (1000, -922), (1300, -917), (1430, -908)], closed=False), "t"))
side.append(path(smooth([(1540, -852), (1760, -848), (1930, -854), (2030, -850)], closed=False), "t"))
side.append(bar([(800, -852), (660, -858), (602, -848), (588, -836)], 30))

# --- konsola, osłona kolumny, wyświetlacz
side.append(path(smooth([
    (2040, -620, "c"), (2050, -800), (2080, -900), (2120, -985), (2200, -1028), (2300, -1040),
    (2400, -1048, "c"), (2400, -620, "c"),
]), "d w"))
PAD = [(2110, -1010, "c"), (2118, -1080), (2150, -1132), (2210, -1150), (2272, -1138),
       (2302, -1096), (2306, -1036, "c")]
side.append(path(smooth(PAD), "d w"))
side.append(path(smooth([(2140, -1074), (2210, -1092), (2286, -1080)], closed=False), "t"))
side.append(path(poly([(2300, -1034), (2370, -1086), (2392, -1076), (2390, -1042)]), "d l"))

# --- pokrywa schowka dziobowego (kaptur)
HOOD = [(2385, -962, "c"), (2390, -1040), (2440, -1062), (2600, -1062), (2850, -1020),
        (3100, -935), (3300, -818), (3378, -742), (3398, -706, "c"),
        (3300, -735), (3100, -800), (2850, -880), (2600, -936)]
side.append(path(smooth(HOOD), "o w"))
HOOD_IH = [(2470, -1012), (2760, -996), (3020, -920), (3200, -845), (3250, -818)]
HOOD_IW = [(2470, 318), (2760, 300), (3020, 230), (3200, 110), (3250, 0)]
side.append(path(smooth(HOOD_IH, closed=False), "t"))

# --- burta pokładu (ściana podestu na stopy + bok przedniego pokładu)
mid = [((a[0] + b[0]) / 2, (a[1] + b[1]) / 2) for a, b in zip(BT, BB)]
deck_side = G + HS[1:-1] + [(3398, -706, "c")] + \
    [(x, y) for x, y in mid[::-1] if 470 < x < 3392] + [(470, -438, "c")]
side.append(path(smooth(deck_side), "o w"))
# podział: ściana podestu | bok przedniego pokładu
side.append(path(smooth([(2120, -738), (2150, -640), (2200, -500)], closed=False), "t"))

# --- odbojnik
bump = [(0, -470, "c")] + BT[1:] + [(3410, -666)] + BB[::-1][:-1] + [(0, -405, "c")]
side.append(path(smooth(bump), "o w"))

# --- burta kadłuba (od odbojnika do krawędzi i dziobnicy)
hull_side = [(84, -405, "c")] + BB[1:-1] + [(3394, -632, "c")] + KEEL[1:3] + \
    [(3260, -380, "c")] + CH[::-1][1:-1] + [(104, -170, "c")]
side.append(path(smooth(hull_side), "o w"))
side.append(path(smooth(ST, closed=False), "d"))
side.append(path(smooth([(x, y + 20) for x, y in ST[:-2]] + [(3236, -450)], closed=False), "t"))

# --- dno w „V" (od krawędzi do stępki)
bottom = [(104, -170, "c")] + CH[1:-1] + [(3260, -380, "c")] + KEEL[4:]
side.append(path(smooth(bottom), "o w"))
side.append(path(smooth([(112, -86), (1500, -89), (2300, -100), (2700, -130), (2950, -180),
                         (3120, -250), (3220, -320)], closed=False), "t"))

# --- sponson przy rufie
side.append(path(smooth([
    (108, -132, "c"), (112, -246, "c"), (330, -238), (490, -218), (590, -192, "c"),
    (490, -170), (300, -148),
]), "d w"))
side.append(circle(250, -190, 10, "t"))
side.append(circle(420, -192, 10, "t"))

# --- oczko dziobowe (na dziobnicy, między krawędzią a stopniem)
side.append(path(smooth([(3300, -488, "c"), (3352, -494), (3366, -470), (3350, -446), (3296, -452, "c")]), "d w"))
side.append(circle(3346, -470, 9, "t"))

# --- lusterko i rączka kierownicy (bliższa strona)
side.append(path(smooth([(2440, -940, "c"), (2440, -1040), (2434, -1124, "c"), (2466, -1124, "c"), (2480, -1030), (2510, -948, "c")]), "d w"))
MIRROR_S = [(2368, -1130), (2400, -1188), (2510, -1198), (2546, -1168), (2522, -1128), (2420, -1118)]
side.append(path(smooth(MIRROR_S), "o w"))
side.append(bar([(2165, -1112), (2082, -1100)], 44))
side.append(line(2140, -1130, 2140, -1090, "t"))

# ─── GÓRA (dziób w +x, prawa burta po +y) ─────────────────────────────────────
top = []
top.append(path(smooth(sym_y([(x, -w) for x, w in BW[::-1]][:-1] + [(0, -480, "c"), (0, 0)])), "o w"))
TBI = [(3360, 0), (3350, -60), (3310, -140), (3225, -245), (3090, -350), (2880, -445),
       (2590, -520), (2250, -562), (1800, -575), (1200, -575), (700, -560), (300, -540),
       (90, -520), (48, -495), (45, -440, "c"), (45, 0)]
top.append(path(smooth(sym_y(TBI)), "d w"))
# platforma rufowa: mata antypoślizgowa
top.append(rect(80, -430, 400, 860, 40, "t"))
for sgn in (1, -1):
    k = lambda pts: [(p[0], p[1] * sgn, *p[2:]) for p in pts]  # noqa: E731
    # górna krawędź burty (od ściany burty do szwu kaptura)
    top.append(path(smooth(k([(x, -w) for x, w in GW]), closed=False), "t"))
    # podest na stopy
    fw = [(600, -226, "c"), (600, -492, "c"), (1200, -494), (1900, -494), (2090, -486),
          (2158, -446, "c"), (2172, -370), (2160, -300), (2120, -262, "c"), (2010, -215),
          (1900, -196), (1600, -212), (1200, -226)]
    top.append(path(smooth(k(fw)), "d w"))
    top.append(path(smooth(k([(470, -575), (520, -540), (600, -492)]), closed=False), "d"))
    # krawędź konsoli (konsola | bark przedniego pokładu)
    top.append(path(smooth(k([(2120, -262), (2210, -310), (2300, -362), (2385, -395)]), closed=False), "d"))
# wyświetlacz
top.append(rect(2300, -160, 84, 320, 14, "d l"))
# kaptur
top.append(path(smooth(sym_y([(x, -w) for x, w in HW[::-1]][:-1] + [(2385, -395, "c"), (2380, 0)])), "o w"))
top.append(path(smooth(sym_y([(x, -w) for x, w in HOOD_IW[::-1]] + [(2460, 0)])), "t"))
# ucho holownicze i uchwyt pasażera (końce uchwytu chowają się pod poduszką)
top.append(bar([(510, 0), (604, 0)], 34))
top.append(bar([(830, -222), (790, -266), (650, -270), (598, -236), (576, -150), (573, 0),
                (576, 150), (598, 236), (650, 270), (790, 266), (830, 222)], 30))
# siedzisko (stopień między kierowcą a pasażerami)
SEAT_T = [(2060, 0), (2052, -96), (2014, -170), (1900, -206), (1600, -226), (1520, -232),
          (1200, -240), (800, -240), (684, -232), (652, -190), (646, 0)]
top.append(path(smooth(sym_y(SEAT_T)), "o w"))
top.append(path(smooth([(1532, -230), (1504, -120), (1498, 0), (1504, 120), (1532, 230)], closed=False), "d"))
top.append(path(smooth(sym_y([(1476, 0), (1472, -110), (1440, -204), (1200, -210), (800, -210),
                              (700, -202), (680, -150), (678, 0)])), "t"))
# ucho holownicze i uchwyt pasażera
# kierownica i osłona kolumny
top.append(mirror_y(bar([(2200, -110), (2190, -240), (2160, -350)], 32), bar([(2160, -346), (2120, -462)], 48)))
top.append(path(smooth(sym_y([(2306, 0), (2300, -92), (2262, -128), (2150, -126), (2114, -84), (2110, 0)])), "d w"))
# lusterka
top.append(mirror_y(
    rect(2440, -520, 70, 90, 20, "d w"),
    path(smooth([(2372, -448), (2404, -588), (2510, -594), (2540, -470), (2490, -440)]), "o w"),
))
# drabinka (zaczep na krawędzi platformy)
top.append(rect(6, -122, 54, 244, 8, "d w"))

# ─── PRZÓD (oś x = 0; prawa burta po lewej stronie rysunku) ─────────────────────
GRIPS = [bar([(-462, -1112), (-346, -1108)], 48), bar([(346, -1108), (462, -1112)], 48),
         bar([(-350, -1106), (350, -1106)], 32)]
PAD_F = path(smooth(sym([(0, -1150), (80, -1146), (120, -1120), (128, -1066), (128, -1000, "c"), (0, -1000)])), "d w")
MIRROR_F = [(426, -1130), (590, -1126), (600, -1162), (572, -1196), (446, -1194), (420, -1164)]
MIRROR_ARM = path(smooth([(440, -880, "c"), (452, -1040), (462, -1124, "c"), (492, -1124, "c"), (502, -1040), (520, -880, "c")]), "d w")
# sylwetka: kadłub + burta + bark pokładu + kaptur
SIL = sym([
    (0, -1062), (200, -1056), (320, -1032), (386, -1000), (430, -980), (470, -962),
    (500, -900), (530, -800), (545, -708, "c"), (598, -470, "c"), (628, -438),
    (610, -405, "c"), (582, -340), (564, -294, "c"), (546, -278, "c"), (522, -176, "c"),
    (0, 0, "c"),
])

front = []
front += GRIPS
front.append(PAD_F)
front.append(mirror_x(MIRROR_ARM, path(smooth(MIRROR_F), "o w")))
front.append(path(smooth(SIL), "o w"))
# krawędź przedniego pokładu (bok przy szwie kaptura) na tle barków i burt podestów
front.append(mirror_x(path(smooth([(596, -500), (566, -640), (516, -790), (456, -900), (400, -956)], closed=False), "t")))
# kaptur
hood_f = [(0, -1062), (200, -1050), (320, -1020), (380, -990), (398, -958, "c")] + \
    proj(HW, HS, rng(2480, 3394, 12))[1:-1] + [(0, -706)]
front.append(path(smooth(sym(hood_f)), "o w"))
iw = proj(HOOD_IW, HOOD_IH, rng(2470, 3250, 10))
front.append(path(smooth(sym([(0, -1040), (200, -1034)] + iw[:-1] + [(0, -818)])), "t"))
# odbojnik na dziobie
xs = rng(1800, 3392, 16)
bt = proj(BW, BT, xs)
bb = proj(BW, BB, xs)
front.append(path(smooth(sym([(0, -700)] + bt[::-1][1:] + [(628, -438)] + bb[1:] + [(0, -632)])), "o w"))
# linie dziobu: krawędź, stopień, dziobnica, oczko
front.append(mirror_x(path(smooth(proj(CW, CH, rng(1500, 3260, 16)), closed=False), "d")))
front.append(mirror_x(path(smooth(proj(SW, ST, rng(1500, 3380, 16)), closed=False), "d")))
front.append(line(0, -6, 0, -632, "d"))
front.append(path(smooth(sym([(0, -494), (20, -490), (24, -470), (20, -450), (0, -446)])), "d w"))
front.append(circle(0, -470, 8, "t"))

# ─── TYŁ (oś x = 0; prawa burta po prawej stronie rysunku) ─────────────────────
rear = []
rear.append(mirror_x(
    MIRROR_ARM,
    path(smooth(MIRROR_F), "o w"),
    path(smooth([(440, -1140), (580, -1136), (588, -1162), (566, -1184), (452, -1182), (436, -1160)]), "d l"),
))
rear.append(path(smooth(SIL), "o w"))
# konsola i ściany czołowe podestów
rear.append(mirror_x(path(smooth([(250, -790), (270, -880), (310, -950), (370, -990)], closed=False), "t")))
rear.append(mirror_x(path(smooth([(250, -790), (380, -780), (490, -740)], closed=False), "d")))
rear += GRIPS
rear.append(PAD_F)
# burty podestów na stopy (tylne końce)
rear.append(mirror_x(path(smooth([(495, -470, "c"), (500, -640), (520, -700), (560, -708), (598, -470, "c")]), "d w")))
# siedzisko, podstawa, uchwyt, ucho
rear.append(path(smooth(sym([(0, -764), (196, -764, "c"), (204, -620), (222, -510), (254, -470, "c"), (0, -470)])), "d w"))
rear.append(path(smooth(sym([(0, -948), (150, -945), (214, -930), (240, -898), (246, -842),
                             (238, -786), (214, -762, "c"), (0, -762)])), "o w"))
rear.append(path(smooth([(-200, -920), (0, -926), (200, -920)], closed=False), "t"))
rear.append(path(smooth(sym([(0, -870), (254, -870), (286, -852), (254, -834), (0, -834)])), "d w"))
rear.append(path(ring(0, -724, 30, 13), "d w", 'fill-rule="evenodd"'))
# odbojnik
rear.append(path(smooth(sym([(0, -470), (598, -470, "c"), (628, -438), (610, -405, "c"), (0, -405)])), "o w"))
# pawęż (rufa kadłuba)
transom = sym([(0, -405), (552, -405, "c"), (532, -340), (512, -290, "c"), (470, -170, "c"), (0, 0, "c")])
rear.append(path(smooth(transom), "o w"))
rear.append(mirror_x(line(512, -290, 564, -294, "d")))
# tunel pompy, dysza, klapa cofania, płyta ślizgowa
rear.append(path(smooth(sym([(0, -275), (172, -270, "c"), (192, -40, "c"), (0, -40)])), "t"))
rear.append(circle(0, -140, 66, "d w"))
rear.append(circle(0, -140, 40, "d k"))
rear.append(path(smooth([
    (-104, -100, "c"), (-110, -170), (-74, -228), (0, -244), (74, -228), (110, -170), (104, -100, "c"),
    (84, -100, "c"), (90, -162), (60, -210), (0, -222), (-60, -210), (-90, -162), (-84, -100, "c"),
]), "d w"))
rear.append(rect(-200, -34, 400, 28, 8, "d w"))
# sponsony
rear.append(mirror_x(path(smooth([(468, -134, "c"), (474, -246, "c"), (550, -240), (580, -222), (568, -204), (510, -150, "c")]), "d w")))
# drabinka
rear.append(mirror_x(bar([(110, -405), (110, -288)], 24)))
rear.append(rect(-122, -362, 244, 20, 8, "d w"))
rear.append(rect(-122, -306, 244, 20, 8, "d w"))


print(group("side", side, ' data-axles=""'))
print(group("front", front))
print(group("rear", rear))
print(group("top", top))
