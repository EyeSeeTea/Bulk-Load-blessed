import { makeStyles } from "@material-ui/core";
import _ from "lodash";
import React, { useEffect, useState } from "react";
import { CompositionRoot } from "../../../CompositionRoot";
import i18n from "../../../locales";
import Settings from "../../logic/settings";
import { Select, SelectOption } from "../select/Select";

type TemplateType = "dataSets" | "programs" | "custom";
type DataSource = Record<TemplateType | "themes", { id: string; name: string }[]>;

interface TemplateSelectorState {
    type: TemplateType;
    id: string;
    theme?: string;
}

export interface TemplateSelectorProps {
    settings: Settings;
    onChange(state: TemplateSelectorState | null): void;
}

export const TemplateSelector = ({ settings, onChange }: TemplateSelectorProps) => {
    const classes = useStyles();

    const [dataSource, setDataSource] = useState<DataSource>();
    const [models, setModels] = useState<{ value: string; label: string }[]>([]);
    const [templates, setTemplates] = useState<{ value: string; label: string }[]>([]);
    const [state, setState] = useState<Partial<TemplateSelectorState>>({});

    useEffect(() => {
        CompositionRoot.attach()
            .templates.list.execute()
            .then(dataSource => {
                const modelOptions = _.compact([
                    settings.isModelEnabled("dataSet") && {
                        value: "dataSets",
                        label: i18n.t("Data Set"),
                    },
                    settings.isModelEnabled("program") && {
                        value: "programs",
                        label: i18n.t("Program"),
                    },
                    dataSource.custom.length > 0 && {
                        value: "custom",
                        label: i18n.t("Custom"),
                    },
                ]);

                setDataSource(dataSource);
                setModels(modelOptions);
                if (modelOptions.length === 1) {
                    const model = modelOptions[0].value as TemplateType;
                    const templates = modelToSelectOption(dataSource[model]);
                    setTemplates(templates);
                    setState(state => ({ ...state, type: model }));
                }
            });
    }, [settings]);

    useEffect(() => {
        const { type, id, theme } = state;
        onChange(type && id ? { type, id, theme } : null);
    }, [state, onChange]);

    const showModelSelector = models.length > 1;
    const elementLabel = showModelSelector ? i18n.t("elements") : models[0]?.label;
    const themes = dataSource ? modelToSelectOption(dataSource.themes) : [];

    const onModelChange = ({ value }: SelectOption) => {
        if (!dataSource) return;

        const model = value as TemplateType;
        const options = modelToSelectOption(dataSource[model]);

        setState({ type: model });
        setTemplates(options);
    };

    const onTemplateChange = ({ value }: SelectOption) => {
        setState(state => ({ ...state, id: value }));
    };

    const onThemeChange = ({ value }: SelectOption) => {
        setState(state => ({ ...state, theme: value }));
    };

    return (
        <div className={classes.row}>
            {showModelSelector && (
                <div className={classes.modelSelect}>
                    <Select
                        placeholder={i18n.t("Model")}
                        onChange={onModelChange}
                        options={models}
                    />
                </div>
            )}

            <div className={classes.templateSelect}>
                <Select
                    placeholder={i18n.t("Select {{elementLabel}} to export...", { elementLabel })}
                    onChange={onTemplateChange}
                    options={templates}
                />
            </div>

            <div className={classes.themeSelect}>
                <Select
                    placeholder={i18n.t("Theme")}
                    onChange={onThemeChange}
                    options={themes}
                    allowEmpty={true}
                />
            </div>
        </div>
    );
};

const useStyles = makeStyles({
    row: {
        display: "flex",
        flexFlow: "row nowrap",
        justifyContent: "space-around",
        marginTop: "1em",
        marginRight: "1em",
    },
    modelSelect: { flexBasis: "30%", margin: "1em", marginLeft: 0 },
    templateSelect: { flexBasis: "70%", margin: "1em" },
    themeSelect: { flexBasis: "30%", margin: "1em" },
});

function modelToSelectOption<T extends { id: string; name: string }>(array: T[]) {
    return array.map(({ id, name }) => ({
        value: id,
        label: name,
    }));
}
