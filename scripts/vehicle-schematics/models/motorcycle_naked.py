"""Motocykl naked / streetfighter (bez owiewki), sylwetka w typie 900 cm3, silnik rzędowy.

Wymiary (typowe dla klasy): rozstaw osi 1430, długość ~2090, wysokość 1190 (lusterka),
szerokość 800 (kierownica z ciężarkami), siodło 825, prześwit 140.
Koła 17": przód 120/70 (r 300), tył 180/55 (r 315). Widelec USD, kąt główki 25 st.
Krótki tłumik boczny po PRAWEJ, łańcuch po LEWEJ.
"""
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from lib import *  # noqa: E402,F403

RA = (0, -315)      # oś tylna
RR, RRIM = 315, 216
FA = (1430, -300)   # oś przednia
FR, FRIM = 300, 216
RAKE = 25


def fk(t, off=0.0, c=False):
    """Punkt w układzie lagi: t w górę wzdłuż osi widelca, off do przodu (prostopadle)."""
    p = along(FA, RAKE, t, off)
    return (*p, "c") if c else p


def fork_band(t0, t1, w0, w1=None, cls="o w"):
    return band(FA, RAKE, t0, t1, w0, w1, cls)


CYL_O = (780, -335)   # oś wału korbowego
CYL_A = 25            # pochylenie cylindrów do przodu


def cy(t, s, c=False):
    """Punkt w układzie cylindra: t w górę wzdłuż osi cylindra, s do przodu."""
    a = math.radians(CYL_A)
    p = (CYL_O[0] + math.sin(a) * t + math.cos(a) * s, CYL_O[1] - math.cos(a) * t + math.sin(a) * s)
    return (*p, "c") if c else p


def _bez(p0, c1, c2, p1, t):
    m = 1 - t
    return (
        m ** 3 * p0[0] + 3 * m * m * t * c1[0] + 3 * m * t * t * c2[0] + t ** 3 * p1[0],
        m ** 3 * p0[1] + 3 * m * m * t * c1[1] + 3 * m * t * t * c2[1] + t ** 3 * p1[1],
    )


def sample(points, n=12, tension=0.5):
    """Punkty na otwartej krzywej smooth() (ta sama konstrukcja Catmull-Rom)."""
    pts = [(p[0], p[1]) for p in points]
    N = len(pts)
    k = tension / 3.0

    def get(i):
        return pts[max(0, min(N - 1, i))]

    out = [pts[0]]
    for i in range(N - 1):
        p0, p1, p2, p3 = get(i - 1), get(i), get(i + 1), get(i + 2)
        c1 = (p1[0] + (p2[0] - p0[0]) * k, p1[1] + (p2[1] - p0[1]) * k)
        c2 = (p2[0] - (p3[0] - p1[0]) * k, p2[1] - (p3[1] - p1[1]) * k)
        for j in range(1, n + 1):
            out.append(_bez(p1, c1, c2, p2, j / n))
    return out


def ctube(points, w0, w1=None, cls="d w"):
    """Rura po gładkiej krzywej przez punkty, średnica w0 -> w1."""
    w1 = w0 if w1 is None else w1
    s = sample(points)
    acc = [0.0]
    for i in range(1, len(s)):
        acc.append(acc[-1] + math.hypot(s[i][0] - s[i - 1][0], s[i][1] - s[i - 1][1]))
    left, right = [], []
    for i, p in enumerate(s):
        a = s[max(0, i - 1)]
        b = s[min(len(s) - 1, i + 1)]
        dx, dy = b[0] - a[0], b[1] - a[1]
        ln = math.hypot(dx, dy) or 1
        nx, ny = -dy / ln, dx / ln
        w = w0 + (w1 - w0) * acc[i] / acc[-1]
        left.append((p[0] + nx * w / 2, p[1] + ny * w / 2))
        right.append((p[0] - nx * w / 2, p[1] - ny * w / 2))
    return path(poly(left + right[::-1]), cls)


def ext_tangent(c1, r1, c2, r2, upper=True):
    """Zewnętrzna styczna dwóch okręgów (łańcuch): punkty styku na c1 i c2."""
    dx, dy = c2[0] - c1[0], c2[1] - c1[1]
    d = math.hypot(dx, dy)
    ux, uy = dx / d, dy / d
    a = math.acos((r1 - r2) / d) * (1 if upper else -1)
    # obrót wektora kierunku; w SVG y w dół, "górna" styczna ma y mniejsze
    nx = ux * math.cos(a) + uy * math.sin(a)
    ny = -ux * math.sin(a) + uy * math.cos(a)
    return (c1[0] + nx * r1, c1[1] + ny * r1), (c2[0] + nx * r2, c2[1] + ny * r2)


