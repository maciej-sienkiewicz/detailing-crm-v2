"""Motocykl sportowy (superbike 1000 cm3, pełna owiewka), bez cech konkretnej marki.

Wymiary (typowe dla klasy): rozstaw osi 1405, długość ~2060, wysokość 1160 (szyba),
szerokość ~700 (lusterka), siodło 855, prześwit 135. Koła 17": przód 120/70 (r 300),
tył 190/55 (r 320). Widelec USD, kąt główki 24 st., podwójne tarcze z przodu.
Krótki, kanciasty tłumik boczny po PRAWEJ (razem z tylną tarczą), łańcuch po LEWEJ.

Panele owiewki (każdy osobny obszar na mapie uszkodzeń): owiewka górna z nosem
i reflektorami, szyba, panel boczny ze skrzelami, owiewka dolna (belly pan),
zbiornik, rama grzbietowa za panelem bocznym, osłona ogona (kuper) z lampą,
osłona wewnętrzna pod ogonem, uchwyt tablicy.
"""
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from lib import *  # noqa: E402,F403

RA = (0, -320)      # oś tylna
RR, RRIM = 320, 216
FA = (1405, -300)   # oś przednia
FR, FRIM = 300, 216
RAKE = 24
ARCH = 382          # promień krawędzi owiewki nad przednim kołem (od osi)


def C(p):
    """Punkt jako ostry narożnik dla smooth()."""
    return (p[0], p[1], "c")


def fk(t, off=0.0, c=False):
    """Punkt w układzie lagi: t w górę wzdłuż osi widelca, off do przodu (prostopadle)."""
    p = along(FA, RAKE, t, off)
    return (*p, "c") if c else p


def fork_band(t0, t1, w0, w1=None, cls="o w"):
    return band(FA, RAKE, t0, t1, w0, w1, cls)


def arch(a, r=ARCH):
    """Punkt na łuku nadkola przedniego (kąt w stopniach, jak on_circle)."""
    return on_circle(*FA, r, a)


def arcband(c, a0, a1, r_out, r_in, n=5):
    """Wycinek pierścienia (błotnik, nadkole) od kąta a0 do a1."""
    o = [on_circle(*c, r_out, a0 + (a1 - a0) * i / (n - 1)) for i in range(n)]
    i_ = [on_circle(*c, r_in, a1 - (a1 - a0) * i / (n - 1)) for i in range(n)]
    o = [(*o[0], "c")] + o[1:-1] + [(*o[-1], "c")]
    i_ = [(*i_[0], "c")] + i_[1:-1] + [(*i_[-1], "c")]
    return smooth(o + i_)


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
    nx = ux * math.cos(a) + uy * math.sin(a)
    ny = -ux * math.sin(a) + uy * math.cos(a)
    return (c1[0] + nx * r1, c1[1] + ny * r1), (c2[0] + nx * r2, c2[1] + ny * r2)


def open_(pts, cls="t"):
    return path(smooth(pts, closed=False), cls)


# ─── punkty wspólne kilku paneli (bok) ─────────────────────────────────────────
NOSE = (1592, -858)          # czubek nosa
NOSE_LO = (1574, -830)       # dolna krawędź czoła nosa (wlot powietrza)
SCR_BASE = (1438, -958)      # przednia krawędź szyby na owiewce
SCR_TOP = (1256, -1162)      # szczyt szyby
SCR_RB = (1162, -1044)       # tylny dolny narożnik szyby
TANK_F = (1152, -1094)       # przód zbiornika (szyba przechodzi tu w linię zbiornika)
TANK_FL = (1116, -930)       # dolny przedni narożnik zbiornika
TANK_R = (800, -934)         # tył zbiornika (styk z siedzeniem)
TANK_RL = (794, -902)
SPR_T = (900, -900)          # tylna krawędź panelu bocznego = przednia krawędź dźwigara ramy
SPR_B = (712, -446)
UF_SPLIT = [C(TANK_FL), (1166, -862), (1236, -774), C(arch(104))]   # owiewka górna / panel boczny
LF_SPLIT = [C(SPR_B), (820, -462), (950, -484), C(arch(150))]       # panel boczny / owiewka dolna
SPR = [C(SPR_B), (716, -500), (736, -570), (770, -650), (816, -736), (862, -820), C(SPR_T)]
PIVOT = (612, -494)          # oś wahacza
PEG = (548, -394)            # podnóżek kierowcy
PPEG = (318, -640)           # podnóżek pasażera
FS = (680, -462)             # zębatka zdawcza (lewa, schowana za płytą ramy)
TIP = (-118, -1072)          # czubek ogona
TIP_LO = (-104, -1032)

