import { Checkbox, FormControlLabel, FormGroup, makeStyles } from "@material-ui/core";
import { Id } from "d2-api";
import { MultiSelector } from "d2-ui-components";
import React from "react";
import { useAppContext } from "../../contexts/api-context";
import i18n from "../../../locales";
import Settings, { Model } from "../../logic/settings";

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
                        control={<Checkbox checked={value} onChange={setModel(key)} />}
                        label={name}
                    />
                ))}
            </FormGroup>

            <FieldTitle>{i18n.t("Visibility")}</FieldTitle>

            <FormGroup className={classes.content} row={true}>
                <FormControlLabel
                    control={
                        <Checkbox
                            checked={settings.showOrgUnitsOnGeneration}
                            onChange={updateBoolean("showOrgUnitsOnGeneration")}
                        />
                    }
                    label={i18n.t("Show Organisation Units On Template Generation")}
                />
            </FormGroup>

            <FieldTitle>{i18n.t("User groups for Template Generation")}</FieldTitle>

            <FormGroup className={classes.content} row={true}>
                <div className={classes.selectorWrapper}>
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
                <div className={classes.selectorWrapper}>
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
    selectorWrapper: { width: "100%" },
    content: { marginBottom: 35, marginLeft: 0 },
});

function FieldTitle(props: { children: React.ReactNode }) {
    return <h3>{props.children}</h3>;
}