def arcband(c, a0, a1, r_out, r_in, n=5):
    """Wycinek pierścienia (błotnik, nadkole) od kąta a0 do a1."""
    o = [on_circle(*c, r_out, a0 + (a1 - a0) * i / (n - 1)) for i in range(n)]
    i_ = [on_circle(*c, r_in, a1 - (a1 - a0) * i / (n - 1)) for i in range(n)]
    o = [(*o[0], "c")] + o[1:-1] + [(*o[-1], "c")]
    i_ = [(*i_[0], "c")] + i_[1:-1] + [(*i_[-1], "c")]
    return smooth(o + i_)


IND = (1266, -806)    # przedni kierunkowskaz (pod reflektorem, na wysięgniku)

# ═══ BOK: warstwa spodnia (koła, tarcze) ═══════════════════════════════════════
side0 = [
    wheel_side(*RA, RR, RRIM, "split5", rot=30),
    wheel_side(*FA, FR, FRIM, "split5", rot=-6),
    brake_disc_side(*FA, 160, holes=12, buttons=6),
    circle(*FA, 40, "d w"),
]
# prawy bok: tylna tarcza i zacisk (pod wahaczem)
sideR0 = [
    brake_disc_side(*RA, 122, holes=10, buttons=5),
    caliper_side(*RA, 122, 300, span=38, inner=34, outer=16),
]
# lewy bok: zębatka i łańcuch (wahacz z warstwy wspólnej przykryje środek łańcucha)
FS = (690, -430)    # zębatka zdawcza
sideL0 = [circle(*RA, 112, "d w"), circle(*RA, 102, "t")]
for i in range(5):
    x, y = on_circle(*RA, 66, i * 72 + 10)
    sideL0.append(circle(x, y, 11, "t"))
(u1, u2) = ext_tangent(RA, 110, FS, 44, upper=True)
(l1, l2) = ext_tangent(RA, 110, FS, 44, upper=False)
for (p, q) in ((u1, u2), (l1, l2)):
    sideL0.append(tube(p, q, 18, 18, "d w", round_end=False))

# ═══ BOK: wspólne (prawy bok, przód w +x) ══════════════════════════════════════
side = []

# nadkole tylne na wahaczu (z nóżką do wahacza)
side.append(path(smooth([
    (*on_circle(*RA, 340, 34), "c"), on_circle(*RA, 342, 60), on_circle(*RA, 342, 90),
    (*on_circle(*RA, 338, 116), "c"), (*on_circle(*RA, 326, 116), "c"), on_circle(*RA, 328, 90),
    on_circle(*RA, 328, 62), (*on_circle(*RA, 326, 44), "c"), (226, -414, "c"), (264, -424, "c"),
]), "d w"))

# wahacz
side.append(path(smooth([
    (612, -510, "c"), (480, -482), (310, -432), (130, -382), (40, -366, "c"),
    (-24, -356), (-48, -318), (-30, -284), (30, -276, "c"),
    (190, -304), (370, -348), (520, -386), (602, -396, "c"),
    (652, -418), (664, -462), (646, -498),
]), "o w"))
side.append(path(smooth([(560, -470), (330, -410), (120, -356), (40, -342)], closed=False), "t"))
side.append(path(smooth([(-6, -346, "c"), (40, -350), (52, -316), (40, -282), (-6, -286, "c")]), "t"))
side.append(circle(*RA, 26, "d w"))
side.append(circle(*RA, 12, "d"))

# ─── wydech: kolektory (przed silnikiem i pod nim) ───
side.append(path(smooth([
    (560, -206, "c"), (800, -212, "c"), (822, -186), (806, -144, "c"), (580, -142, "c"), (552, -170),
]), "d w"))
for pts, w in (
    ([(1016, -506), (1032, -450), (1032, -380), (1016, -316), (986, -262), (940, -226), (872, -206), (812, -204)], 34),
    ([(1028, -512), (1050, -460), (1054, -386), (1040, -316), (1008, -254), (956, -212), (884, -192), (812, -188)], 36),
    ([(1040, -518), (1068, -466), (1076, -390), (1064, -312), (1030, -244), (972, -198), (892, -176), (812, -172)], 38),
):
    side.append(ctube([cy(262, 100)] + pts, w))

