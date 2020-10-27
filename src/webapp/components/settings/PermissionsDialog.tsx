import { ConfirmationDialog, ShareUpdate, Sharing, SharingRule } from "d2-ui-components";
import React, { useCallback } from "react";
import i18n from "../../../locales";
import { D2Api } from "../../../types/d2-api";
import { useAppContext } from "../../contexts/api-context";
import { PermissionSetting, PermissionType } from "../../logic/settings";
import { SettingsFieldsProps } from "./SettingsFields";

interface PermissionsDialogProps extends SettingsFieldsProps {
    onClose: () => void;
    permissionsType: PermissionSetting;
}

export default function PermissionsDialog({
    onClose,
    permissionsType,
    settings,
    onChange,
}: PermissionsDialogProps) {
    const { api } = useAppContext();
    const search = useCallback((query: string) => searchUsers(api, query), [api]);

    const buildMetaObject = useCallback(
        (setting: PermissionSetting) => {
            const displayName =
                setting === "generation"
                    ? i18n.t("Access to Template Generation")
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
                    rule?.map(({ id, displayName }) => ({ id, displayName })) ??
                    settings.getPermissions(setting, type);

                const newSettings = settings
                    .setPermissions(setting, "user", buildPermission("user", users))
                    .setPermissions(setting, "userGroup", buildPermission("userGroup", userGroups));

                await onChange(newSettings);
            };
        },
        [onChange, settings]
    );

    return (
        <ConfirmationDialog
            isOpen={true}
            fullWidth={true}
            onCancel={onClose}
            cancelText={i18n.t("Close")}
        >
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
