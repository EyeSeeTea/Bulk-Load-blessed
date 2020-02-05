import * as React from "react";
import { Typography, Checkbox, FormGroup, FormControlLabel } from "@material-ui/core";
import { MultiSelector } from "d2-ui-components";
import i18n from "../../locales";
import Settings, { Model } from "../../logic/settings";
import { useAppContext } from "../../contexts/api-context";
import { Id } from "d2-api";

export interface SettingsFieldsProps {
    settings: Settings;
    onChange: (settings: Settings) => void;
}

export default function SettingsFields(props: SettingsFieldsProps) {
    const { d2 } = useAppContext();
    const { settings, onChange } = props;

    const options = settings.userGroups.map(userGroup => ({
        value: userGroup.id,
        text: userGroup.displayName,
    }));

    const setModel = React.useCallback(
        (model: Model) => {
            return function(ev: React.ChangeEvent<HTMLInputElement>) {
                onChange(settings.setModel(model, ev.target.checked));
            };
        },
        [settings]
    );

    const setUserGroups = React.useCallback(
        (userGroupIds: Id[]) => {
            onChange(settings.setUserGroupsForGenerationFromIds(userGroupIds));
        },
        [settings]
    );

    return (
        <div>
            <FieldTitle>{i18n.t("Models")}</FieldTitle>

            <FormGroup row={true}>
                {settings.getModelsInfo().map(({ key, name, value }) => (
                    <FormControlLabel
                        key={key}
                        control={<Checkbox checked={value} onChange={setModel(key)} />}
                        label={name}
                    />
                ))}
            </FormGroup>

            <FieldTitle>{i18n.t("User groups for Template Generation")}</FieldTitle>

            <FormGroup row={true}>
                <div style={{ width: "100%" }}>
                    <MultiSelector
                        d2={d2}
                        searchFilterLabel={true}
                        ordered={false}
                        height={200}
                        onChange={setUserGroups}
                        options={options}
                        selected={settings.userGroupsForGeneration.map(userGroup => userGroup.id)}
                    />
                </div>
            </FormGroup>
        </div>
    );
}

function FieldTitle(props: { children: React.ReactNode }) {
    return <h3>{props.children}</h3>;
}