# ═══ BOK: warstwa spodnia (koła, tarcze) ═══════════════════════════════════════
side0 = [
    wheel_side(*RA, RR, RRIM, "split5", rot=18),
    wheel_side(*FA, FR, FRIM, "split5", rot=-10),
    brake_disc_side(*FA, 160, holes=12, buttons=6),
    circle(*FA, 40, "d w"),
]
# prawy bok: tylna tarcza i zacisk (pod wahaczem)
sideR0 = [
    brake_disc_side(*RA, 112, holes=10, buttons=5),
    caliper_side(*RA, 112, 292, span=40, inner=34, outer=16),
    # rura łącząca: wychodzi spod owiewki dolnej, kończy się w tłumiku
    ctube([(740, -164), (640, -180), (566, -226), (514, -290), (494, -346)], 50, 58),
]
# lewy bok: zębatka i łańcuch (wahacz z warstwy wspólnej przykryje górny odcinek,
# płyta ramy i owiewka dolna - zębatkę zdawczą)
sideL0 = [circle(*RA, 108, "d w"), circle(*RA, 98, "t")]
for i in range(5):
    x, y = on_circle(*RA, 64, i * 72 + 10)
    sideL0.append(circle(x, y, 10, "t"))
for upper in (True, False):
    p, q = ext_tangent(RA, 106, FS, 40, upper=upper)
    sideL0.append(tube(p, q, 16, 16, "d w", round_end=False))
# stopka boczna (złożona); przód schowany pod owiewką dolną
sideL0.append(path(poly([(720, -246), (470, -212), (468, -196), (720, -230)]), "d w"))
sideL0.append(path(poly([(486, -224), (454, -220), (452, -190), (484, -194)]), "d w"))

# ═══ BOK: wspólne (prawy bok, przód w +x) ══════════════════════════════════════
side = []

# ─── nadkole tylne na wahaczu ───
side.append(path(smooth([
    C(on_circle(*RA, 344, 30)), on_circle(*RA, 348, 60), on_circle(*RA, 346, 92),
    C(on_circle(*RA, 340, 118)), C(on_circle(*RA, 328, 118)), on_circle(*RA, 332, 92),
    on_circle(*RA, 334, 60), C(on_circle(*RA, 330, 38)), C((246, -452)), C((280, -462)),
]), "d w"))

# ─── wahacz (aluminiowy, głęboki przy osi wahacza) ───
side.append(path(smooth([
    C((668, -560)), (520, -526), (330, -470), (150, -412), C((40, -378)),
    (-18, -370), (-52, -340), (-52, -300), (-22, -276), C((30, -272)),
    (180, -304), (360, -354), (520, -404), C((612, -420)),
    (652, -440), (672, -490),
]), "o w"))
side.append(open_([(600, -500), (420, -446), (230, -392), (70, -350)]))
side.append(path(poly([(-30, -350), (40, -354), (40, -290), (-30, -288)]), "t"))
side.append(circle(*RA, 26, "d w"))
side.append(circle(*RA, 12, "d"))

# ─── amortyzator (widoczny między wahaczem a osłoną pod ogonem) ───
SH0, SH1 = (556, -520), (604, -716)
side.append(tube(SH0, SH1, 64, 64, "d w", round_end=False))
_sd = (SH1[0] - SH0[0], SH1[1] - SH0[1])
_sl = math.hypot(*_sd)
_su = (_sd[0] / _sl, _sd[1] / _sl)
_sn = (-_su[1], _su[0])
for i in range(1, 7):
    t = i / 7 * _sl
    c = (SH0[0] + _su[0] * t, SH0[1] + _su[1] * t)
    a = (c[0] + _sn[0] * 30 - _su[0] * 9, c[1] + _sn[1] * 30 - _su[1] * 9)
    b = (c[0] - _sn[0] * 30 + _su[0] * 9, c[1] - _sn[1] * 30 + _su[1] * 9)
    side.append(line(*a, *b, "t"))

