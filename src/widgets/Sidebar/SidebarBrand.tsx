import type { ReactNode } from 'react';
import {
    Logo,
    CollapsedInitials,
    LogoCaption,
    LogoCaptionRow,
    LogoIcon,
    LogoImage,
    LogoStack,
    LogoText,
    LogoWide,
} from './SidebarStyles';

interface SidebarBrandProps {
    isCollapsed: boolean;
    companyName: string;
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
 * wyśrodkowana. Przycisk zwijania schodzi do wiersza z nazwą: obok logo odbierałby mu
 * szerokość i spychał je z osi, a szeroki logotyp i tak zajmuje cały pasek. Dotyczy to
 * logo w każdym kształcie; wcześniej sygnet stał jako 36-pikselowy kafelek przy lewej
 * krawędzi, a poziomy logotyp był dosunięty do lewej.
 *
 * Bez logo zostaje dawny wiersz: kafelek z inicjałami, nazwa i przycisk po prawej.
 *
 * W zwiniętym menu (desktop, 64 px) zostaje sam kafelek: logo zbliżone do kwadratu
 * mieści się w nim czytelnie, poziomy logotyp nie - wtedy inicjały.
 */
export const SidebarBrand = ({
    isCollapsed,
    companyName,
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
                    <LogoText $isCollapsed={isCollapsed} title={companyName}>
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
                    title={companyName}
                    $plate={logoNeedsPlate}
                    $wide={isWideLogo}
                    onError={onLogoError}
                />
                <LogoCaptionRow>
                    <LogoCaption title={companyName}>{companyName}</LogoCaption>
                    {actions}
                </LogoCaptionRow>
            </LogoStack>
            <CollapsedInitials $isCollapsed={isCollapsed}>
                {isWideLogo
                    ? <LogoIcon>{initials}</LogoIcon>
                    : <LogoImage src={logoUrl} alt={companyName} $plate={logoNeedsPlate} onError={onLogoError} />}
            </CollapsedInitials>
        </>
    );
};
