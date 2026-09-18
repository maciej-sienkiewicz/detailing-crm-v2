import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';
import { Award, Droplets, Package, Plus, Search, Wrench, X } from 'lucide-react';
import {
    ModalShell, ModalHeader, ModalTitleGroup, ModalTitle, ModalSubtitle,
    ModalContent, ModalFooter, CloseBtn,
} from '@/common/components/ModalKit';
import { SharedButton } from '@/common/styles';
import { InputShell, BareInput } from '@/common/components/Form';
import { useDebounce } from '@/common/hooks/useDebounce';
import { useToast } from '@/common/components/Toast/ToastContainer';
import { usePermissions } from '@/core/permissions';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { useProducts, useVisitProducts } from '@/modules/products/hooks/useProducts';
import { useCareInstructions } from '@/modules/settings/hooks/useCareInstructions';
import { qualityCertificateApi, type CertificateProductEntry } from '../api/qualityCertificateApi';
import type { Visit } from '../types';

// Okno „Certyfikat jakości".
//
// Certyfikat NIE jest odbiciem wizyty: kontekst biznesowy jest taki, że nie każda
// wykonana usługa i nie każdy zużyty preparat mają trafić do dokumentu dla klienta,
// a zalecenia nie wynikają z danych wizyty w ogóle — wpisuje je człowiek. Dlatego okno
// pyta o wszystko trzy razy i niczego nie domyśla się po zapisaniu.
//
// Zaznaczone z góry są usługi i produkty wizyty, bo to najczęstszy wybór — odznaczenie
// jednej pozycji jest tańsze niż zaznaczenie dziesięciu.
//
// Okno jest otwartym edytorem, więc jego „Generuj certyfikat" wolno wypełnić kolorem
// (wyjątek z CLAUDE.md §2); reszta przycisków nosi sam odcień.

const Section = styled.section` display: flex; flex-direction: column; gap: 10px; `;
const SectionHead = styled.h3`
    margin: 0; display: flex; align-items: center; gap: 8px;
    font-size: 15px; font-weight: 700; color: ${st.text};
`;
const SectionNote = styled.p` margin: 0; font-size: 12.5px; color: ${st.textMuted}; `;
const Divider = styled.hr` border: none; border-top: 1px solid ${st.border}; margin: 18px 0; `;

const Row = styled.label<{ $on: boolean }>`
    display: flex; align-items: flex-start; gap: 10px; cursor: pointer;
    padding: 10px 12px; border-radius: ${st.radiusSm};
    border: 1px solid ${p => (p.$on ? st.accentBlue : st.border)};
    background: ${p => (p.$on ? st.accentBlueDim : st.bgCard)};
    transition: border-color 150ms ease, background 150ms ease;
    &:hover { border-color: ${p => (p.$on ? st.accentBlue : st.borderHover)}; }
`;
const Check = styled.input` margin: 2px 0 0; width: 16px; height: 16px; flex-shrink: 0; accent-color: ${st.accentBlue}; `;
const RowMain = styled.div` flex: 1; min-width: 0; `;
const RowTitle = styled.div` font-size: 13.5px; font-weight: 600; color: ${st.text}; overflow-wrap: anywhere; `;
const RowSub = styled.div` font-size: 12px; color: ${st.textMuted}; overflow-wrap: anywhere; `;

const Manual = styled.div`
    display: flex; flex-direction: column; gap: 8px;
    padding: 10px 12px; border: 1px solid ${st.border}; border-radius: ${st.radiusSm};
    background: ${st.bgCard};
`;
const ManualHead = styled.div` display: flex; align-items: flex-start; gap: 10px; `;
const CareArea = styled.textarea`
    width: 100%; min-height: 76px; resize: vertical;
    padding: 10px 12px; font-family: inherit; font-size: 13px; line-height: 1.5;
    color: ${st.text}; background: ${st.bgInput};
    border: 1px solid ${st.border}; border-radius: ${st.radiusSm};
    &:focus { outline: none; border-color: ${st.borderFocus}; box-shadow: ${st.shadowBlue}; }
`;

