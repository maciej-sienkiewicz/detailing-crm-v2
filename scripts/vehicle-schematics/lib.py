"""Pomocniki do rysowania schematów pojazdów w milimetrach.

Układ współrzędnych każdego widoku:
  * jednostka = 1 mm, podłoże y = 0, w górę = y UJEMNE (zwykłe SVG),
  * bok (#side): przód pojazdu w stronę +x (to jest PRAWY bok pojazdu),
  * przód/tył (#front, #rear): oś symetrii x = 0,
  * góra (#top): przód w stronę +x, oś symetrii y = 0; lewa burta pojazdu po stronie -y.

Klasy kreski (patrz build.mjs): x = kontur opony / najgrubszy, o = kontur, d = detal,
t = cienka linia podziału. Wypełnienia: w = białe (zasłania to, co pod spodem),
g = szare (opona w widoku przód/tył), l = jasne (szyba), k = ciemne, ns = bez kreski.
Kolejność w pliku = kolejność rysowania: to, co bliżej oglądającego, pisz PÓŹNIEJ
i daj mu klasę `w`, wtedy samo zasłoni linie schowane za nim.
"""

import math


def f(n):
    s = f"{n:.1f}"
    return s[:-2] if s.endswith(".0") else s


def on_circle(cx, cy, r, deg):
    """Punkt na okręgu; kąt w stopniach przeciwnie do wskazówek zegara od +x, y w górę."""
    a = math.radians(deg)
    return (cx + r * math.cos(a), cy - r * math.sin(a))


def smooth(points, closed=True, tension=0.5):
    """Gładka ścieżka przez punkty (Catmull-Rom -> Bezier).

    Punkt może być krotką (x, y) albo (x, y, 'c') - wtedy w tym punkcie jest ostry
    narożnik (styczne zerowe), np. tam, gdzie spotykają się dwa panele.
    """
    pts = [(p[0], p[1], len(p) > 2 and p[2] == "c") for p in points]
    n = len(pts)
    if n < 2:
        return ""

    def get(i):
        if closed:
            return pts[i % n]
        return pts[max(0, min(n - 1, i))]

    d = [f"M{f(pts[0][0])} {f(pts[0][1])}"]
    segs = n if closed else n - 1
    k = tension / 3.0
    for i in range(segs):
        p0, p1, p2, p3 = get(i - 1), get(i), get(i + 1), get(i + 2)
        if p1[2]:
            c1 = (p1[0], p1[1])
        else:
            c1 = (p1[0] + (p2[0] - p0[0]) * k, p1[1] + (p2[1] - p0[1]) * k)
        if p2[2]:
            c2 = (p2[0], p2[1])
        else:
            c2 = (p2[0] - (p3[0] - p1[0]) * k, p2[1] - (p3[1] - p1[1]) * k)
        d.append(
            f"C{f(c1[0])} {f(c1[1])} {f(c2[0])} {f(c2[1])} {f(p2[0])} {f(p2[1])}"
        )
    if closed:
        d.append("Z")
    return "".join(d)


def poly(points, closed=True):
    d = "M" + " L".join(f"{f(x)} {f(y)}" for x, y, *_ in points)
    return d + ("Z" if closed else "")


def path(d, cls="o w", extra=""):
    return f'<path class="{cls}" d="{d}" {extra}/>'


def circle(cx, cy, r, cls="d"):
    return f'<circle class="{cls}" cx="{f(cx)}" cy="{f(cy)}" r="{f(r)}"/>'


def ellipse(cx, cy, rx, ry, cls="d", rot=0):
    t = f' transform="rotate({f(rot)} {f(cx)} {f(cy)})"' if rot else ""
    return f'<ellipse class="{cls}" cx="{f(cx)}" cy="{f(cy)}" rx="{f(rx)}" ry="{f(ry)}"{t}/>'


def line(x1, y1, x2, y2, cls="d"):
    return f'<line class="{cls}" x1="{f(x1)}" y1="{f(y1)}" x2="{f(x2)}" y2="{f(y2)}"/>'


def rect(x, y, w, h, rx=0, cls="d"):
    return f'<rect class="{cls}" x="{f(x)}" y="{f(y)}" width="{f(w)}" height="{f(h)}" rx="{f(rx)}"/>'


def arc(cx, cy, r, a0, a1):
    """Łuk (otwarta ścieżka) od kąta a0 do a1 (stopnie, CCW, y w górę)."""
    x0, y0 = on_circle(cx, cy, r, a0)
    x1, y1 = on_circle(cx, cy, r, a1)
    large = 1 if abs(a1 - a0) % 360 > 180 else 0
    sweep = 0 if a1 > a0 else 1
    return f"M{f(x0)} {f(y0)}A{f(r)} {f(r)} 0 {large} {sweep} {f(x1)} {f(y1)}"


def ring(cx, cy, r_out, r_in):
    """Pierścień jako jedna ścieżka (evenodd)."""
    def c(r):
        return (
            f"M{f(cx + r)} {f(cy)}A{f(r)} {f(r)} 0 1 0 {f(cx - r)} {f(cy)}"
            f"A{f(r)} {f(r)} 0 1 0 {f(cx + r)} {f(cy)}Z"
        )

    return c(r_out) + c(r_in)


