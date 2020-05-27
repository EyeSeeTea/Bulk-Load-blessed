import { Checkbox, FormControlLabel, FormGroup, makeStyles } from "@material-ui/core";
import { Id } from "d2-api";
import { MultiSelector } from "d2-ui-components";
import React, { ChangeEvent, useCallback, useMemo } from "react";
import { OrgUnitSelectionSetting } from "../../../domain/entities/AppSettings";
import i18n from "../../../locales";
import { useAppContext } from "../../contexts/api-context";
import Settings, { Model } from "../../logic/settings";
import { Select, SelectOption } from "../select/Select";

export interface SettingsFieldsProps {
    settings: Settings;
    onChange: (settings: Settings) => void;
}

export default function SettingsFields(props: SettingsFieldsProps) {
    const { d2 } = useAppContext();
    const { settings, onChange } = props;
    const classes = useStyles();

    const options = useMemo(() => {
        return settings.userGroups.map(userGroup => ({
            value: userGroup.id,
            text: userGroup.displayName,
        }));
    }, [settings.userGroups]);

    const setModel = useCallback(
        (model: Model) => {
            return (ev: ChangeEvent<HTMLInputElement>) => {
                onChange(settings.setModel(model, ev.target.checked));
            };
        },
        [settings, onChange]
    );

    const setUserGroupsForGeneration = useCallback(
        (userGroupIds: Id[]) => {
            onChange(settings.setUserGroupsForGenerationFromIds(userGroupIds));
        },
        [settings, onChange]
    );

    const setUserGroupsForSettings = useCallback(
        (userGroupIds: Id[]) => {
            onChange(settings.setUserGroupsForSettingsFromIds(userGroupIds));
        },
        [settings, onChange]
    );

    const setOrgUnitSelection = useCallback(
        ({ value }: SelectOption) => {
            onChange(settings.update({ orgUnitSelection: value as OrgUnitSelectionSetting }));
        },
        [settings, onChange]
    );

    const modelsInfo = useMemo(() => {
        return settings.getModelsInfo();
    }, [settings]);

    const orgUnitSelectionOptions: { value: OrgUnitSelectionSetting; label: string }[] = useMemo(
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

    return (
        <div>
            <h3>{i18n.t("Models")}</h3>

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

            <h3>{i18n.t("Visibility")}</h3>

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

            <h3>{i18n.t("User groups for Template Generation")}</h3>

            <FormGroup className={classes.content} row={true}>
                <div className={classes.fullWidth}>
                    <MultiSelector
                        d2={d2}
                        searchFilterLabel={true}
                        ordered={false}
                        height={200}
                        onChange={setUserGroupsForGeneration}
                        options={options}
                        selected={settings.userGroupsForGeneration.map(userGroup => userGroup.id)}
                    />
                </div>
            </FormGroup>

            <h3>{i18n.t("User groups with access to Settings and Themes")}</h3>

            <FormGroup row={true}>
                <div className={classes.fullWidth}>
                    <MultiSelector
                        d2={d2}
                        searchFilterLabel={true}
                        ordered={false}
                        height={200}
                        onChange={setUserGroupsForSettings}
                        options={options}
                        selected={settings.userGroupsForSettings.map(userGroup => userGroup.id)}
                    />
                </div>
            </FormGroup>
        </div>
    );
}

const useStyles = makeStyles({
    fullWidth: { width: "100%" },
    content: { margin: "1rem", marginBottom: 35, marginLeft: 0 },
    checkbox: { padding: 9 },
});
