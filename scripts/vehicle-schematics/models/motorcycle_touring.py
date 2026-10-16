"""Motocykl turystyczny (pełna owiewka, kufry boczne i centralny), klasa ciężkiego tourera.

Wymiary: rozstaw osi 1695, długość ~2575, wysokość 1430 (szyba), szerokość 925 (lusterka),
kufry boczne 880, siodło 745. Koła 130/70 R18 przód, 200/55 R16 tył.
Napęd wałem w PRAWYM ramieniu wahacza (przekładnia kątowa po prawej), tarcza tylna po lewej.
Tłumiki pod kuframi po obu stronach.
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from lib import *  # noqa: E402,F403

RA = (0, -313)      # oś tylna (16")
RR, RRIM = 313, 215
FA = (1695, -320)   # oś przednia (18")
FR, FRIM = 320, 240
RAKE = 27
U = (-math.sin(math.radians(RAKE)), -math.cos(math.radians(RAKE)))   # wzdłuż lagi w górę
N = (math.cos(math.radians(RAKE)), -math.sin(math.radians(RAKE)))    # prostopadle, do przodu


def fork_pt(t, off):
    return (FA[0] + U[0] * t + N[0] * off, FA[1] + U[1] * t + N[1] * off)


def fork_segment(t0, t1, w, cls="o w", w1=None):
    w1 = w if w1 is None else w1
    pts = [fork_pt(t0, -w / 2), fork_pt(t1, -w1 / 2), fork_pt(t1, w1 / 2), fork_pt(t0, w / 2)]
    return path(poly(pts), cls)


def pipe(points, w, cls="d w"):
    """Rura o stałej średnicy wzdłuż łamanej (gładko), zamknięty obrys."""
    left, right = [], []
    n = len(points)
    for i, (x, y) in enumerate(points):
        if i == 0:
            dx, dy = points[1][0] - x, points[1][1] - y
        elif i == n - 1:
            dx, dy = x - points[i - 1][0], y - points[i - 1][1]
        else:
            dx, dy = points[i + 1][0] - points[i - 1][0], points[i + 1][1] - points[i - 1][1]
        ln = math.hypot(dx, dy)
        nx, ny = -dy / ln, dx / ln
        left.append((x + nx * w / 2, y + ny * w / 2))
        right.append((x - nx * w / 2, y - ny * w / 2))
    left[0] = (*left[0], "c")
    left[-1] = (*left[-1], "c")
    right[0] = (*right[0], "c")
    right[-1] = (*right[-1], "c")
    return path(smooth(left + list(reversed(right))), cls)


def band_arc(c, outer, inner, cls="o w"):
    """Pas wokół koła (błotnik): outer/inner = lista (kąt, promień)."""
    o = [on_circle(*c, r, a) for a, r in outer]
    i = [on_circle(*c, r, a) for a, r in inner]
    pts = [(*o[0], "c")] + o[1:-1] + [(*o[-1], "c"), (*i[0], "c")] + i[1:-1] + [(*i[-1], "c")]
    return path(smooth(pts), cls)


# ═══ BOK ═══════════════════════════════════════════════════════════════════════
side0 = [
    wheel_side(*RA, RR, RRIM, "six", rot=8),
    wheel_side(*FA, FR, FRIM, "six", rot=-4),
    brake_disc_side(*FA, 160, holes=12, buttons=6),
    circle(*FA, 46, "d w"),
]

# ─── prawy bok, pod spodem: wahacz z wałem napędowym i przekładnia kątowa ─────
PIVOT = (720, -400)
sideR0 = [
    # ramię wahacza = obudowa wału
    path(smooth([
        (PIVOT[0] + 10, PIVOT[1] - 46, "c"), (420, -392), (180, -362), (70, -352, "c"),
        (70, -262, "c"), (200, -282), (430, -318), (PIVOT[0] + 10, PIVOT[1] + 40, "c"),
    ]), "o w"),
    # mieszek gumowy przy wahaczu
    *[line(x, y - 42, x, y + 38, "t") for x, y in [(612, -392), (590, -389), (568, -386)]],
    path(smooth([(560, -340), (330, -328), (150, -312)], closed=False), "t"),
    # przekładnia kątowa (obudowa wokół osi)
    path(smooth([
        (110, -366, "c"), (60, -420), (-30, -424), (-96, -372), (-104, -290), (-60, -226),
        (20, -212), (90, -248), (112, -270, "c"),
    ]), "o w"),
    circle(*RA, 58, "d w"),
    circle(*RA, 22, "d"),
]
for i in range(6):
    x, y = on_circle(*RA, 82, i * 60 + 15)
    sideR0.append(circle(x, y, 7, "t"))

# ─── lewy bok, pod spodem: tarcza i zacisk tylny, zwykłe ramię wahacza ───────
sideL0 = [
    brake_disc_side(*RA, 150, holes=12, buttons=5),
    caliper_side(*RA, 150, 150, span=36, inner=36, outer=16),
    path(smooth([
        (PIVOT[0] + 10, PIVOT[1] - 34, "c"), (420, -372), (180, -346), (40, -340, "c"),
        (-34, -313), (40, -286, "c"), (200, -296), (430, -326), (PIVOT[0] + 10, PIVOT[1] + 32, "c"),
    ]), "o w"),
    path(smooth([(560, -356), (330, -340), (150, -322)], closed=False), "t"),
    circle(*RA, 30, "d w"),
    circle(*RA, 14, "d"),
]

# ─── wspólne ──────────────────────────────────────────────────────────────────
side = []

# błotnik przedni, duży, z osłonami bocznymi
side.append(band_arc(
    FA,
    [(12, 334), (40, 350), (75, 358), (108, 354), (138, 338)],
    [(138, 318), (110, 296), (78, 286), (44, 296), (12, 316)],
))
side.append(path(smooth([on_circle(*FA, 336, a) for a in (20, 50, 80, 110, 132)], closed=False), "t"))

# zacisk przedni i laga
side.append(caliper_side(*FA, 160, 146, span=36, inner=38, outer=18))
side.append(fork_segment(300, 640, 50))
side.append(fork_segment(-52, 330, 80))
side.append(fork_segment(250, 312, 86, "d w"))
side.append(circle(*FA, 24, "d w"))

# silnik
side.append(path(smooth([
    (1250, -664, "c"), (1000, -676), (800, -664, "c"), (770, -600), (762, -500), (780, -360),
    (812, -260), (880, -204), (1000, -186), (1150, -190), (1222, -224), (1248, -320), (1256, -500),
]), "o w"))
side.append(path(smooth([(1240, -584), (1000, -598), (790, -590)], closed=False), "t"))
side.append(path(smooth([
    (900, -560), (1060, -556), (1140, -500), (1150, -400), (1100, -330), (960, -318), (870, -360),
    (850, -460),
]), "d w"))
side.append(ellipse(1010, -440, 82, 68, "t"))
for a in (20, 90, 160, 230, 300):
    x, y = on_circle(1010, -440, 104, a)
    side.append(circle(x, y, 7, "t"))
# płyta ramy z osią wahacza
side.append(path(smooth([
    (700, -620, "c"), (790, -632, "c"), (800, -470), (786, -330), (740, -312), (700, -340), (688, -470),
]), "d w"))
side.append(circle(*PIVOT, 26, "d w"))
side.append(circle(*PIVOT, 10, "t"))
# miska olejowa
side.append(path(smooth([(1170, -198, "c"), (1140, -156), (890, -156), (860, -194, "c")], closed=False), "d"))
# głowica cylindrów (pod owiewką dolną)
side.append(path(smooth([
    (1190, -484, "c"), (1262, -486), (1294, -452), (1298, -350), (1274, -308), (1190, -306, "c"),
]), "o w"))
side.append(path(smooth([(1212, -458), (1266, -458), (1274, -348), (1212, -332)], closed=False), "t"))
# kolektor i rura do tłumika
side.append(pipe([
    (1250, -296), (1236, -200), (1170, -146), (1000, -128), (700, -132), (400, -150),
    (150, -172), (20, -190), (-70, -222), (-118, -268),
], 50))

# rama pod siedzeniem / osłona boczna środkowa
side.append(path(smooth([
    (1300, -850, "c"), (1180, -812), (1000, -804), (820, -740), (760, -684, "c"),
    (800, -664), (1050, -668), (1290, -676, "c"),
]), "d w"))

# osłona boczna tylna (pod siedzeniem, przed kufrem)
side.append(path(smooth([
    (770, -716, "c"), (560, -730), (420, -756), (290, -790, "c"), (290, -570, "c"),
    (440, -548), (620, -566), (750, -612, "c"),
]), "o w"))
side.append(path(smooth([(720, -664), (540, -676), (380, -706)], closed=False), "t"))

# gmol (osłona silnika) wokół głowicy
side.append(pipe([(1160, -246), (1252, -252), (1310, -288), (1336, -356), (1334, -430), (1310, -500), (1280, -540)], 36, "o w"))

# podnóżek pasażera
side.append(path(smooth([(470, -560, "c"), (440, -500), (380, -470, "c"), (360, -490), (420, -566, "c")]), "d w"))
side.append(circle(372, -478, 18, "d w"))
# podnóżek kierowcy
side.append(path(smooth([(790, -470, "c"), (850, -394), (868, -340, "c"), (842, -326), (760, -436, "c")]), "d w"))
side.append(circle(860, -340, 22, "d w"))

# tłumik (obie strony, pod kufrem)
MUF0, MUF1 = (-150, -298), (-512, -362)
side.append(tube((-112, -278), (-158, -300), 50, 116, "d w", round_end=False))
side.append(tube(MUF0, MUF1, 116, 126, "o w"))
for t in (0.12, 0.8):
    x = MUF0[0] + (MUF1[0] - MUF0[0]) * t
    y = MUF0[1] + (MUF1[1] - MUF0[1]) * t
    side.append(path(smooth([(x - 10, y + 60), (x + 10, y - 60)], closed=False), "t"))
side.append(ellipse(-522, -364, 22, 56, "d w", rot=10))

# osłona pod kufrem centralnym (bagażnik)
side.append(path(smooth([
    (-110, -876, "c"), (-110, -810, "c"), (-540, -810, "c"), (-548, -878, "c"),
]), "d w"))

# kufer boczny
side.append(path(smooth([
    (246, -812), (280, -784), (294, -720), (296, -640), (270, -540), (210, -466), (150, -444, "c"),
    (-100, -440), (-380, -444), (-470, -456, "c"), (-528, -500), (-550, -600), (-550, -720),
    (-532, -790), (-490, -820, "c"), (-200, -822), (80, -818),
]), "o w"))
side.append(path(smooth([(-550, -730), (-300, -738), (0, -736), (293, -726)], closed=False), "d"))
side.append(path(smooth([(-549, -704, "c"), (-500, -706), (-450, -700, "c"), (-460, -672), (-546, -664, "c")]), "d l"))
side.append(path(smooth([(240, -510), (-100, -496), (-470, -500)], closed=False), "t"))

# siedzenie (kierowca + pasażer)
side.append(path(smooth([
    (1020, -900, "c"), (960, -820), (880, -768), (750, -746), (620, -748), (520, -772),
    (462, -820), (430, -878), (380, -902), (200, -908), (0, -906), (-80, -900, "c"),
    (-80, -846, "c"), (100, -840), (300, -836), (420, -790), (560, -700), (760, -686),
    (930, -716), (1000, -760, "c"),
]), "o w"))
side.append(path(smooth([(452, -812), (380, -850), (200, -858), (0, -856), (-70, -852)], closed=False), "t"))
side.append(path(smooth([(990, -804), (900, -742), (760, -720), (600, -724), (520, -746)], closed=False), "t"))

# kufer centralny z oparciem
side.append(path(smooth([
    (-112, -876, "c"), (-112, -1080), (-140, -1170), (-240, -1214), (-420, -1212),
    (-506, -1172), (-540, -1080), (-544, -930), (-528, -880, "c"),
]), "o w"))
side.append(path(smooth([(-541, -1010), (-330, -1018), (-113, -1012)], closed=False), "d"))
side.append(path(smooth([(-544, -984, "c"), (-490, -986), (-450, -980, "c"), (-458, -950), (-544, -944, "c")]), "d l"))
side.append(path(smooth([
    (-110, -906, "c"), (-50, -920), (-34, -1020), (-48, -1120), (-110, -1150, "c"),
]), "o w"))

# konsola / zbiornik
side.append(path(smooth([
    (1340, -1036, "c"), (1200, -1014), (1090, -974), (1020, -910, "c"), (1006, -820, "c"),
    (1150, -812), (1300, -834, "c"),
]), "o w"))
side.append(path(smooth([(1300, -992), (1180, -984), (1060, -946)], closed=False), "t"))

# kierownica: manetka wychodzi zza owiewki
side.append(pipe([(1380, -1066), (1270, -1078)], 40, "d w"))
side.append(path(smooth([(1372, -1046, "c"), (1310, -1040), (1268, -1034, "c")], closed=False), "d"))

# owiewka przednia z dolną częścią osłaniającą nogi (jeden obrys, podział niżej)
side.append(path(smooth([
    (1660, -1152, "c"), (1750, -1130), (1830, -1088), (1882, -1022), (1906, -946), (1908, -886),
    (1890, -838), (1830, -804), (1730, -784), (1640, -778, "c"), (1570, -748), (1500, -700),
    (1440, -630), (1400, -560), (1376, -500, "c"), (1300, -484), (1240, -500, "c"),
    (1244, -600), (1268, -720), (1298, -840), (1322, -950), (1362, -1060), (1420, -1162, "c"),
]), "o w"))
# podział: owiewka górna / dolna (osłona nóg)
side.append(path(smooth([(1480, -680), (1400, -700), (1330, -730), (1272, -740)], closed=False), "d"))
side.append(path(smooth([(1420, -620), (1350, -600), (1300, -560), (1270, -520)], closed=False), "t"))
# reflektor i światło dolne
side.append(path(smooth([(1906, -896, "c"), (1900, -956), (1872, -1002), (1826, -1024, "c"), (1830, -976), (1864, -920, "c")]), "d l"))
# podział nosa / boku owiewki
side.append(path(smooth([(1826, -806), (1770, -880), (1700, -980), (1630, -1076), (1576, -1150)], closed=False), "d"))
side.append(path(smooth([(1620, -790), (1500, -824), (1400, -846), (1306, -870)], closed=False), "t"))

# lusterko w owiewce z kierunkowskazem
side.append(path(smooth([
    (1640, -1078, "c"), (1720, -1106), (1790, -1116), (1812, -1094), (1784, -1068), (1700, -1062),
]), "o w"))
side.append(path(smooth([(1798, -1110), (1766, -1090), (1700, -1078)], closed=False), "d"))

# szyba
side.append(path(smooth([
    (1660, -1152, "c"), (1616, -1240), (1574, -1326), (1540, -1390), (1500, -1422), (1440, -1430),
    (1396, -1420), (1376, -1390), (1384, -1300), (1400, -1220), (1416, -1166, "c"),
]), "o l"))
side.append(path(smooth([(1510, -1408), (1540, -1330), (1580, -1250)], closed=False), "t"))

# ─── tylko prawy bok, na wierzchu: pedał hamulca ───────────────────────────────
sideR = [
    path(smooth([(862, -340), (930, -332), (984, -312, "c")], closed=False), "d"),
    path(smooth([(972, -330, "c"), (1016, -318), (1012, -298, "c"), (970, -306)]), "d w"),
]
# ─── tylko lewy bok, na wierzchu: dźwignia zmiany biegów ──────────────────────
sideL = [
    path(smooth([(862, -346), (930, -362), (986, -370, "c")], closed=False), "d"),
    circle(996, -370, 14, "d w"),
]

# ═══ PRZÓD (oś x = 0, lewa strona rysunku = prawa strona motocykla) ════════════
front = []
# rzeczy z tyłu: kufer centralny, kufry boczne, tłumiki
front.append(path(smooth(sym([(0, -1214), (200, -1208), (276, -1170), (290, -1080), (290, -900), (270, -870, "c"), (0, -870)])), "o w"))
front.append(mirror_x(path(smooth([
    (170, -812, "c"), (400, -812), (436, -790), (444, -700), (436, -540), (410, -460), (370, -440, "c"),
    (170, -440, "c"),
]), "o w")))
front.append(mirror_x(ellipse(330, -292, 58, 58, "d w")))
front.append(tire_end(0, 200, 626, corner=80, lines=0))
# silnik i kolektory
front.append(path(smooth(sym([(0, -600), (200, -596), (262, -540), (270, -300), (236, -200), (160, -170, "c"), (0, -170)])), "o w"))
front.append(mirror_x(path(smooth([(80, -330), (120, -220), (130, -150)], closed=False), "d")))
front.append(mirror_x(path(smooth([(170, -560), (250, -520), (256, -330)], closed=False), "t")))
# podnóżki, głowice, gmole
front.append(mirror_x(rect(230, -356, 130, 32, 12, "d w")))
front.append(mirror_x(rect(190, -486, 116, 180, 34, "o w"),
                      *[line(204, y, 292, y, "t") for y in (-440, -396, -352)]))
front.append(mirror_x(pipe([(150, -246), (300, -258), (384, -306), (408, -400), (396, -480), (366, -530)], 36, "o w")))
# owiewki dolne (osłony nóg)
front.append(mirror_x(path(smooth([
    (150, -760, "c"), (370, -760, "c"), (386, -660), (380, -560), (360, -500, "c"), (200, -494, "c"),
    (170, -560), (152, -660),
]), "o w")))
front.append(mirror_x(path(smooth([(336, -720), (344, -620), (330, -530)], closed=False), "t")))
# opona, tarcze, błotnik, lagi
front.append(mirror_x(rect(70, -480, 10, 320, 3, "d w")))
front.append(tire_end(0, 130, 640))
front.append(path(smooth(sym([(0, -680), (70, -672), (96, -640), (100, -540), (92, -460), (64, -410, "c"), (0, -400)])), "o w"))
front.append(path(smooth([(-70, -650), (0, -660), (70, -650)], closed=False), "t"))
front.append(mirror_x(
    rect(100, -770, 46, 470, 10, "o w"),
    rect(94, -380, 58, 120, 8, "d w"),
    rect(66, -420, 20, 92, 6, "d w"),
))
# owiewka przednia
front.append(mirror_x(path(smooth([
    (330, -1150, "c"), (410, -1100), (440, -1020), (436, -920), (404, -840), (330, -790),
    (220, -770), (120, -768, "c"),
]), "o w")))
front.append(path(smooth(sym([
    (0, -1180), (200, -1170), (330, -1150, "c"), (410, -1100), (440, -1020), (436, -920),
    (404, -840), (330, -790), (220, -770), (120, -768, "c"), (0, -768),
])), "o w"))
front.append(mirror_x(path(smooth([(320, -1140), (300, -1000), (310, -880), (360, -810)], closed=False), "d")))
# reflektory
front.append(mirror_x(path(smooth([(40, -984, "c"), (150, -998), (256, -994, "c"), (262, -950), (226, -912), (130, -894), (46, -900, "c")]), "d l")))
front.append(line(0, -1080, 0, -1006, "t"))
front.append(path(poly([(-44, -810), (44, -810), (36, -790), (-36, -790)]), "d k"))
# lusterka
front.append(mirror_x(path(smooth([
    (400, -1140, "c"), (448, -1136), (462, -1100), (452, -1056), (420, -1046, "c"), (430, -1100),
]), "o w")))
front.append(mirror_x(path(smooth([(438, -1060), (452, -1090), (446, -1124)], closed=False), "d")))
# szyba
front.append(path(smooth(sym([(0, -1432), (180, -1426), (240, -1396), (268, -1300), (330, -1150, "c"), (0, -1180)])), "o l"))
front.append(path(smooth([(-160, -1400), (0, -1408), (160, -1400)], closed=False), "t"))

# ═══ TYŁ (prawa strona rysunku = prawa strona motocykla) ═══════════════════════
rear = []
# owiewka, szyba, lusterka w tle
rear.append(path(smooth(sym([(0, -1432), (180, -1426), (240, -1396), (268, -1300), (330, -1150, "c"), (0, -1180)])), "o l"))
rear.append(path(smooth(sym([
    (0, -1180), (200, -1170), (330, -1150, "c"), (410, -1100), (440, -1020), (436, -920),
    (404, -840), (330, -790), (220, -770), (0, -770),
])), "o w"))
rear.append(mirror_x(path(smooth([
    (400, -1140, "c"), (448, -1136), (462, -1100), (452, -1056), (420, -1046, "c"), (430, -1100),
]), "o w")))
rear.append(mirror_x(path(smooth([
    (150, -760, "c"), (370, -760, "c"), (386, -660), (380, -560), (360, -500, "c"), (200, -494, "c"),
]), "o w")))
rear.append(path(smooth(sym([(0, -600), (200, -596), (262, -540), (270, -300), (236, -200), (160, -170, "c"), (0, -170)])), "o w"))
rear.append(mirror_x(rect(190, -486, 116, 180, 34, "o w")))
rear.append(mirror_x(pipe([(150, -246), (300, -258), (384, -306), (408, -400), (396, -480), (366, -530)], 36, "o w")))
rear.append(mirror_x(rect(230, -356, 130, 32, 12, "d w")))
# siedzenie kierowcy (wystaje nad kufry boczne)
rear.append(path(smooth(sym([(0, -910), (170, -900), (210, -860), (200, -820, "c"), (0, -820)])), "o w"))
# tłumiki
rear.append(mirror_x(ellipse(330, -360, 63, 63, "o w"), ellipse(330, -360, 38, 38, "d")))
# opona tylna, przekładnia kątowa (prawa, +x), zacisk tarczy (lewa, -x, schowany pod błotnikiem)
rear.append(tire_end(0, 200, 626, corner=80, lines=4))
rear.append(path(smooth([(100, -420, "c"), (150, -404), (176, -340), (162, -250), (100, -224, "c")]), "o w"))
rear.append(path(poly([(-100, -424), (-128, -424), (-128, -364), (-100, -364)]), "d w"))
# błotnik tylny
rear.append(path(smooth(sym([(0, -656), (90, -648), (130, -600), (136, -440, "c"), (110, -446), (60, -470), (0, -476)])), "o w"))
# kufry boczne
SB = [
    (170, -812, "c"), (400, -812), (436, -790), (444, -700), (436, -540), (410, -460), (370, -440, "c"),
    (190, -440, "c"), (172, -470), (166, -600), (166, -760),
]
rear.append(mirror_x(path(smooth(SB), "o w")))
rear.append(mirror_x(path(smooth([(168, -730), (300, -734), (442, -726)], closed=False), "d")))
rear.append(mirror_x(path(smooth([(220, -700, "c"), (420, -700, "c"), (428, -660), (220, -664, "c")]), "d l")))
# tablica rejestracyjna i światło stop
rear.append(rect(-110, -720, 220, 180, 8, "o w"))
rear.append(rect(-100, -710, 200, 160, 5, "t"))
rear.append(path(smooth(sym([(0, -812), (140, -808), (150, -790, "c"), (140, -770), (0, -768)])), "d l"))
# osłona pod kufrem centralnym
rear.append(path(smooth(sym([(0, -876), (240, -876, "c"), (220, -812, "c"), (0, -812)])), "d w"))
# kufer centralny
rear.append(path(smooth(sym([(0, -1214), (200, -1208), (276, -1170), (290, -1080), (290, -900), (270, -870, "c"), (0, -870)])), "o w"))
rear.append(path(smooth([(-290, -1012), (0, -1018), (290, -1012)], closed=False), "d"))
rear.append(path(smooth(sym([(0, -990), (240, -984), (270, -960, "c"), (240, -940), (0, -940)])), "d l"))

# ═══ GÓRA (przód w +x, prawa strona motocykla po +y) ═══════════════════════════
top = []
top.append(rect(1380, -50, 640, 100, 40, "x g"))
# podnóżki
top.append(mirror_y(rect(840, -360, 40, 130, 14, "d w"), rect(356, -300, 34, 90, 12, "d w")))
# silnik / rama widoczne obok siedzenia
top.append(path(smooth(sym_y([(1300, 0), (1300, -240), (1200, -262), (900, -262), (760, -220, "c"), (740, 0)])), "o w"))
# błotnik przedni (przed owiewką)
top.append(path(smooth(sym_y([(2024, 0), (2014, -60), (1950, -94), (1820, -98, "c"), (1820, 0)])), "o w"))
# kufry boczne
SBT = [
    (290, -170, "c"), (296, -330), (270, -410), (200, -436), (-300, -440), (-480, -430),
    (-536, -380), (-548, -280), (-540, -170, "c"),
]
top.append(mirror_y(path(smooth(SBT), "o w")))
top.append(mirror_y(path(smooth([(266, -300), (240, -390), (180, -404), (-300, -408), (-466, -398), (-514, -356), (-522, -280)], closed=False), "t")))
# siedzenie
top.append(path(smooth(sym_y([
    (1020, 0), (1010, -140), (900, -190), (700, -206), (520, -196), (440, -190), (300, -196),
    (100, -194), (-70, -180, "c"), (-70, 0),
])), "o w"))
top.append(path(smooth([(450, -186), (470, -60), (470, 60), (450, 186)], closed=False), "t"))
# kufer centralny
top.append(path(smooth(sym_y([(-110, 0), (-112, -240), (-150, -284), (-300, -290), (-480, -282), (-536, -230), (-546, 0)])), "o w"))
top.append(path(smooth(sym_y([(-150, 0), (-160, -210), (-300, -240), (-470, -232), (-506, -190), (-512, 0)])), "t"))
top.append(path(smooth(sym_y([(-46, 0), (-50, -150), (-110, -170, "c"), (-110, 0)])), "o w"))
# konsola / zbiornik
top.append(path(smooth(sym_y([(1340, 0), (1336, -170), (1200, -180), (1060, -160), (1010, -120, "c"), (1000, 0)])), "o w"))
top.append(circle(1150, 0, 40, "d w"))
# osłony nóg (wystają zza owiewki)
top.append(mirror_y(path(smooth([
    (1236, -160, "c"), (1240, -330), (1270, -380), (1330, -392), (1420, -392, "c"), (1420, -160, "c"),
]), "o w")))
# kierownica
top.append(mirror_y(
    pipe([(1340, -110), (1316, -200), (1292, -250)], 26, "d w"),
    pipe([(1298, -236), (1262, -356)], 40, "d w"),
))
# owiewka
top.append(path(smooth(sym_y([
    (1908, 0), (1900, -90), (1862, -190), (1784, -296), (1680, -376), (1560, -428), (1440, -440),
    (1360, -420, "c"), (1352, -300), (1342, -170), (1336, 0),
])), "o w"))
top.append(mirror_y(path(smooth([(1870, -120), (1790, -250), (1680, -340), (1540, -390)], closed=False), "t")))
# szyba
top.append(path(smooth(sym_y([(1660, 0), (1646, -140), (1596, -260), (1520, -322), (1430, -332, "c"), (1452, -250), (1500, -170), (1532, -90), (1546, 0)])), "o l"))
top.append(rect(1360, -110, 80, 220, 14, "d w"))
# lusterka
top.append(mirror_y(path(smooth([
    (1772, -312, "c"), (1770, -380), (1752, -440), (1720, -462), (1692, -452), (1688, -404),
    (1700, -362, "c"),
]), "o w")))
top.append(mirror_y(path(smooth([(1762, -410), (1740, -448), (1712, -458)], closed=False), "d")))


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