# ─── osłona wewnętrzna pod ogonem (undertail / błotnik wewnętrzny) ───
side.append(path(smooth([
    C((770, -840)), C((694, -668)), (600, -676), (480, -694), (370, -726), (270, -770), (170, -828),
    C((84, -884)), C((60, -930)),
]), "d w"))
side.append(open_([(660, -704), (540, -716), (420, -744), (300, -790), (200, -846)]))

# ─── rama: dźwigar aluminiowy schodzący spod zbiornika do osi wahacza ───
side.append(path(smooth([
    C((1000, -906)), (900, -902), C((802, -894)), (772, -842), (738, -764), (704, -684), (672, -612),
    (640, -572), (606, -554), (584, -526), (578, -490), (590, -456), (622, -434), (680, -428), C((712, -430)),
    C((780, -440)), C((1000, -600)),
]), "o w"))
side.append(open_([(846, -888), (812, -820), (770, -738), (732, -656), (700, -590), (690, -530)]))

# ─── podnóżek pasażera (krótki wspornik pod osłoną) ───
side.append(path(smooth([C((404, -736)), C((356, -736)), (324, -672), C((302, -640)), C((334, -634)), (370, -684)]), "d w"))
side.append(circle(*PPEG, 15, "d w"))

# ─── uchwyt tablicy (klin pod ogonem), kierunkowskaz, tablica ───
side.append(path(smooth([
    C((96, -872)), (0, -848), (-100, -816), C((-204, -782)), C((-224, -800)), (-160, -866),
    (-104, -930), C((-74, -972)), C((40, -930)),
]), "d w"))
side.append(open_([(10, -886), (-100, -846), (-196, -806)]))
side.append(path(poly([(-220, -806), (-234, -808), (-252, -602), (-238, -600)]), "o w"))
side.append(line(-150, -840, -150, -852, "d"))
side.append(ellipse(-150, -856, 24, 14, "d w", rot=-8))

# ─── osłona ogona (kuper): krótki klin stromo zadarty do góry, lampa LED w czubku ───
side.append(path(smooth([
    C(TANK_RL), (772, -852), C((756, -806)),
    (640, -790), (530, -786), (430, -790), (330, -802), (230, -822), (130, -852), (40, -894),
    (-30, -940), (-80, -990), C(TIP_LO), C(TIP), (-70, -1048), (0, -1016), (80, -984), C((146, -958)),
    C((150, -920)), (260, -902), (370, -888), C((458, -878)), (560, -848), (680, -852), (760, -878),
]), "o w"))
# przetłoczenie boku ogona (linia klina) i podział osłony bocznej / kupra
side.append(open_([(724, -826), (600, -816), (470, -818), (350, -834), (230, -862), (120, -904), (30, -956), (-50, -1016)]))
side.append(open_([(420, -794), (398, -848), C((396, -908))], "d"))
side.append(path(smooth([C((-114, -1062)), C((-102, -1034)), (-66, -1014), C((-40, -1000)), C((-50, -1018)), (-82, -1040)]), "d l"))

# ─── siedzenia ───
side.append(path(smooth([
    C((458, -878)), (452, -914), C((438, -926)), (340, -936), (240, -946), C((146, -958)),
    C((150, -920)), (260, -902), (370, -888),
]), "o w"))
side.append(path(smooth([
    C(TANK_R), (770, -900), (716, -872), (640, -858), (560, -856), (500, -864), C((462, -880)),
    C((460, -850)), (520, -836), (620, -830), (700, -846), (760, -872), C(TANK_RL),
]), "o w"))
side.append(open_([(752, -884), (680, -856), (590, -846), (500, -852)]))

# ─── podnóżek kierowcy: płyta wspornika na osi wahacza ───
side.append(path(smooth([
    (612, -544), (650, -530), (662, -494), (648, -460), C((620, -440)), (590, -416),
    C((566, -380)), C((532, -398)), (556, -432), C((572, -462)), (566, -500), (580, -532),
]), "d w"))
side.append(circle(*PIVOT, 30, "d w"))
side.append(circle(*PIVOT, 13, "t"))
side.append(circle(*PEG, 18, "d w"))