# ─── silnik: jedna bryła (skrzynia korbowa + cylindry + głowica + pokrywa zaworów) ───
# airbox i przepustnice nad głowicą, pod ramą
side.append(path(smooth([
    (694, -600, "c"), cy(235, -100, True), cy(382, 0, True), (1000, -750, "c"), (964, -800, "c"), (712, -752, "c"),
]), "d w"))
side.append(path(smooth([(712, -704), (800, -720), (906, -754)], closed=False), "t"))
side.append(path(smooth([
    (626, -300), (628, -400), (648, -472), (690, -520), (744, -532, "c"), cy(187, -70, True), cy(235, -70, True),
    cy(235, -100, True), cy(318, -100, True), cy(332, -94), cy(358, -84), cy(376, -56), cy(382, 0),
    cy(376, 56), cy(358, 84), cy(332, 94), cy(318, 100, True), cy(235, 100, True), cy(235, 70, True),
    cy(110, 70, True), (908, -372), (928, -316), (934, -252), (920, -204), (880, -180), (820, -174, "c"),
    (690, -174, "c"), (650, -194), (630, -240),
]), "o w"))
side.append(path(poly([cy(235, -100), cy(235, 100)], closed=False), "d"))
side.append(path(poly([cy(318, -100), cy(318, 100)], closed=False), "d"))
side.append(path(poly([cy(110, -70), cy(110, 70)], closed=False), "t"))
side.append(path(poly([cy(172, -70), cy(172, 70)], closed=False), "t"))
side.append(path(smooth([(632, -296), (740, -290), (860, -288), (932, -290)], closed=False), "t"))

# chłodnica (dół widoczny pod osłoną)
side.append(path(poly([(1150, -520), (1106, -836), (1030, -836), (1074, -520)]), "o w"))
side.append(path(poly([(1122, -520), (1078, -836)], closed=False), "d"))
side.append(path(poly([(1138, -534), (1096, -822)], closed=False), "t"))

# ─── rama kratownicowa ───
U0, U1 = (1000, -885), (728, -845)
L0 = (1012, -800)
R0, R1 = U1, (668, -590)
L1 = (696, -720)


def lerp(a, b, t):
    return (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)


nodes = [U0, lerp(L0, L1, 0.25), lerp(U0, U1, 0.5), lerp(L0, L1, 0.75), U1]
for a, b in zip(nodes, nodes[1:]):
    side.append(tube(a, b, 24, 24, "d w", round_end=False))
side.append(tube(L0, L1, 28, 28, "d w", round_end=False))
side.append(tube(U0, U1, 28, 28, "d w", round_end=False))
side.append(tube(R0, R1, 30, 30, "d w", round_end=False))
# płyta wahacza (odlew)
side.append(path(smooth([
    (692, -616, "c"), (680, -540), (664, -470), (636, -414), (596, -398), (558, -424), (556, -476),
    (590, -560), (640, -616, "c"),
]), "o w"))
side.append(circle(600, -450, 30, "d w"))
side.append(circle(600, -450, 13, "d"))
# rama pomocnicza (widoczna pod siedzeniem)
side.append(tube((664, -606), (380, -780), 26, 26, "d w", round_end=False))

# ─── ogon, siedzenia ───
# osłona boczna pod siedzeniem + kuper
side.append(path(smooth([
    (736, -862, "c"), (690, -790, "c"), (600, -766), (480, -764), (380, -778), (280, -812), (180, -860),
    (80, -912), (-20, -956), (-112, -988, "c"), (-124, -1014, "c"), (-80, -1010), (0, -996),
    (80, -978), (165, -960, "c"), (300, -900), (460, -860), (600, -830),
]), "o w"))
side.append(path(smooth([(392, -778), (372, -830), (362, -880)], closed=False), "d"))
side.append(path(smooth([(372, -800), (260, -842), (140, -900), (20, -952), (-60, -986)], closed=False), "t"))
side.append(path(smooth([(-112, -988, "c"), (-124, -1014, "c"), (-84, -994), (-62, -966, "c")]), "d l"))
# siedzenie pasażera
side.append(path(smooth([
    (464, -846, "c"), (456, -892, "c"), (380, -904), (300, -922), (220, -944), (165, -960, "c"),
    (172, -922, "c"), (260, -900), (360, -874), (460, -842, "c"),
]), "o w"))
# siedzenie kierowcy
side.append(path(smooth([
    (750, -928, "c"), (706, -878), (640, -845), (560, -827), (500, -830), (464, -846, "c"),
    (460, -800, "c"), (540, -792), (640, -806), (712, -846), (740, -886, "c"),
]), "o w"))
side.append(path(smooth([(710, -862), (630, -826), (550, -812), (474, -814)], closed=False), "t"))

# uchwyt tablicy, kierunkowskaz, tablica
side.append(path(smooth([
    (50, -922, "c"), (-30, -954, "c"), (-180, -860), (-296, -782, "c"), (-288, -758, "c"),
    (-170, -826), (-20, -902),
]), "d w"))
side.append(path(poly([(-306, -778), (-294, -776), (-344, -596), (-356, -598)]), "o w"))
side.append(line(-232, -830, -232, -812, "d"))
side.append(ellipse(-232, -810, 24, 15, "d w"))

