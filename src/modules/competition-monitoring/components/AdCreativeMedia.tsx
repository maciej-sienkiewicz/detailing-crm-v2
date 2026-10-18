import React, { useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import type { AdCreative, AdCreativeMedia as Media } from '../types';

/**
 * Grafika albo film reklamy konkurenta - OSADZONE z serwerów Meta, nie kopiowane.
 *
 * Przeglądarka ładuje plik wprost z `*.fbcdn.net`, więc CRM nie trzyma kopii cudzych
 * grafik ani wizerunków osób z reklam. Ceną jest to, że adres wygasa po kilku dniach
 * - serwer pilnuje terminu i prosi o nowy, a gdy plik mimo to się nie wczyta (Meta
 * zdjęła reklamę), zamiast pustej ramki zostaje sam tekst.
 *
 * Kilka plików (karuzela) to pasek przewijany w bok, jak w aplikacji.
 */

const shimmer = keyframes`
    0% { background-position: -200px 0; }
    100% { background-position: 200px 0; }
`;

const Frame = styled.div`
    margin: 12px 0;
    display: flex;
    gap: 8px;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
`;

const Item = styled.div<{ $single: boolean }>`
    flex: 0 0 ${p => (p.$single ? '100%' : '78%')};
    scroll-snap-align: start;
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
    overflow: hidden;
    background: #0f172a;

    img, video {
        display: block;
        width: 100%;
        max-height: 420px;
        object-fit: contain;
        background: #0f172a;
    }
`;

const Loading = styled.div`
    margin: 12px 0;
    height: 180px;
    border-radius: ${st.radiusSm};
    background: linear-gradient(90deg, #f1f5f9 0, #e2e8f0 50%, #f1f5f9 100%);
    background-size: 400px 100%;
    animation: ${shimmer} 1.4s linear infinite;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    color: ${st.textMuted};
`;

const MediaItem: React.FC<{ media: Media; single: boolean; onBroken: () => void }> = ({ media, single, onBroken }) => (
    <Item $single={single}>
        {media.kind === 'VIDEO' ? (
            <video
                src={media.url}
                poster={media.posterUrl ?? undefined}
                controls
                playsInline
                preload="metadata"
                onError={onBroken}
            />
        ) : (
            <img src={media.url} alt="Grafika reklamy" loading="lazy" referrerPolicy="no-referrer" onError={onBroken} />
        )}
    </Item>
);

interface Props {
    creative: AdCreative | undefined;
    loading: boolean;
}

export const AdCreativeMediaView: React.FC<Props> = ({ creative, loading }) => {
    const [broken, setBroken] = useState<ReadonlySet<string>>(new Set());

    if (loading || creative?.status === 'BUSY') {
        return <Loading role="status">Wczytuję grafikę reklamy…</Loading>;
    }
    const media = (creative?.status === 'OK' ? creative.media : []).filter(item => !broken.has(item.url));
    if (media.length === 0) return null;

    return (
        <Frame aria-label="Grafika i film reklamy">
            {media.map(item => (
                <MediaItem
                    key={item.url}
                    media={item}
                    single={media.length === 1}
                    onBroken={() => setBroken(prev => new Set(prev).add(item.url))}
                />
            ))}
        </Frame>
    );
};
