/**
 * Modal for uploading a new consent template version.
 * Handles the S3 upload workflow:
 * 1. Get presigned URL from backend
 * 2. Upload PDF directly to S3
 */

import { useState, useRef } from 'react';
import styled from 'styled-components';
import { Modal } from '@/common/components/Modal/Modal';
import { Button } from '@/common/components/Button/Button';
import { FormGrid, FieldGroup, Label, ErrorMessage } from '@/common/components/Form/Form';
import { t } from '@/common/i18n';
import { useUploadTemplate } from '../hooks/useConsents';

interface UploadTemplateModalProps {
    isOpen: boolean;
    onClose: () => void;
    definitionId: string;
    definitionName: string;
}

export const UploadTemplateModal = ({
    isOpen,
    onClose,
    definitionId,
    definitionName,
}: UploadTemplateModalProps) => {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [requiresResign, setRequiresResign] = useState(false);
    const [setAsActive, setSetAsActive] = useState(true);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { uploadTemplate, isUploading, error: apiError } = useUploadTemplate({
        onSuccess: () => {
            handleClose();
        },
    });

    const handleClose = () => {
        setSelectedFile(null);
        setRequiresResign(false);
        setSetAsActive(true);
        setErrors({});
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
        onClose();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) {
            setSelectedFile(null);
            return;
        }

        // Validate file type
        if (file.type !== 'application/pdf') {
            setErrors({ file: t.consents.validation.filePdfOnly });
            setSelectedFile(null);
            return;
        }

        setErrors({});
        setSelectedFile(file);
    };

    const handleSelectFile = () => {
        fileInputRef.current?.click();
    };

    const validateForm = () => {
        const newErrors: Record<string, string> = {};

        if (!selectedFile) {
            newErrors.file = t.consents.validation.fileRequired;
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm() || !selectedFile) {
            return;
        }

        uploadTemplate({
            request: {
                definitionId,
                requiresResign,
                setAsActive,
            },
            file: selectedFile,
        });
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} maxWidth="600px">
            <ModalHeader>
                <ModalTitle>{t.consents.uploadTemplateModal.title}</ModalTitle>
                <ModalSubtitle>{definitionName}</ModalSubtitle>
            </ModalHeader>

            <Form onSubmit={handleSubmit}>
                <FormGrid>
                    <FieldGroupFull>
                        <Label>
                            {t.consents.uploadTemplateModal.fileLabel}
                            <RequiredStar>*</RequiredStar>
                        </Label>
                        <FileInputWrapper>
                            <HiddenFileInput
                                ref={fileInputRef}
                                type="file"
                                accept=".pdf,application/pdf"
                                onChange={handleFileChange}
                                disabled={isUploading}
                            />
                            <FileSelectButton
                                type="button"
                                onClick={handleSelectFile}
                                disabled={isUploading}
                                $hasError={!!errors.file}
                            >
                                {selectedFile
                                    ? `${t.consents.uploadTemplateModal.fileSelected}: ${selectedFile.name}`
                                    : t.consents.uploadTemplateModal.selectFile}
                            </FileSelectButton>
                        </FileInputWrapper>
                        <HintText>{t.consents.uploadTemplateModal.fileHint}</HintText>
                        {errors.file && <ErrorMessage>{errors.file}</ErrorMessage>}
                    </FieldGroupFull>

                    <FieldGroupFull>
                        <CheckboxLabel>
                            <Checkbox
                                type="checkbox"
                                checked={requiresResign}
                                onChange={(e) => setRequiresResign(e.target.checked)}
                                disabled={isUploading}
                            />
                            <CheckboxText>
                                {t.consents.uploadTemplateModal.requiresResignLabel}
                            </CheckboxText>
                        </CheckboxLabel>
                        <HintText>{t.consents.uploadTemplateModal.requiresResignHint}</HintText>
                        {requiresResign && (
                            <WarningBox>
                                <WarningIcon>⚠️</WarningIcon>
                                <WarningText>
                                    Włączenie tej opcji spowoduje, że wszyscy klienci będą musieli
                                    ponownie podpisać tę zgodę.
                                </WarningText>
                            </WarningBox>
                        )}
                    </FieldGroupFull>

                    <FieldGroupFull>
                        <CheckboxLabel>
                            <Checkbox
                                type="checkbox"
                                checked={setAsActive}
                                onChange={(e) => setSetAsActive(e.target.checked)}
                                disabled={isUploading}
                            />
                            <CheckboxText>
                                {t.consents.uploadTemplateModal.setAsActiveLabel}
                            </CheckboxText>
                        </CheckboxLabel>
                        <HintText>{t.consents.uploadTemplateModal.setAsActiveHint}</HintText>
                    </FieldGroupFull>
                </FormGrid>

                {apiError && (
                    <ErrorMessage>{t.consents.error.uploadTemplateFailed}</ErrorMessage>
                )}

                {isUploading && (
                    <UploadProgress>
                        <Spinner />
                        <UploadText>{t.consents.uploadTemplateModal.uploadingToS3}</UploadText>
                    </UploadProgress>
                )}

                <ModalActions>
                    <Button
                        type="button"
                        $variant="secondary"
                        onClick={handleClose}
                        disabled={isUploading}
                    >
                        {t.consents.uploadTemplateModal.cancel}
                    </Button>
                    <Button type="submit" $variant="primary" disabled={isUploading}>
                        {isUploading
                            ? t.consents.uploadTemplateModal.uploading
                            : t.consents.uploadTemplateModal.upload}
                    </Button>
                </ModalActions>
            </Form>
        </Modal>
    );
};