def g(*parts, transform=None):
    t = f' transform="{transform}"' if transform else ""
    return f"<g{t}>" + "".join(parts) + "</g>"


def mirror_x(*parts):
    """Rysuje części i ich odbicie względem osi x = 0 (widok przód/tył)."""
    body = "".join(parts)
    return body + f'<g transform="scale(-1 1)">{body}</g>'


def mirror_y(*parts):
    """Rysuje części i ich odbicie względem osi y = 0 (widok z góry)."""
    body = "".join(parts)
    return body + f'<g transform="scale(1 -1)">{body}</g>'


# ─── Koła ──────────────────────────────────────────────────────────────────────


def spoke(cx, cy, a, r0, r1, w0, w1, cls="d w"):
    """Ramię felgi: czworokąt od promienia r0 do r1, szerokość w0 -> w1 (mm)."""
    da = (math.cos(math.radians(a)), -math.sin(math.radians(a)))
    n = (-da[1], da[0])
    p = [
        (cx + da[0] * r0 + n[0] * w0 / 2, cy + da[1] * r0 + n[1] * w0 / 2),
        (cx + da[0] * r1 + n[0] * w1 / 2, cy + da[1] * r1 + n[1] * w1 / 2),
        (cx + da[0] * r1 - n[0] * w1 / 2, cy + da[1] * r1 - n[1] * w1 / 2),
        (cx + da[0] * r0 - n[0] * w0 / 2, cy + da[1] * r0 - n[1] * w0 / 2),
    ]
    return f'<path class="{cls}" d="{poly(p)}"/>'


def wheel_side(cx, cy, r, rim_r, spokes="split5", hub_r=40, rot=0, tread=True):
    """Koło w widoku z boku: opona, felga, ramiona, piasta.

    spokes:
      'split5'  - 5 rozdwojonych ramion (sport/naked),
      'y3'      - 3 ramiona w kształcie Y,
      'six'     - 6 prostych ramion (cruiser, skuter),
      'ten'     - 10 cienkich prostych ramion,
      'wire'    - koło szprychowe (enduro, cross, cruiser klasyczny),
      'disc'    - pełna tarcza (skuter, tylne koło cruisera),
      'none'    - tylko opona i obręcz.
    """
    out = []
    out.append(circle(cx, cy, r, "x w"))
    if tread:
        out.append(circle(cx, cy, r - (r - rim_r) * 0.18, "t"))
    out.append(circle(cx, cy, rim_r, "o w"))
    lip = rim_r - max(14, rim_r * 0.075)
    k = rim_r / 216  # ramiona skalowane do felgi 17"
    if spokes == "split5":
        for i in range(5):
            a = rot + i * 72
            out.append(spoke(cx, cy, a - 6, hub_r * 0.8, lip + 4, 15 * k, 11 * k))
            out.append(spoke(cx, cy, a + 6, hub_r * 0.8, lip + 4, 15 * k, 11 * k))
    elif spokes == "y3":
        for i in range(3):
            a = rot + i * 120
            mid = hub_r + (lip - hub_r) * 0.42
            out.append(spoke(cx, cy, a, hub_r * 0.8, mid + 6, 30 * k, 22 * k))
            x, y = on_circle(cx, cy, mid, a)
            out.append(spoke(x, y, a - 26, 0, lip - mid + 10, 16 * k, 12 * k))
            out.append(spoke(x, y, a + 26, 0, lip - mid + 10, 16 * k, 12 * k))
    elif spokes == "six":
        for i in range(6):
            out.append(spoke(cx, cy, rot + i * 60, hub_r * 0.8, lip + 4, 30 * k, 18 * k))
    elif spokes == "ten":
        for i in range(10):
            out.append(spoke(cx, cy, rot + i * 36, hub_r * 0.8, lip + 4, 14 * k, 10 * k))
    elif spokes == "wire":
        n = 18
        for i in range(n):
            a = rot + i * 360 / n
            h1 = on_circle(cx, cy, hub_r * 0.85, a)
            r1 = on_circle(cx, cy, lip, a + 26)
            r2 = on_circle(cx, cy, lip, a - 26)
            out.append(line(h1[0], h1[1], r1[0], r1[1], "t"))
            out.append(line(h1[0], h1[1], r2[0], r2[1], "t"))
    elif spokes == "disc":
        out.append(circle(cx, cy, lip * 0.62, "t"))
    out.append(circle(cx, cy, lip, "d"))
    out.append(circle(cx, cy, hub_r, "d w"))
    out.append(circle(cx, cy, hub_r * 0.45, "d"))
    return "".join(out)


