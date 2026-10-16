"""Skuter (maxi-skuter klasy 300-400 cm3), sylwetka step-through bez cech konkretnej marki.

Wymiary: rozstaw osi 1540, długość ~2180, wysokość 1415 (szyba), szerokość 775 (lusterka),
siodło 795, prześwit ~135. Koła 120/70-15 przód (r 274, felga r 190) i 140/70-14 tył
(r 276, felga r 178).
Strony: zespół napędowy (silnik + przekładnia CVT jako wahacz) po LEWEJ stronie tylnego
koła, tłumik i prawe ramię wahacza z tarczą tylnego hamulca po PRAWEJ. Przednia tarcza
z zaciskiem po LEWEJ stronie koła.
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from lib import *  # noqa: E402,F403

RA = (0, -276)      # oś tylna
RR, RRIM = 276, 178
FA = (1540, -274)   # oś przednia
FR, FRIM = 274, 190
RAKE = 26


def arcp(c, r, angles):
    return [on_circle(c[0], c[1], r, a) for a in angles]


def fork_pt(t, off, *flag):
    return (*along(FA, RAKE, t, off), *flag)


def axis(p0, p1):
    """Punkt na osi p0->p1: t w [0,1], off > 0 = w górę (prostopadle do osi)."""
    dx, dy = p1[0] - p0[0], p1[1] - p0[1]
    ln = math.hypot(dx, dy)
    ux, uy = dx / ln, dy / ln
    nx, ny = uy, -ux
    if ny > 0:
        nx, ny = -nx, -ny

    def pt(t, off=0.0, *flag):
        return (p0[0] + dx * t + nx * off, p0[1] + dy * t + ny * off, *flag)
    return pt


def scooter_wheel(c, r, rim, rot):
    """Koło odlewane skutera: 5 szerokich ramion (felga 14-15")."""
    out = [wheel_side(*c, r, rim, "none", hub_r=34)]
    lip = rim - 16
    for i in range(5):
        out.append(spoke(c[0], c[1], rot + i * 72, 30, lip + 4, 40, 24))
    out.append(circle(*c, 46, "d w"))
    out.append(circle(*c, 20, "d"))
    return "".join(out)


def pipe(pts, w0, w1=None, cls="d w"):
    """Rura o osi przez punkty pts, średnica w0 -> w1, końce ścięte."""
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
    return path(smooth(left + right[::-1]), cls)


def group(id_, parts, extra=""):
    return f'<g id="{id_}"{extra}>' + "".join(parts) + "</g>"


# Spód siedzenia (od tyłu do przodu); nadwozie podchodzi pod nie z zakładką.
SEAT_BASE = [(-196, -852), (-50, -834), (150, -806), (350, -770), (500, -736), (650, -716), (760, -704)]

# ═══ BOK ═══════════════════════════════════════════════════════════════════════
side0 = [
    scooter_wheel(RA, RR, RRIM, 18),
    scooter_wheel(FA, FR, FRIM, -6),
]

# ─── tylko prawy bok, pod spodem: tarcza tylna, skrzynia korbowa, prawe ramię wahacza
sideR0 = [
    brake_disc_side(*RA, 122, holes=10, buttons=5),
    caliper_side(*RA, 122, 250, span=40, inner=30, outer=16),
]
sideR0.append(path(smooth([
    (790, -260, "c"), (765, -170), (700, -132), (560, -126), (450, -142), (400, -200),
    (396, -290), (430, -390), (500, -470, "c"),
]), "d w"))
sideR0.append(circle(610, -250, 74, "d w"))
sideR0.append(circle(610, -250, 52, "t"))
for a in range(0, 360, 60):
    sideR0.append(circle(*on_circle(610, -250, 63, a), 4, "t"))
sideR0.append(path(smooth([
    (440, -330), (240, -316), (60, -312), (-24, -304), (-40, -276), (-24, -248),
    (60, -240), (240, -246), (440, -250), (476, -290),
]), "d w"))
sideR0.append(circle(*RA, 30, "d w"))
sideR0.append(circle(*RA, 13, "d"))
# rura wydechowa spod podłogi do tłumika
sideR0.append(pipe([(920, -162), (790, -156), (680, -142), (560, -142), (470, -178), (424, -240), (404, -292)], 34, 40))

# ─── tylko lewy bok, pod spodem: tarcza przednia, obudowa CVT ─────────────────
sideL0 = [
    brake_disc_side(*FA, 134, holes=12, buttons=6),
    caliper_side(*FA, 134, 152, span=38, inner=32, outer=18),
]
sideL0.append(path(smooth([
    *arcp(RA, 128, (90, 135, 180, 225, 270)),
    (150, -148), (320, -144), (480, -140), (620, -148), (720, -200), (755, -290),
    (730, -390), (650, -452), (480, -456), (320, -436), (150, -414),
]), "o w"))
sideL0.append(path(smooth([
    *arcp(RA, 104, (90, 135, 180, 225, 270)),
    (150, -172), (320, -168), (480, -164), (600, -172), (690, -218), (718, -295),
    (692, -378), (620, -426), (480, -430), (320, -412), (150, -390),
]), "t"))
sideL0.append(circle(580, -300, 100, "d w"))
sideL0.append(circle(580, -300, 74, "t"))
for a in range(15, 360, 60):
    sideL0.append(circle(*on_circle(580, -300, 87, a), 4.5, "t"))
sideL0.append(circle(140, -288, 60, "d w"))
sideL0.append(circle(*RA, 30, "d w"))
sideL0.append(circle(*RA, 13, "d"))

# ─── wspólne (prawy bok, przód w +x) ──────────────────────────────────────────
side = []
# błotnik tylny (nadkole na wahaczu)
hug_o = arcp(RA, 302, (30, 62, 96, 128, 142))
hug_i = arcp(RA, 286, (142, 128, 96, 62, 30))
side.append(path(smooth([(*hug_o[0], "c"), *hug_o[1:4], (*hug_o[4], "c"),
                         (*hug_i[0], "c"), *hug_i[1:4], (*hug_i[4], "c")]), "d w"))
# amortyzator tylny (po obu stronach)
SH0, SH1 = (-30, -322), (112, -650)
sh = axis(SH0, SH1)
side.append(path(poly([sh(0.06, 20), sh(1, 20), sh(1, -20), sh(0.06, -20)]), "d w"))
side.append(path(poly([sh(0.3, 25), sh(0.86, 25), sh(0.86, -25), sh(0.3, -25)]), "d w"))
for k in range(1, 7):
    t = 0.3 + k * 0.08
    a, b = sh(t, 25), sh(t - 0.03, -25)
    side.append(line(a[0], a[1], b[0], b[1], "t"))
side.append(circle(*SH0, 17, "d w"))

# podstawka centralna (złożona pod silnikiem)
cs = axis((560, -170), (400, -132))
side.append(path(smooth([cs(0, 18, "c"), cs(0.6, 14), cs(1, 13, "c"), cs(1.06, 0), cs(1, -13, "c"), cs(0.6, -14), cs(0, -18, "c")]), "d w"))
side.append(path(smooth([cs(0.9, -12, "c"), cs(0.82, -30, "c"), cs(1.08, -30, "c"), cs(1.06, -12, "c")]), "d w"))
side.append(circle(560, -170, 15, "d w"))

# błotnik przedni
fo = arcp(FA, 304, (30, 55, 85, 115, 148))
fi = arcp(FA, 286, (150, 115, 85, 55, 30))
side.append(path(smooth([(*fo[0], "c"), *fo[1:4], (*fo[4], "c"), (*fi[0], "c"), *fi[1:4], (*fi[4], "c")]), "o w"))
# widelec teleskopowy
side.append(path(smooth([
    fork_pt(330, 30, "c"), fork_pt(160, 30), fork_pt(-10, 30), fork_pt(-31, 21), fork_pt(-40, 0),
    fork_pt(-31, -21), fork_pt(-10, -30), fork_pt(160, -30), fork_pt(330, -30, "c"),
]), "o w"))
side.append(path(smooth([fork_pt(200, -30), fork_pt(200, 30)], closed=False), "t"))
side.append(circle(*FA, 22, "d w"))
side.append(circle(*FA, 9, "d"))

# uchwyt tablicy (przedłużenie błotnika) i tablica
side.append(path(smooth([
    (-120, -720, "c"), (-230, -690), (-328, -644, "c"), (-340, -620, "c"), (-240, -650), (-130, -686, "c"),
]), "d w"))
side.append(path(poly([(-356, -632), (-340, -632), (-354, -456), (-370, -456)]), "o w"))
side.append(ellipse(-262, -668, 22, 12, "d l"))

# tunel pośrodku podłogi (widoczny nad podestem)
side.append(path(smooth([
    (750, -440, "c"), (772, -588, "c"), (880, -576), (990, -564), (1080, -556), (1132, -552, "c"),
    (1132, -440, "c"),
]), "o w"))
side.append(path(smooth([(800, -580), (900, -568), (1000, -558), (1110, -550)], closed=False), "t"))

# nadwozie: owiewka przednia + osłona nóg + podest + boki tylne
arch = arcp(FA, 318, (118, 136, 158, 178, 194))
body_top = [(x, y - 16) for x, y in SEAT_BASE]
side.append(path(smooth([
    (1612, -1040, "c"), (1700, -980), (1760, -920), (1792, -878, "c"), (1774, -852),
    (1716, -824), (1648, -792), (1584, -748), (1528, -690),
    *arch, (1228, -150), (1190, -138),
    (1100, -136), (1000, -136), (860, -140), (775, -172), (724, -240), (674, -330),
    (600, -410), (500, -470), (380, -522), (250, -570), (100, -614), (-30, -654),
    (-140, -700), (-216, -746), (-262, -796, "c"), (-254, -826), (-232, -850), (-210, -864, "c"),
    *body_top,
    (796, -688, "c"), (792, -650), (780, -600), (764, -548), (748, -490), (744, -452, "c"),
    (1040, -448), (1085, -468), (1118, -530), (1134, -620), (1142, -720), (1152, -830),
    (1172, -950), (1196, -1046), (1216, -1084, "c"), (1300, -1100), (1420, -1100),
    (1520, -1080),
]), "o w"))
# podziały paneli: nos / owiewka boczna / fartuch / podest / bok tylny / ogon
side.append(path(smooth([(1556, -1068), (1520, -980), (1508, -870), (1528, -690)], closed=False), "d"))
side.append(path(smooth([(1476, -640), (1320, -650), (1138, -660)], closed=False), "d"))
side.append(path(smooth([(1085, -468), (1120, -320), (1172, -140)], closed=False), "d"))
side.append(path(smooth([(744, -452), (726, -370), (698, -290)], closed=False), "d"))
side.append(path(smooth([(-40, -834), (-62, -750), (-76, -668)], closed=False), "d"))
side.append(path(smooth([(1060, -310), (900, -306), (780, -292)], closed=False), "t"))
side.append(path(smooth([(784, -616), (560, -622), (300, -656), (40, -716), (-200, -800)], closed=False), "t"))
side.append(path(smooth([(1500, -940), (1330, -900), (1170, -890)], closed=False), "t"))
# podnóżek pasażera (składany, w boku nadwozia)
side.append(rect(565, -548, 96, 30, 13, "d w"))

# siedzenie dwuosobowe z oparciem kierowcy
side.append(path(smooth([
    (806, -690, "c"), (828, -716), (828, -744), (806, -764), (750, -780), (640, -793), (520, -798), (452, -804),
    (420, -826), (402, -866), (380, -888), (300, -898), (150, -908), (0, -920), (-120, -934),
    (-182, -932), (-212, -900, "c"), (-210, -866), *SEAT_BASE, (790, -694),
]), "o w"))
side.append(path(smooth([(454, -802), (412, -794), (392, -782)], closed=False), "t"))
# uchwyt pasażera
side.append(path(smooth([
    (-196, -868, "c"), (-150, -888), (-40, -880), (60, -860), (96, -834, "c"), (70, -830),
    (-60, -846), (-150, -856), (-192, -850, "c"),
]), "d w"))
side.append(path(smooth([(-140, -870, "c"), (-40, -866), (30, -854, "c"), (-40, -858), (-130, -862, "c")]), "t"))
# tylna lampa
side.append(path(smooth([(-212, -876, "c"), (-244, -852), (-262, -812), (-258, -790, "c"), (-240, -814), (-222, -852)]), "d l"))

# reflektor i kierunkowskaz
side.append(path(smooth([(1790, -884, "c"), (1746, -920), (1680, -948, "c"), (1704, -914), (1768, -868, "c")]), "d l"))
side.append(path(smooth([(1652, -816, "c"), (1604, -834), (1570, -836, "c"), (1600, -814, "c")]), "d l"))

# szyba
side.append(path(smooth([
    (1612, -1040, "c"), (1574, -1140), (1530, -1250), (1486, -1350), (1454, -1402), (1424, -1415, "c"),
    (1400, -1390), (1394, -1300), (1406, -1190), (1432, -1098, "c"),
]), "o l"))
side.append(path(smooth([(1454, -1380), (1492, -1300), (1540, -1180)], closed=False), "t"))

# kierownica z osłoną, manetka, dźwignia, lusterko
side.append(path(smooth([(1184, -1084, "c"), (1196, -1140), (1250, -1172), (1330, -1170), (1372, -1130), (1376, -1100, "c")]), "o w"))
side.append(path(poly([(1214, -1150), (1218, -1150), (1246, -1288), (1240, -1290)]), "d w"))
side.append(path(smooth([(1196, -1296, "c"), (1236, -1336), (1290, -1342), (1302, -1316), (1268, -1282, "c")]), "o w"))
side.append(path(smooth([(1196, -1124, "c"), (1270, -1118), (1284, -1106, "c"), (1210, -1108, "c")]), "d w"))
side.append(circle(1188, -1122, 22, "d w"))
side.append(circle(1188, -1122, 10, "t"))

# ─── tylko prawy bok, na wierzchu: tłumik z rurą wydechową ────────────────────
mu = axis((400, -300), (-128, -446))
sideR = [
    path(smooth([
        mu(0, 34, "c"), mu(0.12, 58), mu(0.3, 72), mu(0.7, 74), mu(0.95, 70), mu(1.02, 40),
        mu(1.03, 0), mu(1.02, -40), mu(0.95, -70), mu(0.7, -74), mu(0.3, -70), mu(0.12, -54), mu(0, -32, "c"),
    ]), "o w"),
    # osłona termiczna
    path(smooth([mu(0.1, 50, "c"), mu(0.3, 66), mu(0.66, 68, "c"), mu(0.6, 26), mu(0.3, 18), mu(0.12, 26, "c")]), "d w"),
]
sideR.append(path(smooth([mu(0.9, 70), mu(0.9, 0), mu(0.9, -70)], closed=False), "t"))
sideR.append(ellipse(*mu(1.0, 0)[:2], 16, 34, "d w", rot=-16))
sideR.append(circle(*mu(0.42, 42), 5, "t"))
sideR.append(circle(*mu(0.56, 46), 5, "t"))

sideL = []

# ═══ PRZÓD (oś x = 0, lewa strona rysunku = prawa strona skutera) ══════════════
MIRRORS = mirror_x(
    path(poly([(214, -1128), (224, -1128), (318, -1282), (310, -1286)]), "d w"),
    path(smooth([(286, -1284, "c"), (318, -1326), (372, -1342), (390, -1320), (384, -1288), (330, -1276, "c")]), "o w"),
)
BARS = mirror_x(
    rect(150, -1132, 112, 20, 8, "d w"),
    rect(250, -1140, 112, 36, 14, "d w"),
)
SCREEN = path(smooth(sym([
    (0, -1415), (64, -1413), (104, -1404), (126, -1382), (160, -1230), (194, -1060, "c"), (0, -1050),
])), "o l")
LEGSHIELD = sym([
    (0, -1104), (140, -1102), (222, -1086), (276, -1030), (304, -940), (312, -830),
    (302, -720), (278, -610), (250, -500), (228, -380), (206, -250), (186, -142, "c"), (0, -138),
])

front = [MIRRORS, BARS]
front.append(mirror_x(path(smooth([(240, -1110, "c"), (344, -1100), (356, -1090, "c"), (250, -1096, "c")]), "d w")))
# podest (widoczny zza fartucha)
front.append(path(smooth(sym([(0, -452), (256, -452, "c"), (258, -420), (240, -280), (222, -142, "c"), (0, -140)])), "d w"))
front.append(path(smooth(LEGSHIELD), "o w"))
front.append(mirror_x(
    path(smooth([(286, -652), (210, -646), (120, -642)], closed=False), "d"),
    path(smooth([(190, -142), (200, -300), (222, -470)], closed=False), "t"),
))
# koło, tarcza (lewa strona = +x), błotnik, widelec
front.append(tire_end(0, 120, 548))
front.append(rect(66, -440, 8, 300, 2, "d w"))
front.append(path(smooth(sym([
    (0, -596), (62, -588), (80, -555), (78, -470), (60, -410), (30, -384, "c"), (0, -380),
])), "o w"))
front.append(mirror_x(
    rect(88, -600, 32, 140, 6, "d w"),
    rect(84, -470, 40, 244, 12, "o w"),
    line(84, -420, 124, -420, "t"),
    circle(104, -274, 11, "d w"),
))
# nos z reflektorami
front.append(path(smooth(sym([
    (0, -1052), (176, -1044, "c"), (226, -1004), (244, -950), (236, -900), (200, -864, "c"),
    (100, -840), (0, -818, "c"),
])), "o w"))
front.append(mirror_x(
    path(smooth([(30, -872, "c"), (120, -900), (214, -956, "c"), (228, -918), (160, -878), (46, -846, "c")]), "d l"),
    path(smooth([(206, -834, "c"), (250, -850, "c"), (254, -830), (212, -820, "c")]), "d l"),
    path(smooth([(176, -1044), (196, -996), (204, -962)], closed=False), "t"),
))
front.append(path(poly([(-40, -850), (40, -850), (30, -832), (-30, -832)]), "d k"))
front.append(SCREEN)
front.append(path(smooth([(-110, -1384), (0, -1394), (110, -1384)], closed=False), "t"))

# ═══ TYŁ (prawa strona rysunku = prawa strona skutera) ════════════════════════
rear = [MIRRORS]
rear.append(mirror_x(path(smooth([(298, -1290, "c"), (324, -1324), (370, -1334), (380, -1318), (374, -1294), (334, -1288, "c")]), "t l")))
rear.append(SCREEN)
rear.append(BARS)
rear.append(path(smooth(sym([(0, -1184), (120, -1180), (175, -1152), (186, -1110, "c"), (0, -1102)])), "o w"))
# osłona nóg od środka i podest
rear.append(path(smooth(sym([
    (0, -1104), (140, -1102), (222, -1086), (276, -1030), (304, -940), (312, -830),
    (302, -720), (276, -610), (252, -500), (250, -452, "c"), (254, -416), (232, -260),
    (210, -142, "c"), (0, -140),
])), "o w"))
rear.append(mirror_x(path(smooth([(24, -1060, "c"), (160, -1056), (190, -1020), (182, -984, "c"), (24, -984, "c")]), "t")))
rear.append(path(smooth([(-250, -452), (-120, -458), (0, -460), (120, -458), (250, -452)], closed=False), "d"))
# boki tylne
rear.append(path(smooth(sym([
    (0, -880), (150, -872), (192, -830), (206, -740), (210, -600), (200, -500, "c"),
    (150, -520), (110, -580), (80, -650), (0, -700),
])), "o w"))
rear.append(mirror_x(path(smooth([(196, -820), (176, -700), (160, -600)], closed=False), "t")))
# siedzenie od tyłu i uchwyty
rear.append(path(smooth(sym([(0, -922), (110, -918), (160, -902), (172, -874, "c"), (0, -866)])), "o w"))
rear.append(mirror_x(path(smooth([(130, -880, "c"), (196, -890), (220, -868), (212, -846, "c"), (184, -856), (130, -862, "c")]), "d w")))
# tylna lampa
rear.append(path(smooth(sym([(0, -858), (100, -854), (150, -832), (156, -800), (120, -778, "c"), (0, -770)])), "d l"))
rear.append(path(smooth([(-90, -808), (0, -802), (90, -808)], closed=False), "t"))
# opona, błotnik, amortyzatory
rear.append(tire_end(0, 140, 552, corner=56, lines=4))
rear.append(path(smooth(sym([(0, -604), (78, -596), (90, -570), (88, -548, "c"), (0, -556)])), "d w"))
rear.append(mirror_x(rect(98, -646, 30, 300, 10, "d w"), rect(94, -560, 38, 150, 12, "d w")))
# CVT (lewa = -x), tłumik (prawa = +x)
rear.append(path(smooth([(-76, -406, "c"), (-156, -402), (-190, -370), (-194, -190), (-170, -150), (-76, -148, "c")]), "o w"))
rear.append(path(smooth([(-146, -380), (-172, -350), (-174, -200), (-154, -172)], closed=False), "t"))
rear.append(path(smooth([(92, -380), (150, -372), (226, -390), (240, -446), (226, -500), (160, -516), (100, -500)]), "o w"))
rear.append(ellipse(166, -446, 46, 50, "d w"))
rear.append(ellipse(166, -446, 26, 28, "t"))
# uchwyt i tablica
rear.append(rect(-28, -720, 56, 100, 6, "d w"))
rear.append(rect(-105, -632, 210, 176, 10, "o w"))
rear.append(rect(-95, -622, 190, 156, 6, "t"))
rear.append(mirror_x(line(28, -664, 112, -668, "d"), ellipse(128, -668, 20, 13, "d w")))

# ═══ GÓRA (przód w +x, prawa strona skutera po +y) ═════════════════════════════
top = []
top.append(rect(-276, -70, 552, 140, 56, "x g"))
top.append(rect(1266, -60, 548, 120, 50, "x g"))
# CVT po lewej (-y), tłumik po prawej (+y)
top.append(path(smooth([(-128, -76, "c"), (-112, -160), (-40, -192), (600, -192), (730, -168), (755, -76, "c")]), "o w"))
top.append(path(smooth([(420, 120, "c"), (300, 214), (0, 246), (-118, 240), (-136, 186), (-118, 132), (0, 120), (300, 110, "c")]), "o w"))
top.append(path(smooth([(330, 190), (100, 226), (-80, 236)], closed=False), "t"))
top.append(ellipse(-128, 186, 12, 40, "d w"))
# błotnik przedni
top.append(rect(1600, -72, 210, 144, 60, "o w"))
# podest z tunelem
top.append(path(smooth(sym_y([(1150, 0), (1150, -236, "c"), (1060, -252), (800, -252), (770, -236, "c"), (770, 0)])), "o w"))
top.append(mirror_y(line(1040, -96, 1040, -246, "t")))
top.append(path(smooth(sym_y([(1140, 0), (1140, -90, "c"), (790, -100, "c"), (790, 0)])), "d w"))
top.append(circle(1010, 0, 38, "d w"))
top.append(circle(1010, 0, 24, "t"))
# nadwozie tylne
top.append(path(smooth(sym_y([
    (806, 0), (806, -150), (780, -184, "c"), (650, -202), (450, -210), (200, -206), (40, -196),
    (-100, -166), (-200, -122), (-250, -66), (-264, 0),
])), "o w"))
top.append(mirror_y(path(smooth([(720, -190), (450, -198), (180, -192)], closed=False), "t")))
# uchwyty pasażera
top.append(mirror_y(
    path(smooth([
        (96, -160, "c"), (40, -196), (-100, -200), (-180, -178), (-204, -130, "c"), (-180, -124),
        (-120, -146), (0, -152, "c"),
    ]), "d w"),
    path(smooth([(40, -166, "c"), (-60, -182), (-150, -164, "c"), (-80, -168)]), "t"),
))
# siedzenie
top.append(path(smooth(sym_y([
    (828, 0), (820, -60), (780, -128), (640, -164), (460, -172), (420, -170, "c"),
    (402, -160, "c"), (200, -154), (0, -142), (-130, -118), (-200, -76), (-208, 0),
])), "o w"))
top.append(path(smooth(sym_y([(410, 0), (410, -166)])), "d"))
top.append(path(smooth([(440, -140), (452, 0), (440, 140)], closed=False), "t"))
# tylna lampa
top.append(path(smooth(sym_y([(-226, -100, "c"), (-256, -50), (-264, 0)])), "d l"))
# tablica
top.append(rect(-370, -105, 26, 210, 4, "o w"))
top.append(rect(-346, -26, 130, 52, 6, "d w"))
top.append(mirror_y(line(-262, -26, -262, -110, "d"), ellipse(-262, -126, 12, 22, "d l")))
# owiewka przednia z osłoną nóg
top.append(path(smooth(sym_y([
    (1792, 0), (1782, -30), (1744, -82), (1680, -140), (1590, -200), (1490, -252),
    (1380, -292), (1280, -312), (1214, -306, "c"), (1170, -260), (1152, -160), (1148, 0),
])), "o w"))
top.append(path(smooth([(1216, -292), (1226, -150), (1226, 0), (1226, 150), (1216, 292)], closed=False), "d"))
top.append(mirror_y(path(smooth([(1500, -248), (1540, -150), (1612, -40)], closed=False), "t")))
top.append(mirror_y(path(smooth([(1770, -40, "c"), (1700, -110), (1652, -144, "c"), (1680, -108), (1744, -34, "c")]), "d l")))
top.append(mirror_y(path(smooth([(1652, -168, "c"), (1590, -214, "c"), (1600, -190, "c")]), "d l")))
# szyba
top.append(path(smooth(sym_y([(1612, 0), (1606, -140), (1580, -210, "c"), (1430, -150), (1404, -100), (1396, 0)])), "o l"))
# kierownica z osłoną, lusterka
top.append(mirror_y(
    rect(1176, -262, 22, 120, 8, "d w"),
    rect(1170, -362, 36, 112, 14, "d w"),
    path(smooth([(1208, -250, "c"), (1280, -346), (1270, -358, "c"), (1196, -262, "c")]), "d w"),
    path(poly([(1196, -196), (1204, -196), (1252, -300), (1244, -302)]), "d w"),
    path(smooth([(1228, -290, "c"), (1270, -300), (1290, -384), (1260, -388), (1236, -330)]), "o w"),
))
top.append(path(smooth(sym_y([(1376, 0), (1370, -130), (1320, -176), (1200, -172, "c"), (1186, 0)])), "o w"))


print(group("side0", side0))
print(group("sideR0", sideR0))
print(group("sideL0", sideL0))
print(group("side", side, f' data-axles="{RA[0]},{RA[1]};{FA[0]},{FA[1]}"'))
print(group("sideR", sideR))
print(group("sideL", sideL))
print(group("front", front))
print(group("rear", rear))
print(group("top", top))
