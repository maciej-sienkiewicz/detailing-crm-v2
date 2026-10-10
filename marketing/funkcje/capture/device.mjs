// capture/device.mjs
// Przeniesione z detailboost-webpage/capture (to samo nagrywanie co na stronie), dostosowane do samouczka.
// Geometria urządzeń w kadrze 1440 × 900: ten sam rachunek składa klatki (recorder)
// i przelicza obszary ramek kroków (lib.beat), więc ramka trafia w to samo miejsce.
// Samouczek: klatki ekranu mają 1440 × 900 px CSS przy DPR 1,5, więc urządzenia składamy w tym samym 2160 × 1350.
export const FRAME = { width: 2160, height: 1350 };

export const DEVICES = {
    // Telefon klienta na rozmytym ekranie studia (strona podpisu z linku SMS).
    phone: { heightShare: 0.9, bezel: 18, radius: 57, overlay: true },
    // Tablet w recepcji (przyjęcie pojazdu), poziomo.
    tablet: { heightShare: 0.9, bezel: 27, radius: 45 },
    // Ten sam tablet obrócony pionowo i podany klientowi do podpisu - na rozmytym
    // ekranie przyjęcia, jak telefon przy wydaniu.
    'tablet-portrait': { heightShare: 0.95, bezel: 24, radius: 45, overlay: true },
};

/** Położenie ekranu urządzenia w kadrze dla okna strony `vp`. */
export function deviceLayout(kind, vp) {
    const d = DEVICES[kind];
    const outerH = Math.round(FRAME.height * d.heightShare);
    let scale = (outerH - d.bezel * 2) / vp.height;
    // Tablet poziomo: ogranicza go też szerokość kadru.
    scale = Math.min(scale, (FRAME.width * 0.94 - d.bezel * 2) / vp.width);
    const sw = Math.round(vp.width * scale);
    const sh = Math.round(vp.height * scale);
    const ow = sw + d.bezel * 2;
    const oh = sh + d.bezel * 2;
    const ox = Math.round((FRAME.width - ow) / 2);
    const oy = Math.round((FRAME.height - oh) / 2);
    return { ...d, scale, sw, sh, ow, oh, ox, oy, sx: ox + d.bezel, sy: oy + d.bezel };
}
