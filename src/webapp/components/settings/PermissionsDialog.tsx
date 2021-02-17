import {
    ShareUpdate,
    Sharing,
    SharingRule,
    ConfirmationDialog,
    ConfirmationDialogProps,
} from "@eyeseetea/d2-ui-components";
import _ from "lodash";
import { Checkbox, FormControlLabel } from "@material-ui/core";
import React, { useCallback, useState } from "react";
import i18n from "../../../locales";
import { D2Api } from "../../../types/d2-api";
import { useAppContext } from "../../contexts/app-context";
import { PermissionSetting, PermissionType } from "../../logic/settings";
import { SettingsFieldsProps } from "./SettingsFields";

interface PermissionsDialogProps extends SettingsFieldsProps {
    onClose: () => void;
    permissionsType: PermissionSetting;
}

export default function PermissionsDialog({ onClose, permissionsType, settings, onChange }: PermissionsDialogProps) {
    const { api } = useAppContext();
    const search = useCallback((query: string) => searchUsers(api, query), [api]);
    const [dialogProps, updateDialog] = useState<ConfirmationDialogProps | null>(null);

    const buildMetaObject = useCallback(
        (setting: PermissionSetting) => {
            const displayName =
                setting === "generation"
                    ? i18n.t("Access to Template Generation")
                    : setting === "import"
                    ? i18n.t("Access to Import Data")
                    : i18n.t("Access to Settings and Themes");

            const buildSharings = (type: PermissionType) =>
                settings.getPermissions(setting, type).map(sharing => ({ ...sharing, access: "" }));

            return {
                meta: {
                    allowPublicAccess: false,
                    allowExternalAccess: false,
                },
                object: {
                    id: "",
                    displayName,
                    externalAccess: false,
                    publicAccess: "",
                    userAccesses: buildSharings("user"),
                    userGroupAccesses: buildSharings("userGroup"),
                },
            };
        },
        [settings]
    );

    const onUpdateSharingOptions = useCallback(
        (setting: PermissionSetting) => {
            return async ({ userAccesses: users, userGroupAccesses: userGroups }: ShareUpdate) => {
                const buildPermission = (type: PermissionType, rule?: SharingRule[]) =>
                    rule?.map(({ id, displayName }) => ({ id, displayName })) ?? settings.getPermissions(setting, type);

                const newSettings = settings
                    .setPermissions(setting, "user", buildPermission("user", users))
                    .setPermissions(setting, "userGroup", buildPermission("userGroup", userGroups));
                await onChange(newSettings);
            };
        },
        [onChange, settings]
    );

    const acceptAllUsersPermissions = useCallback(
        (setting: PermissionSetting) => {
            const allUser: SharingRule[] = [{ id: "ALL", displayName: "", access: "" }];
            const newSettings = settings
                .setPermissions(setting, "allUsers", allUser)
                .setPermissions(setting, "user", [])
                .setPermissions(setting, "userGroup", []);

            return onChange(newSettings);
        },
        [settings, onChange]
    );

    const onChangeAllUsers = useCallback(
        (setting: PermissionSetting, checked: boolean) => {
            if (checked) {
                updateDialog({
                    title: i18n.t("Access Permissions confirmation"),
                    description: i18n.t(
                        "This option gives access to all users. The current list of allowed users and user groups will be deleted. Do you want to proceed?"
                    ),
                    saveText: i18n.t("Accept"),
                    cancelText: i18n.t("Cancel"),
                    onCancel: () => {
                        updateDialog(null);
                    },
                    onSave: () => {
                        updateDialog(null);
                        acceptAllUsersPermissions(setting);
                    },
                });
            } else {
                const newSettings = settings.setPermissions(setting, "allUsers", []);
                return onChange(newSettings);
            }
        },
        [settings, onChange, acceptAllUsersPermissions]
    );

    const allUserChecked = useCallback(
        (setting: PermissionSetting) => {
            const userPermissions = settings.getPermissions(setting, "allUsers");
            return _(userPermissions).some(item => item.id === "ALL");
        },
        [settings]
    );

    return (
        <ConfirmationDialog isOpen={true} fullWidth={true} onCancel={onClose} cancelText={i18n.t("Close")}>
            {!allUserChecked(permissionsType) && (
                <Sharing
                    meta={buildMetaObject(permissionsType)}
                    showOptions={{
                        dataSharing: false,
                        publicSharing: false,
                        externalSharing: false,
                        permissionPicker: false,
                    }}
                    onSearch={search}
                    onChange={onUpdateSharingOptions(permissionsType)}
                />
            )}
            {dialogProps && <ConfirmationDialog isOpen={true} maxWidth="xl" {...dialogProps} />}

            <FormControlLabel
                control={
                    <Checkbox
                        checked={allUserChecked(permissionsType)}
                        onChange={ev => onChangeAllUsers(permissionsType, ev.target.checked)}
                    />
                }
                label={i18n.t("All users allowed")}
            />
        </ConfirmationDialog>
    );
}

function searchUsers(api: D2Api, query: string) {
    const options = {
        fields: { id: true, displayName: true },
        filter: { displayName: { ilike: query } },
    };
    return api.metadata.get({ users: options, userGroups: options }).getData();
}
