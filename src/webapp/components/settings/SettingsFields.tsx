import { Checkbox, FormControlLabel, FormGroup, makeStyles } from "@material-ui/core";
import { Id } from "d2-api";
import { MultiSelector } from "d2-ui-components";
import _ from "lodash";
import React from "react";
import i18n from "../../../locales";
import { useAppContext } from "../../contexts/api-context";
import Settings, { Model } from "../../logic/settings";
import { Select } from "../select/Select";

export interface SettingsFieldsProps {
    settings: Settings;
    onChange: (settings: Settings) => void;
}

type BooleanField = "showOrgUnitsOnGeneration";

export default function SettingsFields(props: SettingsFieldsProps) {
    const { d2 } = useAppContext();
    const { settings, onChange } = props;
    const classes = useStyles();

    const options = React.useMemo(() => {
        return settings.userGroups.map(userGroup => ({
            value: userGroup.id,
            text: userGroup.displayName,
        }));
    }, [settings.userGroups]);

    const setModel = React.useCallback(
        (model: Model) => {
            return (ev: React.ChangeEvent<HTMLInputElement>) => {
                onChange(settings.setModel(model, ev.target.checked));
            };
        },
        [settings, onChange]
    );

    const setUserGroupsForGeneration = React.useCallback(
        (userGroupIds: Id[]) => {
            onChange(settings.setUserGroupsForGenerationFromIds(userGroupIds));
        },
        [settings, onChange]
    );

    const setUserGroupsForSettings = React.useCallback(
        (userGroupIds: Id[]) => {
            onChange(settings.setUserGroupsForSettingsFromIds(userGroupIds));
        },
        [settings, onChange]
    );

    const updateBoolean = React.useCallback(
        (field: BooleanField) => {
            return (ev: React.ChangeEvent<HTMLInputElement>) => {
                const newSettings = settings.update({ [field]: ev.target.checked });
                onChange(newSettings);
            };
        },
        [settings, onChange]
    );

    const modelsInfo = React.useMemo(() => {
        return settings.getModelsInfo();
    }, [settings]);

    return (
        <div>
            <FieldTitle>{i18n.t("Models")}</FieldTitle>

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

            <FieldTitle>{i18n.t("Visibility")}</FieldTitle>

            <FormGroup className={classes.content} row={true}>
                {false && (
                    <FormControlLabel
                        control={
                            <Checkbox
                                className={classes.checkbox}
                                checked={settings.showOrgUnitsOnGeneration}
                                onChange={updateBoolean("showOrgUnitsOnGeneration")}
                            />
                        }
                        label={i18n.t("Show Organisation Units On Template Generation")}
                    />
                )}
                <div className={classes.fullWidth}>
                <Select
                    placeholder={i18n.t("Organisation Units visibility")}
                    onChange={_.noop}
                    options={[
                        {
                            value: "1",
                            label: i18n.t("Filter Organisation Units during template generation"),
                        },
                        {
                            value: "2",
                            label: i18n.t("Overwrite Organisation Units during template import"),
                        },
                        {
                            value: "3",
                            label: i18n.t(
                                "Show filter and overwrite menus during template generation and import"
                            ),
                        },
                    ]}
                    /></div>
            </FormGroup>

            <FieldTitle>{i18n.t("User groups for Template Generation")}</FieldTitle>

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

            <FieldTitle>{i18n.t("User groups with access to Settings")}</FieldTitle>

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

function FieldTitle(props: { children: React.ReactNode }) {
    return <h3>{props.children}</h3>;
}
