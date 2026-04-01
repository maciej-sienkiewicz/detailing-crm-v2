import { useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import { st } from '@/modules/statistics/components/StatisticsTheme';

const fadeIn = keyframes`
    from { opacity: 0; }
    to   { opacity: 1; }
`;

const slideUp = keyframes`
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
`;

const Overlay = styled.div`
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.75);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    padding: 24px;
    animation: ${fadeIn} 0.18s ease;
`;

const Modal = styled.div`
    display: flex;
    flex-direction: column;
    width: min(92vw, 1100px);
    height: min(90vh, 860px);
    background: ${st.bgCard};
    border-radius: ${st.radius};
    overflow: hidden;
    box-shadow: 0 24px 64px rgba(0, 0, 0, 0.45);
    animation: ${slideUp} 0.22s ease;
`;

const Header = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    background: ${st.bg};
    border-bottom: 1px solid ${st.border};
    flex-shrink: 0;
`;

const FileIcon = styled.div`
    width: 32px;
    height: 32px;
    border-radius: 7px;
    background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    flex-shrink: 0;
`;

const FileName = styled.div`
    flex: 1;
    font-size: ${st.fontSm};
    font-weight: 600;
    color: ${st.text};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
`;

const HeaderActions = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
`;

const DownloadBtn = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 13px;
    background: transparent;
    border: 1px solid ${st.border};
    border-radius: ${st.radiusFull};
    font-size: ${st.fontSm};
    font-weight: 600;
    color: ${st.textSecondary};
    cursor: pointer;
    transition: all ${st.transition};

    &:hover {
        border-color: ${st.accentBlue};
        color: ${st.accentBlue};
        background: ${st.accentBlueDim};
    }

    svg { width: 14px; height: 14px; }
`;

const CloseBtn = styled.button`
    width: 32px;
    height: 32px;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: ${st.textMuted};
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all ${st.transition};
    flex-shrink: 0;

    &:hover {
        background: ${st.bgCardAlt};
        color: ${st.text};
    }

    svg { width: 18px; height: 18px; }
`;

const PdfFrame = styled.iframe`
    flex: 1;
    width: 100%;
    border: none;
    background: #525659;
`;

interface PdfViewerModalProps {
    fileUrl: string;
    fileName: string;
    isOpen: boolean;
    onClose: () => void;
    onDownload: () => void;
}

export const PdfViewerModal = ({ fileUrl, fileName, isOpen, onClose, onDownload }: PdfViewerModalProps) => {
    useEffect(() => {
        if (!isOpen) return;
        const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handleKey);
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', handleKey);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <Overlay onClick={onClose}>
            <Modal onClick={e => e.stopPropagation()}>
                <Header>
                    <FileIcon>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                            <polyline points="14 2 14 8 20 8"/>
                        </svg>
                    </FileIcon>
                    <FileName title={fileName}>{fileName}</FileName>
                    <HeaderActions>
                        <DownloadBtn onClick={onDownload}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                <polyline points="7 10 12 15 17 10"/>
                                <line x1="12" y1="15" x2="12" y2="3"/>
                            </svg>
                            Pobierz
                        </DownloadBtn>
                        <CloseBtn onClick={onClose} title="Zamknij (Esc)">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="18" y1="6" x2="6" y2="18"/>
                                <line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                        </CloseBtn>
                    </HeaderActions>
                </Header>
                <PdfFrame
                    src={fileUrl}
                    title={fileName}
                />
            </Modal>
        </Overlay>
    );
};