# ─── zbiornik ───
side.append(path(smooth([
    (1052, -1062, "c"), (1010, -1086), (940, -1096), (868, -1086), (812, -1050), (774, -992), (752, -934),
    (742, -904, "c"), (820, -888), (920, -892), (1000, -912), (1046, -940, "c"),
]), "o w"))
# pokrywa górna zbiornika / bok zbiornika, wgłębienie na kolano
side.append(path(smooth([(1046, -1044), (960, -1050), (880, -1036), (820, -1000), (786, -944)], closed=False), "d"))
side.append(path(smooth([(940, -900, "c"), (900, -960), (830, -976), (790, -930, "c")], closed=False), "t"))

# ─── błotnik przedni ───
side.append(path(arcband(FA, 28, 128, 332, 314, n=6), "o w"))
side.append(path(smooth([on_circle(*FA, 323, 42), on_circle(*FA, 323, 80), on_circle(*FA, 323, 116)], closed=False), "t"))

# ─── zegary, mikroszybka (podstawa schowana za reflektorem), reflektor ───
side.append(path(poly([fk(738, -6), fk(800, -12), fk(806, 46), fk(744, 56)]), "d w"))
side.append(path(smooth([
    fk(652, 60, True), fk(656, 126, True), fk(744, 112), fk(784, 96, True), fk(782, 64, True), fk(740, 62),
]), "o l"))
side.append(path(smooth([
    fk(540, 30, True), fk(536, 96), fk(552, 134), fk(600, 148), fk(650, 144), fk(674, 116),
    fk(678, 30, True),
]), "o w"))
side.append(path(smooth([fk(562, 132, True), fk(604, 142), fk(646, 136, True), fk(640, 112), fk(570, 112)]), "d l"))

# ─── zacisk, widelec USD, półki ───
side.append(caliper_side(*FA, 160, 165, span=36, inner=38, outer=18))
side.append(path(smooth([
    fk(-46, -30, True), fk(-46, 30, True), fk(60, 36), fk(128, 26, True), fk(128, -26, True), fk(60, -40),
]), "o w"))
side.append(fork_band(120, 342, 44, 44, "d w"))
side.append(fork_band(330, 792, 60, 60, "o w"))
side.append(fork_band(330, 356, 64, 64, "d w"))
side.append(path(poly([fk(596, -78), fk(630, -78), fk(630, 34), fk(596, 34)]), "d w"))
side.append(path(poly([fk(750, -86), fk(780, -86), fk(780, 34), fk(750, 34)]), "d w"))
side.append(path(poly([fk(792, -22), fk(804, -16), fk(804, 16), fk(792, 22)]), "d w"))
side.append(circle(*FA, 22, "d w"))
side.append(circle(*FA, 9, "d"))
# kierunkowskaz przedni
side.append(ellipse(*IND, 20, 13, "d w", rot=-10))

# ─── osłona chłodnicy (nakładka zbiornika) ───
side.append(path(smooth([
    (1040, -1056, "c"), (1100, -1008), (1142, -930, "c"), (1160, -820), (1168, -710), (1160, -606, "c"),
    (1120, -626), (1060, -676), (1000, -740), (956, -822, "c"), (968, -880), (1000, -930),
]), "o w"))
side.append(path(smooth([
    (1160, -606, "c"), (1120, -626), (1060, -676), (1000, -740), (956, -822, "c"),
    (998, -818, "c"), (1050, -750), (1104, -694), (1156, -664, "c"),
]), "d w"))
side.append(path(smooth([(1060, -1012), (1104, -930, "c"), (1122, -820), (1120, -730)], closed=False), "d"))

# kierownica, manetka, dźwignia, lusterko
side.append(path(smooth([(1044, -1004, "c"), (1074, -1010, "c"), (1074, -1066, "c"), (1046, -1062, "c")]), "d w"))
side.append(ctube([(1062, -1062), (1030, -1078), (990, -1096)], 26))
side.append(ctube([(1018, -1086), (996, -1096), (976, -1104)], 36))
side.append(circle(970, -1106, 17, "d w"))
side.append(ctube([(1042, -1090), (1012, -1078), (986, -1074)], 12))
side.append(ctube([(1030, -1096), (1038, -1118), (1046, -1138)], 12))
side.append(path(smooth([
    (1006, -1150), (1030, -1184), (1068, -1190), (1094, -1170), (1088, -1140, "c"), (1016, -1134, "c"),
]), "o w"))

# podnóżki i wsporniki
side.append(path(smooth([
    (452, -760, "c"), (418, -640), (370, -528), (334, -500, "c"), (348, -540), (390, -650), (420, -772, "c"),
]), "d w"))
side.append(circle(350, -508, 16, "d w"))
side.append(path(smooth([
    (660, -600, "c"), (664, -530), (590, -430), (532, -374, "c"), (508, -392), (566, -476), (618, -572, "c"),
]), "d w"))
side.append(circle(522, -382, 18, "d w"))

