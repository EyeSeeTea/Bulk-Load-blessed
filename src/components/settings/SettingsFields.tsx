import * as React from "react";
import { Checkbox, FormGroup, FormControlLabel } from "@material-ui/core";
import { MultiSelector } from "d2-ui-components";
import i18n from "../../locales";
import Settings, { Model } from "../../logic/settings";
import { useAppContext } from "../../contexts/api-context";
import { Id } from "d2-api";
import { makeStyles } from "@material-ui/styles";

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

    function setModel(model: Model) {
        return React.useCallback(
            (ev: React.ChangeEvent<HTMLInputElement>) => {
                onChange(settings.setModel(model, ev.target.checked));
            },
            [settings]
        );
    }

    const setUserGroupsForGeneration = React.useCallback(
        (userGroupIds: Id[]) => {
            onChange(settings.setUserGroupsForGenerationFromIds(userGroupIds));
        },
        [settings]
    );

    const setUserGroupsForSettings = React.useCallback(
        (userGroupIds: Id[]) => {
            onChange(settings.setUserGroupsForSettingsFromIds(userGroupIds));
        },
        [settings]
    );

    function updateBoolean(field: BooleanField) {
        return React.useCallback(
            (ev: React.ChangeEvent<HTMLInputElement>) => {
                const newSettings = settings.update({ [field]: ev.target.checked });
                onChange(newSettings);
            },
            [settings]
        );
    }

    const modelsInfo = React.useMemo(() => {
        return settings.getModelsInfo();
    }, [settings]);

    return (
        <div>
            <FieldTitle>{i18n.t("Models")}</FieldTitle>

            <FormGroup row={true}>
                {modelsInfo.map(({ key, name, value }) => (
                    <FormControlLabel
                        key={key}
                        control={<Checkbox checked={value} onChange={setModel(key)} />}
                        label={name}
                    />
                ))}
            </FormGroup>

            <FieldTitle>{i18n.t("Visibility")}</FieldTitle>

            <FormGroup row={true}>
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

            <FormGroup row={true}>
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
});

function FieldTitle(props: { children: React.ReactNode }) {
    return <h3>{props.children}</h3>;
}
