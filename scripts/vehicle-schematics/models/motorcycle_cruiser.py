"""Cruiser / chopper z silnikiem V2 (klasa 1600-1800 cm3, bez cech konkretnej marki).

Wymiary: rozstaw osi 1630, długość ~2375, wysokość 1150 (lusterka), szerokość ~950
(lusterka), siodło 680. Koła szprychowe: przednie 19" (opona ~110/90), tylne 17"
(opona 200/55). Główka ramy 30 deg, lagi klasyczne (nie USD), wahacz trójkątny
z amortyzatorem schowanym pod siedzeniem. Tłumiki (dwa, jeden nad drugim) i filtr powietrza po PRAWEJ,
napęd paskiem i pokrywa sprzęgła (primary) po LEWEJ. Tarcze hamulców po prawej.
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from lib import *  # noqa: E402,F403

RA = (0, -328)      # oś tylna
RR, RRIM = 326, 216
FA = (1630, -338)   # oś przednia
FR, FRIM = 338, 241
RAKE = 30
C = (960, -385)     # wał korbowy (wierzchołek V)
V_HALF = 22.5       # pół kąta V (cylindry 45 deg)


# ─── pomocniki modelu ────────────────────────────────────────────────────────────


def thick(pts, w, cls="d w", w1=None):
    """Pas o szerokości w (-> w1) wzdłuż łamanej wygładzonej (rura ramy, kolektor)."""
    w1 = w if w1 is None else w1
    n = len(pts)
    left, right = [], []
    for i, p in enumerate(pts):
        a, b = pts[max(0, i - 1)], pts[min(n - 1, i + 1)]
        dx, dy = b[0] - a[0], b[1] - a[1]
        ln = math.hypot(dx, dy)
        nx, ny = -dy / ln, dx / ln
        hw = (w + (w1 - w) * i / (n - 1)) / 2
        left.append((p[0] + nx * hw, p[1] + ny * hw))
        right.append((p[0] - nx * hw, p[1] - ny * hw))
    out = [(*left[0], "c"), *left[1:-1], (*left[-1], "c"), (*right[-1], "c"),
           *reversed(right[1:-1]), (*right[0], "c")]
    return path(smooth(out), cls)


def arcband(c, r_in, r_out, a0, a1, cls="o w"):
    """Pas łukowy (błotnik) między promieniami r_in i r_out, od kąta a0 do a1 (CCW)."""
    x0, y0 = on_circle(*c, r_out, a0)
    x1, y1 = on_circle(*c, r_out, a1)
    x2, y2 = on_circle(*c, r_in, a1)
    x3, y3 = on_circle(*c, r_in, a0)
    lg = 1 if abs(a1 - a0) > 180 else 0
    d = (f"M{f(x0)} {f(y0)}A{f(r_out)} {f(r_out)} 0 {lg} 0 {f(x1)} {f(y1)}"
         f"L{f(x2)} {f(y2)}A{f(r_in)} {f(r_in)} 0 {lg} 1 {f(x3)} {f(y3)}Z")
    return path(d, cls)


def fender(c, r_out, inner, a0, a1, step=8, cls="o w"):
    """Błotnik z fartuchem: zewnętrzny łuk r_out, dolna krawędź fartucha wg listy
    (kąt, promień) - interpolowana liniowo, od a0 do a1."""
    def r_in(a):
        for (b0, q0), (b1, q1) in zip(inner, inner[1:]):
            if b0 <= a <= b1:
                return q0 + (q1 - q0) * (a - b0) / (b1 - b0)
        return inner[-1][1]
    n = max(2, int(abs(a1 - a0) / step))
    angs = [a0 + (a1 - a0) * i / n for i in range(n + 1)]
    outer = [on_circle(*c, r_out, a) for a in angs]
    inn = [on_circle(*c, r_in(a), a) for a in reversed(angs)]
    pts = [(*outer[0], "c"), *outer[1:-1], (*outer[-1], "c"), (*inn[0], "c"), *inn[1:-1], (*inn[-1], "c")]
    return path(smooth(pts), cls)


def arcline(c, r, a0, a1, cls="t"):
    return path(arc(*c, r, a0, a1), cls)


def fork_g(*parts):
    """Lagi rysowane pionowo (oś koła = FA) i obrócone o kąt główki."""
    return g(*parts, transform=f"rotate({-RAKE} {f(FA[0])} {f(FA[1])})")


def frect(o0, o1, t0, t1, rx=0, cls="o w"):
    """Prostokąt w układzie lagi: o - w przód od osi lagi, t - w górę od osi koła."""
    return rect(FA[0] + o0, FA[1] - t1, o1 - o0, t1 - t0, rx, cls)


def cyl_g(sign, *parts):
    """Cylinder rysowany pionowo nad wałem C i obrócony: +1 przedni, -1 tylny."""
    return g(*parts, transform=f"rotate({f(sign * V_HALF)} {f(C[0])} {f(C[1])})")


def cylinder():
    cx, cy = C
    out = [rect(cx - 94, cy - 305, 188, 155, 6, "o w")]
    for i in range(11):
        y = cy - 162 - 13 * i
        out.append(line(cx - 94, y, cx + 94, y, "t"))
    out.append(rect(cx - 103, cy - 400, 206, 95, 12, "o w"))
    for t in (325, 348, 371):
        out.append(line(cx - 103, cy - t, cx + 103, cy - t, "t"))
    out.append(path(smooth([
        (cx - 88, cy - 400, "c"), (cx - 82, cy - 424), (cx - 44, cy - 436), (cx + 44, cy - 436),
        (cx + 82, cy - 424), (cx + 88, cy - 400, "c"),
    ]), "o w"))
    return out


def tread_lines(cx, cy, r):
    return circle(cx, cy, r, "t")


# ─── BOK: warstwa spodnia (koła, tarcze, koło pasowe) ───────────────────────────
side0 = [
    wheel_side(*RA, RR, RRIM, "wire", hub_r=58, rot=90),
    wheel_side(*FA, FR, FRIM, "wire", hub_r=54, rot=90),
]
sideR0 = [
    circle(*FA, 114, "t w"),
    brake_disc_side(*FA, 150, holes=12, buttons=6),
    circle(*FA, 54, "d w"),
    circle(*FA, 30, "t"),
    caliper_side(*FA, 150, 160, span=36, inner=36, outer=16),
    circle(*RA, 110, "t w"),
    brake_disc_side(*RA, 145, holes=10, buttons=5),
    circle(*RA, 58, "d w"),
    caliper_side(*RA, 145, 300, span=36, inner=34, outer=16),
]
# koło pasowe i pasek (pasek biegnie pod wahaczem, osłona pasa na wierzchu w sideL)
FP = (650, -395)    # zębatka przekładni (schowana za pokrywą primary)
FPR, RPR = 52, 160


def belt_pts():
    dx, dy = RA[0] - FP[0], RA[1] - FP[1]
    dd = math.hypot(dx, dy)
    base = math.atan2(-dy, dx)            # kąt w układzie y w górę
    off = math.asin((RPR - FPR) / dd)
    up = math.degrees(base) + 90 + math.degrees(off)
    lo = math.degrees(base) - 90 - math.degrees(off)
    return up, lo


_up, _lo = belt_pts()
sideL0 = [
    circle(*RA, RPR + 8, "d w"),
]
_bt0 = on_circle(*FP, FPR + 8, _up)
_bt1 = on_circle(*RA, RPR + 8, _up)
_bb0 = on_circle(*FP, FPR + 8, _lo)
_bb1 = on_circle(*RA, RPR + 8, _lo)
sideL0.append(path(f"M{f(_bt0[0])} {f(_bt0[1])}L{f(_bt1[0])} {f(_bt1[1])}"
                   f"A{RPR + 8} {RPR + 8} 0 1 1 {f(_bb1[0])} {f(_bb1[1])}L{f(_bb0[0])} {f(_bb0[1])}", "d"))
_bt0i = on_circle(*FP, FPR, _up)
_bt1i = on_circle(*RA, RPR, _up)
_bb0i = on_circle(*FP, FPR, _lo)
_bb1i = on_circle(*RA, RPR, _lo)
sideL0.append(path(f"M{f(_bt0i[0])} {f(_bt0i[1])}L{f(_bt1i[0])} {f(_bt1i[1])}"
                   f"A{RPR} {RPR} 0 1 1 {f(_bb1i[0])} {f(_bb1i[1])}L{f(_bb0i[0])} {f(_bb0i[1])}", "t"))
sideL0.append(circle(*RA, RPR - 22, "t"))
for i in range(6):
    x, y = on_circle(*RA, RPR - 70, i * 60 + 30)
    sideL0.append(circle(x, y, 22, "t"))
sideL0.append(circle(*RA, 50, "d w"))

# ─── BOK: wspólne (prawy bok, przód w +x) ──────────────────────────────────────
side = []
# rama: rura przednia (dolna) i kołyska pod silnikiem
side.append(thick([(1262, -880), (1240, -700), (1218, -520), (1200, -360), (1186, -250),
                   (1150, -186), (1060, -160), (880, -152), (720, -160), (640, -196),
                   (606, -280)], 46, "d w"))
# rama za skrzynią (słupek siodła)
side.append(thick([(730, -720), (690, -600), (650, -480), (612, -370)], 40, "d w"))

# błotnik tylny z głębokim fartuchem
side.append(fender(RA, 366, [(68, 334), (84, 314), (104, 302), (192, 300)], 68, 192))
side.append(arcline(RA, 354, 72, 189, "t"))
# lampa tylna na błotniku
side.append(path(smooth([
    (*on_circle(*RA, 364, 154), "c"), (*on_circle(*RA, 392, 152.5), "c"), on_circle(*RA, 397, 147.5),
    (*on_circle(*RA, 392, 142.5), "c"), (*on_circle(*RA, 364, 141), "c"),
]), "d w"))
side.append(path(smooth([
    (*on_circle(*RA, 392, 152.5), "c"), on_circle(*RA, 397, 147.5), (*on_circle(*RA, 392, 142.5), "c"),
    (*on_circle(*RA, 384, 143.5), "c"), (*on_circle(*RA, 384, 151.5), "c"),
]), "d l"))
# uchwyt i tablica rejestracyjna
side.append(path(poly([(-345, -452), (-382, -452), (-382, -436), (-348, -436)]), "d w"))
side.append(rect(-392, -490, 12, 126, 3, "o w"))

# wahacz (trójkątny, amortyzator schowany pod siedzeniem)
P = (600, -350)     # oś wahacza
T = (450, -566)     # wierzchołek trójkąta (schowany za osłoną pod siedzeniem)
side.append(thick([(20, -352), (120, -420), (250, -500), (370, -550), (T[0], T[1])], 40, "d w"))
side.append(thick([(T[0], T[1]), (520, -470), (588, -366)], 40, "d w"))
side.append(thick([(P[0], P[1]), (420, -342), (200, -334), (-14, -328)], 58, "o w"))
side.append(circle(*P, 30, "d w"))
side.append(circle(*P, 12, "t"))
side.append(circle(*RA, 30, "d w"))
side.append(circle(*RA, 13, "d"))

# skrzynia korbowa + skrzynia biegów
side.append(path(smooth([
    (1110, -488, "c"), (1128, -420), (1112, -330), (1064, -264), (960, -230), (850, -240),
    (760, -262), (660, -276), (602, -300), (586, -380), (600, -452), (640, -480, "c"),
    (815, -488, "c"), (960, -545), (1110, -488, "c"),
]), "o w"))
side.append(path(smooth([(782, -270), (790, -380), (814, -470)], closed=False), "t"))
# cylindry (najpierw tylny, przedni go przesłania)
side.append(cyl_g(-1, *cylinder()))
side.append(cyl_g(+1, *cylinder()))

# osłona pod siedzeniem (akumulator / zbiornik oleju)
side.append(path(smooth([
    (676, -622), (580, -626), (480, -612), (430, -566), (440, -500), (520, -468),
    (620, -470), (690, -520), (706, -584),
]), "o w"))
side.append(path(smooth([(640, -598), (540, -600), (474, -578)], closed=False), "t"))

# zbiornik (kropla)
side.append(path(smooth([
    (1252, -950, "c"), (1180, -973), (1090, -981), (990, -973), (900, -952), (832, -918),
    (788, -874), (774, -846, "c"), (860, -832), (980, -840), (1100, -855), (1258, -878, "c"),
]), "o w"))
side.append(path(smooth([(1214, -916), (1100, -920), (980, -908), (880, -884), (818, -856)], closed=False), "t"))
side.append(rect(982, -984, 56, 12, 5, "d w"))

# siedzenie schodkowe: kierowca nisko, pasażer wyżej
side.append(path(smooth([
    (852, -931, "c"), (790, -884), (705, -802), (615, -722), (530, -688), (470, -684),
    (418, -694), (386, -722), (366, -764), (346, -790, "c"), (300, -800), (180, -808),
    (60, -802), (-20, -786), (-66, -760, "c"), (-62, -688, "c"), (0, -694),
    (80, -688), (160, -668), (260, -648), (420, -634), (540, -630), (640, -664), (722, -736),
    (790, -820), (836, -884),
]), "o w"))
side.append(path(smooth([(344, -790), (348, -720), (336, -664)], closed=False), "d"))
side.append(path(smooth([(816, -890), (720, -798), (620, -716), (520, -672), (430, -676), (380, -706)], closed=False), "t"))
side.append(path(smooth([(326, -784), (180, -790), (50, -786), (-46, -764)], closed=False), "t"))

# kierunkowskaz tylny (na boku błotnika)
_ts = on_circle(*RA, 362, 128)
side.append(path(poly([(_ts[0] + 8, _ts[1] - 6), (-262, -618), (-262, -606), (_ts[0] + 8, _ts[1] + 6)]), "d w"))
side.append(ellipse(-286, -612, 28, 16, "d w"))
side.append(path(smooth([(-296, -626), (-314, -612), (-296, -598, "c")]), "d l"))

# błotnik przedni (głęboki)
side.append(arcband(FA, 304, 374, 18, 150, "o w"))
side.append(arcline(FA, 360, 22, 146, "t"))

# lagi klasyczne (rury nośne na górze, goleń na dole), osłony, półki
side.append(fork_g(
    frect(-23, 23, 280, 600, 4, "d w"),
    frect(-38, 38, -40, 300, 26, "o w"),
    frect(-32, 32, 286, 304, 3, "d w"),
    frect(-82, 46, 590, 628, 10, "d w"),
    frect(-34, 34, 626, 726, 6, "o w"),
    frect(-80, 42, 724, 752, 10, "d w"),
    frect(-62, -32, 750, 800, 6, "d w"),
))
side.append(circle(*FA, 30, "d w"))
side.append(circle(*FA, 12, "d"))

# reflektor (okrągły, czasza za kloszem)
HL = (1520, -872)
side.append(path(smooth([
    along(FA, RAKE, 609, 40), (1398, -890), (1398, -862), along(FA, RAKE, 590, 40),
]), "d w"))
side.append(path(smooth([
    (HL[0] - 8, HL[1] - 98, "c"), (HL[0] - 74, HL[1] - 86), (HL[0] - 118, HL[1] - 40),
    (HL[0] - 124, HL[1]), (HL[0] - 118, HL[1] + 40), (HL[0] - 74, HL[1] + 86), (HL[0] - 8, HL[1] + 98, "c"),
]), "o w"))
side.append(path(smooth([
    (HL[0] - 8, HL[1] - 98, "c"), (HL[0] + 6, HL[1] - 96), (HL[0] + 12, HL[1] - 50), (HL[0] + 14, HL[1]),
    (HL[0] + 12, HL[1] + 50), (HL[0] + 6, HL[1] + 96), (HL[0] - 8, HL[1] + 98, "c"),
]), "d l"))
side.append(path(smooth([(HL[0] - 70, HL[1] - 82), (HL[0] - 104, HL[1] - 30)], closed=False), "t"))

# kierunkowskaz przedni (na osłonie lagi)
_fs = along(FA, RAKE, 660, 30)
side.append(ellipse(1342, -962, 28, 16, "d w"))
side.append(path(smooth([(1352, -976), (1370, -962), (1352, -948, "c")]), "d l"))

# kierownica (szeroka, cofnięta), manetka, dźwignia, lusterko
_cl = along(FA, RAKE, 785, -47)
# zegar na kierownicy (za kierownicą)
side.append(ellipse(_cl[0] - 4, _cl[1] - 24, 36, 17, "d w", rot=-28))
side.append(thick([(_cl[0] + 2, _cl[1] + 2), (_cl[0] + 13, _cl[1] - 20), (1178, -1032), (1120, -1037), (1086, -1035)], 24, "d w"))
side.append(rect(_cl[0] - 24, _cl[1] - 6, 48, 18, 6, "d w"))
side.append(thick([(1112, -1046), (1060, -1053), (1004, -1056)], 11, "d w"))
side.append(thick([(1088, -1035), (1040, -1032), (990, -1028)], 38, "o w"))
side.append(path(smooth([(1086, -1050, "c"), (1114, -1050, "c"), (1114, -1020, "c"), (1086, -1018, "c")]), "d w"))
side.append(line(1102, -1050, 1104, -1074, "d"))
side.append(ellipse(1104, -1110, 14, 38, "o w"))


def peg_side(x, y, r=24):
    return [circle(x, y, r, "d w"), circle(x, y, r * 0.55, "t")]


def pegs_common():
    out = []
    # podnóżek pasażera (złożony uchwyt)
    out.append(thick([(386, -452), (350, -424), (330, -410)], 22, "d w"))
    out += peg_side(330, -410, 20)
    # podnóżek kierowcy wysunięty do przodu (forward controls)
    out.append(path(smooth([(1150, -300, "c"), (1196, -306), (1232, -344, "c"), (1210, -372), (1166, -340, "c")]), "d w"))
    out += peg_side(1222, -352, 26)
    return out


# ─── tylko prawy bok: filtr powietrza, pokrywy, wydech, pedał hamulca ──────────
sideR = []
# pokrywa rozrządu
sideR.append(ellipse(1018, -356, 74, 52, "d w", rot=-18))
sideR.append(ellipse(1018, -356, 58, 38, "t", rot=-18))
# filtr powietrza (okrągła pokrywa w V)
sideR.append(circle(960, -662, 118, "o w"))
sideR.append(circle(960, -662, 98, "t"))
sideR.append(circle(960, -662, 22, "d w"))
# kolektor przedni -> dolny tłumik
sideR.append(thick([(1146, -690), (1186, -630), (1206, -520), (1194, -410), (1140, -330),
                    (1030, -294), (880, -284), (700, -290), (540, -302), (470, -308)], 46, "d w"))
# kolektor tylny -> górny tłumik
sideR.append(thick([(836, -708), (790, -660), (730, -592), (660, -536), (580, -500),
                    (500, -482), (440, -476)], 46, "d w"))
# osłony termiczne na kolektorach
sideR.append(thick([(1192, -600), (1204, -500), (1188, -400)], 56, "d w"))
sideR.append(thick([(770, -638), (700, -562), (620, -514)], 56, "d w"))
# tłumiki: dolny (z przedniego cylindra) i górny (z tylnego), lekko uniesione ku tyłowi
MUFF = [((470, -309), (-218, -372)), ((440, -477), (-188, -540))]
MW = 94
for (x0, y0), (x1, y1) in MUFF:
    ln = math.hypot(x1 - x0, y1 - y0)
    ux, uy = (x1 - x0) / ln, (y1 - y0) / ln
    cone_end = (x0 + ux * 96, y0 + uy * 96)
    sideR.append(tube((x0 + ux * 10, y0 + uy * 10), cone_end, 46, MW, "d w", round_end=False))
    sideR.append(tube((x0 + ux * 90, y0 + uy * 90), (x1, y1), MW, MW, "o w"))
    for t in (150, ln - 70):
        cx_, cy_ = x0 + ux * t, y0 + uy * t
        sideR.append(line(cx_ - uy * (MW / 2 - 2), cy_ + ux * (MW / 2 - 2),
                          cx_ + uy * (MW / 2 - 2), cy_ - ux * (MW / 2 - 2), "t"))
    sideR.append(ellipse(x1 + ux * 8, y1 + uy * 8, 13, MW / 2 - 8, "d w", rot=math.degrees(math.atan2(uy, ux))))
# pedał hamulca (forward control)
sideR.append(thick([(1176, -318), (1214, -380), (1250, -424)], 16, "d w"))
sideR.append(path(smooth([(1232, -444, "c"), (1286, -432, "c"), (1282, -410, "c"), (1228, -420, "c")]), "d w"))
sideR += pegs_common()

# ─── tylko lewy bok: pokrywa primary, osłona pasa, zmiana biegów, stopka ──────
sideL = []
# stopka boczna (złożona)
sideL.append(thick([(842, -214), (700, -196), (548, -178)], 24, "d w"))
sideL.append(circle(842, -214, 16, "d w"))
# drążek zmiany biegów
sideL.append(thick([(1176, -318), (980, -276), (820, -268)], 12, "d w"))
# osłona pasa (górna)
sideL.append(path(smooth([
    (560, -470, "c"), (360, -486), (160, -500), (100, -508, "c"), (96, -484), (150, -476),
    (360, -462), (556, -446, "c"),
]), "d w"))
# pokrywa primary (napęd pierwotny + sprzęgło)
sideL.append(path(smooth([
    (1074, -400), (1050, -470), (960, -500), (800, -522), (690, -528), (590, -500), (556, -420),
    (580, -318), (690, -262), (800, -262), (960, -282), (1050, -320),
]), "o w"))
sideL.append(circle(690, -398, 92, "d w"))
for i in range(5):
    x, y = on_circle(690, -398, 76, 90 + i * 72)
    sideL.append(circle(x, y, 7, "t"))
sideL.append(ellipse(890, -440, 56, 30, "d w", rot=4))
sideL.append(circle(990, -390, 40, "t"))
# dźwignia zmiany biegów (forward control)
sideL.append(thick([(1176, -318), (1214, -380), (1250, -424)], 16, "d w"))
sideL.append(path(smooth([(1232, -444, "c"), (1286, -432, "c"), (1282, -410, "c"), (1228, -420, "c")]), "d w"))
sideL += pegs_common()


# ─── PRZÓD (oś x = 0, lewa strona rysunku = prawa strona motocykla) ─────────────
# połówka kierownicy widziana z przodu / z tyłu (x > 0)
HBAR = [
    rect(26, -1016, 30, 28, 6, "d w"),
    thick([(40, -1006), (110, -1026), (220, -1036), (320, -1036)], 24, "d w"),
    rect(316, -1054, 128, 36, 16, "o w"),
    rect(296, -1060, 30, 46, 8, "d w"),
    thick([(326, -1064), (400, -1068), (452, -1062)], 11, "d w"),
    line(312, -1058, 408, -1092, "d"),
]
front = []
front.append(tire_end(0, 200, 652, corner=80, lines=4))
# tłumiki widziane z przodu (prawa strona = -x)
front.append(rect(-277, -419, 94, 157, 47, "d w"))
front.append(rect(-253, -587, 94, 157, 47, "d w"))
# skrzynia korbowa i pokrywy boczne
front.append(path(smooth(sym([(0, -545), (140, -540), (152, -420), (140, -260), (90, -228), (0, -226)])), "o w"))
front.append(rect(150, -522, 66, 262, 26, "d w"))          # primary (lewa)
front.append(rect(-176, -400, 30, 92, 10, "d w"))           # pokrywa rozrządu (prawa)
# cylinder przedni (zasłania tylny)
cyl_front = [rect(-94, -662, 188, 140, 6, "o w")]
for i in range(9):
    cyl_front.append(line(-94, -534 - 14 * i, 94, -534 - 14 * i, "t"))
cyl_front.append(rect(-104, -750, 208, 90, 12, "o w"))
for y in (-680, -704, -728):
    cyl_front.append(line(-104, y, 104, y, "t"))
cyl_front.append(path(smooth(sym([(0, -786), (60, -782), (86, -766), (88, -750, "c"), (0, -750)])), "o w"))
front += cyl_front
# filtr powietrza (prawa)
front.append(rect(-254, -780, 102, 236, 34, "o w"))
front.append(line(-232, -760, -232, -564, "t"))
# kolektor przedni (prawa)
front.append(thick([(-96, -690), (-150, -650), (-176, -560), (-180, -420), (-184, -330)], 46, "d w"))
front.append(ellipse(-184, -326, 23, 12, "d w"))
# zbiornik za reflektorem
front.append(path(smooth(sym([(0, -981), (110, -975), (164, -952), (182, -910), (172, -872), (130, -856, "c"), (0, -852)])), "o w"))
# podnóżki wysunięte i pedały
front.append(mirror_x(
    rect(140, -372, 120, 28, 10, "d w"),
    rect(250, -374, 124, 44, 20, "d w"),
    rect(262, -442, 84, 24, 10, "d w"),
    line(300, -418, 284, -374, "d"),
))
# opona przednia i błotnik
front.append(tire_end(0, 124, 676, corner=56, lines=3))
front.append(path(smooth(sym([(0, -714), (56, -706), (82, -680), (90, -600), (90, -446, "c"), (0, -446)])), "o w"))
front.append(path(smooth([(-70, -458), (0, -462), (70, -458)], closed=False), "t"))
# zacisk przedni (prawa)
front.append(rect(-104, -452, 36, 104, 8, "d w"))
# lagi
front.append(mirror_x(
    rect(95, -850, 46, 260, 4, "d w"),
    rect(80, -600, 76, 300, 26, "o w"),
    rect(84, -602, 68, 16, 3, "d w"),
    circle(118, -338, 20, "d w"),
    rect(84, -966, 68, 98, 6, "o w"),
))
front.append(rect(-164, -884, 328, 36, 10, "o w"))
front.append(rect(-158, -992, 316, 28, 10, "o w"))
# reflektor
front.append(circle(0, -872, 102, "o w"))
front.append(circle(0, -872, 86, "d l"))
front.append(circle(0, -872, 34, "t"))
# kierunkowskazy przednie
front.append(mirror_x(
    rect(150, -969, 60, 14, 4, "d w"),
    circle(232, -962, 26, "d w"),
    circle(232, -962, 17, "d l"),
))
# kierownica, manetki, lusterka
front.append(rect(-50, -1030, 100, 32, 12, "d w"))
front.append(mirror_x(*HBAR))
front.append(mirror_x(circle(436, -1110, 38, "o w")))

# ─── TYŁ (prawa strona rysunku = prawa strona motocykla) ───────────────────────
rear = []
# kierownica i lusterka (z tyłu widać szkło)
rear.append(mirror_x(circle(436, -1110, 38, "o w"), circle(436, -1110, 29, "d l")))
rear.append(mirror_x(*HBAR))
# kierunkowskazy przednie (wystają za zbiornikiem)
rear.append(mirror_x(rect(150, -969, 60, 14, 4, "d w"), circle(232, -962, 26, "d w")))
# zbiornik
rear.append(path(smooth(sym([(0, -981), (110, -975), (164, -952), (182, -910), (172, -872), (130, -856, "c"), (0, -852)])), "o w"))
# podnóżki kierowcy
rear.append(mirror_x(
    rect(140, -372, 120, 28, 10, "d w"),
    rect(250, -374, 124, 44, 20, "d w"),
    rect(262, -442, 84, 24, 10, "d w"),
))
# cylinder tylny
cyl_rear = [rect(-94, -662, 188, 140, 6, "o w")]
for i in range(9):
    cyl_rear.append(line(-94, -534 - 14 * i, 94, -534 - 14 * i, "t"))
cyl_rear.append(rect(-104, -750, 208, 90, 12, "o w"))
cyl_rear.append(path(smooth(sym([(0, -786), (60, -782), (86, -766), (88, -750, "c"), (0, -750)])), "o w"))
rear += cyl_rear
# skrzynia korbowa, primary (lewa = -x), filtr (prawa = +x)
rear.append(path(smooth(sym([(0, -545), (140, -540), (152, -420), (140, -260), (90, -228), (0, -226)])), "o w"))
rear.append(rect(-216, -522, 66, 262, 26, "d w"))
rear.append(rect(152, -780, 102, 236, 34, "o w"))
# osłony pod siedzeniem
rear.append(mirror_x(rect(136, -626, 34, 156, 12, "d w")))
# siedzenie kierowcy (szersze, za kanapą pasażera)
rear.append(path(smooth(sym([(0, -932), (46, -928), (100, -870), (156, -806), (184, -740), (188, -690), (178, -640), (146, -628, "c"), (0, -628)])), "o w"))
rear.append(path(smooth([(-150, -792), (-60, -884), (0, -894), (60, -884), (150, -792)], closed=False), "t"))
# wahacz
rear.append(mirror_x(rect(106, -362, 44, 66, 10, "d w")))
# osłona pasa (lewa)
rear.append(rect(-142, -510, 26, 66, 6, "d w"))
# podnóżki pasażera
rear.append(mirror_x(rect(126, -428, 120, 36, 14, "d w")))
# tłumiki (prawa strona = +x), jeden nad drugim
for cx_, cy_, cyf in ((230, -372, -309), (206, -540, -477)):
    rear.append(rect(cx_ - 47, cy_ - 47, 94, cyf - cy_ + 94, 47, "d w"))
    rear.append(circle(cx_, cy_, 47, "o w"))
    rear.append(circle(cx_, cy_, 34, "d"))
    rear.append(circle(cx_, cy_, 21, "t"))
# opona tylna i błotnik
rear.append(tire_end(0, 200, 652, corner=80, lines=4))
rear.append(path(smooth(sym([(0, -696), (92, -686), (130, -650), (138, -560), (138, -260, "c"), (0, -260)])), "o w"))
rear.append(path(smooth([(-110, -276), (0, -280), (110, -276)], closed=False), "t"))
rear.append(mirror_x(path(smooth([(118, -640), (124, -560), (124, -280)], closed=False), "t")))
# kanapa pasażera
rear.append(path(smooth(sym([(0, -808), (96, -802), (128, -780), (136, -730), (126, -704, "c"), (0, -700)])), "o w"))
rear.append(path(smooth([(-112, -770), (-60, -786), (0, -790), (60, -786), (112, -770)], closed=False), "t"))
# lampa tylna
rear.append(rect(-62, -548, 124, 50, 16, "o w"))
rear.append(rect(-50, -540, 100, 34, 10, "d l"))
# tablica
rear.append(rect(-96, -490, 192, 126, 8, "o w"))
rear.append(rect(-86, -480, 172, 106, 5, "t"))
# kierunkowskazy tylne
rear.append(mirror_x(rect(134, -619, 30, 14, 4, "d w"), circle(178, -612, 20, "d w"), circle(178, -612, 13, "d l")))

# ─── GÓRA (przód w +x, prawa strona motocykla po +y) ───────────────────────────
top = []
top.append(rect(-326, -100, 652, 200, 86, "x g"))
top.append(rect(1292, -62, 676, 124, 58, "x g"))
# podnóżki wysunięte, pedały
top.append(mirror_y(
    rect(1150, -260, 56, 120, 12, "d w"),
    rect(1196, -374, 54, 128, 22, "d w"),
    rect(1238, -350, 48, 92, 12, "d w"),
))
# cylindry (głowice wystają spod zbiornika)
for x0, x1 in ((704, 936), (984, 1216)):
    top.append(rect(x0, -104, x1 - x0, 208, 24, "o w"))
    for i in range(1, 6):
        x = x0 + (x1 - x0) * i / 6
        top.append(line(x, -104, x, 104, "t"))
# pokrywa primary (lewa = -y)
top.append(path(smooth([
    (1074, -150, "c"), (1060, -196), (960, -214), (700, -220), (590, -206), (556, -150, "c"),
]), "o w"))
# osłona pasa (lewa)
top.append(rect(100, -164, 460, 30, 10, "d w"))
# wydech (prawa): dolny tłumik szerzej, górny na nim
top.append(thick([(1150, 100), (1196, 160), (1186, 210), (1100, 230), (880, 230), (470, 230)], 46, "d w"))
top.append(tube((480, 230), (384, 230), 46, 94, "d w", round_end=False))
top.append(tube((390, 230), (-218, 230), 94, 94, "o w"))
top.append(mirror_y(rect(310, -246, 40, 124, 14, "d w")))
top.append(thick([(836, 104), (790, 170), (700, 198), (520, 206), (440, 206)], 46, "d w"))
top.append(tube((450, 206), (354, 206), 46, 94, "d w", round_end=False))
top.append(tube((360, 206), (-188, 206), 94, 94, "o w"))
for x in (290, -118):
    top.append(line(x, 161, x, 251, "t"))
# filtr powietrza (prawa = +y)
top.append(rect(842, 146, 236, 102, 34, "o w"))
top.append(line(860, 226, 1060, 226, "t"))
# kierunkowskazy tylne
top.append(mirror_y(
    path(poly([(-224, -128), (-262, -170), (-270, -162), (-232, -122)]), "d w"),
    ellipse(-288, -176, 28, 18, "d w"),
))
# błotnik tylny
top.append(path(smooth(sym_y([(186, 0), (186, -120, "c"), (100, -134), (-200, -136), (-320, -124), (-362, -80), (-368, 0)])), "o w"))
top.append(path(smooth(sym_y([(-300, 0), (-302, -50), (-326, -56, "c"), (-346, -50), (-348, 0)])), "d l"))
# tablica
top.append(rect(-394, -96, 14, 192, 3, "o w"))
top.append(rect(-382, -14, 40, 28, 3, "d w"))
# zbiornik (kropla z góry)
top.append(path(smooth(sym_y([
    (1258, 0), (1252, -112), (1214, -166), (1130, -184), (1020, -176), (920, -146),
    (844, -100), (794, -48), (782, 0),
])), "o w"))
top.append(path(smooth(sym_y([(1210, 0), (1204, -108), (1130, -150), (1000, -146), (880, -104), (826, -50), (816, 0)])), "t"))
top.append(circle(1010, 0, 30, "d w"))
top.append(circle(1010, 0, 18, "t"))
# siedzenie kierowcy
top.append(path(smooth(sym_y([
    (862, 0), (856, -40), (800, -76), (700, -118), (580, -168), (470, -184), (392, -176), (350, -150, "c"), (344, 0),
])), "o w"))
top.append(path(smooth(sym_y([(816, 0), (806, -36), (700, -92), (580, -140), (470, -154), (400, -142, "c"), (396, 0)])), "t"))
# kanapa pasażera
top.append(path(smooth(sym_y([
    (364, 0), (360, -126, "c"), (240, -136), (100, -132), (0, -120), (-52, -94), (-68, 0),
])), "o w"))
top.append(path(smooth(sym_y([(326, 0), (322, -60), (316, -104, "c"), (100, -110), (-10, -96), (-34, 0)])), "t"))
# błotnik przedni
top.append(path(smooth(sym_y([(1990, 0), (1984, -56), (1950, -86), (1800, -90), (1500, -90), (1330, -86), (1306, -60), (1302, 0)])), "o w"))
top.append(line(1340, 0, 1960, 0, "t"))
# lagi i półki
top.append(mirror_y(
    rect(1330, -141, 160, 46, 4, "d w"),
    rect(1470, -156, 200, 76, 26, "o w"),
))
top.append(rect(1286, -164, 72, 328, 12, "o w"))
top.append(mirror_y(rect(1240, -152, 60, 68, 8, "o w")))
top.append(rect(1226, -158, 62, 316, 12, "o w"))
# reflektor
top.append(path(smooth(sym_y([(1534, 0), (1532, -96, "c"), (1490, -100), (1440, -88), (1404, -52), (1396, 0)])), "o w"))
top.append(rect(1514, -100, 22, 200, 8, "d l"))
# kierunkowskazy przednie
top.append(mirror_y(
    path(poly([(1298, -150), (1326, -218), (1340, -214), (1312, -146)]), "d w"),
    ellipse(1342, -232, 28, 17, "d w"),
))
# kierownica, manetki, dźwignie, lusterka
top.append(circle(1188, 0, 48, "d w"))
top.append(circle(1188, 0, 36, "d l"))
top.append(mirror_y(
    thick([(1196, -40), (1214, -120), (1196, -250), (1136, -332), (1080, -372)], 26, "d w"),
    thick([(1084, -370), (1034, -406), (990, -440)], 38, "o w"),
    thick([(1116, -344), (1080, -394), (1040, -436)], 12, "d w"),
    rect(1094, -360, 34, 40, 8, "d w"),
    line(1106, -356, 1104, -416, "d"),
    ellipse(1104, -436, 15, 38, "o w", rot=-14),
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
