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
import React, { ChangeEvent, useCallback, useMemo, useState } from "react";
import {
    DuplicateToleranceUnit,
    Model,
    OrgUnitSelectionSetting,
} from "../../../domain/entities/AppSettings";
import i18n from "../../../locales";
import Settings, { PermissionSetting } from "../../logic/settings";
import { Select, SelectOption } from "../select/Select";
import DataElementsFilterDialog from "./DataElementsFilterDialog";
import PermissionsDialog from "./PermissionsDialog";

export interface SettingsFieldsProps {
    settings: Settings;
    onChange: (settings: Settings) => Promise<void>;
}

export default function SettingsFields({ settings, onChange }: SettingsFieldsProps) {
    const classes = useStyles();

    const [permissionsType, setPermissionsType] = useState<PermissionSetting | null>(null);
    const [isExclusionDialogVisible, showExclusionDialog] = useState<boolean>(false);

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
            {!!isExclusionDialogVisible && (
                <DataElementsFilterDialog
                    onClose={() => showExclusionDialog(false)}
                    settings={settings}
                    onChange={onChange}
                />
            )}

            {!!permissionsType && (
                <PermissionsDialog
                    onClose={() => setPermissionsType(null)}
                    permissionsType={permissionsType}
                    settings={settings}
                    onChange={onChange}
                />
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

            <h3 className={classes.title}>{i18n.t("Duplicate detection for events (programs)")}</h3>

            <FormGroup className={classes.content} row={true}>
                <p className={classes.duplicateToleranceLabel}>
                    {i18n.t("Event date absolute difference")}
                </p>
                <TextField
                    className={classes.duplicateTolerance}
                    type="number"
                    onChange={setDuplicateTolerance}
                    value={settings.duplicateTolerance}
                />
                <Select
                    onChange={setDuplicateToleranceUnit}
                    options={duplicateToleranceUnits}
                    value={settings.duplicateToleranceUnit}
                />
            </FormGroup>

            <FormGroup className={classes.content} row={true}>
                <ListItem button onClick={() => showExclusionDialog(true)}>
                    <ListItemIcon>
                        <Icon>filter_list</Icon>
                    </ListItemIcon>
                    <ListItemText
                        primary={i18n.t("Data elements filter")}
                        secondary={i18n.t("Data elements used for duplication assessment")}
                    />
                </ListItem>
            </FormGroup>

            <h3 className={classes.title}>{i18n.t("Permissions")}</h3>

            <FormGroup className={classes.content} row={true}>
                <ListItem button onClick={() => setPermissionsType("generation")}>
                    <ListItemIcon>
                        <Icon>cloud_download</Icon>
                    </ListItemIcon>
                    <ListItemText
                        primary={i18n.t("Access to Template Generation")}
                        secondary={buildSharingDescription("generation")}
                    />
                </ListItem>
                <ListItem button onClick={() => setPermissionsType("settings")}>
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
    duplicateTolerance: { margin: 0, marginRight: 15, width: 35 },
    duplicateToleranceLabel: { margin: 0, marginRight: 15, alignSelf: "center" },
});
