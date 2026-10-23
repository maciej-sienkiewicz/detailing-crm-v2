import type { ReactNode } from 'react';
import {
    BrandMark,
    BrandWordmark,
    CollapsedMark,
    LogoCaption,
    LogoCornerActions,
    LogoStack,
} from './SidebarStyles';

/** Te same pliki co na ekranie logowania (AuthLayout) - jasny tusz pod ciemny pasek. */
const WORDMARK_SRC = '/brand/detailboost-horizontal-white.svg?v=3';
const MARK_SRC = '/brand/detailboost-mark-white.svg?v=3';

interface SidebarBrandProps {
    isCollapsed: boolean;
    /** Nazwa studia do podpisu pod logo, bez formy prawnej; null = jeszcze jej nie znamy. */
    companyName: string | null;
    /** Pełna nazwa z rejestru - w podpowiedzi. */
    legalName?: string | null;
    /** Przyciski zwijania (desktop) i zamykania (telefon) menu. */
    actions: ReactNode;
}

/**
 * Nagłówek menu: logo DetailBoost, pod nim nazwa studia.
 *
 * Na górze menu stoi znak produktu, a nie logo wgrane przez studio (decyzja biznesu).
 * Logo studia zostaje tam, gdzie widzi je klient: na protokołach, wydrukach i w mailach.
 * Nazwa studia zostaje pod znakiem, drobniej i ciszej - przy kilku kontach na jednym
 * urządzeniu (przełącznik PIN) tylko ona mówi, w czyim studiu się jest.
 *
 * Przycisk zwijania siedzi w prawym górnym rogu, bez ramki. Wcześniej stał w wierszu
 * z nazwą: obrysowany kwadrat miał wagę samej nazwy, zabierał jej szerokość i nazwa
 * z rejestru („LEATHER MASTER Hu…") kończyła się wielokropkiem w pół imienia właściciela.
 *
 * W zwiniętym menu (desktop, 64 px) poziomy logotyp się nie mieści - zostaje sam sygnet.
 */
export const SidebarBrand = ({
    isCollapsed,
    companyName,
    legalName = companyName,
    actions,
}: SidebarBrandProps) => (
    <>
        <LogoStack $isCollapsed={isCollapsed}>
            <BrandWordmark src={WORDMARK_SRC} alt="DetailBoost" width={684} height={81} />
            {companyName && <LogoCaption title={legalName ?? companyName}>{companyName}</LogoCaption>}
        </LogoStack>
        <LogoCornerActions $isCollapsed={isCollapsed}>{actions}</LogoCornerActions>
        <CollapsedMark $isCollapsed={isCollapsed}>
            <BrandMark src={MARK_SRC} alt="DetailBoost" width={32} height={32} />
        </CollapsedMark>
    </>
);
