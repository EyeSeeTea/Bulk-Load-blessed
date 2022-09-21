import { ConfirmationDialog, Sharing } from "@eyeseetea/d2-ui-components";
import { useCallback } from "react";
import i18n from "../../../locales";
import { useAppContext } from "../../contexts/app-context";
import { Id } from "../../../domain/entities/ReferenceObject";

export interface ThemePermissionsDialogProps {
    themeId: Id;
    onClose: () => void;
    rows: any[];
}

export function ThemePermissionsDialog(props: ThemePermissionsDialogProps) {
    const { themeId, onClose } = props;
    const { compositionRoot } = useAppContext();

    const search = useCallback((query: string) => compositionRoot.users.search(query), [compositionRoot]);

    const metaObject = {
        meta: {
            allowPublicAccess: false,
            allowExternalAccess: false,
        },
        object: {
            id: "",
            displayName: i18n.t("Access to Themes"),
            externalAccess: false,
            publicAccess: "",
            userAccesses: [],
            userGroupAccesses: [],
        },
    };

    return (
        <ConfirmationDialog isOpen={true} fullWidth={true} onCancel={onClose} cancelText={i18n.t("Close")}>
            <Sharing
                meta={metaObject}
                showOptions={{
                    dataSharing: false,
                    publicSharing: false,
                    externalSharing: false,
                    permissionPicker: false,
                }}
                onSearch={search}
                onChange={async () => console.log(themeId)}
            />
        </ConfirmationDialog>
    );
}