# ─── błotnik przedni ───
side.append(path(arcband(FA, 26, 140, 336, 316, n=6), "o w"))
side.append(open_([on_circle(*FA, 326, 40), on_circle(*FA, 326, 80), on_circle(*FA, 326, 124)]))

# ─── zacisk, widelec USD ───
side.append(caliper_side(*FA, 160, 152, span=34, inner=36, outer=18))
side.append(path(smooth([
    fk(-46, -32, True), fk(-46, 32, True), fk(60, 38), fk(118, 28, True), fk(118, -28, True), fk(60, -42),
]), "o w"))
side.append(fork_band(110, 350, 46, 46, "d w"))
side.append(fork_band(336, 560, 62, 62, "o w"))
side.append(fork_band(336, 362, 66, 66, "d w"))
side.append(circle(*FA, 22, "d w"))
side.append(circle(*FA, 9, "d"))

# ─── owiewka dolna (belly pan) ───
side.append(path(smooth([
    C(arch(150)), arch(164), arch(178), arch(190), (1032, -176), C((1004, -140)),
    (900, -132), (780, -136), C((668, -162)), (678, -256), (694, -356), *LF_SPLIT[:-1],
]), "o w"))
side.append(open_([(1000, -200), (880, -178), (760, -186), (690, -210)]))
side.append(path(smooth([C((986, -270)), (900, -258), C((830, -262)), C((842, -236)), (920, -236), C((980, -248))]), "d l"))

# ─── panel boczny (owiewka środkowa) ze skrzelami ───
side.append(path(smooth([
    *LF_SPLIT[::-1][:-1], *SPR, C((1060, -912)), *UF_SPLIT, arch(116), arch(130), arch(142),
]), "o w"))
# skrzela: trzy skośne szczeliny wylotu powietrza w zagłębieniu panelu
for i, ln in enumerate((150, 136, 120)):
    # szczelina zwężona ku dołowi, równoległa do krawędzi owiewki górnej
    x0, y0 = 1238 - 46 * i, -700 + 22 * i          # dolny koniec
    ux, uy = -0.6, -0.8                              # w górę wzdłuż podziału
    nx, ny = 0.8, -0.6                               # w poprzek (do przodu)
    x1, y1 = x0 + ux * ln, y0 + uy * ln
    side.append(path(smooth([
        C((x0, y0)), C((x1 + nx * 3, y1 + ny * 3)), C((x1 - nx * 10, y1 - ny * 10)), C((x0 - nx * 5, y0 - ny * 5)),
    ]), "d k"))
side.append(open_([(1210, -640), (1080, -600), (940, -588), (800, -606)]))

# ─── zbiornik ───
side.append(path(smooth([
    C(TANK_F), (1080, -1098), (1000, -1092), (920, -1068), (862, -1030), (820, -978), C(TANK_R),
    C(TANK_RL), (850, -896), C(SPR_T), (1000, -902), (1060, -912), C(TANK_FL), (1132, -980), (1146, -1040),
]), "o w"))
side.append(open_([(1140, -1070), (1040, -1074), (936, -1052), (866, -1008), (828, -950)], "d"))
side.append(open_([(990, -903), (966, -950), (914, -984), (850, -982)]))

# ─── owiewka górna: ostry nos, wąskie reflektory ───
side.append(path(smooth([
    C(NOSE), (1534, -898), (1484, -930), C(SCR_BASE), (1340, -994), (1240, -1022), C(SCR_RB),
    C((1147, -1044)), (1132, -980), *UF_SPLIT, (1376, -712), (1446, -762), C((1522, -804)), C(NOSE_LO),
]), "o w"))
# reflektor: wąska szczelina wzdłuż górnej krawędzi nosa
side.append(path(smooth([C((1578, -864)), (1528, -894), C((1462, -934)), C((1456, -906)), (1516, -878), C((1564, -852))]), "d l"))
# wlot powietrza w czole nosa
side.append(path(smooth([C((1588, -852)), C((1576, -834)), C((1560, -842))]), "d k"))
# przetłoczenie boku owiewki górnej (dolna płaszczyzna nosa)
side.append(open_([(1550, -836), (1450, -814), (1350, -770), (1290, -734)]))
side.append(open_([(1440, -900), (1340, -914), (1240, -936), (1160, -966)]))

