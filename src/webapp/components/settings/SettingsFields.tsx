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
import { DuplicateToleranceUnit, Model, OrgUnitSelectionSetting } from "../../../domain/entities/AppSettings";
import i18n from "../../../locales";
import Settings, { PermissionSetting } from "../../logic/settings";
import { Select, SelectOption } from "../select/Select";
import { DataSetDataElementsFilterDialog } from "./DataSetDataElementsFilterDialog";
import { DuplicateDataElementsFilterDialog } from "./DuplicateDataElementsFilterDialog";
import { DataFormTemplateAssignDialog } from "./DataFormTemplateAssignDialog";
import { PermissionsDialog } from "./PermissionsDialog";
import { ProgramStageFilterDialog } from "./ProgramStageFilterDialog";
import { TemplatesDialog } from "./TemplatesDialog";
import { RouteComponentProps } from "../../pages/Router";

type CustomTemplatesProps = Pick<RouteComponentProps, "customTemplates" | "setCustomTemplates">;

export interface SettingsFieldsProps {
    settings: Settings;
    onChange: (settings: Settings) => void;
}

export default function SettingsFields(props: SettingsFieldsProps & CustomTemplatesProps) {
    const { settings, onChange, customTemplates, setCustomTemplates } = props;
    const classes = useStyles();

    const [permissionsType, setPermissionsType] = useState<PermissionSetting | null>(null);
    const [isExclusionDialogVisible, showExclusionDialog] = useState<boolean>(false);
    const [isDataSetDataElementsFilterDialogVisible, showDataSetDataElementsFilterDialog] = useState<boolean>(false);
    const [isProgramStageFilterDialogVisible, showProgramStageFilterDialog] = useState<boolean>(false);
    const [isModuleTemplateDialogVisible, showModuleTemplateDialog] = useState<boolean>(false);
    const [isTemplatesDialogVisible, showTemplatesDialog] = useState<boolean>(false);

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

    const setDuplicateEnabled = useCallback(
        ({ value }: SelectOption) => {
            onChange(settings.update({ duplicateEnabled: value === "true" }));
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

    const duplicateEnabledOptions: SelectOption[] = useMemo(
        () => [
            {
                value: "true",
                label: i18n.t("Yes"),
            },
            {
                value: "false",
                label: i18n.t("No"),
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
            const usersCount = settings.getPermissions(setting, "user").length;
            const userGroupsCount = settings.getPermissions(setting, "userGroup").length;
            const allUsers = settings.hasAllPermission(setting);

            if (allUsers) {
                return i18n.t("Accessible to all users");
            } else if (usersCount > 0 && userGroupsCount > 0) {
                return i18n.t("Accessible to {{users}} users and {{userGroups}} user groups", {
                    users: usersCount,
                    userGroups: userGroupsCount,
                });
            } else if (usersCount > 0) {
                return i18n.t("Accessible to {{users}} users", { users: usersCount });
            } else if (userGroupsCount > 0) {
                return i18n.t("Accessible to {{userGroups}} user groups", {
                    userGroups: userGroupsCount,
                });
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
            {isDataSetDataElementsFilterDialogVisible && (
                <DataSetDataElementsFilterDialog
                    title={i18n.t("Data element filter for data sets")}
                    onClose={() => showDataSetDataElementsFilterDialog(false)}
                    settings={settings}
                    onChange={onChange}
                />
            )}

            {isProgramStageFilterDialogVisible && (
                <ProgramStageFilterDialog
                    title={i18n.t("Data element and attribute filter for programs")}
                    onClose={() => showProgramStageFilterDialog(false)}
                    settings={settings}
                    onChange={onChange}
                />
            )}

            {isModuleTemplateDialogVisible && (
                <DataFormTemplateAssignDialog
                    title={i18n.t("Dataset/Program <-> Template")}
                    onClose={() => showModuleTemplateDialog(false)}
                    settings={settings}
                    onChange={onChange}
                    customTemplates={customTemplates}
                />
            )}

            {isTemplatesDialogVisible && (
                <TemplatesDialog
                    title={i18n.t("Templates")}
                    onClose={() => showTemplatesDialog(false)}
                    settings={settings}
                    onChange={onChange}
                    customTemplates={customTemplates}
                    setCustomTemplates={setCustomTemplates}
                />
            )}

            {!!isExclusionDialogVisible && (
                <DuplicateDataElementsFilterDialog
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

            <h3 className={classes.title}>{i18n.t("Data model")}</h3>

            <FormGroup className={classes.content} row={true}>
                {modelsInfo.map(({ key, name, value }) => (
                    <FormControlLabel
                        key={key}
                        control={<Checkbox className={classes.checkbox} checked={value} onChange={setModel(key)} />}
                        label={name}
                    />
                ))}
            </FormGroup>

            <h3 className={classes.title}>{i18n.t("Organisation Unit Visibility")}</h3>

            <FormGroup className={classes.content} row={true}>
                <div className={classes.fullWidth}>
                    <Select
                        onChange={setOrgUnitSelection}
                        options={orgUnitSelectionOptions}
                        value={settings.orgUnitSelection}
                    />
                </div>
            </FormGroup>

            <h3 className={classes.title}>{i18n.t("Columns layout")}</h3>

            <div className={classes.content}>
                <ListItem button onClick={() => showDataSetDataElementsFilterDialog(true)}>
                    <ListItemIcon>
                        <Icon>filter_list</Icon>
                    </ListItemIcon>

                    <ListItemText
                        primary={i18n.t("Filter columns for data sets")}
                        secondary={i18n.t(
                            "Data elements (with optional disaggregation) to include/exclude for data sets"
                        )}
                    />
                </ListItem>

                <ListItem button onClick={() => showProgramStageFilterDialog(true)}>
                    <ListItemIcon>
                        <Icon>filter_list</Icon>
                    </ListItemIcon>

                    <ListItemText
                        primary={i18n.t("Filter columns for programs")}
                        secondary={i18n.t("Data elements and attributes to include/exclude for programs")}
                    />
                </ListItem>
            </div>

            <h3 className={classes.title}>{i18n.t("Duplicate detection")}</h3>

            <FormGroup className={classes.content} row={true}>
                <div className={classes.fullWidth}>
                    <Select
                        onChange={setDuplicateEnabled}
                        options={duplicateEnabledOptions}
                        value={String(settings.duplicateEnabled)}
                    />
                </div>
            </FormGroup>

            <h3 className={classes.title}>{i18n.t("Template configuration")}</h3>

            <div className={classes.content}>
                <ListItem button onClick={() => showModuleTemplateDialog(true)}>
                    <ListItemIcon>
                        <Icon>shuffle</Icon>
                    </ListItemIcon>

                    <ListItemText
                        primary={i18n.t("Dataset/Program <-> Template")}
                        secondary={i18n.t("Templates (autogenerated and custom) available for each dataset or program")}
                    />
                </ListItem>

                <ListItem button onClick={() => showTemplatesDialog(true)}>
                    <ListItemIcon>
                        <Icon>description</Icon>
                    </ListItemIcon>

                    <ListItemText
                        primary={i18n.t("Templates")}
                        secondary={i18n.t(
                            "Create, edit, and configure permissions for autogenerated and custom templates"
                        )}
                    />
                </ListItem>
            </div>

            <div className={classes.content}>
                <FormGroup className={classes.eventDateTime} row={true}>
                    <p className={classes.duplicateToleranceLabel}>
                        {i18n.t("Event date time difference for events (programs)")}
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

                <ListItem button onClick={() => showExclusionDialog(true)}>
                    <ListItemIcon>
                        <Icon>filter_list</Icon>
                    </ListItemIcon>
                    <ListItemText
                        primary={i18n.t("Duplicate detection filter for events (programs)")}
                        secondary={i18n.t("Data elements used for duplicates identification")}
                    />
                </ListItem>
            </div>

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
                <ListItem button onClick={() => setPermissionsType("import")}>
                    <ListItemIcon>
                        <Icon>cloud_upload</Icon>
                    </ListItemIcon>
                    <ListItemText
                        primary={i18n.t("Access to Import Data")}
                        secondary={buildSharingDescription("import")}
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
    content: { margin: "1rem", marginBottom: 35, marginLeft: 0 },
    checkbox: { padding: 9 },
    title: { marginTop: 0 },
    eventDateTime: { marginBottom: 15 },
    duplicateTolerance: { margin: 0, marginRight: 15, width: 35 },
    duplicateToleranceLabel: { margin: 0, marginRight: 15, alignSelf: "center" },
});
