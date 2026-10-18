import styled from 'styled-components';
import { Check, ImageOff } from 'lucide-react';
import { SectionTitle, ui } from '@/common/components/ui';
import { pluralPl } from '@/common/utils/plural';
import type { PublishVisit } from '../../accountsTypes';
import { formatDate } from '../MetricBits';
import { PHONE } from '../../utils/phone';
import { Order, Thumb, Thumbs } from './PublishSection';
import { MAX_AI_PHOTOS } from './publishLogic';

/**
 * „Realizacja" w generatorze: z której wizyty jest post i które jej zdjęcia zobaczy AI.
 *
 * Z wizyty backend bierze auto i wykonane usługi jako FAKTY - dawniej generator dostawał
 * samo „Realizacja: Bmw X5" i dopisywał usługi, których nie było. Zdjęcia mówią mu to, czego
 * w danych nie ma: kolor, efekt, wnętrze czy lakier. Te same zdjęcia, w tej samej kolejności,
 * są potem zaznaczone do publikacji, więc tekst opisuje dokładnie to, co jest w karuzeli.
 */

const Wrap = styled.section<{ $highlight: boolean }>`
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 14px;
    margin-bottom: 20px;
    border: 1px solid ${p => (p.$highlight ? ui.brandLineSoft : ui.line)};
    border-radius: 12px;
    background: ${p => (p.$highlight ? ui.brandTint : ui.surface)};
`;

const VisitSelect = styled.select`
    height: 40px;
    padding: 0 12px;
    border: 1.5px solid ${ui.line};
    border-radius: 10px;
    background: ${ui.surface};
    font-family: inherit;
    font-size: 14px;
    color: ${ui.ink};

    &:focus { outline: none; border-color: ${ui.brand}; box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.12); }

    ${PHONE} {
        height: 44px;
        min-width: 0;
        font-size: 15px;
    }
`;

const Hint = styled.p`
    margin: 0;
    font-size: 12.5px;
    line-height: 1.5;
    color: ${ui.textMuted};
`;

const Empty = styled.p`
    margin: 0;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: ${ui.textMuted};

    svg { width: 16px; height: 16px; flex-shrink: 0; }
`;

const visitLabel = (visit: PublishVisit) =>
    [visit.vehicle, visit.visitNumber, formatDate(visit.date)].filter(Boolean).join(', ');

interface Props {
    visits: PublishVisit[] | undefined;
    loading: boolean;
    visitId: string | undefined;
    onVisitChange: (visit: PublishVisit | undefined) => void;
    aiPhotos: string[];
    onToggleAiPhoto: (photoId: string) => void;
    /** Otwarte z „Wybierz inną realizację" - sekcja ma przyciągnąć wzrok, bo to jest pytanie okna. */
    highlight?: boolean;
    /** Focus na wyborze wizyty przy `highlight`. Okno wyłącza go na telefonie - tam focus daje tylko palec. */
    autoFocus?: boolean;
}

export const VisitMaterialSection = ({
    visits, loading, visitId, onVisitChange, aiPhotos, onToggleAiPhoto, highlight = false, autoFocus = true,
}: Props) => {
    const list = visits ?? [];
    const visit = list.find(v => v.visitId === visitId);
    const full = aiPhotos.length >= MAX_AI_PHOTOS;

    return (
        <Wrap $highlight={highlight} aria-label="Realizacja">
            <SectionTitle
                as="h3"
                count={visit
                    ? `AI zobaczy ${aiPhotos.length} ${pluralPl(aiPhotos.length, 'zdjęcie', 'zdjęcia', 'zdjęć')}, do ${MAX_AI_PHOTOS}`
                    : 'opcjonalnie'}
            >
                {highlight ? 'Wybierz realizację' : 'Realizacja'}
            </SectionTitle>

            {loading ? (
                <Hint>Wczytuję ostatnie wizyty ze zdjęciami…</Hint>
            ) : list.length === 0 ? (
                <Empty><ImageOff aria-hidden="true" />Brak wizyt ze zdjęciami z ostatnich 60 dni. Post powstanie z samego tematu.</Empty>
            ) : (
                <>
                    <VisitSelect
                        aria-label="Wizyta, której dotyczy post"
                        value={visitId ?? ''}
                        autoFocus={highlight && autoFocus}
                        onChange={e => onVisitChange(list.find(v => v.visitId === e.target.value))}
                    >
                        <option value="">Bez realizacji, sam temat</option>
                        {list.map(v => <option key={v.visitId} value={v.visitId}>{visitLabel(v)}</option>)}
                    </VisitSelect>

                    {visit && (
                        <>
                            <Thumbs>
                                {visit.photos.map(photo => {
                                    const order = aiPhotos.indexOf(photo.id);
                                    const isSelected = order >= 0;
                                    return (
                                        <Thumb
                                            key={photo.id}
                                            type="button"
                                            $selected={isSelected}
                                            aria-pressed={isSelected}
                                            aria-label={isSelected ? `Zdjęcie ${order + 1} dla AI, odznacz` : 'Pokaż to zdjęcie AI'}
                                            disabled={!isSelected && full}
                                            onClick={() => onToggleAiPhoto(photo.id)}
                                        >
                                            <img src={photo.thumbnailUrl} alt="" loading="lazy" />
                                            {isSelected && <Order>{aiPhotos.length > 1 ? order + 1 : <Check size={12} />}</Order>}
                                        </Thumb>
                                    );
                                })}
                            </Thumbs>
                            <Hint>
                                Usługi AI weźmie z wizyty, więc nie dopisze niczego, czego nie robiliście. Na zdjęciach
                                opisze kolor i efekt, bez numerów rejestracyjnych. Kolejność zaznaczania to kolejność
                                zdjęć w poście.
                            </Hint>
                        </>
                    )}
                </>
            )}
        </Wrap>
    );
};