# ─── szyba ───
side.append(path(smooth([
    C(SCR_BASE), (1384, -1018), (1330, -1086), (1290, -1138), C(SCR_TOP),
    (1222, -1146), (1190, -1124), (1166, -1104), C(TANK_F), C(SCR_RB), (1240, -1024), (1330, -1000),
]), "o l"))
side.append(open_([(1380, -1000), (1320, -1056), (1274, -1112)]))

# ─── manetka z dźwignią (przed zbiornikiem) ───
side.append(ctube([(1122, -952), (1086, -946), (1056, -940)], 30))
side.append(circle(1050, -939, 14, "d w"))
side.append(ctube([(1112, -968), (1080, -974), (1046, -972)], 12))

# ─── lusterko na owiewce górnej ───
side.append(ctube([(1412, -966), (1404, -984), (1398, -998)], 14))
side.append(path(smooth([
    (1336, -1006), (1358, -1032), (1410, -1038), (1436, -1020), C((1432, -994)), C((1344, -994)),
]), "o w"))
side.append(open_([(1350, -1002), (1390, -1022), (1428, -1016)]))

# ═══ tylko prawy bok: tłumik, pedał hamulca (rura łącząca jest w sideR0) ════════
M0, M1 = (472, -350), (214, -546)   # oś tłumika (od przodu do wylotu)
_md = (M1[0] - M0[0], M1[1] - M0[1])
_ml = math.hypot(*_md)
_mu = (_md[0] / _ml, _md[1] / _ml)
_mn = (_mu[1], -_mu[0])             # prostopadle (s > 0 = pod osią)


def mpt(t, s, c=False):
    p = (M0[0] + _md[0] * t + _mn[0] * s, M0[1] + _md[1] * t + _mn[1] * s)
    return (*p, "c") if c else p


sideR = [
    # tłumik: kanciasta puszka, skośna pokrywa wylotu
    path(smooth([
        mpt(-0.05, 34, True), mpt(0.06, 62, True), mpt(0.9, 66, True), mpt(1.02, 28, True),
        mpt(1.04, -24, True), mpt(0.97, -62, True), mpt(0.06, -58, True), mpt(-0.05, -30, True),
    ]), "o w"),
    path(poly([mpt(0.06, 6), mpt(0.92, 8)], closed=False), "t"),
    path(poly([mpt(0.9, 66), mpt(0.97, -62)], closed=False), "d"),
    path(poly([mpt(0.12, 62), mpt(0.12, -58)], closed=False), "t"),
    ellipse(*mpt(1.0, 2), 13, 26, "d k", rot=28),
    # pedał hamulca
    ctube([(552, -404), (596, -380), (640, -370), (668, -368)], 14),
    path(poly([(658, -380), (682, -380), (682, -356), (658, -356)]), "d w"),
]

# ═══ tylko lewy bok: osłona łańcucha, dźwignia zmiany biegów ══════════════════
sideL = [
    path(smooth([C((470, -478)), (330, -448), C((150, -400)), C((160, -420)), (330, -468), C((470, -496))]), "d w"),
    ctube([(552, -404), (598, -388), (640, -382), (668, -384)], 14),
    path(poly([(658, -394), (682, -394), (682, -372), (658, -372)]), "d w"),
]

# ═══ PRZÓD (oś x = 0; lewa strona rysunku = PRAWA strona motocykla) ══════════════
SCREEN_END = sym([(0, -1162), (80, -1157), (122, -1122), (144, -1062), C((154, -998)), (0, -996)])
# owiewka górna od przodu: szeroka tarcza z reflektorami
FACE = sym([
    (0, -1000), C((154, -1000)), C((156, -1046)), (206, -1014), C((254, -972)), (260, -930),
    (256, -860), (246, -780), C((234, -716)), (196, -748), (140, -778), (70, -794), (0, -798),
])
# panele boczne + owiewka dolna: zwężają się ku dołowi
BODY = sym([
    (0, -990), (180, -986), C((232, -958)), (242, -880), (242, -760), C((236, -600)), C((226, -540)),
    (196, -420), (160, -300), C((112, -150)), (96, -138), (0, -134),
])