def caliper_side(cx, cy, r_disc, angle, span=34, inner=38, outer=14):
    """Zacisk hamulca przy krawędzi tarczy: wycinek pierścienia wokół kąta `angle`."""
    a0, a1 = angle - span / 2, angle + span / 2
    pts = []
    for a in (a0, (a0 + angle) / 2, angle, (angle + a1) / 2, a1):
        pts.append(on_circle(cx, cy, r_disc + outer, a))
    pts = [(*pts[0], "c")] + pts[1:-1] + [(*pts[-1], "c")]
    inn = []
    for a in (a1, angle, a0):
        inn.append(on_circle(cx, cy, r_disc - inner, a))
    inn = [(*inn[0], "c"), inn[1], (*inn[2], "c")]
    return f'<path class="d w" d="{smooth(pts + inn)}"/>'


def brake_disc_side(cx, cy, r_out, r_in=None, holes=14, buttons=6, carrier=True):
    """Tarcza hamulcowa w widoku z boku (pływająca: pierścień + nity)."""
    r_in = r_in or r_out * 0.76
    out = [f'<path class="d w" fill-rule="evenodd" d="{ring(cx, cy, r_out, r_in)}"/>']
    if holes:
        for i in range(holes):
            x, y = on_circle(cx, cy, (r_out + r_in) / 2, i * 360 / holes + 8)
            out.append(circle(x, y, (r_out - r_in) * 0.09, "t"))
    if buttons:
        for i in range(buttons):
            x, y = on_circle(cx, cy, r_in - (r_out - r_in) * 0.12, i * 360 / buttons)
            out.append(circle(x, y, (r_out - r_in) * 0.16, "t w"))
    return "".join(out)


def tire_end(cx, w, h, ground=0.0, corner=None, lines=3):
    """Opona widziana z przodu lub z tyłu: zaokrąglony prostokąt z bieżnikiem."""
    corner = corner if corner is not None else w * 0.42
    x0, x1 = cx - w / 2, cx + w / 2
    top, bot = ground - h, ground
    out = [rect(x0, top, w, h, corner, "x g")]
    for i in range(1, lines + 1):
        x = x0 + w * i / (lines + 1)
        out.append(line(x, top + corner * 0.55, x, bot - corner * 0.55, "t"))
    return "".join(out)


def sym(half):
    """Pełny obrys symetryczny względem x = 0 z połówki (x >= 0).

    `half` biegnie od punktu na osi u góry do punktu na osi u dołu (oba z x = 0).
    """
    mirrored = [(-p[0], p[1], *p[2:]) for p in reversed(half[1:-1])]
    return list(half) + mirrored


def sym_y(half):
    """Pełny obrys symetryczny względem y = 0 (widok z góry) z połówki (y <= 0).

    `half` biegnie od punktu na osi z przodu do punktu na osi z tyłu.
    """
    mirrored = [(p[0], -p[1], *p[2:]) for p in reversed(half[1:-1])]
    return list(half) + mirrored


# ─── Rury, lagi, pasy ──────────────────────────────────────────────────────────


def tube(p0, p1, w0, w1, cls="o w", round_end=True):
    """Rura/tłumik od p0 do p1, średnica w0 -> w1; zaokrąglony koniec przy p1."""
    dx, dy = p1[0] - p0[0], p1[1] - p0[1]
    ln = math.hypot(dx, dy)
    ux, uy = dx / ln, dy / ln
    nx, ny = -uy, ux
    a = (p0[0] + nx * w0 / 2, p0[1] + ny * w0 / 2)
    b = (p1[0] + nx * w1 / 2, p1[1] + ny * w1 / 2)
    c = (p1[0] - nx * w1 / 2, p1[1] - ny * w1 / 2)
    d = (p0[0] - nx * w0 / 2, p0[1] - ny * w0 / 2)
    if round_end:
        e = (p1[0] + ux * w1 * 0.18, p1[1] + uy * w1 * 0.18)
        return path(smooth([(*d, "c"), (*a, "c"), (*b, "c"), e, (*c, "c")]), cls)
    return path(poly([a, b, c, d]), cls)


def along(origin, angle_from_vertical, t, off=0.0):
    """Punkt na osi pochylonej o kąt od pionu (np. lagi: kąt główki ramy).

    t   - odległość wzdłuż osi w górę i do tyłu od `origin` (oś koła),
    off - przesunięcie prostopadłe (dodatnie = do przodu pojazdu).
    """
    a = math.radians(angle_from_vertical)
    ux, uy = -math.sin(a), -math.cos(a)
    nx, ny = math.cos(a), -math.sin(a)
    return (origin[0] + ux * t + nx * off, origin[1] + uy * t + ny * off)


def band(origin, angle_from_vertical, t0, t1, w0, w1=None, cls="o w"):
    """Pas (np. goleń lagi) wzdłuż pochylonej osi od t0 do t1, szerokość w0 -> w1."""
    w1 = w0 if w1 is None else w1
    pts = [
        along(origin, angle_from_vertical, t0, -w0 / 2),
        along(origin, angle_from_vertical, t1, -w1 / 2),
        along(origin, angle_from_vertical, t1, w1 / 2),
        along(origin, angle_from_vertical, t0, w0 / 2),
    ]
    return path(poly(pts), cls)
