import {
    Checkbox,
    FormControlLabel,
    FormGroup,
    Icon,
    ListItem,
    ListItemIcon,
    ListItemText,
    makeStyles,
    TextField,
} from "@material-ui/core";
import { D2Api } from "d2-api";
import { ConfirmationDialog, ShareUpdate, Sharing, SharingRule } from "d2-ui-components";
import React, { ChangeEvent, useCallback, useMemo, useState } from "react";
import {
    DuplicateToleranceUnit,
    Model,
    OrgUnitSelectionSetting,
} from "../../../domain/entities/AppSettings";
import i18n from "../../../locales";
import { useAppContext } from "../../contexts/api-context";
import Settings, { PermissionSetting, PermissionType } from "../../logic/settings";
import { Select, SelectOption } from "../select/Select";

export interface SettingsFieldsProps {
    settings: Settings;
    onChange: (settings: Settings) => Promise<void>;
}

export default function SettingsFields(props: SettingsFieldsProps) {
    const { settings, onChange } = props;
    const classes = useStyles();
    const { api } = useAppContext();
    const [sharingDialogType, setSharingDialogType] = useState<PermissionSetting | null>(null);

    const setModel = useCallback(
        (model: Model) => {
            return (ev: ChangeEvent<HTMLInputElement>) => {
                onChange(settings.setModel(model, ev.target.checked));
            };
        },
        [settings, onChange]
    );

    const setOrgUnitSelection = useCallback(
        ({ value }: SelectOption) => {
            onChange(settings.update({ orgUnitSelection: value as OrgUnitSelectionSetting }));
        },
        [settings, onChange]
    );

    const setDuplicateTolerance = useCallback(
        (event: ChangeEvent<HTMLInputElement>) => {
            const duplicateTolerance = parseInt(event.target.value);
            if (!isNaN(duplicateTolerance) && duplicateTolerance >= 0 && duplicateTolerance <= 10) {
                onChange(settings.update({ duplicateTolerance }));
            }
        },
        [settings, onChange]
    );

    const setDuplicateToleranceUnit = useCallback(
        ({ value }: SelectOption) => {
            onChange(settings.update({ duplicateToleranceUnit: value as DuplicateToleranceUnit }));
        },
        [settings, onChange]
    );

    const modelsInfo = useMemo(() => {
        return settings.getModelsInfo();
    }, [settings]);

    const orgUnitSelectionOptions: SelectOption[] = useMemo(
        () => [
            {
                value: "generation",
                label: i18n.t("Select Organisation Units on template generation"),
            },
            {
                value: "import",
                label: i18n.t("Select Organisation Units on template import"),
            },
            {
                value: "both",
                label: i18n.t("Select Organisation Units on template generation and import"),
            },
        ],
        []
    );

    const duplicateToleranceUnits: SelectOption[] = useMemo(
        () => [
            { value: "day", label: i18n.t("Days") },
            { value: "week", label: i18n.t("Weeks") },
            { value: "month", label: i18n.t("Months") },
            { value: "year", label: i18n.t("Years") },
        ],
        []
    );

    const search = React.useCallback((query: string) => searchUsers(api, query), [api]);

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

    const buildSharingDescription = useCallback(
        (setting: PermissionSetting) => {
            const users = settings.getPermissions(setting, "user").length;
            const userGroups = settings.getPermissions(setting, "userGroup").length;

            if (users > 0 && userGroups > 0) {
                return i18n.t("Accessible to {{users}} users and {{userGroups}} user groups", {
                    users,
                    userGroups,
                });
            } else if (users > 0) {
                return i18n.t("Accessible to {{users}} users", { users });
            } else if (userGroups > 0) {
                return i18n.t("Accessible to {{userGroups}} user groups", { userGroups });
            } else if (setting === "settings") {
                return i18n.t("Only accessible to system administrators");
            } else {
                return i18n.t("Not accessible");
            }
        },
        [settings]
    );

    return (
        <React.Fragment>
            {!!sharingDialogType && (
                <ConfirmationDialog
                    isOpen={true}
                    fullWidth={true}
                    onCancel={() => setSharingDialogType(null)}
                    cancelText={i18n.t("Close")}
                >
                    <Sharing
                        meta={buildMetaObject(sharingDialogType)}
                        showOptions={{
                            dataSharing: false,
                            publicSharing: false,
                            externalSharing: false,
                            permissionPicker: false,
                        }}
                        onSearch={search}
                        onChange={onUpdateSharingOptions(sharingDialogType)}
                    />
                </ConfirmationDialog>
            )}

            <h3 className={classes.title}>{i18n.t("Models")}</h3>

            <FormGroup className={classes.content} row={true}>
                {modelsInfo.map(({ key, name, value }) => (
                    <FormControlLabel
                        key={key}
                        control={
                            <Checkbox
                                className={classes.checkbox}
                                checked={value}
                                onChange={setModel(key)}
                            />
                        }
                        label={name}
                    />
                ))}
            </FormGroup>

            <h3 className={classes.title}>{i18n.t("Visibility")}</h3>

            <FormGroup className={classes.content} row={true}>
                <div className={classes.fullWidth}>
                    <Select
                        placeholder={i18n.t("Organisation Units visibility")}
                        onChange={setOrgUnitSelection}
                        options={orgUnitSelectionOptions}
                        value={settings.orgUnitSelection}
                    />
                </div>
            </FormGroup>

            <h3 className={classes.title}>{i18n.t("Duplicate tolerance for programs")}</h3>

            <FormGroup className={classes.content} row={true}>
                <TextField
                    className={classes.duplicateTolerance}
                    type="number"
                    variant="outlined"
                    margin="dense"
                    onChange={setDuplicateTolerance}
                    value={settings.duplicateTolerance}
                />
                <Select
                    variant="outlined"
                    margin="dense"
                    onChange={setDuplicateToleranceUnit}
                    options={duplicateToleranceUnits}
                    value={settings.duplicateToleranceUnit}
                />
            </FormGroup>

            <FormGroup className={classes.content} row={true}>
                <ListItem button onClick={() => ({})}>
                    <ListItemIcon>
                        <Icon>filter_list</Icon>
                    </ListItemIcon>
                    <ListItemText
                        primary={i18n.t("Data elements filter")}
                        secondary={i18n.t("Used to assess if a record is a duplicated")}
                    />
                </ListItem>
            </FormGroup>

            <h3 className={classes.title}>{i18n.t("Permissions")}</h3>

            <FormGroup className={classes.content} row={true}>
                <ListItem button onClick={() => setSharingDialogType("generation")}>
                    <ListItemIcon>
                        <Icon>cloud_download</Icon>
                    </ListItemIcon>
                    <ListItemText
                        primary={i18n.t("Access to Template Generation")}
                        secondary={buildSharingDescription("generation")}
                    />
                </ListItem>
                <ListItem button onClick={() => setSharingDialogType("settings")}>
                    <ListItemIcon>
                        <Icon>settings</Icon>
                    </ListItemIcon>
                    <ListItemText
                        primary={i18n.t("Access to Settings and Themes")}
                        secondary={buildSharingDescription("settings")}
                    />
                </ListItem>
            </FormGroup>
        </React.Fragment>
    );
}

const useStyles = makeStyles({
    fullWidth: { width: "100%" },
    content: { margin: "1rem", marginLeft: 0 },
    checkbox: { padding: 9 },
    title: { marginTop: 35 },
    duplicateTolerance: { margin: 0, marginRight: 15, width: 75 },
});

function searchUsers(api: D2Api, query: string) {
    const options = {
        fields: { id: true, displayName: true },
        filter: { displayName: { ilike: query } },
    };
    return api.metadata.get({ users: options, userGroups: options }).getData();
}
