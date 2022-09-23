import { ConfirmationDialog, ShareUpdate, Sharing } from "@eyeseetea/d2-ui-components";
import { useCallback } from "react";
import i18n from "../../../locales";
import { useAppContext } from "../../contexts/app-context";
import { Id } from "../../../domain/entities/ReferenceObject";
import { PermissionType } from "../../logic/settings";
import { Theme } from "../../../domain/entities/Theme";

export interface ThemePermissionsDialogProps {
    themeId: Id;
    onClose: () => void;
    rows: Theme[];
    onChange: (rows: Theme[]) => void;
}

export function ThemePermissionsDialog(props: ThemePermissionsDialogProps) {
    const { themeId, onClose, rows: themes, onChange } = props;
    const { compositionRoot } = useAppContext();

    const search = useCallback((query: string) => compositionRoot.users.search(query), [compositionRoot]);

    const buildMetaObject = useCallback(
        (id: Id) => {
            const buildSharings = (type: PermissionType) => {
                const theme = themes.find(theme => theme.id === id);
                return type === "user" ? theme?.sharing?.users : theme?.sharing?.userGroups;
            };

            return {
                meta: {
                    allowPublicAccess: false,
                    allowExternalAccess: false,
                },
                object: {
                    id: "",
                    displayName: i18n.t("Access to Themes"),
                    externalAccess: false,
                    publicAccess: "",
                    userAccesses: buildSharings("user"),
                    userGroupAccesses: buildSharings("userGroup"),
                },
            };
        },
        [themes]
    );

    const onUpdateSharingOptions = useCallback(() => {
        return async ({ userAccesses: users, userGroupAccesses: userGroups }: ShareUpdate) => {
            const newThemes = themes.map((theme): Theme => {
                if (theme.id !== themeId) return theme;
                return theme.updateSharing({
                    external: false,
                    public: "",
                    users: users ?? [],
                    userGroups: userGroups ?? [],
                });
            });

            onChange(newThemes);
        };
    }, [onChange, themes, themeId]);

    return (
        <ConfirmationDialog isOpen={true} fullWidth={true} onCancel={onClose} cancelText={i18n.t("Close")}>
            <Sharing
                meta={buildMetaObject(themeId)}
                showOptions={{
                    dataSharing: true,
                    publicSharing: true,
                    externalSharing: true,
                    permissionPicker: true,
                }}
                onSearch={search}
                onChange={onUpdateSharingOptions()}
            />
        </ConfirmationDialog>
    );
}