# ═══ tylko prawy bok: pokrywy silnika, pedał hamulca, tłumik, zbiorniczek ════════
MA, MB = (600, -212), (400, -292)   # oś tłumika
_md = (MB[0] - MA[0], MB[1] - MA[1])
_ml = math.hypot(*_md)
_mu = (_md[0] / _ml, _md[1] / _ml)
_mn = (_mu[1], -_mu[0])             # prostopadle, w górę


def mpt(t, s):
    return (MA[0] + _md[0] * t + _mn[0] * s, MA[1] + _md[1] * t + _mn[1] * s)


sideR = [
    circle(708, -392, 82, "d w"),
    circle(708, -392, 64, "t"),
    circle(860, -290, 50, "d w"),
    circle(860, -290, 36, "t"),
    path(smooth([(522, -396), (592, -360, "c"), (664, -348, "c")], closed=False), "d"),
    path(poly([(652, -356), (690, -354), (690, -340), (652, -342)]), "d w"),
    # tłumik: stożek z kolektora i krótka puszka ze skośnym wylotem
    path(smooth([(*mpt(-0.3, 26), "c"), (*mpt(0.02, 58), "c"), (*mpt(0.02, -58), "c"), (*mpt(-0.3, -26), "c")]), "d w"),
    path(smooth([
        (*mpt(0, 60), "c"), (*mpt(0.9, 66), "c"), mpt(1.04, 40), (*mpt(1.08, -10), "c"),
        (*mpt(0.96, -66), "c"), (*mpt(0, -60), "c"),
    ]), "o w"),
    path(poly([mpt(0.1, 60), mpt(0.1, -60)], closed=False), "t"),
    path(poly([mpt(0.9, 66), mpt(0.96, -66)], closed=False), "d"),
    ellipse(*mpt(1.0, 4), 13, 30, "d", rot=18),
    path(poly([(1044, -1078), (1070, -1078), (1068, -1112), (1046, -1110)]), "d w"),
]

# ═══ tylko lewy bok: pokrywa alternatora, osłona zębatki, zmiana biegów, stopka ══
sideL = [
    circle(820, -322, 76, "d w"),
    circle(820, -322, 58, "t"),
    path(smooth([(736, -512, "c"), (754, -440), (730, -380, "c"), (660, -384), (646, -458, "c")]), "d w"),
    path(smooth([(450, -470, "c"), (300, -446), (160, -414, "c"), (166, -430), (300, -462), (450, -488, "c")]), "d w"),
    path(smooth([(522, -396), (592, -368, "c"), (664, -372, "c")], closed=False), "d"),
    circle(668, -372, 10, "d w"),
    # stopka boczna (złożona)
    path(poly([(646, -262), (470, -238), (468, -222), (648, -246)]), "d w"),
    path(poly([(484, -248), (452, -244), (450, -212), (482, -216)]), "d w"),
]

# ═══ PRZÓD (oś x = 0; lewa strona rysunku = PRAWA strona motocykla) ══════════════
def crankcase_end(right=-1):
    """Skrzynia korbowa od przodu/tyłu; right = znak x prawej strony motocykla w danym widoku."""
    out = [path(smooth(sym([
        (0, -505), (170, -502, "c"), (188, -446), (194, -340), (186, -262), (156, -206),
        (112, -178, "c"), (0, -174),
    ])), "o w")]
    # pokrywa sprzęgła (prawa) i alternatora (lewa)
    out.append(path(smooth([(186 * right, -478, "c"), (212 * right, -452), (216 * right, -390),
                            (206 * right, -320), (190 * right, -306, "c")]), "d w"))
    out.append(path(smooth([(-188 * right, -402, "c"), (-206 * right, -376), (-210 * right, -322),
                            (-200 * right, -258), (-186 * right, -248, "c")]), "d w"))
    return "".join(out)


def muffler_end(right=-1):
    pts = [(100, -250), (112, -330), (150, -362), (200, -366), (238, -332), (246, -250), (236, -180),
           (196, -150), (140, -152), (108, -190)]
    return path(smooth([(x * right, y) for x, y in pts]), "o w")


def tank_end():
    return path(smooth(sym([
        (0, -1092), (112, -1084), (168, -1048), (188, -980), (186, -910), (172, -886, "c"), (0, -882),
    ])), "o w")


def shroud_end():
    return mirror_x(
        path(smooth([
            (150, -1046, "c"), (200, -1022), (234, -964), (246, -884), (240, -774), (224, -680),
            (206, -606, "c"), (190, -630), (186, -760), (186, -900), (176, -990),
        ]), "o w"),
        path(smooth([(196, -1004), (220, -940), (226, -850), (220, -750), (206, -664)], closed=False), "d"),
    )