def mirror_end(rear=False):
    out = [ctube([(240, -972), (256, -984), (268, -990)], 14)]
    out.append(path(smooth([
        (258, -996), (274, -1030), (318, -1040), (344, -1026), (344, -998), C((330, -982)), C((268, -982)),
    ]), "o w"))
    if rear:
        out.append(path(smooth([
            (270, -998), (284, -1024), (318, -1032), (334, -1020), (334, -1000), C((326, -990)), C((276, -990)),
        ]), "d l"))
    return "".join(out)


def grip_end():
    return "".join([
        ctube([(100, -948), (200, -952), (296, -958)], 26),
        ctube([(232, -952), (266, -955), (300, -958)], 34),
        circle(306, -958, 12, "d w"),
        ctube([(200, -968), (250, -974), (294, -976)], 12),
    ])


def peg_end():
    return rect(168, -406, 92, 24, 12, "d w")


def muffler_end(sx):
    """Tłumik od przodu/tyłu (sx = znak x prawej strony motocykla w danym widoku)."""
    pts = [(148, -560), (164, -604), (222, -612), (242, -574), (242, -330), (226, -294), (168, -290), (148, -320)]
    return path(smooth([C((x * sx, y)) if i in (0, 3, 4, 7) else (x * sx, y) for i, (x, y) in enumerate(pts)]), "o w")


front = []
front.append(tire_end(0, 190, 640, corner=78, lines=0))
front.append(muffler_end(-1))
front.append(mirror_x(peg_end()))
front.append(mirror_x(grip_end()))
front.append(path(smooth(BODY), "o w"))
# chłodnica w prześwicie między panelami bocznymi
front.append(rect(-180, -850, 360, 360, 14, "d w"))
for y in (-794, -738, -682, -626, -570):
    front.append(line(-170, y, 170, y, "t"))
# krawędź owiewki dolnej (za kołem) i jej przetłoczenia
front.append(open_([(-226, -540), (-180, -496), (0, -488), (180, -496), (226, -540)], "d"))
front.append(mirror_x(open_([(236, -600), (226, -700), (228, -800), (236, -900)])))
front.append(open_([(-182, -300), (0, -290), (182, -300)]))
front.append(path(smooth(sym([(0, -244), C((64, -240)), C((56, -206)), (0, -202)])), "d l"))
# widelec, tarcze, opona, błotnik
front.append(mirror_x(rect(64, -462, 8, 324, 3, "d w")))
front.append(mirror_x(
    rect(78, -812, 58, 230, 8, "o w"),
    rect(78, -594, 58, 22, 4, "d w"),
    rect(86, -574, 42, 170, 4, "d w"),
    rect(72, -410, 70, 156, 14, "o w"),
))
front.append(tire_end(0, 120, 600, corner=50, lines=3))
front.append(path(smooth(sym([(0, -640), (58, -634), (74, -606), (76, -480), C((68, -456)), (0, -452)])), "o w"))
front.append(open_([(-58, -604), (0, -614), (58, -604)]))
# owiewka górna: tarcza z reflektorami i wlotem powietrza
front.append(path(smooth(FACE), "o w"))
front.append(mirror_x(
    path(smooth([C((60, -888)), (150, -916), C((236, -952)), C((234, -926)), (150, -890), C((68, -866))]), "d l"),
    open_([(156, -1040), (196, -992), (234, -950)]),
    open_([(244, -800), (190, -822), (120, -836), (60, -842)]),
))
front.append(path(smooth(sym([(0, -872), C((42, -870)), C((30, -826)), (0, -824)])), "d k"))
front.append(path(smooth(SCREEN_END), "o l"))
front.append(open_([(-70, -1140), (0, -1148), (70, -1140)]))
front.append(mirror_x(mirror_end()))

