import { useState } from 'react';
import styled, { css } from 'styled-components';
import {
    ModalShell,
    ModalHeader,
    ModalTitleGroup,
    ModalTitle,
    ModalSubtitle,
    ModalContent,
    ModalFooter,
    CloseBtn,
} from '@/common/components/ModalKit';
import { SharedButton, SharedButtonGroup } from '@/common/styles';
import { useToast } from '@/common/components/Toast';
import { customerApi } from '../api/customerApi';
import type { CustomerFilters } from '../types';

type ExportScope = 'all' | 'filtered';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    currentFilters: Omit<CustomerFilters, 'page' | 'limit'>;
    filteredCount: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const hasActiveFilters = (f: Omit<CustomerFilters, 'page' | 'limit'>): boolean =>
    !!f.search ||
    (!!f.customerType && f.customerType !== 'all') ||
    !!f.services?.length ||
    !!f.lastVisitWithinDays ||
    !!f.notVisitedSinceDays ||
    !!f.vehicleBrand ||
    !!f.vehicleModel ||
    f.minRevenue != null ||
    f.maxRevenue != null ||
    f.minVisits != null ||
    f.maxVisits != null;

const plural = (n: number) =>
    n === 1 ? 'klient' : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? 'klientów' : 'klientów';

// ─── Styles ───────────────────────────────────────────────────────────────────

const OptionList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
`;

const OptionCard = styled.label<{ $active: boolean; $disabled?: boolean }>`
    display: flex;
    align-items: flex-start;
    gap: 14px;
    padding: 16px 18px;
    border: 1.5px solid ${p => p.$active ? '#0ea5e9' : '#e2e8f0'};
    border-radius: 14px;
    background: ${p => p.$active ? '#f0f9ff' : '#ffffff'};
    cursor: ${p => p.$disabled ? 'not-allowed' : 'pointer'};
    transition: border-color 180ms ease, background 180ms ease;
    opacity: ${p => p.$disabled ? 0.45 : 1};

    ${p => !p.$disabled && !p.$active && css`
        &:hover {
            border-color: #cbd5e1;
            background: #f8fafc;
        }
    `}
`;

const Radio = styled.input`
    margin-top: 2px;
    flex-shrink: 0;
    width: 17px;
    height: 17px;
    accent-color: #0ea5e9;
    cursor: inherit;
`;

const OptionBody = styled.div`
    display: flex;
    flex-direction: column;
    gap: 3px;
`;

const OptionTitle = styled.span`
    font-size: 14px;
    font-weight: 600;
    color: #0f172a;
    line-height: 1.3;
`;

const OptionDesc = styled.span`
    font-size: 13px;
    color: #64748b;
    line-height: 1.4;
`;

const CountBadge = styled.span`
    display: inline-flex;
    align-items: center;
    padding: 1px 8px;
    background: #0ea5e9;
    color: #fff;
    border-radius: 9999px;
    font-size: 11px;
    font-weight: 700;
    margin-left: 7px;
    vertical-align: middle;
`;

const InfoBox = styled.div`
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 11px 14px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    font-size: 12px;
    color: #64748b;
    line-height: 1.5;
    margin-top: 4px;
`;

// ─── Component ────────────────────────────────────────────────────────────────

export const ExportModal = ({ isOpen, onClose, currentFilters, filteredCount }: Props) => {
    const filtersActive = hasActiveFilters(currentFilters);
    const [scope, setScope] = useState<ExportScope>('all');
    const [isExporting, setIsExporting] = useState(false);
    const { showError, showSuccess } = useToast();

    const handleExport = async () => {
        setIsExporting(true);
        try {
            const filters = scope === 'filtered' ? currentFilters : {
                sortBy: currentFilters.sortBy,
                sortDirection: currentFilters.sortDirection,
            };
            await customerApi.exportCustomers(filters);
            showSuccess('Eksport gotowy', 'Plik CSV został pobrany');
            onClose();
        } catch (err: unknown) {
            const status = (err as { response?: { status?: number } })?.response?.status;
            if (status === 429) {
                showError('Za dużo żądań', 'Poczekaj chwilę przed kolejnym eksportem');
            } else if (status === 422) {
                showError('Za dużo wyników', 'Zawęź filtry — eksport obsługuje maks. 10 000 klientów');
            } else {
                showError('Błąd eksportu', 'Nie udało się pobrać pliku CSV');
            }
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <ModalShell isOpen={isOpen} onClose={onClose} size="sm">
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle>Eksport klientów</ModalTitle>
                    <ModalSubtitle>Wybierz zakres danych do pobrania</ModalSubtitle>
                </ModalTitleGroup>
                <CloseBtn onClick={onClose} />
            </ModalHeader>

            <ModalContent>
                <OptionList>
                    <OptionCard $active={scope === 'all'} onClick={() => setScope('all')}>
                        <Radio
                            type="radio"
                            name="export-scope"
                            checked={scope === 'all'}
                            onChange={() => setScope('all')}
                        />
                        <OptionBody>
                            <OptionTitle>Wszyscy klienci</OptionTitle>
                            <OptionDesc>Eksportuje pełną bazę klientów bez żadnych filtrów</OptionDesc>
                        </OptionBody>
                    </OptionCard>

                    <OptionCard
                        $active={scope === 'filtered'}
                        $disabled={!filtersActive}
                        onClick={() => filtersActive && setScope('filtered')}
                    >
                        <Radio
                            type="radio"
                            name="export-scope"
                            checked={scope === 'filtered'}
                            disabled={!filtersActive}
                            onChange={() => filtersActive && setScope('filtered')}
                        />
                        <OptionBody>
                            <OptionTitle>
                                Aktualnie odfiltrowano
                                {filtersActive && (
                                    <CountBadge>{filteredCount} {plural(filteredCount)}</CountBadge>
                                )}
                            </OptionTitle>
                            <OptionDesc>
                                {filtersActive
                                    ? 'Eksportuje wyniki pasujące do aktywnych filtrów i wyszukiwania'
                                    : 'Brak aktywnych filtrów — ustaw filtry w widoku listy'}
                            </OptionDesc>
                        </OptionBody>
                    </OptionCard>
                </OptionList>

                <InfoBox>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}>
                        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    Plik CSV jest zakodowany w&nbsp;UTF-8 z&nbsp;BOM — otwiera się poprawnie w&nbsp;Excelu i&nbsp;LibreOffice.
                    Maks. 10&nbsp;000 rekordów na eksport.
                </InfoBox>
            </ModalContent>

            <ModalFooter>
                <SharedButtonGroup>
                    <SharedButton $variant="secondary" onClick={onClose} disabled={isExporting}>
                        Anuluj
                    </SharedButton>
                    <SharedButton $variant="primary" onClick={handleExport} disabled={isExporting}>
                        {isExporting ? (
                            <>
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: 'spin 0.8s linear infinite' }}>
                                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                                </svg>
                                Pobieranie…
                            </>
                        ) : (
                            <>
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                    <polyline points="7 10 12 15 17 10" />
                                    <line x1="12" y1="15" x2="12" y2="3" />
                                </svg>
                                Eksportuj CSV
                            </>
                        )}
                    </SharedButton>
                </SharedButtonGroup>
            </ModalFooter>
        </ModalShell>
    );
};