def bar_end(rear=False):
    out = [rect(30, -1070, 34, 64, 6, "d w")]   # podstawka kierownicy na półce
    out.append(ctube([(0, -1062), (120, -1068), (240, -1084), (330, -1100), (386, -1106)], 26))
    out.append(ctube([(286, -1098), (330, -1102), (384, -1106)], 36))
    out.append(circle(392, -1106, 12, "d w"))
    out.append(ctube([(255, -1094), (288, -1114), (318, -1136)], 12))
    out.append(path(smooth([
        (262, -1150), (290, -1184), (350, -1190), (394, -1176), (400, -1150), (384, -1134, "c"),
        (276, -1132, "c"),
    ]), "o w"))
    if rear:
        out.append(path(smooth([(278, -1148), (300, -1176), (350, -1180), (386, -1168), (390, -1150),
                                (378, -1142, "c"), (286, -1140, "c")]), "d l"))
    return "".join(out)


FLY = path(smooth(sym([(0, -1050), (52, -1046, "c"), (78, -972, "c"), (0, -968)])), "o l")
IND_Y = IND[1]

front = []
front.append(tire_end(0, 180, 630, corner=72, lines=0))
front.append(muffler_end(-1))
front.append(mirror_x(rect(162, -390, 76, 24, 12, "d w")))
front.append(rect(-128, -210, 256, 68, 22, "d w"))
front.append(crankcase_end(-1))
front.append(tank_end())
# kierownica i lusterka (prawa strona -x: zbiorniczek płynu)
front.append(mirror_x(bar_end()))
front.append(mirror_x(ctube([(240, -1080), (300, -1080), (378, -1078)], 12)))
front.append(path(poly([(-150, -1078), (-196, -1078), (-192, -1112), (-154, -1112)]), "d w"))
# kolektory wydechowe
for x in (52, 150):
    front.append(mirror_x(ctube([(x, -540), (x * 1.04, -450), (x * 0.94, -330), (x * 0.72, -230),
                                 (x * 0.56, -186)], 42)))
# chłodnica i osłony
front.append(rect(-190, -840, 380, 344, 14, "o w"))
front.append(rect(-174, -826, 348, 316, 8, "t"))
for y in (-760, -690, -620, -550):
    front.append(line(-174, y, 174, y, "t"))
front.append(shroud_end())
# półki
front.append(rect(-142, -1016, 284, 48, 14, "d w"))
front.append(rect(-142, -884, 284, 46, 14, "d w"))
# tarcze, widelec
front.append(mirror_x(rect(68, -462, 10, 324, 3, "d w")))
front.append(mirror_x(
    rect(75, -1028, 60, 432, 8, "o w"),
    rect(75, -620, 60, 22, 4, "d w"),
    rect(83, -600, 44, 196, 4, "d w"),
    rect(69, -416, 72, 162, 14, "o w"),
))
front.append(tire_end(0, 120, 600, corner=50, lines=3))
# błotnik przedni
front.append(path(smooth(sym([(0, -636), (56, -630), (74, -600), (76, -470), (66, -444, "c"), (0, -438)])), "o w"))
front.append(path(smooth([(-56, -600), (0, -610), (56, -600)], closed=False), "t"))
# reflektor, mikroszybka, kierunkowskazy
front.append(path(smooth(sym([
    (0, -962), (80, -958, "c"), (108, -932), (112, -872), (96, -828), (60, -804, "c"), (0, -800),
])), "o w"))
front.append(path(smooth(sym([(0, -948), (70, -944, "c"), (94, -922), (96, -876), (82, -842, "c"), (0, -836)])), "d l"))
front.append(path(smooth([(-82, -842), (0, -852), (82, -842)], closed=False), "t"))
front.append(path(smooth([(-70, -944), (-58, -908), (0, -900), (58, -908), (70, -944)], closed=False), "t"))
front.append(FLY)
front.append(mirror_x(line(96, IND_Y, 150, IND_Y, "d"), ellipse(168, IND_Y, 20, 14, "d w")))