# ═══ TYŁ (prawa strona rysunku = PRAWA strona motocykla) ══════════════════════════
rear = []
rear.append(mirror_x(mirror_end(rear=True)))
rear.append(path(smooth(SCREEN_END), "o l"))
rear.append(path(smooth(FACE), "o w"))
rear.append(mirror_x(grip_end()))
rear.append(path(smooth(BODY), "o w"))
rear.append(mirror_x(open_([(236, -600), (226, -700), (228, -800), (236, -900)])))
rear.append(open_([(-226, -540), (-180, -500), (-120, -494)], "d"))
rear.append(open_([(120, -494), (180, -500), (226, -540)], "d"))
# zbiornik, siedzenie kierowcy
rear.append(path(smooth(sym([
    (0, -1098), (110, -1092), (168, -1064), (198, -1014), (204, -966), C((194, -910)), (0, -906),
])), "o w"))
rear.append(open_([(-150, -1060), (0, -1074), (150, -1060)]))
rear.append(path(smooth(sym([(0, -874), (140, -870), (160, -852), C((156, -830)), (0, -830)])), "o w"))
# podnóżki kierowcy i pasażera (wsporniki pasażera chowają się za tablicą)
rear.append(mirror_x(
    peg_end(),
    path(poly([(70, -748), (92, -752), (170, -650), (148, -642)]), "d w"),
    rect(150, -652, 84, 24, 12, "d w"),
))
# opona, wahacz, zębatka (lewa, -x), tarcza z zaciskiem (prawa, +x)
rear.append(tire_end(0, 190, 640, corner=78, lines=4))
rear.append(mirror_x(path(smooth([C((104, -566)), C((150, -566)), C((146, -280)), C((106, -280))]), "o w")))
rear.append(rect(-110, -428, 12, 216, 3, "d w"))
rear.append(rect(96, -430, 10, 220, 3, "d w"))
rear.append(rect(88, -270, 40, 76, 8, "d w"))
# tłumik (prawa, +x)
rear.append(muffler_end(1))
rear.append(path(smooth([C((156, -560)), C((170, -600)), C((218, -606)), C((234, -572)), C((234, -480)), C((156, -480))]), "d w"))
rear.append(ellipse(195, -540, 24, 32, "d k"))
# nadkole
rear.append(path(smooth(sym([(0, -670), (86, -664), (104, -642), C((106, -612)), (0, -616)])), "d w"))
# osłona wewnętrzna, osłona ogona, lampa LED
rear.append(path(smooth(sym([(0, -800), C((86, -796)), C((80, -668)), (0, -668)])), "d w"))
rear.append(path(smooth(sym([
    (0, -1072), (38, -1068), (60, -1042), (88, -968), (116, -888), (136, -808), C((140, -786)), (0, -786),
])), "o w"))
rear.append(path(smooth(sym([(0, -1060), (34, -1058), C((52, -1036)), (30, -1028), (0, -1026)])), "d l"))
rear.append(mirror_x(open_([(62, -1020), (92, -946), (118, -862)])))
# uchwyt tablicy, kierunkowskazy, tablica
rear.append(path(smooth(sym([(0, -1004), C((40, -1002)), C((32, -790)), (0, -790)])), "d w"))
rear.append(mirror_x(line(32, -850, 112, -850, "d"), ellipse(130, -850, 22, 14, "d w")))
rear.append(rect(-102, -800, 204, 192, 10, "o w"))
rear.append(rect(-90, -788, 180, 168, 6, "t"))