const NoteInput = styled.input`
    width: 100%; padding: 8px 10px; font-family: inherit; font-size: 12.5px;
    color: ${st.text}; background: ${st.bgInput};
    border: 1px solid ${st.border}; border-radius: ${st.radiusSm};
    &:focus { outline: none; border-color: ${st.borderFocus}; box-shadow: ${st.shadowBlue}; }
`;
const RemoveBtn = styled.button`
    background: none; border: none; color: ${st.textMuted}; cursor: pointer; padding: 2px;
    &:hover { color: ${st.accentRed}; }
`;
const Empty = styled.p` margin: 0; font-size: 13px; color: ${st.textMuted}; `;
const RowHint = styled.div` margin-top: 2px; font-size: 11.5px; font-weight: 600; color: ${st.accentBlue}; `;

const Combo = styled.div` position: relative; `;
const LeadIcon = styled.span` display: inline-flex; padding-left: 12px; color: ${st.textMuted}; flex-shrink: 0; `;
// Lista podpowiedzi w PORTALU z pozycją `fixed`: treść okna się przewija i ma własne
// przycięcie, więc `absolute` w środku ucinałby listę razem z kontenerem.
const Menu = styled.div`
    position: fixed; z-index: 1300;
    background: ${st.bgCard}; border: 1px solid ${st.border}; border-radius: ${st.radiusSm};
    box-shadow: ${st.shadowMd}; overflow: hidden; max-height: 260px; overflow-y: auto;
`;
const Option = styled.button`
    display: flex; align-items: center; gap: 8px; width: 100%; text-align: left;
    padding: 10px 12px; background: none; border: none; cursor: pointer;
    font-family: inherit; font-size: 13px; color: ${st.text};
    &:hover { background: ${st.bgCardAlt}; }
    & + & { border-top: 1px solid ${st.border}; }
`;
const FreeText = styled(Option)` color: ${st.accentBlue}; font-weight: 600; `;
const MenuHint = styled.div` padding: 10px 12px; font-size: 12.5px; color: ${st.textMuted}; `;

/** Pozycja wpisana ręcznie. `key` istnieje tylko po to, żeby React nie gubił pól notatki. */
interface ManualEntry extends CertificateProductEntry {
    key: string;
    /** Podpis pod nazwą (opakowanie z katalogu) — na certyfikat i tak wchodzi z serwera. */
    subtitle: string | null;
}

let manualSeq = 0;
const nextKey = () => `manual-${++manualSeq}`;

/**
 * Pole „wyszukaj w katalogu albo wpisz z ręki".
 *
 * Wolna nazwa jest równoprawna, a nie awaryjna: polecamy i zużywamy preparaty, których
 * nie mamy u siebie w katalogu, a zmuszanie do założenia karty produktu tylko po to,
 * żeby wpisać go na certyfikat, zaśmieciłoby katalog.
 */
function ProductPicker({ placeholder, catalog, onPick }: {
    placeholder: string;
    /** Czy w ogóle wolno szukać w katalogu — studio bez modułu produktów dostaje 403. */
    catalog: boolean;
    onPick: (entry: ManualEntry) => void;
}) {
    const [search, setSearch] = useState('');
    const [open, setOpen] = useState(false);
    const debounced = useDebounce(search, 250);
    const { products, isLoading } = useProducts(
        { search: debounced, page: 1, limit: 8 },
        { enabled: catalog && debounced.trim().length > 0 },
    );
    const wrapRef = useRef<HTMLDivElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const [rect, setRect] = useState<{ top: number; left: number; width: number } | null>(null);

    const trimmed = search.trim();
    const visible = open && trimmed.length > 0;

    useEffect(() => {
        const onDoc = (e: MouseEvent) => {
            const t = e.target as Node;
            if (wrapRef.current?.contains(t) || menuRef.current?.contains(t)) return;
            setOpen(false);
        };
        document.addEventListener('mousedown', onDoc);
        return () => document.removeEventListener('mousedown', onDoc);
    }, []);

    const measure = useCallback(() => {
        const r = wrapRef.current?.getBoundingClientRect();
        if (r) setRect({ top: r.bottom + 4, left: r.left, width: r.width });
    }, []);
    useLayoutEffect(() => {
        if (!visible) return;
        measure();
        window.addEventListener('scroll', measure, true);
        window.addEventListener('resize', measure);
        return () => {
            window.removeEventListener('scroll', measure, true);
            window.removeEventListener('resize', measure);
        };
    }, [visible, measure]);

    const take = (entry: Omit<ManualEntry, 'key'>) => {
        onPick({ ...entry, key: nextKey() });
        setSearch('');
        setOpen(false);
    };

    return (
        <Combo ref={wrapRef}>
            <InputShell>
                <LeadIcon><Search size={15} /></LeadIcon>
                <BareInput
                    placeholder={placeholder}
                    value={search}
                    onChange={e => { setSearch(e.target.value); setOpen(true); }}
                    onFocus={() => setOpen(true)}
                />
            </InputShell>
            {visible && rect && createPortal(
                <Menu ref={menuRef} style={{ top: rect.top, left: rect.left, width: rect.width }}>
                    {catalog && products.map(p => (
                        <Option
                            key={p.id}
                            type="button"
                            onClick={() => take({
                                productId: p.id,
                                name: p.name,
                                note: null,
                                subtitle: [p.brand, `${p.packageSizeValue} ${p.packageSizeUnit}`]
                                    .filter(Boolean).join(' · ') || null,
                            })}
                        >
                            <Package size={14} />
                            {[p.brand, p.name].filter(Boolean).join(' ')}
                        </Option>
                    ))}
                    {catalog && isLoading && products.length === 0 && <MenuHint>Szukam w katalogu…</MenuHint>}
                    <FreeText
                        type="button"
                        onClick={() => take({ productId: null, name: trimmed, note: null, subtitle: null })}
                    >
                        <Plus size={14} /> Dopisz „{trimmed}" spoza katalogu
                    </FreeText>
                </Menu>,
                document.body,
            )}
        </Combo>
    );
}

