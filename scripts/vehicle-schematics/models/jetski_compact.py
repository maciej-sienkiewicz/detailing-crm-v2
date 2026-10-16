"""Skuter wodny kompaktowy 2-osobowy (klasa lekkich skuterów rekreacyjnych).

Wymiary: długość 2800 (od dyszy do dzioba), szerokość 1180 (odbojnik w najszerszym
miejscu), wysokość 1050 (lusterka nad stępką). Brak kół: y = 0 to stępka.
x = 0 to koniec dyszy odrzutu, pawęż (rufa) przy x = 112, nos dzioba przy x = 2800.
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from lib import *  # noqa: E402,F403


# ─── pomocniki ───────────────────────────────────────────────────────────────


def dense(points, closed=False, n=16, tension=0.5):
    """Próbkuje krzywą dokładnie tak, jak rysuje ją smooth() (Catmull-Rom -> Bezier)."""
    pts = [(p[0], p[1], len(p) > 2 and p[2] == "c") for p in points]
    cnt = len(pts)

    def get(i):
        if closed:
            return pts[i % cnt]
        return pts[max(0, min(cnt - 1, i))]

    k = tension / 3.0
    out = []
    segs = cnt if closed else cnt - 1
    for i in range(segs):
        p0, p1, p2, p3 = get(i - 1), get(i), get(i + 1), get(i + 2)
        c1 = (p1[0], p1[1]) if p1[2] else (p1[0] + (p2[0] - p0[0]) * k, p1[1] + (p2[1] - p0[1]) * k)
        c2 = (p2[0], p2[1]) if p2[2] else (p2[0] - (p3[0] - p1[0]) * k, p2[1] - (p3[1] - p1[1]) * k)
        for j in range(n):
            t = j / n
            m = 1 - t
            out.append((
                m ** 3 * p1[0] + 3 * m * m * t * c1[0] + 3 * m * t * t * c2[0] + t ** 3 * p2[0],
                m ** 3 * p1[1] + 3 * m * m * t * c1[1] + 3 * m * t * t * c2[1] + t ** 3 * p2[1],
            ))
    if not closed:
        out.append((pts[-1][0], pts[-1][1]))
    return out


def y_at(curve, x):
    """Wysokość krzywej (próbkowanej) w punkcie x."""
    for a, b in zip(curve, curve[1:]):
        if (a[0] - x) * (b[0] - x) <= 0 and a[0] != b[0]:
            t = (x - a[0]) / (b[0] - a[0])
            return a[1] + t * (b[1] - a[1])
    raise ValueError(f"x={x} poza krzywą")


def offset_closed(curve, d):
    """Krzywa zamknięta (gęsta) przesunięta o d do środka."""
    n = len(curve)
    area = sum(curve[i][0] * curve[(i + 1) % n][1] - curve[(i + 1) % n][0] * curve[i][1] for i in range(n))
    sgn = 1 if area > 0 else -1
    out = []
    for i in range(n):
        a, b = curve[i - 1], curve[(i + 1) % n]
        tx, ty = b[0] - a[0], b[1] - a[1]
        ln = math.hypot(tx, ty) or 1
        nx, ny = -ty / ln * sgn, tx / ln * sgn
        out.append((curve[i][0] + nx * d, curve[i][1] + ny * d))
    return out


def side_band(curve_top, curve_bot, x0, x1, inset_top, inset_bot, steps=10):
    """Górna i dolna krawędź pasa między dwiema krzywymi boku (od x0 do x1)."""
    top = [(x0 + (x1 - x0) * i / steps, 0) for i in range(steps + 1)]
    top = [(x, y_at(curve_top, x) + inset_top) for x, _ in top]
    bot = [(x1 - (x1 - x0) * i / steps, 0) for i in range(steps + 1)]
    bot = [(x, y_at(curve_bot, x) - inset_bot) for x, _ in bot]
    return top, bot




# ─── BOK: krzywe wspólne ─────────────────────────────────────────────────────

# oś odbojnika (od rufy do dzioba); odbojnik ma 50 mm wysokości, na nosie zaokrąglony
S = [(112, -360), (600, -363), (1200, -373), (1700, -391), (2050, -413), (2350, -444),
     (2550, -474), (2680, -502), (2750, -524)]
RRT_D = dense([(x, y - 25) for x, y in S])
RRB_D = dense([(x, y + 25) for x, y in S])

# górna krawędź burty: platforma -> burta studzienki -> bark pokładu dziobowego -> nos
SH = [(113, -405, "c"), (190, -407), (255, -425), (330, -468), (440, -513), (600, -538),
      (900, -552), (1200, -562), (1420, -575), (1560, -594), (1690, -626), (1820, -650),
      (1980, -664), (2160, -664), (2350, -650), (2500, -628), (2620, -600), (2700, -578),
      (2750, -562), (2780, -552, "c")]
SH_D = dense(SH)

# grzbiet pokrywy dziobowej (oś symetrii), zaokrąglony nos
TOP = [(1600, -805), (1700, -822), (1850, -830), (2000, -826), (2200, -808), (2400, -772),
       (2550, -730), (2660, -684), (2730, -637), (2770, -598), (2786, -570), (2784, -550, "c")]
TOP_D = dense(TOP)

# ogon za siedzeniem (od platformy do siedzenia)
TAIL = [(290, -405, "c"), (330, -440), (372, -510), (402, -600), (425, -700), (446, -786, "c")]

side = []

# pokład górny: konsola pod siedzeniem + pokrywa dziobowa (dolna krawędź za burtą)
side.append(path(smooth(TAIL + [(1000, -790), (1590, -797)] + TOP[1:] + [
    (2700, -540), (2300, -560), (1800, -560), (1500, -520), (600, -500), (310, -405, "c"),
]), "o w"))
# tylny szew pokrywy dziobowej (przy osłonie kierownicy)
side.append(line(1800, -790, 1800, y_at(TOP_D, 1800), "d"))
# schowek dziobowy (pokrywa na grzbiecie, przed osłoną kierownicy)
LID0, LID1 = 1905, 2195
side.append(path(smooth([
    (LID0, y_at(TOP_D, LID0), "c"), (LID0 + 4, y_at(TOP_D, LID0) + 24),
    ((LID0 + LID1) / 2, y_at(TOP_D, (LID0 + LID1) / 2) + 26),
    (LID1 - 4, y_at(TOP_D, LID1) + 26), (LID1, y_at(TOP_D, LID1), "c"),
], closed=False), "d"))

# siedzenie dwuosobowe (część pasażera wyżej)
side.append(path(smooth([
    (445, -790, "c"), (430, -808), (428, -836), (445, -858), (490, -869), (600, -872), (760, -870),
    (870, -863), (930, -853), (1050, -846), (1300, -842), (1460, -836), (1540, -831), (1584, -826),
    (1612, -815), (1620, -795, "c"),
]), "o w"))
side.append(path(smooth([
    (448, -804), (452, -840), (492, -853), (760, -855), (880, -846), (1050, -831), (1300, -827),
    (1460, -821), (1540, -812), (1572, -801),
], closed=False), "t"))

# osłona kolumny kierownicy
COVER = [(1585, -790, "c"), (1578, -850), (1590, -905), (1622, -945), (1672, -970), (1730, -975),
         (1778, -955), (1820, -905), (1860, -852), (1895, y_at(TOP_D, 1895), "c")]
side.append(path(smooth(COVER + [(x, y_at(TOP_D, x)) for x in (1800, 1700, 1620)]), "o w"))
side.append(path(smooth([(1604, -896), (1640, -936), (1700, -958), (1762, -955)], closed=False), "t"))
# kierownica: prawy chwyt (koniec widziany z boku)
side.append(tube((1630, -966), (1556, -986), 40, 40, "d w"))
# lusterko (prawe) na krótkim wsporniku z osłony
side.append(tube((1738, -958), (1744, -1010), 14, 12, "d w", round_end=False))
side.append(path(smooth([(1712, -1044), (1752, -1052), (1782, -1042), (1784, -1018), (1770, -1005),
                         (1720, -1006), (1706, -1024)]), "o w"))

# duży panel boczny przedni: od szwu pokrywy dziobowej do odbojnika, skośny tył
SEAM = [(1800, -790, "c"), (1900, -783), (2100, -760), (2350, -718), (2550, -670), (2680, -624),
        (2750, -587), (2784, -552, "c")]
PANEL_REAR = [(1480, -406, "c"), (1540, -500), (1600, -596), (1700, -700)]
side.append(path(smooth(SEAM + [(2750, -524), (2550, -474), (2350, -444), (2050, -413), (1700, -391),
                                 (1480, -383)] + PANEL_REAR), "o w"))
# przetłoczenie barku na panelu
side.append(path(smooth([(1660, -640), (1820, -662), (1980, -672), (2160, -670), (2350, -654),
                         (2500, -630), (2600, -607)], closed=False), "t"))
# panel boczny tylny = burta studzienki (dolna krawędź schowana pod odbojnikiem)
side.append(path(smooth(SH[:10] + [(1600, -596, "c"), (1540, -500), (1480, -406, "c"), (1480, -383),
                                   (1200, -373), (600, -363), (113, -360, "c")]), "o w"))

# kadłub (pod odbojnikiem)
side.append(path(smooth([
    (113, -365, "c"), (111, -110), (113, -30), (135, -6), (190, 0), (1000, 0), (1300, 0),
    (1600, -14), (1900, -58), (2180, -140), (2420, -255), (2600, -370), (2700, -450),
    (2752, -505, "c"), (2600, -474), (2000, -410), (1200, -373), (600, -363),
]), "o w"))
# obło (chine) i wzdłużnik na dnie
side.append(path(smooth([(114, -150), (700, -152), (1300, -160), (1750, -180), (2100, -220),
                         (2400, -290), (2580, -372), (2690, -445), (2738, -497)], closed=False), "d"))
side.append(path(smooth([(140, -72), (900, -74), (1450, -82), (1850, -112), (2150, -168),
                         (2380, -250), (2520, -330), (2562, -360)], closed=False), "t"))
# ucho holownicze na dziobie
side.append(path(smooth([(2708, -452, "c"), (2732, -451), (2742, -437), (2732, -423), (2704, -422, "c")],
                        closed=False), "d"))

# odbojnik
rr_top = [(x, y - 25) for x, y in S]
rr_bot = [(x, y + 25) for x, y in S]
side.append(path(smooth([
    (122, rr_top[0][1]), *rr_top[1:], (2778, -550), (2798, -533), (2794, -512), (2772, -501),
    *reversed(rr_bot[1:]), (122, rr_bot[0][1]), (106, -342), (103, -360), (106, -378),
]), "o w"))

# rufa: płyta ślizgowa, dysza, stopień
side.append(rect(86, -14, 340, 14, 4, "d w"))
side.append(tube((112, -140), (0, -140), 140, 100, "o w", round_end=False))
side.append(line(76, -204, 76, -76, "t"))
side.append(tube((108, -334), (82, -272), 22, 22, "d w", round_end=False))
side.append(rect(28, -278, 84, 20, 8, "d w"))

# tylko prawy bok: dźwignia przepustnicy przed prawym chwytem
sideR = [tube((1636, -976), (1694, -950), 16, 12, "d w")]

# ─── PRZÓD (oś x = 0; prawa strona skutera po lewej stronie rysunku) ─────────
BODY_HALF = [
    (0, -830), (150, -824), (285, -802), (390, -767), (460, -724), (505, -676), (532, -630),
    (554, -575), (572, -510), (584, -450), (590, -416), (591, -391), (588, -366), (576, -330),
    (556, -282), (528, -228), (494, -172, "c"), (380, -128), (260, -84), (150, -46), (70, -18),
    (0, 0, "c"),
]
BODY = path(smooth(sym(BODY_HALF)), "o w")
SEAT_END = path(smooth(sym([(0, -872), (130, -870), (190, -858), (218, -830), (226, -790, "c"), (0, -790)])), "o w")
COVER_END_HALF = [(0, -975), (75, -971), (110, -955), (128, -922), (140, -870), (150, -790, "c"), (0, -790)]
BARS = mirror_x(
    tube((112, -952), (262, -966), 26, 26, "d w", round_end=False),
    rect(258, -988, 112, 40, 18, "d w"),
)
MIRROR_HEAD = [(170, -1040), (226, -1052), (278, -1045), (288, -1022), (278, -1003), (174, -1002), (160, -1020)]
MIRROR_GLASS = [(180, -1034), (226, -1043), (270, -1038), (277, -1022), (270, -1009), (182, -1008), (172, -1020)]
MIRROR_STALK = tube((96, -962), (180, -1012), 16, 14, "d w", round_end=False)
RR_FRONT = [(0, -530), (120, -524), (205, -502), (330, -474), (455, -444), (545, -413), (588, -391)]

front = [SEAT_END, BARS]
front.append(path(smooth(sym(COVER_END_HALF)), "o w"))
front.append(mirror_x(MIRROR_STALK, path(smooth(MIRROR_HEAD), "o w")))
front.append(BODY)
# szew pokrywy dziobowej z dużymi panelami bocznymi
front.append(path(smooth([
    (-292, -790), (-300, -757), (-270, -715), (-200, -670), (-120, -622), (-40, -585), (0, -578),
    (40, -585), (120, -622), (200, -670), (270, -715), (300, -757), (292, -790),
], closed=False), "d"))
# schowek dziobowy (krawędź przednia i boczne)
front.append(path(smooth([(-190, -806, "c"), (-189, -783), (0, -808), (189, -783), (190, -806, "c")],
                         closed=False), "d"))
# kadłub: obła, dziobnica, ucho holownicze
front.append(mirror_x(path(smooth([(494, -172), (468, -215), (410, -272), (300, -350), (170, -430),
                                   (50, -500)], closed=False), "d")))
front.append(line(0, -505, 0, -8, "t"))
front.append(path(smooth(
    [(x, y - 25) for x, y in RR_FRONT] + [(593, -391)] + [(x, y + 25) for x, y in reversed(RR_FRONT)]
    + [(-x, y + 25) for x, y in RR_FRONT[1:]] + [(-593, -391)]
    + [(-x, y - 25) for x, y in reversed(RR_FRONT[1:])]
), "o w"))
front.append(circle(0, -440, 18, "d w"))
front.append(circle(0, -440, 8, "t"))

# ─── TYŁ (prawa strona skutera po prawej stronie rysunku) ───────────────────
rear = []
rear.append(mirror_x(MIRROR_STALK, path(smooth(MIRROR_HEAD), "o w"), path(smooth(MIRROR_GLASS), "d l")))
rear.append(BARS)
rear.append(path(smooth(sym(COVER_END_HALF)), "o w"))
rear.append(rect(-56, -964, 112, 28, 8, "d l"))
rear.append(BODY)
# burty studzienek (ściana wewnętrzna i grzbiet burty)
rear.append(mirror_x(path(smooth([(420, -405), (440, -500), (462, -566, "c"), (552, -576)], closed=False), "d")))
# cokół z ogonem i siedzenie
rear.append(path(smooth(sym([(0, -790), (225, -790, "c"), (232, -765), (224, -650), (196, -520),
                             (165, -405, "c"), (0, -405)])), "o w"))
rear.append(SEAT_END)
# platforma rufowa (krawędź)
rear.append(path(smooth(sym([(0, -405), (440, -405, "c"), (494, -401), (502, -385, "c"), (0, -385)])), "d w"))
# pawęż (dno: wspólne V z kadłubem, płaska płyta pod pompą)
TRANSOM_HALF = [(0, -335), (500, -335, "c"), (497, -270), (480, -205), (446, -150, "c"), (380, -128),
                (260, -84), (150, -46), (84, -22), (80, -12, "c"), (0, -12)]
rear.append(path(smooth(sym(TRANSOM_HALF)), "o w"))
# odbojnik wokół rufy
rear.append(path(smooth(sym([
    (0, -385), (300, -385), (505, -387), (560, -401), (588, -416), (593, -403), (593, -379),
    (588, -366), (560, -351), (505, -337), (300, -335), (0, -335),
])), "o w"))
# korki spustowe, ucha rufowe
rear.append(mirror_x(circle(250, -150, 12, "d w"), circle(400, -290, 15, "d w"), circle(400, -290, 6, "t")))
# płyta ślizgowa i dysza
rear.append(rect(-80, -12, 160, 12, 4, "d w"))
rear.append(circle(0, -140, 70, "o w"))
rear.append(circle(0, -140, 50, "d w"))
rear.append(circle(0, -140, 34, "d k"))
# stopień do wchodzenia z wody
rear.append(mirror_x(rect(68, -336, 24, 66, 4, "d w")))
rear.append(rect(-115, -280, 230, 22, 8, "d w"))

# ─── GÓRA (przód w +x, prawa burta po +y) ────────────────────────────────────
OUT_HALF = [
    (2800, 0), (2788, -60), (2750, -122), (2680, -205), (2550, -330), (2350, -455), (2150, -522),
    (1920, -565), (1680, -587), (1420, -590), (1100, -581), (800, -565), (520, -543), (320, -524),
    (200, -509), (140, -493), (117, -455), (112, -380), (112, 0),
]
OUT = sym_y(OUT_HALF)
OUT_D = dense(OUT, closed=True, n=10)
INNER_D = offset_closed(OUT_D, 36)

top = []
# dysza i stopień za pawężą
top.append(tube((112, 0), (0, 0), 140, 100, "o w", round_end=False))
top.append(rect(28, -115, 84, 230, 8, "d w"))
# obrys (odbojnik) i jego wewnętrzna krawędź
top.append(path(smooth(OUT), "o w"))
top.append(path(poly(INNER_D), "d"))
# studzienki na stopy + platforma rufowa (zagłębienie)
RECESS_HALF = [(1560, 0), (1572, -240), (1600, -282), (1622, -345), (1618, -410), (1580, -455),
               (1500, -474), (1250, -470), (950, -458), (650, -440), (420, -420), (260, -405),
               (175, -395), (152, -360), (150, 0)]
top.append(path(smooth(sym_y(RECESS_HALF)), "d w"))
# maty antypoślizgowe w studzienkach i na platformie
top.append(mirror_y(path(smooth([
    (460, -258, "c"), (1480, -258), (1550, -285), (1574, -350), (1548, -418), (1480, -438),
    (1200, -437), (900, -427), (600, -410), (460, -400, "c"),
]), "t")))
top.append(rect(168, -360, 108, 720, 20, "t"))
# szew pokrywy dziobowej i skośne tylne krawędzie dużych paneli bocznych
top.append(path(smooth([
    (1800, -280), (1900, -292), (2100, -300), (2350, -270), (2550, -200), (2680, -120), (2750, -40),
    (2766, 0), (2750, 40), (2680, 120), (2550, 200), (2350, 270), (2100, 300), (1900, 292), (1800, 280),
], closed=False), "d"))
top.append(mirror_y(
    line(1800, -146, 1800, -280, "d"),
    path(smooth([(1800, -280), (1700, -385), (1600, -480), (1480, -553)], closed=False), "d"),
))
# przetłoczenie barku na panelach bocznych
top.append(mirror_y(path(smooth([(1660, -496), (1820, -508), (1980, -500), (2160, -470), (2350, -400),
                                 (2500, -318), (2600, -232)], closed=False), "t")))
# schowek dziobowy
top.append(rect(LID0, -190, LID1 - LID0, 380, 60, "d w"))
top.append(rect(2150, -36, 22, 72, 8, "d"))
# cokół z ogonem, siedzenie
top.append(path(smooth(sym_y([(1606, 0), (1606, -180), (1585, -215), (1500, -228), (1200, -232), (900, -236),
                              (500, -234), (370, -226), (318, -198), (296, -120), (290, 0)])), "d w"))
top.append(path(smooth(sym_y([(1610, 0), (1606, -80), (1585, -135), (1530, -165), (1400, -180),
                              (1200, -190), (1000, -200), (900, -210), (700, -220), (540, -216), (470, -194),
                              (436, -130), (428, 0)])), "o w"))
top.append(path(smooth(sym_y([(1586, 0), (1582, -72), (1563, -116), (1515, -143), (1400, -157),
                              (1200, -168), (1000, -178), (900, -188), (700, -198), (548, -194), (490, -174),
                              (458, -120), (450, 0)])), "t"))
top.append(path(smooth([(905, -209), (895, 0), (905, 209)], closed=False), "t"))
# kierownica z chwytami
top.append(mirror_y(
    tube((1634, -120), (1612, -258), 26, 26, "d w", round_end=False),
    tube((1612, -250), (1574, -372), 40, 40, "d w"),
))
top.append(tube((1640, 262), (1650, 345), 14, 12, "d w"))
# osłona kolumny kierownicy z wyświetlaczem
top.append(path(smooth(sym_y([(1895, 0), (1880, -70), (1825, -125), (1730, -150), (1640, -148),
                              (1590, -120), (1578, -60), (1576, 0)])), "o w"))
top.append(rect(1598, -55, 55, 110, 12, "d l"))
# lusterka
top.append(mirror_y(
    tube((1745, -140), (1745, -176), 16, 14, "d w", round_end=False),
    path(smooth([(1716, -172), (1768, -174), (1780, -230), (1768, -286), (1722, -290), (1708, -230)]), "o w"),
))


def group(id_, parts, extra=""):
    return f'<g id="{id_}"{extra}>' + "".join(parts) + "</g>"


print(group("side", side, ' data-axles=""'))
print(group("sideR", sideR))
print(group("front", front))
print(group("rear", rear))
print(group("top", top))
