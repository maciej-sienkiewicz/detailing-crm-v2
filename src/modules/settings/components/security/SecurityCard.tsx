import styled from 'styled-components';

/**
 * Jeden szkielet karty dla całej zakładki „Bezpieczeństwo".
 *
 * Wcześniej każda z czterech kart była budowana osobno: dwa promienie (12 i 14 px),
 * dwa rozmiary tytułu, jedna z kafelkiem ikony, jedna z czerwoną obwódką, i dwa różne
 * przyciski główne w dwóch różnych kolorach — indygo (#6366f1) obok błękitu marki
 * (#0ea5e9). Indygo nie występuje nigdzie indziej w aplikacji; wzięło się z kopiowania
 * przykładu, nie z decyzji.
 *
 * Paleta zakładki to teraz cztery barwy i ani jednej więcej: tusz, szarość, obwódka
 * i błękit marki. Zieleń i czerwień zostają wyłącznie jako ZNACZENIE (stan „ustawiony",
 * akcja nieodwracalna) — nigdy jako ozdoba (CLAUDE.md §2).
 *
 * Wypełniony kolorem jest dokładnie JEDEN przycisk na ekranie i tylko wtedy, gdy
 * otwarty jest edytor PIN-u: edytor przejmuje uwagę i sam znika. Wszystkie akcje
 * widoczne stale są obwódkowe.
 */
export const Card = styled.section`
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding: 20px 22px;
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
`;

/** Tytuł po lewej, sterowanie po prawej — jeden rytm we wszystkich kartach. */
export const CardHead = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
`;

export const CardHeadText = styled.div`
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 3px;
`;

export const CardTitle = styled.h3`
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: #0f172a;
`;

/** Jedno zdanie, tylko tam, gdzie karta bez niego byłaby zagadką. */
export const CardNote = styled.p`
    margin: 0;
    font-size: 12.5px;
    line-height: 1.5;
    color: #64748b;
`;

export const CardActions = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    flex-shrink: 0;
    flex-wrap: wrap;
`;

const buttonBase = `
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 8px 16px;
    border-radius: 8px;
    font-family: inherit;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
    transition: background 150ms, border-color 150ms, color 150ms;

    &:disabled { opacity: 0.5; cursor: not-allowed; }

    /* Pod palcem 44 px - jak każdy przycisk z zestawu ui. */
    @media (hover: none) and (pointer: coarse) { min-height: 44px; }
`;

/** Akcja dostępna: odcień w obwódce, bez wypełnienia. */
export const OutlineBtn = styled.button`
    ${buttonBase}
    background: #fff;
    border: 1px solid #e2e8f0;
    color: #0f172a;

    &:hover:not(:disabled) { border-color: #0ea5e9; color: #0ea5e9; background: rgba(14, 165, 233, 0.04); }
`;

/** Wypełniony wyłącznie w otwartym edytorze — patrz komentarz na górze pliku. */
export const PrimaryBtn = styled.button`
    ${buttonBase}
    background: #0ea5e9;
    border: 1px solid #0ea5e9;
    color: #fff;

    &:hover:not(:disabled) { background: #0284c7; border-color: #0284c7; }
`;

export const GhostBtn = styled.button`
    ${buttonBase}
    background: none;
    border: 1px solid transparent;
    color: #64748b;

    &:hover:not(:disabled) { color: #0f172a; }
`;

/** Czerwień niesie nieodwracalność, więc siedzi w akcji, nie w ramce karty. */
export const DangerBtn = styled.button`
    ${buttonBase}
    background: #fff;
    border: 1px solid rgba(239, 68, 68, 0.4);
    color: #dc2626;

    &:hover:not(:disabled) { background: rgba(239, 68, 68, 0.06); border-color: #ef4444; }
`;

/** Stan karty: kropka i słowo. Zieleń = gotowe, szarość = jeszcze nie. */
export const StateTag = styled.span<{ $on: boolean }>`
    display: inline-flex;
    align-items: center;
    gap: 7px;
    font-size: 12.5px;
    font-weight: 600;
    color: ${p => (p.$on ? '#15803d' : '#64748b')};

    &::before {
        content: '';
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: ${p => (p.$on ? '#16a34a' : '#cbd5e1')};
    }
`;

/** Wartość, po którą się do karty wraca — e-mail konta. */
export const CardValue = styled.p`
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: #0f172a;
    word-break: break-all;
`;

export const Select = styled.select`
    padding: 8px 12px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    font-family: inherit;
    font-size: 13px;
    font-weight: 600;
    color: #0f172a;
    background: #fff;
    cursor: pointer;

    &:focus { outline: none; border-color: #0ea5e9; box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.12); }

    @media (hover: none) and (pointer: coarse) { min-height: 44px; }
`;

export const Input = styled.input<{ $error?: boolean }>`
    width: 100%;
    padding: 9px 12px;
    border: 1px solid ${p => (p.$error ? '#ef4444' : '#e2e8f0')};
    border-radius: 8px;
    font-family: inherit;
    font-size: 13px;
    color: #0f172a;
    background: #fff;
    outline: none;
    transition: border-color 150ms, box-shadow 150ms;

    &:focus { border-color: #0ea5e9; box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.12); }
`;

export const FieldError = styled.p`
    margin: 0;
    font-size: 12px;
    font-weight: 600;
    color: #dc2626;
`;