interface Props {
    visit: Visit;
    onClose: () => void;
}

export function QualityCertificateModal({ visit, onClose }: Props) {
    const { showError, showSuccess } = useToast();
    const { can } = usePermissions();
    // Moduł produktów jest sprzedawany osobno. Bez niego certyfikat nadal ma sens —
    // usługi i zalecenia wpisane z ręki wystarczą — więc okno nie odmawia, tylko
    // przestaje pytać katalog o cokolwiek.
    const canProducts = can('PRODUCTS_VIEW');
    const { links } = useVisitProducts(canProducts ? visit.id : undefined);

    // Odrzucone usługi nie zostały wykonane — na certyfikacie nie mają czego szukać
    // i nie ma po co ich pokazywać do odznaczania.
    const services = useMemo(
        () => visit.services.filter(s => s.status !== 'REJECTED'),
        [visit.services],
    );

    // Usługi są w wizycie, zanim okno się zamontuje, więc zaznaczenie startowe liczymy raz,
    // przy tworzeniu stanu. Efekt przestawiałby je przy każdym odświeżeniu wizyty w tle
    // (react-query potrafi odświeżyć po powrocie do karty) i kasował odznaczenia.
    const [serviceIds, setServiceIds] = useState<Set<string>>(() => new Set(services.map(s => s.id)));
    const [linkIds, setLinkIds] = useState<Set<string>>(new Set());
    const [extras, setExtras] = useState<ManualEntry[]>([]);
    const [recommended, setRecommended] = useState<ManualEntry[]>([]);
    const [careNote, setCareNote] = useState('');
    // Odstępstwa od zaznaczenia automatycznego. Trzymamy je osobno, zamiast jednego
    // zbioru „zaznaczone": inaczej odznaczenie usługi cofałoby ręczną decyzję
    // użytkownika albo — odwrotnie — zamrażałoby listę przy pierwszej zmianie.
    const [careOn, setCareOn] = useState<Set<string>>(new Set());
    const [careOff, setCareOff] = useState<Set<string>>(new Set());
    const [busy, setBusy] = useState(false);

    const { instructions } = useCareInstructions();

    // Identyfikatory KATALOGOWE zaznaczonych usług — po nich idzie przypisanie
    // instrukcji. Pozycja wizyty ma własne id, które z cennikiem nie ma nic wspólnego.
    const selectedCatalogServiceIds = useMemo(
        () => new Set(services.filter(s => serviceIds.has(s.id)).map(s => s.serviceId).filter(Boolean)),
        [services, serviceIds],
    );

    const autoCareIds = useMemo(() => new Set(
        instructions
            .filter(i => i.isDefaultSelected || i.serviceIds.some(id => selectedCatalogServiceIds.has(id)))
            .map(i => i.id),
    ), [instructions, selectedCatalogServiceIds]);

    const careSelected = useMemo(() => {
        const next = new Set(autoCareIds);
        careOn.forEach(id => next.add(id));
        careOff.forEach(id => next.delete(id));
        return next;
    }, [autoCareIds, careOn, careOff]);

    const toggleCare = (id: string) => {
        const isOn = careSelected.has(id);
        setCareOn(prev => {
            const next = new Set(prev);
            if (isOn) next.delete(id); else next.add(id);
            return next;
        });
        setCareOff(prev => {
            const next = new Set(prev);
            if (isOn) next.add(id); else next.delete(id);
            return next;
        });
    };

    // Powiązania z produktami dociągają się osobnym zapytaniem, więc ich zaznaczenie musi
    // poczekać na dane — ale tylko RAZ, z tego samego powodu co wyżej.
    const linksSeeded = useRef(false);
    useEffect(() => {
        if (linksSeeded.current || links.length === 0) return;
        linksSeeded.current = true;
        setLinkIds(new Set(links.map(l => l.id)));
    }, [links]);

    const toggle = (set: Set<string>, id: string, apply: (next: Set<string>) => void) => {
        const next = new Set(set);
        if (next.has(id)) next.delete(id); else next.add(id);
        apply(next);
    };

    const patchNote = (
        list: ManualEntry[],
        apply: (next: ManualEntry[]) => void,
        key: string,
        note: string,
    ) => apply(list.map(e => (e.key === key ? { ...e, note: note || null } : e)));

    const nothingSelected =
        serviceIds.size === 0 && linkIds.size === 0 && extras.length === 0
        && recommended.length === 0 && careSelected.size === 0 && careNote.trim().length === 0;

    const generate = async () => {
        setBusy(true);
        try {
            await qualityCertificateApi.generate(
                visit.id,
                {
                    serviceIds: [...serviceIds],
                    productLinkIds: [...linkIds],
                    extraProducts: extras.map(({ productId, name, note }) => ({ productId, name, note })),
                    recommendations: recommended.map(({ productId, name, note }) => ({ productId, name, note })),
                    careInstructionIds: [...careSelected],
                    careNote: careNote.trim() || null,
                },
                visit.visitNumber,
            );
            showSuccess('Certyfikat wygenerowany', 'Plik PDF został pobrany.');
            onClose();
        } catch {
            showError('Nie udało się wygenerować certyfikatu', 'Spróbuj ponownie za chwilę.');
        } finally {
            setBusy(false);
        }
    };

    const manualList = (
        list: ManualEntry[],
        apply: (next: ManualEntry[]) => void,
        notePlaceholder: string,
    ) => list.map(entry => (
        <Manual key={entry.key}>
            <ManualHead>
                <RowMain>
                    <RowTitle>{entry.name}</RowTitle>
                    {entry.subtitle && <RowSub>{entry.subtitle}</RowSub>}
                </RowMain>
                <RemoveBtn
                    type="button"
                    aria-label="Usuń pozycję"
                    onClick={() => apply(list.filter(e => e.key !== entry.key))}
                >
                    <X size={16} />
                </RemoveBtn>
            </ManualHead>
            <NoteInput
                placeholder={notePlaceholder}
                value={entry.note ?? ''}
                onChange={e => patchNote(list, apply, entry.key, e.target.value)}
            />
        </Manual>
    ));

    return (
        <ModalShell isOpen onClose={onClose} maxWidth="680px">
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle>Certyfikat jakości</ModalTitle>
                    <ModalSubtitle>Wybierz, co ma znaleźć się w dokumencie dla klienta</ModalSubtitle>
                </ModalTitleGroup>
                <CloseBtn onClick={onClose} />
            </ModalHeader>

            <ModalContent>
                <Section>
                    <SectionHead><Wrench size={16} /> Wykonane usługi</SectionHead>
                    <SectionNote>Odznacz te, których nie chcesz pokazywać klientowi.</SectionNote>
                    {services.length === 0 && <Empty>Ta wizyta nie ma usług do wypisania.</Empty>}
                    {services.map(s => (
                        <Row key={s.id} $on={serviceIds.has(s.id)}>
                            <Check
                                type="checkbox"
                                checked={serviceIds.has(s.id)}
                                onChange={() => toggle(serviceIds, s.id, setServiceIds)}
                            />
                            <RowMain>
                                <RowTitle>{s.serviceName}</RowTitle>
                                {s.note && <RowSub>{s.note}</RowSub>}
                            </RowMain>
                        </Row>
                    ))}
                </Section>

                <Divider />

                <Section>
                    <SectionHead><Package size={16} /> Użyte produkty</SectionHead>
                    <SectionNote>
                        Zaznaczone pochodzą z karty wizyty. Możesz je ukryć albo dopisać preparat,
                        którego przy wizycie nie odnotowano.
                    </SectionNote>
                    {links.length === 0 && extras.length === 0 && (
                        <Empty>Do tej wizyty nie dopięto produktów — możesz dopisać je poniżej.</Empty>
                    )}
                    {links.map(l => (
                        <Row key={l.id} $on={linkIds.has(l.id)}>
                            <Check
                                type="checkbox"
                                checked={linkIds.has(l.id)}
                                onChange={() => toggle(linkIds, l.id, setLinkIds)}
                            />
                            <RowMain>
                                <RowTitle>{[l.brand, l.productName].filter(Boolean).join(' ')}</RowTitle>
                                <RowSub>{[l.packageLabel, l.note].filter(Boolean).join(' · ')}</RowSub>
                            </RowMain>
                        </Row>
                    ))}
                    {manualList(extras, setExtras, 'Notatka pod pozycją (opcjonalnie)')}
                    <ProductPicker
                        placeholder={canProducts
                            ? 'Dopisz użyty produkt — z katalogu lub z ręki…'
                            : 'Dopisz użyty produkt…'}
                        catalog={canProducts}
                        onPick={entry => setExtras(prev => [...prev, entry])}
                    />
                </Section>

                <Divider />

                <Section>
                    <SectionHead><Award size={16} /> Zalecane do dalszej pielęgnacji</SectionHead>
                    <SectionNote>
                        Ta lista nie wynika z wizyty — dodaj ją ręcznie. Do każdej pozycji możesz
                        dopisać notatkę, np. jak często stosować.
                    </SectionNote>
                    {recommended.length === 0 && (
                        <Empty>Nic jeszcze nie polecono. Bez wpisów ta sekcja nie pojawi się na certyfikacie.</Empty>
                    )}
                    {manualList(recommended, setRecommended, 'Np. co dwa tygodnie, metodą dwóch wiader')}
                    <ProductPicker
                        placeholder={canProducts
                            ? 'Poleć produkt — z katalogu lub z ręki…'
                            : 'Poleć produkt…'}
                        catalog={canProducts}
                        onPick={entry => setRecommended(prev => [...prev, entry])}
                    />
                </Section>

                <Divider />

                <Section>
                    <SectionHead><Droplets size={16} /> Jak utrzymać efekt</SectionHead>
                    <SectionNote>
                        Zaznaczone instrukcje trafią na certyfikat. Same zaznaczają się te oznaczone
                        w ustawieniach jako stałe oraz przypisane do wybranych wyżej usług — możesz
                        to zmienić.
                    </SectionNote>
                    {instructions.length === 0 && (
                        <Empty>
                            Słownik instrukcji jest pusty. Uzupełnisz go w Ustawieniach → Cennik usług →
                            Instrukcje pielęgnacji.
                        </Empty>
                    )}
                    {instructions.map(instruction => {
                        const on = careSelected.has(instruction.id);
                        const fromService = !instruction.isDefaultSelected
                            && instruction.serviceIds.some(id => selectedCatalogServiceIds.has(id));
                        return (
                            <Row key={instruction.id} $on={on}>
                                <Check type="checkbox" checked={on} onChange={() => toggleCare(instruction.id)} />
                                <RowMain>
                                    <RowTitle>{instruction.title}</RowTitle>
                                    <RowSub>{instruction.content}</RowSub>
                                    {fromService && <RowHint>zaznaczona przez wybraną usługę</RowHint>}
                                </RowMain>
                            </Row>
                        );
                    })}
                    <CareArea
                        value={careNote}
                        onChange={e => setCareNote(e.target.value)}
                        placeholder="Uwagi tylko do tego certyfikatu, np. auto odbierane w deszczu, przełóż pierwsze mycie."
                    />
                </Section>
            </ModalContent>

            <ModalFooter>
                <SharedButton type="button" $variant="ghost" onClick={onClose} disabled={busy}>
                    Anuluj
                </SharedButton>
                <SharedButton type="button" onClick={generate} disabled={busy || nothingSelected}>
                    {busy ? 'Generuję…' : 'Generuj certyfikat'}
                </SharedButton>
            </ModalFooter>
        </ModalShell>
    );
}
