// src/modules/auth/components/PasswordRequirements.tsx
//
// Wymogi hasła pokazywane W TRAKCIE pisania, z ptaszkiem przy każdym już
// spełnionym. Zastąpiły pasek siły hasła: "Średnie hasło" mówiło, że coś jest
// nie tak, ale nie mówiło CO poprawić, więc użytkownik dowiadywał się
// o brakującej cyfrze dopiero z błędu po kliknięciu "Załóż konto".
//
// Lista reguł pochodzi z utils/passwordRules - tego samego miejsca, z którego
// buduje się walidacja formularza. Ptaszek przy komplecie reguł znaczy więc
// dokładnie tyle, że formularz to hasło przyjmie.
//
// Znacznik spełnionej reguły jest CELOWO oszczędny (jasne tło + zielona
// obwódka, nie wypełniona zieleń): w oknie jest już jeden wypełniony element -
// przycisk kroku następnego - i cztery nasycone kropki obok niego robiłyby
// remis o pierwsze miejsce (CLAUDE.md §2).

import styled from 'styled-components';
import { PASSWORD_RULES } from '../utils/passwordRules';
import { t } from '@/common/i18n';

const Container = styled.div`
    margin-top: ${props => props.theme.spacing.sm};
`;

const Title = styled.p`
    margin: 0 0 ${props => props.theme.spacing.sm};
    font-size: ${props => props.theme.fontSizes.xs};
    color: ${props => props.theme.colors.textSecondary};
`;

const List = styled.ul`
    display: flex;
    flex-wrap: wrap;
    gap: ${props => props.theme.spacing.xs} ${props => props.theme.spacing.md};
    margin: 0;
    padding: 0;
    list-style: none;
`;

const Item = styled.li<{ $met: boolean }>`
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: ${props => props.theme.fontSizes.xs};
    color: ${props => props.$met ? '#15803d' : props.theme.colors.textMuted};
    transition: color ${props => props.theme.transitions.fast};
`;

const Marker = styled.span<{ $met: boolean }>`
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 16px;
    height: 16px;
    border-radius: ${props => props.theme.radii.full};
    border: 1.5px solid ${props => props.$met ? '#86efac' : props.theme.colors.border};
    background: ${props => props.$met ? props.theme.colors.successLight : 'transparent'};
    color: #15803d;
    transition: all ${props => props.theme.transitions.fast};

    svg {
        width: 10px;
        height: 10px;
    }
`;

const CheckIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
    </svg>
);

interface PasswordRequirementsProps {
    password: string;
    /**
     * Czy lista ma być widoczna. Widok pokazuje ją, gdy pole hasła jest aktywne
     * albo coś już w nim stoi - użytkownik ma znać wymogi, zanim zacznie
     * zgadywać, a nie dopiero po odrzuconym formularzu.
     */
    visible: boolean;
}

export const PasswordRequirements = ({ password, visible }: PasswordRequirementsProps) => {
    if (!visible) return null;

    return (
        <Container>
            <Title>{t.auth.passwordRules.title}</Title>
            {/*
              * aria-live: czytnik ekranu ma powiedzieć, że wymóg został właśnie
              * spełniony - ptaszek sam z siebie niczego nie ogłasza.
              */}
            <List aria-live="polite">
                {PASSWORD_RULES.map(rule => {
                    const met = rule.test(password);
                    return (
                        <Item
                            key={rule.id}
                            $met={met}
                            aria-label={`${rule.label} — ${met ? t.auth.passwordRules.met : t.auth.passwordRules.unmet}`}
                        >
                            <Marker $met={met} aria-hidden="true">
                                {met && <CheckIcon />}
                            </Marker>
                            {rule.label}
                        </Item>
                    );
                })}
            </List>
        </Container>
    );
};
