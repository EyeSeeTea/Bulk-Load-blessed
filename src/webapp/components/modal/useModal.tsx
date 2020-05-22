import { ConfirmationDialog, ConfirmationDialogProps } from "d2-ui-components";
import React, { useCallback, useState } from "react";

export interface ModalState extends Omit<ConfirmationDialogProps, "isOpen"> {
    autoClose?: boolean;
}

export type ModalResult = [
    (props: ConfirmationDialogProps) => JSX.Element | null,
    (state: ModalState) => void,
    () => void
];

export default function useModal(initialState: ModalState | null = null): ModalResult {
    const [modalState, updateModal] = useState<ModalState | null>(initialState);
    const closeModal = useCallback(() => updateModal(null), []);

    const component = useCallback(
        (props: ConfirmationDialogProps) => {
            if (modalState === null) return null;
            const { autoClose = true, onSave, onCancel, onInfoAction, ...rest } = modalState;

            return (
                <ConfirmationDialog
                    {...props}
                    {...rest}
                    isOpen={true}
                    onSave={event => {
                        if (onSave) onSave(event);
                        if (autoClose) closeModal();
                    }}
                    onCancel={event => {
                        if (onCancel) onCancel(event);
                        if (autoClose) closeModal();
                    }}
                    onInfoAction={event => {
                        if (onInfoAction) onInfoAction(event);
                        if (autoClose) closeModal();
                    }}
                />
            );
        },
        [closeModal, modalState]
    );

    return [component, updateModal, closeModal];
}
