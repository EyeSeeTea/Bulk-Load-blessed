import { ConfirmationDialog, ShareUpdate, Sharing, SharingRule } from "@eyeseetea/d2-ui-components";
import { useCallback } from "react";
import i18n from "../../../locales";
import { useAppContext } from "../../contexts/app-context";
import { Id } from "../../../domain/entities/ReferenceObject";
import { ThemeDetail } from "./ThemeListTable";
import { PermissionType } from "../../logic/settings";

export interface ThemePermissionsDialogProps {
    themeId: Id;
    onClose: () => void;
    rows: ThemeDetail[];
}

export function ThemePermissionsDialog(props: ThemePermissionsDialogProps) {
    const { themeId, onClose, rows } = props;
    const { compositionRoot } = useAppContext();

    const search = useCallback((query: string) => compositionRoot.users.search(query), [compositionRoot]);

    const buildMetaObject = useCallback(
        (id: Id) => {
            const buildSharings = (type: PermissionType) => {
                const arr = rows.find(row => row.id === id);
                return type === "user" ? arr?.users : arr?.userGroups;
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
        [rows]
    );

    const onUpdateSharingOptions = useCallback(() => {
        return async ({ userAccesses: users, userGroupAccesses: userGroups }: ShareUpdate) => {
            const buildPermission = (rule: SharingRule[]) =>
                rule.map(({ id, displayName }) => ({ id, name: displayName })) ?? [];

            const newRows = rows.map((item, i) => ({
                ...item,
                users: buildPermission(users ?? [])[i] ?? [],
                userGroups: buildPermission(userGroups ?? [])[i] ?? [],
            }));

            console.log(newRows);
        };
    }, [rows]);

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
