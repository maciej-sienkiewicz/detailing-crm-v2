import { useEffect } from 'react';
import styled from 'styled-components';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import {
  ModalShell,
  ModalHeader,
  ModalTitleGroup,
  ModalTitle,
  CloseBtn,
} from '@/common/components/ModalKit';

/* ─── Content-area styled-components ─────────────────────────────────────── */

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

const HeaderActions = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
    margin-left: auto;
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

const PdfFrame = styled.iframe`
    flex: 1;
    width: 100%;
    min-height: min(calc(90vh - 60px), 800px);
    border: none;
    background: #525659;
    display: block;
`;

/* ─── Component ───────────────────────────────────────────────────────────── */

interface PdfViewerModalProps {
    fileUrl: string;
    fileName: string;
    isOpen: boolean;
    onClose: () => void;
    onDownload: () => void;
}

export const PdfViewerModal = ({ fileUrl, fileName, isOpen, onClose, onDownload }: PdfViewerModalProps) => {
    return (
        <ModalShell isOpen={isOpen} onClose={onClose} maxWidth="1100px">
            <ModalHeader>
                <FileIcon>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                    </svg>
                </FileIcon>
                <ModalTitleGroup>
                    <ModalTitle title={fileName}>{fileName}</ModalTitle>
                </ModalTitleGroup>
                <HeaderActions>
                    <DownloadBtn onClick={onDownload}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                            <polyline points="7 10 12 15 17 10"/>
                            <line x1="12" y1="15" x2="12" y2="3"/>
                        </svg>
                        Pobierz
                    </DownloadBtn>
                    <CloseBtn onClick={onClose} />
                </HeaderActions>
            </ModalHeader>
            <PdfFrame
                src={fileUrl}
                title={fileName}
            />
        </ModalShell>
    );
};
