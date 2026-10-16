// src/modules/comms/components/useAttachmentPreview.tsx
import { useCallback, useState } from 'react';
import { downloadAttachmentFile, isPreviewableAttachment, type PreviewableFile } from '../inbox/messageFormat';
import { AttachmentPreviewModal } from './AttachmentPreviewModal';

/**
 * Stan podglądu dla widoku z załącznikami: `open` pokazuje plik albo - gdy go nie da
 * się obejrzeć - po prostu go pobiera, `preview` to okno do wyrenderowania.
 */
export function useAttachmentPreview(load: (id: string) => Promise<Blob>) {
    const [target, setTarget] = useState<{ files: PreviewableFile[]; id: string } | null>(null);

    const open = useCallback(
        (file: PreviewableFile, files: PreviewableFile[] = [file]) => {
            if (isPreviewableAttachment(file)) setTarget({ files, id: file.id });
            else void downloadAttachmentFile(load, file.id, file.fileName).catch(() => {});
        },
        [load]
    );

    const close = useCallback(() => setTarget(null), []);

    const preview = target ? (
        <AttachmentPreviewModal files={target.files} initialId={target.id} load={load} onClose={close} />
    ) : null;

    return { open, preview };
}