const ModalHeader = styled.div`
    margin-bottom: ${(props) => props.theme.spacing.lg};
`;

const ModalTitle = styled.h2`
    font-size: 1.5rem;
    font-weight: 600;
    color: ${(props) => props.theme.colors.text.primary};
    margin: 0 0 ${(props) => props.theme.spacing.xs} 0;
`;

const ModalSubtitle = styled.p`
    font-size: 0.875rem;
    color: ${(props) => props.theme.colors.text.secondary};
    margin: 0;
`;

const Form = styled.form`
    display: flex;
    flex-direction: column;
    gap: ${(props) => props.theme.spacing.lg};
`;

const FieldGroupFull = styled(FieldGroup)`
    grid-column: 1 / -1;
`;

const RequiredStar = styled.span`
    color: ${(props) => props.theme.colors.error};
    margin-left: 4px;
`;

const FileInputWrapper = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${(props) => props.theme.spacing.sm};
`;

const HiddenFileInput = styled.input`
    display: none;
`;

const FileSelectButton = styled.button<{ $hasError?: boolean }>`
    padding: ${(props) => props.theme.spacing.sm} ${(props) => props.theme.spacing.md};
    border: 2px dashed
        ${(props) =>
            props.$hasError ? props.theme.colors.error : props.theme.colors.border.light};
    border-radius: ${(props) => props.theme.radius.md};
    background-color: ${(props) => props.theme.colors.surface.main};
    color: ${(props) => props.theme.colors.text.primary};
    font-size: 0.875rem;
    cursor: pointer;
    transition: all ${(props) => props.theme.transitions.fast};
    text-align: left;

    &:hover:not(:disabled) {
        border-color: ${(props) => props.theme.colors.primary};
        background-color: ${(props) => props.theme.colors.surface.hover};
    }

    &:disabled {
        cursor: not-allowed;
        opacity: 0.6;
    }
`;

const HintText = styled.span`
    font-size: 0.75rem;
    color: ${(props) => props.theme.colors.text.secondary};
    margin-top: ${(props) => props.theme.spacing.xs};
`;

const CheckboxLabel = styled.label`
    display: flex;
    align-items: center;
    gap: ${(props) => props.theme.spacing.sm};
    cursor: pointer;
`;

const Checkbox = styled.input`
    width: 18px;
    height: 18px;
    cursor: pointer;
    accent-color: ${(props) => props.theme.colors.primary};

    &:disabled {
        cursor: not-allowed;
    }
`;

const CheckboxText = styled.span`
    font-size: 0.875rem;
    color: ${(props) => props.theme.colors.text.primary};
    font-weight: 500;
`;

const WarningBox = styled.div`
    display: flex;
    gap: ${(props) => props.theme.spacing.sm};
    padding: ${(props) => props.theme.spacing.sm} ${(props) => props.theme.spacing.md};
    background-color: ${(props) => props.theme.colors.warning}15;
    border: 1px solid ${(props) => props.theme.colors.warning};
    border-radius: ${(props) => props.theme.radius.md};
    margin-top: ${(props) => props.theme.spacing.sm};
`;

const WarningIcon = styled.span`
    font-size: 1.25rem;
    flex-shrink: 0;
`;

const WarningText = styled.span`
    font-size: 0.875rem;
    color: ${(props) => props.theme.colors.text.primary};
`;

const UploadProgress = styled.div`
    display: flex;
    align-items: center;
    gap: ${(props) => props.theme.spacing.md};
    padding: ${(props) => props.theme.spacing.md};
    background-color: ${(props) => props.theme.colors.surface.hover};
    border-radius: ${(props) => props.theme.radius.md};
`;

const Spinner = styled.div`
    width: 20px;
    height: 20px;
    border: 2px solid ${(props) => props.theme.colors.border.light};
    border-top-color: ${(props) => props.theme.colors.primary};
    border-radius: 50%;
    animation: spin 0.8s linear infinite;

    @keyframes spin {
        to {
            transform: rotate(360deg);
        }
    }
`;

const UploadText = styled.span`
    font-size: 0.875rem;
    color: ${(props) => props.theme.colors.text.secondary};
`;

const ModalActions = styled.div`
    display: flex;
    gap: ${(props) => props.theme.spacing.md};
    justify-content: flex-end;
    margin-top: ${(props) => props.theme.spacing.md};
`;
