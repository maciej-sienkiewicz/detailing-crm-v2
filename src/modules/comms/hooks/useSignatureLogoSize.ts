// src/modules/comms/hooks/useSignatureLogoSize.ts
//
// Naturalne wymiary logo stopki, zmierzone w przeglądarce.
//
// Stopka to HTML pocztowy: obrazek musi mieć oba wymiary wpisane wprost, bo Outlook nie zna
// object-fit, a „szerokość ramki + limit wysokości" spłaszczał logo. Wymiarów nie trzymamy
// w projekcie - mierzymy logo przy każdym otwarciu kreatora, więc działa to też dla stopek
// zapisanych wcześniej i dla logo podanego linkiem.

import { useEffect, useState } from 'react';
import { loadImage } from '../utils/signatureImage';
import type { SignatureLogoSize } from '../utils/signatureTemplates';

interface Measured { url: string; size: SignatureLogoSize | null }

const MEASURE_TIMEOUT_MS = 4000;

export function useSignatureLogoSize(url: string | null | undefined): { size: SignatureLogoSize | null; measuring: boolean } {
    const src = (url ?? '').trim();
    const [measured, setMeasured] = useState<Measured | null>(null);

    useEffect(() => {
        if (!src) return;
        let cancelled = false;
        // Obrazek, który nie odpowiada (wolny serwer pod linkiem), nie może blokować zapisu.
        const timeout = window.setTimeout(() => {
            if (!cancelled) setMeasured({ url: src, size: null });
        }, MEASURE_TIMEOUT_MS);
        loadImage(src)
            .then(img => {
                if (cancelled) return;
                const ok = img.naturalWidth > 0 && img.naturalHeight > 0;
                setMeasured({ url: src, size: ok ? { width: img.naturalWidth, height: img.naturalHeight } : null });
            })
            // Obrazek, którego nie da się wczytać, i tak się nie pokaże - stopka zostaje przy
            // dopasowaniu przez klienta poczty zamiast blokować zapis.
            .catch(() => { if (!cancelled) setMeasured({ url: src, size: null }); });
        return () => {
            cancelled = true;
            window.clearTimeout(timeout);
        };
    }, [src]);

    if (!src) return { size: null, measuring: false };
    const current = measured?.url === src ? measured : null;
    return { size: current?.size ?? null, measuring: current === null };
}
