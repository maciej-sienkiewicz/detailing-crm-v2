import styled from 'styled-components';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import {
    ModalShell,
    ModalHeader,
    ModalTitleGroup,
    ModalTitle,
    ModalContent,
} from '@/common/components/ModalKit';
import { SUBMODAL_Z_INDEX } from '@/common/styles';

/*
 * Wyjście z okna „Dokumentacja i Podpisy" jest decyzją, nie zamknięciem okna.
 *
 * Wizyta w tym momencie JUŻ istnieje w bazie — ze swoim numerem, protokołami i
 * zdjęciami — ale jeszcze się nie rozpoczęła. Odruchowy Escape zostawiał ją w tym
 * stanie na zawsze: nie było jej na żadnej liście, nie dało się jej ani prowadzić, ani
 * anulować, a jedyne, co po niej zostawało, to wpis w Aktywności obiecujący wizytę,
 * której nie ma. Dlatego zamiast cichego wyjścia użytkownik dostaje trzy jawne wyjścia
 * i musi jedno wybrać.
 */

const Body = styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 4px 0 8px;
`;

const WarningBanner = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 14px;
    background: #FEF9C3;
    border-left: 3px solid #EAB308;
    border-radius: ${st.radiusSm};
`;

const WarningIconWrap = styled.div`
    flex-shrink: 0;
    color: #CA8A04;
    display: flex;
    align-items: center;

    svg {
        width: 18px;
        height: 18px;
    }
`;

const WarningText = styled.div`
    font-size: ${st.fontSm};
    font-weight: 600;
    color: #78350F;
    line-height: 1.4;
`;

const Description = styled.p`
    margin: 0;
    font-size: ${st.fontSm};
    color: ${st.textSecondary};
    line-height: 1.55;
`;

const Options = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const OptionBtn = styled.button<{ $variant: 'primary' | 'neutral' | 'danger' }>`
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
    width: 100%;
    padding: 12px 16px;
    text-align: left;
    border-radius: ${st.radiusSm};
    cursor: pointer;
    transition: all ${st.transition};
    border: 1px solid ${({ $variant }) =>
        $variant === 'primary' ? st.accentBlue
        : $variant === 'danger' ? 'rgba(239, 68, 68, 0.45)'
        : st.border};
    background: ${({ $variant }) => ($variant === 'primary' ? st.accentBlueDim : 'transparent')};

    &:hover:not(:disabled) {
        border-color: ${({ $variant }) =>
            $variant === 'danger' ? '#EF4444' : st.borderHover};
    }

    &:disabled {
        opacity: 0.55;
        cursor: not-allowed;
    }
`;

const OptionTitle = styled.span<{ $variant: 'primary' | 'neutral' | 'danger' }>`
    font-size: ${st.fontSm};
    font-weight: 600;
    color: ${({ $variant }) =>
        $variant === 'primary' ? st.accentBlue
        : $variant === 'danger' ? '#DC2626'
        : st.text};
`;

const OptionDesc = styled.span`
    font-size: 12px;
    color: ${st.textSecondary};
    line-height: 1.45;
`;

const TriangleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
);

interface AbandonCheckInDialogProps {
    isOpen: boolean;
    visitNumber: string;
    /** Blokuje przyciski na czas anulowania wizyty. */
    isCancelling: boolean;
    /** Wróć do dokumentów — nic się nie zmienia. */
    onBack: () => void;
    /** Anuluj wizytę — szkic i jego dokumenty znikają, rezerwacja wraca do kalendarza. */
    onCancelVisit: () => void;
    /**
     * Wyjście bez zmian — pokazywane TYLKO tam, gdzie odłożenie przyjęcia niczego nie
     * psuje, czyli przy dokańczaniu z listy „Nieukończone przyjęcia": szkic już tam
     * jest, więc zamknięcie okna niczego nie zmienia.
     *
     * W kreatorze przyjęcia tej opcji nie ma i to jest celowe. „Zostaw na później"
     * brzmi niewinnie, a znaczy „zostaw auto przyjęte, wizytę nierozpoczętą i licz, że
     * ktoś do tego wróci" — czyli produkuje dokładnie ten stan, który cała ta praca
     * miała wyeliminować. Przyjęcie albo się kończy, albo się je anuluje.
     */
    onLeaveForLater?: () => void;
}

export const AbandonCheckInDialog = ({
    isOpen,
    visitNumber,
    isCancelling,
    onBack,
    onCancelVisit,
    onLeaveForLater,
}: AbandonCheckInDialogProps) => (
    // Bez zamykania Escape'em i kliknięciem w tło: to okno istnieje właśnie po to,
    // żeby odruchowe zamknięcie nie było jedną z możliwych odpowiedzi.
    <ModalShell isOpen={isOpen} onClose={onBack} maxWidth="480px" zIndex={SUBMODAL_Z_INDEX} dismissible={false}>
        <ModalHeader>
            <ModalTitleGroup>
                <ModalTitle>Przerwać przyjęcie pojazdu?</ModalTitle>
            </ModalTitleGroup>
        </ModalHeader>

        <ModalContent>
            <Body>
                <WarningBanner>
                    <WarningIconWrap><TriangleIcon /></WarningIconWrap>
                    <WarningText>Wizyta {visitNumber} nie została jeszcze rozpoczęta.</WarningText>
                </WarningBanner>

                <Description>
                    Dane przyjęcia są już zapisane, ale dopóki nie zatwierdzisz wizyty, nie trafi
                    ona na listę wizyt ani do obsługi. Dokończ ją albo anuluj — nie da się jej
                    zostawić w tym stanie.
                </Description>

                <Options>
                    <OptionBtn $variant="primary" onClick={onBack} disabled={isCancelling}>
                        <OptionTitle $variant="primary">Wróć do dokumentów</OptionTitle>
                        <OptionDesc>Dokończ podpisy i zatwierdź wizytę teraz.</OptionDesc>
                    </OptionBtn>

                    <OptionBtn $variant="danger" onClick={onCancelVisit} disabled={isCancelling}>
                        <OptionTitle $variant="danger">
                            {isCancelling ? 'Anulowanie...' : 'Anuluj wizytę'}
                        </OptionTitle>
                        <OptionDesc>
                            Usuwa przyjęcie razem z wygenerowanymi dokumentami. Rezerwacja wraca
                            do kalendarza i można przyjąć auto od nowa.
                        </OptionDesc>
                    </OptionBtn>

                    {onLeaveForLater && (
                        <OptionBtn $variant="neutral" onClick={onLeaveForLater} disabled={isCancelling}>
                            <OptionTitle $variant="neutral">Zamknij bez zmian</OptionTitle>
                            <OptionDesc>
                                Wróć do listy nieukończonych przyjęć. Nic nie zostanie usunięte.
                            </OptionDesc>
                        </OptionBtn>
                    )}
                </Options>
            </Body>
        </ModalContent>
    </ModalShell>
);
