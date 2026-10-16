"""Motocykl adventure / turystyczne enduro (klasa 1100-1300 cm3, silnik rzędowy 2-cyl.).

Wymiary: rozstaw osi 1525, długość ~2270, wysokość 1450 (szyba), szerokość ~950
(osłony dłoni), siedzenie 865, prześwit 250 (płyta pod silnikiem).
Koła szprychowe: przód 90/90-21 (r 347), tył 150/70-18 (r 334).
Tłumik uniesiony po PRAWEJ, łańcuch po LEWEJ.
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from lib import *  # noqa: E402,F403

RA = (0, -334)      # oś tylna, opona 150/70-18
RR, RRIM = 334, 240
FA = (1525, -347)   # oś przednia, opona 90/90-21
FR, FRIM = 347, 276
RAKE = 27
PIV = (620, -470)   # oś wahacza
FS = (668, -425)    # zębatka zdawcza


# ─── pomocniki lokalne ────────────────────────────────────────────────────────


def fork_pt(t, off):
    a = math.radians(RAKE)
    ux, uy = -math.sin(a), -math.cos(a)
    nx, ny = math.cos(a), -math.sin(a)
    return (FA[0] + ux * t + nx * off, FA[1] + uy * t + ny * off)


def fork_segment(t0, t1, w0, w1=None, cls="o w"):
    w1 = w0 if w1 is None else w1
    pts = [fork_pt(t0, -w0 / 2), fork_pt(t1, -w1 / 2), fork_pt(t1, w1 / 2), fork_pt(t0, w0 / 2)]
    return path(poly(pts), cls)


def seg(a, b, t, off=0.0):
    """Punkt na odcinku a->b (t = 0..1) przesunięty prostopadle o `off`
    (dodatnie = w lewo od kierunku a->b, w SVG: dla kierunku do tyłu to „w górę")."""
    dx, dy = b[0] - a[0], b[1] - a[1]
    ln = math.hypot(dx, dy)
    ux, uy = dx / ln, dy / ln
    nx, ny = uy, -ux
    return (a[0] + dx * t + nx * off, a[1] + dy * t + ny * off)


def sample_smooth(points, closed=False, n=14, tension=0.5):
    """Punkty na krzywej, którą rysuje smooth() (ten sam Catmull-Rom -> Bezier)."""
    pts = [(p[0], p[1], len(p) > 2 and p[2] == "c") for p in points]
    m = len(pts)

    def get(i):
        return pts[i % m] if closed else pts[max(0, min(m - 1, i))]

    k = tension / 3.0
    out = [(pts[0][0], pts[0][1])]
    for i in range(m if closed else m - 1):
        p0, p1, p2, p3 = get(i - 1), get(i), get(i + 1), get(i + 2)
        c1 = (p1[0], p1[1]) if p1[2] else (p1[0] + (p2[0] - p0[0]) * k, p1[1] + (p2[1] - p0[1]) * k)
        c2 = (p2[0], p2[1]) if p2[2] else (p2[0] - (p3[0] - p1[0]) * k, p2[1] - (p3[1] - p1[1]) * k)
        for j in range(1, n + 1):
            t = j / n
            a, b, c, d = (1 - t) ** 3, 3 * (1 - t) ** 2 * t, 3 * (1 - t) * t ** 2, t ** 3
            out.append((a * p1[0] + b * c1[0] + c * c2[0] + d * p2[0],
                        a * p1[1] + b * c1[1] + c * c2[1] + d * p2[1]))
    return out


def bent_tube(points, w, cls="d w", caps=(True, True)):
    """Rura o stałej średnicy `w` wzdłuż gładkiej krzywej (gmole, stelaż, kierownica)."""
    c = sample_smooth(points)
    r = w / 2
    left, right = [], []
    for i, p in enumerate(c):
        a = c[max(0, i - 1)]
        b = c[min(len(c) - 1, i + 1)]
        dx, dy = b[0] - a[0], b[1] - a[1]
        ln = math.hypot(dx, dy) or 1
        nx, ny = -dy / ln, dx / ln
        left.append((p[0] + nx * r, p[1] + ny * r))
        right.append((p[0] - nx * r, p[1] - ny * r))

    def cap(end, prev):
        dx, dy = end[0] - prev[0], end[1] - prev[1]
        ln = math.hypot(dx, dy) or 1
        ux, uy = dx / ln, dy / ln
        nx, ny = -uy, ux
        return [(end[0] + nx * r * math.cos(q) + ux * r * math.sin(q),
                 end[1] + ny * r * math.cos(q) + uy * r * math.sin(q))
                for q in [i * math.pi / 8 for i in range(1, 8)]]

    pts = list(left)
    if caps[1]:
        pts += cap(c[-1], c[-2])
    pts += list(reversed(right))
    if caps[0]:
        pts += cap(c[0], c[1])
    return path(poly(pts), cls)


def knobs(c, r, depth=26, step=9):
    """Bieżnik opony lekko terenowej: krótkie klocki przy krawędzi."""
    out = [circle(c[0], c[1], r - depth, "t")]
    for i in range(int(360 / step)):
        a = i * step
        d = depth if i % 2 == 0 else depth * 0.6
        p0 = on_circle(c[0], c[1], r - 3, a)
        p1 = on_circle(c[0], c[1], r - d, a)
        out.append(line(p0[0], p0[1], p1[0], p1[1], "t"))
    return "".join(out)


def tangents(c1, r1, c2, r2):
    """Zewnętrzne styczne dwóch okręgów (łańcuch): [(p1, p2) górna, (p1, p2) dolna]."""
    dx, dy = c2[0] - c1[0], c2[1] - c1[1]
    L = math.hypot(dx, dy)
    ex, ey = dx / L, dy / L
    b = math.asin((r2 - r1) / L)
    res = []
    for s in (1, -1):
        mx, my = s * ey, -s * ex
        nx = mx * math.cos(b) - ex * math.sin(b)
        ny = my * math.cos(b) - ey * math.sin(b)
        res.append(((c1[0] + r1 * nx, c1[1] + r1 * ny), (c2[0] + r2 * nx, c2[1] + r2 * ny)))
    return res


def muffler(p0, p1, prof, cls="o w"):
    """Tłumik wzdłuż osi p0 -> p1; prof = [(t, promień)], od wlotu do końcówki."""
    top = [seg(p0, p1, t, r) for t, r in prof]
    bot = [seg(p0, p1, t, -r) for t, r in reversed(prof)]
    top = [(*top[0], "c")] + top[1:-1] + [(*top[-1], "c")]
    bot = [(*bot[0], "c")] + bot[1:-1] + [(*bot[-1], "c")]
    return path(smooth(top + bot), cls)


def arc_band(c, r0, r1, a0, a1, cls="d w"):
    """Pas wzdłuż łuku (błotnik przylegający do koła)."""
    n = 6
    angs = [a0 + (a1 - a0) * i / n for i in range(n + 1)]
    outer = [on_circle(c[0], c[1], r1, a) for a in angs]
    inner = [on_circle(c[0], c[1], r0, a) for a in reversed(angs)]
    outer = [(*outer[0], "c")] + outer[1:-1] + [(*outer[-1], "c")]
    inner = [(*inner[0], "c")] + inner[1:-1] + [(*inner[-1], "c")]
    return path(smooth(outer + inner), cls)


# ─── BOK: warstwa spodnia (koła, tarcza przednia, silnik) ────────────────────
side0 = [
    wheel_side(*RA, RR, RRIM, "wire", hub_r=66, rot=4, tread=False),
    knobs(RA, RR),
    wheel_side(*FA, FR, FRIM, "wire", hub_r=46, rot=0, tread=False),
    knobs(FA, FR),
    brake_disc_side(*FA, 155, holes=12, buttons=6),
    circle(*FA, 46, "d w"),
]
# silnik: skrzynia korbowa, cylinder pochylony do przodu, głowica z pokrywą zaworów
side0.append(path(smooth([
    (700, -430), (722, -335), (800, -296), (920, -288), (1030, -296), (1082, -334),
    (1100, -410), (1092, -490), (1066, -540, "c"), (880, -560, "c"), (740, -548), (704, -500),
]), "o w"))
CYL = [(872, -556, "c"), (1066, -540, "c"), (1122, -690, "c"), (936, -716, "c")]
side0.append(path(smooth(CYL), "o w"))
side0.append(path(smooth([(930, -712, "c"), (1124, -686, "c"), (1166, -790, "c"), (1100, -812), (976, -826, "c")]), "o w"))
side0.append(path(smooth([(946, -740), (1060, -726), (1136, -716)], closed=False), "t"))

# ─── tylko prawy, spodnie: tarcza tylna, pokrywa sprzęgła, kolektor ──────────
sideR0 = [
    brake_disc_side(*RA, 132, holes=10, buttons=5),
    caliper_side(*RA, 132, 300, span=40, inner=34, outer=16),
    path(smooth([(790, -372), (880, -346), (970, -370), (1000, -440), (960, -512), (860, -526), (790, -480)]), "d w"),
    circle(890, -440, 48, "t"),
    bent_tube([(1146, -770), (1140, -660), (1122, -560), (1110, -470), (1080, -380), (1030, -320)], 40),
    # rura łącząca spod silnika do tłumika (chowa się za płytą, ramą i wahaczem)
    bent_tube([(800, -292), (660, -300), (580, -360), (546, -450), (532, -546)], 54, "d w"),
]

# ─── tylko lewy, spodnie: zębatka, pokrywa alternatora ───────────────────────
sideL0 = [
    circle(*RA, 116, "d w"), circle(*RA, 104, "t"),
    path(smooth([(800, -380), (900, -342), (1010, -372), (1040, -450), (990, -520), (880, -530), (806, -480)]), "d w"),
    circle(920, -440, 56, "t"),
]
for i in range(5):
    x, y = on_circle(*RA, 70, i * 72 + 10)
    sideL0.append(circle(x, y, 12, "t"))

# ─── BOK: wspólne (prawy bok, przód w +x) ────────────────────────────────────
side = []
# błotnik tylny przy wahaczu
side.append(arc_band(RA, 344, 358, 38, 122))

# amortyzator (górę zakrywa osłona boczna, dół wahacz)
side.append(bent_tube([(560, -770), (534, -630), (510, -500)], 50, "d w"))
for k in range(5):
    t = 0.28 + k * 0.1
    a, b = seg((560, -770), (510, -500), t, 25), seg((560, -770), (510, -500), t, -25)
    side.append(line(a[0], a[1], b[0], b[1], "t"))

# wahacz
sw_top = [seg(PIV, RA, t, o) for t, o in [(-0.02, 58), (0.30, 54), (0.62, 46), (0.92, 40)]]
sw_bot = [seg(PIV, RA, t, o) for t, o in [(0.92, -40), (0.62, -46), (0.30, -52), (-0.02, -54)]]
side.append(path(smooth([
    (*sw_top[0], "c"), *sw_top[1:3], (*sw_top[3], "c"), seg(PIV, RA, 1.07, 0),
    (*sw_bot[0], "c"), *sw_bot[1:3], (*sw_bot[3], "c"), seg(PIV, RA, -0.10, 0),
]), "o w"))
side.append(path(smooth([seg(PIV, RA, 0.14, 22), seg(PIV, RA, 0.5, 18), seg(PIV, RA, 0.84, 14)], closed=False), "t"))
side.append(circle(*RA, 30, "d w"))
side.append(circle(*RA, 13, "d"))

# rama: rura główna, stelaż tylny, płyta wahacza
side.append(bent_tube([(1000, -744), (880, -694), (790, -640), (740, -596)], 44, "d w"))
side.append(bent_tube([(740, -604), (580, -680), (420, -742), (250, -804), (110, -860)], 30, "d w"))
side.append(bent_tube([(820, -730), (770, -640), (700, -548), (650, -470), (636, -392), (650, -350)], 66, "o w"))
side.append(circle(*PIV, 36, "d w"))
side.append(circle(*PIV, 13, "t"))

# płyta pod silnikiem
side.append(path(smooth([
    (1160, -404, "c"), (1158, -330), (1120, -270), (1060, -250, "c"), (760, -250, "c"),
    (724, -268), (712, -298, "c"), (800, -306), (1010, -312), (1092, -332), (1124, -404, "c"),
]), "o w"))
side.append(path(smooth([(1140, -370), (1124, -300), (1060, -272), (780, -272)], closed=False), "t"))
for x in (820, 960):
    side.append(circle(x, -284, 10, "t"))

# błotnik przedni niski i laga USD z zaciskiem
side.append(arc_band(FA, 358, 374, 28, 152, "o w"))
side.append(caliper_side(*FA, 155, 150, span=34, inner=36, outer=18))
side.append(fork_segment(450, 820, 66))
side.append(fork_segment(130, 470, 48, cls="d w"))
side.append(fork_segment(-56, 150, 80))
side.append(path(smooth([fork_pt(20, -30), fork_pt(120, -30)], closed=False), "t"))
side.append(circle(*FA, 24, "d w"))

# gmole: pętla wokół przodu silnika, kończy się na płycie ramy
CB = [(1120, -790), (1182, -700), (1194, -610), (1180, -520), (1150, -458), (1100, -420),
      (1000, -404), (860, -412), (690, -432)]
side.append(bent_tube(CB, 28, "o w"))
side.append(bent_tube([(1006, -408), (996, -480)], 20, "d w"))
side.append(circle(690, -432, 9, "d"))

# osłona boczna pod siedzeniem kierowcy
side.append(path(smooth([
    (860, -884, "c"), (760, -820), (640, -800), (530, -806, "c"), (544, -756), (596, -716, "c"),
    (760, -708), (880, -724), (990, -760, "c"),
]), "o w"))
side.append(path(smooth([(820, -752), (700, -744), (610, -742)], closed=False), "t"))

# zbiornik
side.append(path(smooth([
    (1160, -1126, "c"), (1080, -1118), (990, -1092), (900, -1046), (842, -985), (816, -936, "c"),
    (900, -900), (1100, -940), (1170, -1040, "c"),
]), "o w"))
side.append(path(smooth([(1130, -1104), (1040, -1092), (950, -1058), (880, -1006)], closed=False), "t"))

# osłona przednia boczna: osłona chłodnicy (przód) + boczek zbiornika (tył)
side.append(path(smooth([
    (1330, -1160, "c"), (1270, -1146), (1200, -1112), (1120, -1060), (1030, -1012), (950, -972),
    (890, -944), (846, -926, "c"), (880, -868), (940, -800), (1010, -746), (1100, -706), (1196, -678, "c"),
    (1238, -760), (1290, -860), (1340, -940, "c"),
]), "o w"))
side.append(path(smooth([(1206, -1114), (1156, -900), (1100, -706)], closed=False), "d"))
side.append(path(smooth([(1276, -880, "c"), (1220, -830), (1180, -770, "c"), (1204, -772), (1262, -846)]), "d w"))
side.append(path(smooth([(1110, -990), (1020, -950), (940, -900)], closed=False), "t"))

# siedzenie (kierowca nisko, pasażer wyżej)
# ogon pod siedzeniem pasażera
side.append(path(smooth([
    (560, -790, "c"), (420, -760), (270, -776), (140, -812), (36, -856, "c"), (30, -912, "c"),
    (130, -900), (300, -872), (452, -846), (540, -820),
]), "o w"))
side.append(path(smooth([(480, -786), (300, -800), (110, -858)], closed=False), "t"))

# siedzenie (kierowca nisko, pasażer wyżej)
side.append(path(smooth([
    (848, -958, "c"), (780, -912), (680, -874), (580, -866), (506, -878), (474, -900, "c"), (452, -934),
    (330, -950), (180, -956), (100, -950), (84, -928, "c"), (92, -884, "c"), (250, -862), (420, -838),
    (520, -812), (640, -796), (760, -818), (830, -872, "c"),
]), "o w"))
side.append(path(smooth([(820, -890), (740, -846), (640, -822), (540, -832), (482, -860)], closed=False), "t"))
side.append(path(smooth([(452, -884), (300, -896), (120, -908)], closed=False), "t"))

# błotnik tylny z tablicą i kierunkowskazem (początek chowa się pod lampą)
side.append(path(smooth([
    (-60, -904, "c"), (-150, -862), (-260, -820), (-344, -782, "c"), (-356, -760, "c"),
    (-262, -792), (-150, -838), (-70, -880, "c"),
]), "d w"))
side.append(path(poly([(-366, -798), (-346, -798), (-374, -616), (-394, -616)]), "o w"))
side.append(ellipse(-246, -818, 24, 14, "d w"))

# lampa tylna, uchwyt pasażera, bagażnik
side.append(path(smooth([
    (60, -938, "c"), (-60, -936), (-138, -926, "c"), (-152, -894), (-122, -868, "c"), (0, -876), (50, -900, "c"),
]), "o w"))
side.append(path(smooth([(-138, -926, "c"), (-152, -894), (-122, -868, "c"), (-112, -898)]), "d l"))
side.append(bent_tube([(140, -952), (250, -946), (350, -924), (398, -884)], 26, "d w"))
side.append(path(poly([(-198, -958), (168, -966), (172, -946), (-196, -938)]), "o w"))
for x in (-120, -10, 100):
    side.append(line(x, -940, x - 4, -918, "d"))

# maska z reflektorem
side.append(path(smooth([
    (1300, -1186, "c"), (1408, -1174, "c"), (1432, -1110), (1444, -1030), (1438, -962), (1428, -942, "c"),
    (1374, -932), (1334, -942, "c"), (1314, -1020), (1302, -1110),
]), "o w"))
side.append(path(smooth([(1443, -1088, "c"), (1418, -1078), (1410, -1030), (1418, -990, "c"), (1444, -996, "c")]), "d l"))
# dziób
side.append(path(smooth([
    (1428, -942, "c"), (1530, -914), (1630, -886), (1690, -868), (1708, -854, "c"), (1692, -840, "c"),
    (1600, -838), (1480, -846), (1380, -862), (1340, -880, "c"),
]), "o w"))
side.append(path(smooth([(1660, -864), (1520, -878), (1400, -900)], closed=False), "t"))
# szyba
side.append(path(smooth([
    (1300, -1186, "c"), (1408, -1174, "c"), (1380, -1270), (1340, -1370), (1300, -1440), (1278, -1452, "c"),
    (1258, -1446, "c"), (1272, -1350), (1290, -1260),
]), "o l"))
side.append(path(smooth([(1356, -1200), (1320, -1310), (1282, -1420)], closed=False), "t"))

# kierownica na półce lagi, lusterko, osłona dłoni
side.append(rect(1088, -1134, 96, 24, 8, "d w"))
side.append(bent_tube([(1136, -1132), (1130, -1174)], 30, "d w"))
side.append(bent_tube([(1150, -1176), (1090, -1188), (1030, -1200)], 30, "d w"))
side.append(line(1126, -1200, 1114, -1316, "d"))
side.append(path(smooth([(1090, -1314, "c"), (1144, -1318, "c"), (1152, -1376), (1114, -1396, "c"), (1084, -1372)]), "o w"))
side.append(path(smooth([
    (1030, -1198, "c"), (1092, -1228), (1160, -1248), (1202, -1234), (1212, -1198), (1198, -1164),
    (1160, -1150, "c"), (1108, -1176),
]), "o w"))
side.append(path(smooth([(1070, -1206), (1140, -1228), (1190, -1220)], closed=False), "t"))

# podnóżki
side.append(rect(598, -410, 64, 30, 10, "d w"))
side.append(bent_tube([(432, -742), (392, -630), (362, -566)], 22, "d w"))
side.append(rect(332, -578, 56, 26, 9, "d w"))

# ─── tylko prawy bok: rura łącząca i tłumik, pedał hamulca ───────────────────
MUF0, MUF1 = (520, -556), (80, -762)
MUF_PROF = [(0, 30), (0.1, 50), (0.2, 58), (0.6, 60), (0.96, 60), (1.0, 54)]
sideR = [
    bent_tube([seg(MUF0, MUF1, 0.62, 0), (266, -800)], 22, "d w"),
    muffler(MUF0, MUF1, MUF_PROF),
]
for t in (0.2, 0.86):
    a, b = seg(MUF0, MUF1, t, 58), seg(MUF0, MUF1, t, -58)
    sideR.append(line(a[0], a[1], b[0], b[1], "t"))
sideR.append(ellipse(MUF1[0], MUF1[1], 22, 52, "d w", rot=25))
sideR.append(path(smooth([seg(MUF0, MUF1, 0.24, -34), seg(MUF0, MUF1, 0.5, -38), seg(MUF0, MUF1, 0.82, -38)], closed=False), "t"))
sideR.append(bent_tube([(640, -396), (700, -378), (760, -360)], 16, "d w"))
sideR.append(rect(752, -374, 40, 18, 6, "d w"))

# ─── tylko lewy bok: łańcuch z osłoną, osłona zębatki, zmiana biegów, stopka ─
(u1, u2), (l1, l2) = tangents(FS, 46, RA, 112)
sideL = [
    path(poly([u1, u2, seg(u1, u2, 1, -14), seg(u1, u2, 0, -14)]), "d w"),
    path(poly([l1, l2, seg(l1, l2, 1, 14), seg(l1, l2, 0, 14)]), "d w"),
    path(smooth([seg(u1, u2, 0.08, 8), seg(u1, u2, 0.72, 8), seg(u1, u2, 0.72, 26), seg(u1, u2, 0.08, 30)]), "d w"),
    path(smooth([(730, -500, "c"), (748, -420), (710, -360, "c"), (620, -366), (606, -450, "c")]), "d w"),
    bent_tube([(640, -414), (700, -404), (766, -390)], 16, "d w"),
    rect(760, -404, 18, 34, 6, "d w"),
    bent_tube([(700, -312), (620, -296), (540, -284)], 22, "d w"),
    rect(522, -296, 44, 22, 6, "d w"),
]

# ─── wspólne kształty widoków przód / tył ────────────────────────────────────
SCREEN_F = path(smooth(sym([(0, -1452), (110, -1448), (186, -1428), (178, -1300), (160, -1184, "c"), (0, -1176)])), "o l")
MASK_F = path(smooth(sym([
    (0, -1186), (120, -1180), (166, -1152), (180, -1064), (172, -980), (140, -940, "c"), (0, -934),
])), "o w")
BAR_F = bent_tube([(0, -1190), (200, -1194), (330, -1202), (432, -1214)], 28, "d w", caps=(False, True))
GUARD_F = path(smooth([
    (300, -1190, "c"), (330, -1238), (400, -1262), (458, -1258), (480, -1215), (472, -1166),
    (430, -1146), (360, -1154),
]), "o w")
MIRROR_STALK = line(300, -1212, 330, -1306, "d")
MIRROR_F = path(smooth([(306, -1312, "c"), (432, -1306, "c"), (440, -1352), (420, -1384, "c"), (318, -1388, "c"), (302, -1350)]), "o w")
CRASH_F = bent_tube([(196, -780), (250, -700), (282, -610), (290, -500), (282, -430), (250, -405), (210, -404)], 28, "o w")
ENGINE_F = path(smooth(sym([
    (0, -600), (150, -598), (192, -560), (204, -460), (196, -360), (170, -310, "c"), (0, -300),
])), "o w")
SKID_F = path(smooth(sym([(0, -404), (140, -400), (176, -370, "c"), (168, -280), (132, -250, "c"), (0, -250)])), "o w")
PEG_F = rect(160, -410, 92, 28, 10, "d w")
SHROUD_F = path(smooth([
    (176, -1124, "c"), (214, -1104), (242, -1014), (252, -880), (246, -780), (232, -710),
    (214, -676, "c"), (168, -680, "c"), (170, -800), (174, -930), (172, -1060),
]), "o w")
TANK_F = path(smooth(sym([(0, -1126), (150, -1118), (212, -1072), (238, -990), (230, -940), (0, -930)])), "o w")

# ─── PRZÓD (oś x = 0, lewa strona rysunku = PRAWA strona motocykla) ──────────
front = [mirror_x(MIRROR_STALK, MIRROR_F), mirror_x(BAR_F), mirror_x(GUARD_F)]
front.append(mirror_x(path(smooth([(330, -1178), (400, -1162), (452, -1178)], closed=False), "t")))
front.append(ENGINE_F)
front.append(path(smooth(sym([(0, -570), (110, -568), (140, -530), (150, -420), (130, -340, "c"), (0, -334)])), "t"))
front.append(mirror_x(PEG_F))
front.append(SKID_F)
front.append(mirror_x(path(smooth([(60, -380), (150, -372), (160, -280)], closed=False), "t")))
# tłumik wystaje po prawej (-x) zza silnika, w środku gmola
front.append(path(smooth([(-196, -660, "c"), (-250, -652), (-262, -600), (-246, -548), (-196, -540, "c")]), "d w"))
front.append(mirror_x(CRASH_F))
# chłodnica między osłonami
front.append(rect(-168, -900, 336, 290, 10, "d w"))
for k in range(1, 7):
    y = -900 + k * 41
    front.append(line(-160, y, 160, y, "t"))
front.append(TANK_F)
front.append(mirror_x(SHROUD_F))
front.append(mirror_x(path(smooth([(248, -930), (210, -900), (174, -890)], closed=False), "d")))
# lagi
front.append(mirror_x(
    rect(67, -1080, 58, 330, 8, "d w"),
    rect(73, -766, 46, 300, 4, "d w"),
    rect(62, -482, 68, 182, 10, "d w"),
))
# maska, reflektory, szyba
front.append(MASK_F)
front.append(mirror_x(path(smooth([(18, -1074, "c"), (128, -1090, "c"), (152, -1034), (124, -992, "c"), (24, -1004, "c")]), "d l")))
front.append(SCREEN_F)
front.append(path(smooth([(-150, -1420), (0, -1432), (150, -1420)], closed=False), "t"))
# opona, błotnik, dziób
front.append(tire_end(0, 92, 694, corner=40, lines=2))
front.append(path(smooth(sym([(0, -728), (50, -720), (66, -690), (66, -600), (56, -540, "c"), (0, -528)])), "o w"))
front.append(path(smooth(sym([(0, -946), (110, -936), (124, -906), (102, -862), (60, -842, "c"), (0, -838)])), "o w"))
front.append(line(0, -940, 0, -846, "t"))

# ─── TYŁ (prawa strona rysunku = PRAWA strona motocykla) ─────────────────────
rear = [SCREEN_F, MASK_F, rect(-108, -1252, 216, 80, 16, "d w")]
rear.append(mirror_x(MIRROR_STALK, MIRROR_F, path(smooth([(320, -1322, "c"), (420, -1318, "c"), (426, -1352), (410, -1374, "c"), (330, -1376, "c"), (318, -1348)]), "d l")))
rear += [mirror_x(BAR_F), mirror_x(GUARD_F), mirror_x(CRASH_F), ENGINE_F, SKID_F]
rear.append(mirror_x(SHROUD_F))
rear.append(TANK_F)
rear.append(mirror_x(path(smooth([(214, -1080), (226, -1000), (232, -940)], closed=False), "t")))
rear.append(mirror_x(PEG_F))
# osłony pod siedzeniem
rear.append(path(smooth(sym([(0, -880), (180, -876), (204, -840), (208, -760), (196, -670, "c"), (0, -670)])), "o w"))
# wahacz, zębatka (lewa, -x), tarcza z zaciskiem (prawa, +x)
rear.append(mirror_x(rect(92, -380, 44, 92, 8, "d w")))
rear.append(rect(-118, -450, 10, 232, 3, "d w"))
rear.append(rect(80, -466, 8, 264, 3, "d w"))
rear.append(rect(86, -262, 34, 62, 6, "d w"))
# rura łącząca tłumika (prawa, +x)
rear.append(bent_tube([(100, -296), (156, -360), (186, -460), (196, -560)], 50, "d w"))
rear.append(tire_end(0, 152, 668, corner=60, lines=3))
rear.append(path(smooth(sym([(0, -692), (78, -686), (96, -660), (98, -620, "c"), (0, -626)])), "o w"))
# ogon, siedzenie, bagażnik, lampa, uchwyty
rear.append(path(smooth(sym([(0, -912), (150, -908), (178, -876), (184, -800), (170, -760, "c"), (0, -760)])), "o w"))
rear.append(path(smooth(sym([(0, -956), (132, -952), (152, -924, "c"), (0, -912)])), "o w"))
rear.append(path(smooth(sym([(0, -938), (96, -936), (104, -900), (84, -870, "c"), (0, -868)])), "d l"))
rear.append(mirror_x(bent_tube([(128, -954), (168, -948), (180, -920), (174, -884)], 26, "d w")))
rear.append(rect(-140, -968, 280, 26, 6, "o w"))
# tłumik (prawa strona, +x): końcówka i korpus pod nią
rear.append(path(smooth([
    (200, -822), (256, -808), (262, -760), (260, -620), (244, -546), (200, -536), (156, -546),
    (140, -620), (138, -760), (144, -808),
]), "o w"))
rear.append(circle(200, -762, 52, "d w"))
rear.append(circle(200, -762, 26, "t"))
# uchwyt tablicy, kierunkowskazy, tablica
rear.append(path(poly([(-40, -868), (40, -868), (34, -796), (-34, -796)]), "d w"))
rear.append(mirror_x(line(34, -818, 104, -818, "d"), ellipse(122, -818, 22, 14, "d w")))
rear.append(rect(-104, -798, 208, 182, 10, "o w"))
rear.append(rect(-92, -786, 184, 158, 6, "t"))

# ─── GÓRA (przód w +x, PRAWA strona motocykla po +y) ─────────────────────────
top = []
top.append(rect(-334, -76, 668, 152, 60, "x g"))
top.append(rect(1178, -46, 694, 92, 40, "x g"))
# tłumik (+y)
MT0, MT1 = (520, 196), (80, 206)
top.append(bent_tube([(780, 120), (640, 140), (570, 170), (530, 192)], 54, "d w"))
top.append(muffler(MT0, MT1, MUF_PROF))
for t in (0.2, 0.86):
    a, b = seg(MT0, MT1, t, 58), seg(MT0, MT1, t, -58)
    top.append(line(a[0], a[1], b[0], b[1], "t"))
top.append(ellipse(MT1[0], MT1[1], 14, 52, "d w"))
# podnóżki, gmole
top.append(mirror_y(rect(598, -252, 64, 96, 12, "d w"), rect(332, -226, 56, 80, 12, "d w")))
top.append(mirror_y(bent_tube([(1110, -200), (1182, -262), (1194, -288), (1180, -292), (1100, -282),
                                (1000, -256), (880, -236), (764, -214)], 28, "o w")))
# osłony pod siedzeniem i ogon
top.append(path(smooth(sym_y([(900, 0), (890, -200), (800, -210), (620, -206), (530, -196, "c"), (530, 0)])), "o w"))
top.append(path(smooth(sym_y([(560, 0), (552, -176, "c"), (400, -176), (200, -166), (36, -150, "c"), (30, 0)])), "o w"))
# osłony przednie i zbiornik
top.append(mirror_y(path(smooth([
    (1336, -150, "c"), (1292, -230), (1200, -254), (1080, -252), (960, -234), (880, -204), (846, -176, "c"),
    (900, -150, "c"),
]), "o w")))
top.append(path(smooth(sym_y([
    (1160, 0), (1150, -100), (1110, -170), (1030, -212), (930, -214), (860, -190), (820, -140, "c"), (814, 0),
])), "o w"))
top.append(circle(1040, 0, 42, "d w"))
top.append(circle(1040, 0, 26, "t"))
top.append(mirror_y(path(smooth([(1120, -140), (1020, -176), (900, -164)], closed=False), "t")))
# siedzenie
top.append(path(smooth(sym_y([
    (848, 0), (842, -100, "c"), (770, -150), (660, -172), (540, -168), (476, -158, "c"),
    (330, -152), (180, -140), (100, -112), (84, -60, "c"), (84, 0),
])), "o w"))
top.append(line(476, -156, 476, 156, "d"))
# błotnik tylny, tablica, kierunkowskazy
top.append(path(smooth(sym_y([(-40, 0), (-40, -44, "c"), (-340, -40, "c"), (-356, 0)])), "d w"))
top.append(rect(-394, -104, 30, 208, 4, "o w"))
top.append(mirror_y(line(-246, -42, -246, -100, "d"), ellipse(-246, -118, 16, 22, "d w")))
# bagażnik, uchwyty
top.append(mirror_y(bent_tube([(140, -128), (250, -166), (340, -178), (396, -166)], 26, "d w")))
top.append(rect(-198, -140, 370, 280, 16, "o w"))
for y in (-80, 0, 80):
    top.append(line(-170, y, 140, y, "t"))

# błotnik przedni, dziób, maska
top.append(path(smooth(sym_y([(1858, 0), (1846, -44), (1808, -62), (1700, -64, "c"), (1700, 0)])), "o w"))
top.append(path(smooth(sym_y([
    (1708, 0), (1694, -40), (1610, -72), (1500, -104), (1400, -122), (1334, -122, "c"), (1334, 0),
])), "o w"))
top.append(line(1690, 0, 1360, 0, "t"))
top.append(path(smooth(sym_y([(1444, 0), (1436, -96), (1396, -150), (1330, -176), (1290, -178, "c"), (1290, 0)])), "o w"))
# osłona kokpitu z zegarami, półka lagi, szyba
top.append(path(smooth(sym_y([(1300, 0), (1300, -156, "c"), (1240, -176), (1190, -150), (1180, -100, "c"), (1180, 0)])), "o w"))
top.append(rect(1196, -86, 70, 172, 14, "d w"))
top.append(rect(1088, -124, 96, 248, 22, "d w"))
top.append(mirror_y(circle(1140, -96, 24, "t")))
top.append(path(smooth(sym_y([(1412, 0), (1400, -100), (1370, -160), (1320, -184, "c"), (1262, -186, "c"), (1276, -100), (1286, 0)])), "o l"))
# kierownica, osłony dłoni, lusterka
top.append(bent_tube([(1092, -434), (1114, -350), (1132, -260), (1136, -150), (1136, 0), (1136, 150), (1132, 260),
                      (1114, 350), (1092, 434)], 28, "d w"))
top.append(mirror_y(
    path(smooth([
        (1150, -300, "c"), (1196, -322), (1214, -380), (1200, -446), (1140, -478), (1060, -480),
        (1030, -466, "c"), (1060, -452), (1130, -448), (1172, -420), (1178, -350),
    ]), "o w"),
    line(1126, -290, 1116, -318, "d"),
    path(smooth([(1090, -308, "c"), (1136, -312, "c"), (1148, -436, "c"), (1098, -440, "c")]), "o w"),
))


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
