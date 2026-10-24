// src/modules/settings/components/creditsContact.tsx
//
// Doładowanie kredytów przez kontakt z obsługą, dopóki zakup w aplikacji nie działa.
//
// Bramka płatności za kredyty nie jest jeszcze podpięta do Przelewy24, więc zakup
// kończył się dopiero na samym końcu błędem 503 („chwilowo niedostępny"), po wyborze
// pakietu i zaznaczeniu zgody. Backend mówi teraz wprost, czy zakup online jest możliwy
// (`onlinePurchaseAvailable` przy saldzie), a ustawienia i kreator przy wizycie zamiast
// „Kup" prowadzą do maila z wybranym pakietem w treści.

import { ButtonLink, Notice } from '@/common/components/ui';
import { SUPPORT_EMAIL } from '@/modules/support/contact';
import { creditsRequestHref, type CreditsRequestPackage } from './creditsRequest';
import { creditsLabel, formatCreditCount } from './smsCreditPricing';

/** Zakup w aplikacji niedostępny: co zrobić zamiast tego. */
export function CreditsContactNotice() {
    return (
        <Notice tone="info" title="Kredytów nie kupisz jeszcze w aplikacji">
            Wybierz pakiet i napisz do nas na {SUPPORT_EMAIL}. Odpowiemy, jak go opłacić.
        </Notice>
    );
}

interface ContactButtonProps {
    pkg: CreditsRequestPackage | null;
    size?: 'sm' | 'md' | 'lg';
}

/** Akcja główna sekcji, gdy zakup online jest niedostępny: jedno wypełnienie, jak „Kup". */
export function CreditsContactButton({ pkg, size = 'lg' }: ContactButtonProps) {
    return (
        <ButtonLink href={creditsRequestHref(pkg)} $variant="primary" $size={size}>
            {pkg
                ? `Napisz do nas o ${formatCreditCount(pkg.creditAmount)} ${creditsLabel(pkg.creditAmount)}`
                : 'Napisz do nas'}
        </ButtonLink>
    );
}