# ═══ TYŁ (prawa strona rysunku = PRAWA strona motocykla) ══════════════════════════
rear = []
rear.append(path(smooth(sym([(0, -1050), (52, -1046, "c"), (78, -972, "c"), (0, -968)])), "o w"))
rear.append(mirror_x(bar_end(rear=True)))
rear.append(path(poly([(150, -1078), (196, -1078), (192, -1112), (154, -1112)]), "d w"))
rear.append(shroud_end())
rear.append(tank_end())
rear.append(path(smooth([(-150, -1030), (-80, -1060), (0, -1066), (80, -1060), (150, -1030)], closed=False), "t"))
# silnik
rear.append(path(poly([(-168, -500), (-168, -560), (168, -560), (168, -500)]), "o w"))
rear.append(path(smooth(sym([(0, -716), (140, -712), (152, -690, "c"), (178, -688, "c"), (178, -560, "c"), (0, -560)])), "o w"))
rear.append(line(-152, -690, 152, -690, "t"))
rear.append(rect(-128, -210, 256, 68, 22, "d w"))
rear.append(crankcase_end(1))
# płyty ramy, podnóżki kierowcy
rear.append(mirror_x(rect(140, -866, 34, 460, 14, "d w")))
rear.append(mirror_x(rect(162, -390, 76, 24, 12, "d w")))
# tłumik (prawa = +x)
rear.append(muffler_end(1))
rear.append(ellipse(172, -280, 58, 62, "d w"))
rear.append(ellipse(172, -280, 24, 26, "d k"))
# podnóżki pasażera z wspornikami
rear.append(mirror_x(
    path(poly([(140, -760), (160, -760), (170, -516), (150, -516)]), "d w"),
    rect(146, -518, 70, 22, 11, "d w"),
))
# wahacz, zębatka (lewa), zacisk (prawa)
rear.append(mirror_x(rect(112, -516, 40, 246, 14, "o w")))
rear.append(rect(-108, -424, 12, 218, 3, "d w"))
rear.append(rect(86, -252, 40, 82, 8, "d w"))
rear.append(tire_end(0, 180, 630, corner=72, lines=4))
rear.append(path(smooth(sym([(0, -656), (82, -650), (100, -628), (100, -600, "c"), (0, -604)])), "d w"))
# osłony boczne, siedzenie kierowcy, siedzenie pasażera, kuper
rear.append(path(smooth(sym([(0, -868), (138, -864), (152, -810), (146, -762, "c"), (0, -762)])), "o w"))
rear.append(path(smooth(sym([(0, -930), (106, -926), (150, -884), (166, -830), (160, -798, "c"), (0, -798)])), "o w"))
rear.append(path(smooth(sym([(0, -962), (78, -958), (106, -932), (116, -874), (110, -846, "c"), (0, -846)])), "o w"))
rear.append(path(smooth(sym([
    (0, -1016), (48, -1014), (88, -992), (110, -944), (114, -892), (104, -870, "c"), (0, -870),
])), "o w"))
rear.append(path(smooth(sym([(0, -1008), (44, -1006, "c"), (60, -986, "c"), (0, -984)])), "d l"))
rear.append(path(smooth([(-108, -930), (0, -944), (108, -930)], closed=False), "t"))
# uchwyt tablicy, kierunkowskazy, tablica
rear.append(path(smooth(sym([(0, -900), (54, -896, "c"), (44, -770, "c"), (0, -770)])), "d w"))
rear.append(mirror_x(line(48, -810, 130, -810, "d"), ellipse(150, -810, 22, 15, "d w")))
rear.append(rect(-106, -778, 212, 176, 10, "o w"))
rear.append(rect(-94, -766, 188, 152, 6, "t"))

