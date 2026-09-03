// src/modules/competition-monitoring/hooks/useIllusionProgress.ts
//
// Pasek postępu dla operacji, która nie raportuje postępu.
//
// Generowanie posta to jedno żądanie HTTP trwające kilkanaście sekund (generator →
// weryfikator → korekta → weryfikator), z którego serwer nie wysyła nic aż do końca.
// Nie mamy więc czego mierzyć — a mimo to pasek jest tu na miejscu: czekanie z paskiem
// jest odbierane jako krótsze niż to samo czekanie z animacją „w kółko", pod warunkiem
// że pasek RUSZA SZYBKO i ZWALNIA pod koniec. Odwrotny przebieg (powolny start, skok na
// końcu) daje wrażenie zacięcia — to jest właśnie „progress illusion".
//
// Krzywa: p(t) = cap · (1 − e^(−t/τ)). Nigdy nie dobija do 100%, bo 100% ma znaczyć
// „gotowe", a tego wie tylko odpowiedź serwera. Gdy odpowiedź przyjdzie, [finish]
// domyka pasek do 100% i dopiero wtedy widok przechodzi dalej.

import { useEffect, useRef, useState } from 'react';

/** Stała czasowa krzywej: po ~3,5 s pasek jest w ~63% drogi do sufitu. */
const TAU_MS = 3500;

/** Sufit dla fazy oczekiwania — resztę dokłada dopiero prawdziwy koniec pracy. */
export const PROGRESS_CEILING = 92;

/**
 * Punkt krzywej dla danego czasu oczekiwania — wydzielony z hooka, bo to jego jedyna
 * część, którą da się (i warto) sprawdzić testem: sam kształt.
 */
export const illusionPercent = (elapsedMs: number): number =>
    PROGRESS_CEILING * (1 - Math.exp(-elapsedMs / TAU_MS));

export interface IllusionProgress {
    /** 0–100, do szerokości paska. */
    percent: number;
    /** Czy trwa domykanie do 100% (po odpowiedzi serwera). */
    isFinishing: boolean;
}

/**
 * @param active czy operacja trwa — przejście true→false domyka pasek do 100%,
 *        więc wywołujący nie musi niczego dodatkowo wołać.
 */
export function useIllusionProgress(active: boolean): IllusionProgress {
    const [percent, setPercent] = useState(0);
    const [isFinishing, setIsFinishing] = useState(false);
    /** Czy pasek w ogóle ruszył — bez tego zamontowanie „w spoczynku" domykałoby go do 100%. */
    const hasRun = useRef(false);

    useEffect(() => {
        let frame = 0;

        if (active) {
            hasRun.current = true;
            const startedAt = performance.now();
            // Stan ustawia dopiero klatka animacji, nie ciało efektu — pierwsza klatka
            // (elapsed ≈ 0) zeruje pasek przy każdym kolejnym uruchomieniu.
            const tick = () => {
                const elapsed = performance.now() - startedAt;
                setIsFinishing(false);
                setPercent(illusionPercent(elapsed));
                frame = requestAnimationFrame(tick);
            };
            frame = requestAnimationFrame(tick);
            return () => cancelAnimationFrame(frame);
        }

        if (!hasRun.current) return;

        // Operacja skończona: dociągamy z miejsca, w którym stanął pasek, zamiast
        // zerować go w locie — cofnięcie się paska czyta się jak błąd.
        frame = requestAnimationFrame(() => {
            setIsFinishing(true);
            setPercent(100);
        });
        return () => cancelAnimationFrame(frame);
    }, [active]);

    return { percent, isFinishing };
}