# ═══ GÓRA (przód w +x, PRAWA strona motocykla po +y) ═════════════════════════════
top = []
top.append(rect(-320, -95, 640, 190, 70, "x g"))
top.append(rect(1105, -60, 600, 120, 50, "x g"))
# wahacz, zębatka i łańcuch (lewa, -y), tarcza tylna (prawa, +y)
top.append(mirror_y(rect(-52, -150, 724, 44, 16, "o w")))
top.append(rect(-108, -112, 216, 12, 4, "d w"))
top.append(rect(0, -114, 680, 14, 6, "d w"))
top.append(rect(-112, 100, 224, 10, 4, "d w"))
# podnóżki: kierowcy i pasażera; pedał hamulca (+y), zmiana biegów (-y)
top.append(mirror_y(rect(530, -256, 36, 100, 12, "d w"), rect(300, -236, 36, 84, 12, "d w")))
top.append(ctube([(552, 196), (620, 200), (680, 194)], 16))
top.append(ctube([(552, -196), (620, -200), (680, -194)], 16))
# tłumik (prawa, +y) z rurą spod owiewki
top.append(ctube([(676, 80), (600, 124), (520, 156), (470, 168)], 50, 56))
top.append(path(smooth([C((482, 150)), C((482, 232)), C((246, 244)), C((212, 226)), C((212, 164)), C((244, 146))]), "o w"))
top.append(path(poly([(246, 148), (246, 244)], closed=False), "d"))
top.append(path(poly([(470, 192), (250, 196)], closed=False), "t"))
# uchwyt tablicy, kierunkowskazy, tablica
top.append(rect(-232, -30, 300, 60, 12, "d w"))
top.append(mirror_y(line(-150, -30, -150, -112, "d"), ellipse(-150, -130, 14, 22, "d w")))
top.append(rect(-266, -102, 34, 204, 4, "o w"))
top.append(rect(-260, -92, 22, 184, 3, "t"))
# błotnik przedni, tarcze
top.append(mirror_y(rect(1250, -78, 310, 10, 4, "d w")))
top.append(path(smooth(sym_y([(1660, 0), (1650, -40), (1610, -62), C((1300, -66)), C((1240, -56)), (1236, 0)])), "o w"))
top.append(open_([(1640, 0), (1300, 0)]))
# owiewka boczna i dolna (widok z góry)
top.append(path(smooth(sym_y([
    (1340, 0), (1336, -196), (1270, -240), (1110, -248), (970, -246), (870, -230), C((792, -204)),
    (720, -170), C((668, -130)), (664, 0),
])), "o w"))
top.append(mirror_y(open_([(1300, -218), (1100, -232), (900, -222), (800, -198)])))
# manetki z dźwigniami
top.append(mirror_y(
    ctube([(1110, -96), (1094, -180), (1074, -260), (1062, -296)], 26),
    ctube([(1084, -226), (1072, -264), (1062, -300)], 34),
    circle(1060, -306, 12, "d w"),
    ctube([(1112, -196), (1104, -250), (1090, -296)], 12),
))
# zbiornik
top.append(path(smooth(sym_y([
    (1168, 0), (1162, -118), (1122, -184), (1040, -206), (940, -202), (860, -176), C((800, -150)), (798, 0),
])), "o w"))
top.append(circle(1000, 0, 40, "d w"))
top.append(circle(1000, 0, 24, "t"))
top.append(mirror_y(open_([(1130, -150), (1030, -170), (920, -160), (840, -132)])))
# osłona ogona (kuper) – wąska, zbiega się w ostry czubek; siedzenia, lampa
top.append(path(smooth(sym_y([
    (800, 0), C((798, -164)), (700, -168), (590, -160), (470, -142), (340, -116), (200, -86),
    (60, -54), (-50, -28), C((-118, -8)), (-118, 0),
])), "o w"))
top.append(mirror_y(open_([(720, -152), (520, -134), (330, -100), (140, -64), (-30, -24)])))
top.append(path(smooth(sym_y([(-100, 0), C((-100, -14)), C((-116, -8)), (-116, 0)])), "d l"))
top.append(path(smooth(sym_y([
    (462, 0), (460, -96), (446, -114), (380, -112), (290, -98), (200, -82), (150, -68), C((144, -50)), (142, 0),
])), "o w"))
top.append(path(smooth(sym_y([
    (802, 0), C((800, -146)), (740, -156), (640, -158), (540, -150), (476, -134), (462, -96), (460, 0),
])), "o w"))
# owiewka górna (nos), reflektory
top.append(path(smooth(sym_y([
    (1582, 0), (1564, -44), (1506, -114), (1428, -174), (1340, -218), (1250, -236), C((1150, -230)),
    (1150, 0),
])), "o w"))
top.append(mirror_y(path(smooth([C((1566, -34)), (1510, -98), C((1446, -150)), C((1442, -128)), (1500, -84), C((1554, -24))]), "d l")))
top.append(mirror_y(open_([(1540, -46), (1430, -136), (1310, -194), (1200, -206)])))
# szyba, zegary pod szybą
top.append(path(smooth(sym_y([(1422, 0), (1414, -92), (1364, -144), (1260, -158), C((1162, -150)), (1158, 0)])), "o l"))
top.append(rect(1180, -62, 64, 124, 12, "t"))
top.append(open_([(1410, 0), (1166, 0)]))
# lusterka
top.append(mirror_y(
    ctube([(1370, -224), (1366, -246), (1362, -262)], 14),
    path(smooth([(1312, -266), C((1320, -254)), C((1414, -254)), (1416, -294), (1402, -342), (1350, -352), (1316, -322)]), "o w"),
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
