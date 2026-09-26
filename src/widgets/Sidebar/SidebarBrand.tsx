import type { ReactNode } from 'react';
import {
    Logo,
    CollapsedInitials,
    LogoCaption,
    LogoCornerActions,
    LogoIcon,
    LogoImage,
    LogoStack,
    LogoText,
    LogoWide,
} from './SidebarStyles';

interface SidebarBrandProps {
    isCollapsed: boolean;
    /** Nazwa do nagłówka, bez formy prawnej. */
    companyName: string;
    /** Pełna nazwa z rejestru - w podpowiedzi i jako tekst alternatywny logo. */
    legalName?: string;
    initials: string;
    /** Adres logo studia; null = studio nie ma logo albo logo się nie wczytało. */
    logoUrl: string | null;
    logoNeedsPlate: boolean;
    /** Poziomy logotyp - szersza podkładka, a w zwiniętym menu inicjały zamiast kafelka z logo. */
    isWideLogo: boolean;
    onLogoError: () => void;
    /** Przyciski zwijania (desktop) i zamykania (telefon) menu. */
    actions: ReactNode;
}

/**
 * Nagłówek menu: logo i nazwa studia.
 *
 * Logo wgrane przez studio stoi na środku nagłówka, a nazwa firmy pod nim - także
 * wyśrodkowana, drobniej i ciszej niż logo, bo zwykle je powtarza. Przycisk zwijania
 * siedzi w prawym górnym rogu, bez ramki. Wcześniej stał w wierszu z nazwą: obrysowany
 * kwadrat miał wagę samej nazwy, zabierał jej szerokość i nazwa z rejestru
 * („LEATHER MASTER Hu…") kończyła się wielokropkiem w pół imienia właściciela.
 *
 * Bez logo zostaje dawny wiersz: kafelek z inicjałami, nazwa i przycisk po prawej.
 *
 * W zwiniętym menu (desktop, 64 px) zostaje sam kafelek: logo zbliżone do kwadratu
 * mieści się w nim czytelnie, poziomy logotyp nie - wtedy inicjały.
 */
export const SidebarBrand = ({
    isCollapsed,
    companyName,
    legalName = companyName,
    initials,
    logoUrl,
    logoNeedsPlate,
    isWideLogo,
    onLogoError,
    actions,
}: SidebarBrandProps) => {
    if (!logoUrl) {
        return (
            <>
                <Logo $isCollapsed={isCollapsed}>
                    <LogoIcon>{initials}</LogoIcon>
                    <LogoText $isCollapsed={isCollapsed} title={legalName}>
                        {companyName}
                    </LogoText>
                </Logo>
                {actions}
            </>
        );
    }

    return (
        <>
            <LogoStack $isCollapsed={isCollapsed}>
                <LogoWide
                    src={logoUrl}
                    alt={companyName}
                    title={legalName}
                    $plate={logoNeedsPlate}
                    $wide={isWideLogo}
                    onError={onLogoError}
                />
                <LogoCaption title={legalName}>{companyName}</LogoCaption>
            </LogoStack>
            <LogoCornerActions $isCollapsed={isCollapsed}>{actions}</LogoCornerActions>
            <CollapsedInitials $isCollapsed={isCollapsed}>
                {isWideLogo
                    ? <LogoIcon>{initials}</LogoIcon>
                    : <LogoImage src={logoUrl} alt={companyName} $plate={logoNeedsPlate} onError={onLogoError} />}
            </CollapsedInitials>
        </>
    );
};
