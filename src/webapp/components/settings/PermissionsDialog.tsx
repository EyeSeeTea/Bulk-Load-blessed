import {
    ShareUpdate, Sharing, 
    SharingRule, 
    ConfirmationDialog,
    ConfirmationDialogProps, } from "@eyeseetea/d2-ui-components";
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
            let allUser: SharingRule[] = [];
            allUser = [{ id: "ALL", displayName: "", access: "" }];
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
                    description: 
                    i18n.t("This option provides access permissions to all users and therefore, will ") + 
                    i18n.t("not be possible to get back to the previous state of this section. Are you ") +
                    i18n.t("sure you want to sustain this action?"),
                    saveText :"Accept",
                    cancelText :"Cancel" ,
                    onCancel: () => {updateDialog(null); },
                    onSave: async () => {
                        updateDialog(null); 
                        acceptAllUsersPermissions(setting);
                    },
                });

            }else{
                const newSettings = settings.setPermissions(setting, "allUsers", []);
                return onChange(newSettings);

            }
        },
        [settings, onChange, acceptAllUsersPermissions]
    );


    const allUserChecked = useCallback(
        (setting: PermissionSetting) => {
            const userPermissions = settings.getPermissions(setting, "allUsers");
            if (userPermissions.length > 0) {
                const isAllUserAllowed = userPermissions.some(item => item.id === "ALL");
                return isAllUserAllowed;
            }
            return false;
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
            {dialogProps && <ConfirmationDialog 
            isOpen={true} 
            maxWidth={"xl"}
            {...dialogProps}

            />}

            <FormControlLabel
                control={
                    <Checkbox
                        checked={allUserChecked(permissionsType)}
                        onChange={(ev: any) => {
                            const checked = ev.target.checked;
                            onChangeAllUsers(permissionsType, checked);
                        }}
                    />
                }
                label={"All users allowed"}
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