# ═══ GÓRA (przód w +x, PRAWA strona motocykla po +y) ═════════════════════════════
IND_X = IND[0]
top = []
top.append(rect(-315, -90, 630, 180, 70, "x g"))
top.append(rect(1130, -60, 600, 120, 48, "x g"))
# zębatka i łańcuch (lewa, -y), tarcza tylna (prawa, +y), tarcze przednie
top.append(rect(-112, -110, 224, 12, 4, "d w"))
top.append(rect(0, -112, 690, 14, 6, "d w"))
top.append(rect(-122, 98, 244, 10, 4, "d w"))
top.append(mirror_y(rect(1270, -82, 320, 10, 4, "d w")))
# tłumik (prawa, +y)
top.append(tube((670, 50), (600, 130), 50, 50, "d w", round_end=False))
top.append(path(smooth([
    (604, 106, "c"), (420, 120, "c"), (396, 150), (396, 200), (410, 236, "c"), (604, 222, "c"),
]), "o w"))
top.append(line(420, 120, 410, 236, "d"))
# wahacz
top.append(mirror_y(rect(-48, -152, 700, 40, 16, "o w")))
# nadkole tylne
top.append(path(smooth(sym_y([(280, 0), (276, -70), (250, -100, "c"), (-110, -100, "c"), (-146, -80), (-152, 0)])), "d w"))
# podnóżki, pedał hamulca (+y), dźwignia zmiany biegów (-y)
top.append(mirror_y(rect(506, -238, 32, 72, 12, "d w"), rect(336, -216, 30, 66, 12, "d w")))
top.append(ctube([(540, 184), (600, 192), (664, 182)], 18))
top.append(ctube([(540, -184), (600, -194), (664, -186)], 18))
# silnik: pokrywa sprzęgła (+y) i alternatora (-y)
top.append(rect(626, -194, 310, 388, 40, "o w"))
top.append(rect(628, 170, 160, 50, 22, "d w"))
top.append(rect(748, -212, 146, 46, 22, "d w"))
# widelec
top.append(mirror_y(
    rect(1095, -134, 196, 58, 10, "o w"),
    rect(1286, -127, 94, 44, 6, "d w"),
    rect(1352, -141, 130, 72, 18, "d w"),
))
top.append(path(smooth(sym_y([(1722, 0), (1712, -40), (1670, -64), (1300, -70, "c"), (1226, -62, "c"), (1222, 0)])), "o w"))
top.append(path(smooth([(1690, 0), (1290, 0)], closed=False), "t"))
# osłony boczne + kuper, siedzenia
top.append(path(smooth(sym_y([
    (736, 0), (734, -150, "c"), (600, -156), (470, -150), (380, -140), (280, -122), (165, -104),
    (60, -86), (-40, -68), (-110, -52), (-124, -40, "c"), (-124, 0),
])), "o w"))
top.append(path(smooth(sym_y([(-104, 0), (-104, -46, "c"), (-124, -40, "c"), (-124, 0)])), "d l"))
top.append(mirror_y(path(smooth([(392, -140), (372, -110), (362, -96)], closed=False), "d")))
top.append(path(smooth(sym_y([(464, 0), (460, -116, "c"), (380, -112), (280, -104), (200, -96), (165, -90, "c"), (165, 0)])), "o w"))
top.append(path(smooth(sym_y([(750, 0), (746, -126, "c"), (690, -150), (600, -164), (520, -160), (464, -136, "c"), (462, 0)])), "o w"))
# uchwyt tablicy, kierunkowskazy, tablica
top.append(rect(-300, -40, 190, 80, 10, "d w"))
top.append(mirror_y(line(-232, -40, -232, -130, "d"), ellipse(-232, -150, 15, 22, "d w")))
top.append(rect(-356, -106, 62, 212, 4, "o w"))
top.append(rect(-346, -94, 42, 188, 3, "t"))
# osłony chłodnicy, zbiornik
top.append(mirror_y(path(smooth([
    (1060, -120, "c"), (1150, -170), (1176, -210), (1160, -244), (1080, -256), (1000, -240),
    (966, -200, "c"), (1010, -170),
]), "o w")))
top.append(mirror_y(path(smooth([(1150, -196), (1080, -228), (1000, -222)], closed=False), "t")))
top.append(path(smooth(sym_y([
    (1050, 0), (1044, -110), (1012, -164), (950, -190), (870, -184), (790, -152), (744, -124, "c"), (740, 0),
])), "o w"))
top.append(circle(940, 0, 40, "d w"))
top.append(circle(940, 0, 24, "t"))
top.append(mirror_y(path(smooth([(1010, -130), (920, -150), (820, -130)], closed=False), "t")))
# reflektor, kierunkowskazy
top.append(mirror_y(line(IND_X, -96, IND_X, -150, "d"), ellipse(IND_X, -168, 14, 20, "d w")))
top.append(path(smooth(sym_y([(1320, 0), (1314, -70), (1290, -104), (1220, -110, "c"), (1176, -100, "c"), (1172, 0)])), "o w"))
top.append(path(smooth([(1312, -72), (1322, 0), (1312, 72)], closed=False), "d"))
# półka górna, zegary, mikroszybka
top.append(rect(1028, -140, 108, 280, 20, "d w"))
top.append(mirror_y(circle(1098, -105, 26, "d w")))
top.append(rect(1104, -76, 64, 152, 10, "d w"))
top.append(path(smooth(sym_y([(1262, 0), (1252, -56), (1206, -76, "c"), (1160, -70, "c"), (1154, 0)])), "o l"))
# kierownica, manetki, dźwignie, lusterka
top.append(mirror_y(
    ctube([(1066, 0), (1062, -120), (1036, -240), (1004, -330), (986, -386)], 26),
    ctube([(1014, -290), (998, -340), (982, -388)], 36),
    circle(974, -394, 14, "d w"),
    ctube([(1058, -236), (1052, -300), (1036, -378)], 14),
    ctube([(1036, -254), (1044, -290), (1052, -322)], 12),
    path(smooth([(1030, -268, "c"), (1074, -270), (1080, -330), (1072, -396), (1034, -398, "c"), (1026, -330)]), "o w"),
))
top.append(path(poly([(1040, 150), (1066, 150), (1066, 196), (1040, 196)]), "d w"))


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
