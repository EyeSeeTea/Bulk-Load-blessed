import { Checkbox, FormControlLabel, makeStyles } from "@material-ui/core";
import { OrgUnitsSelector } from "d2-ui-components";
import _ from "lodash";
import moment from "moment";
import React, { useEffect, useState } from "react";
import { CompositionRoot } from "../../../CompositionRoot";
import { Theme } from "../../../domain/entities/Theme";
import i18n from "../../../locales";
import { cleanOrgUnitPaths } from "../../../utils/dhis";
import { useAppContext } from "../../contexts/api-context";
import Settings from "../../logic/settings";
import { buildPossibleYears } from "../../utils/periods";
import { Select, SelectOption } from "../select/Select";

type TemplateType = "dataSets" | "programs" | "custom";
type DataSource = Record<TemplateType, { id: string; name: string }[]>;

interface TemplateSelectorState {
    type: TemplateType;
    id: string;
    orgUnits: string[];
    populate: boolean;
    theme?: string;
    startYear?: string;
    endYear?: string;
}

export interface TemplateSelectorProps {
    settings: Settings;
    themes: Theme[];
    onChange(state: TemplateSelectorState | null): void;
}

export const TemplateSelector = ({ settings, themes, onChange }: TemplateSelectorProps) => {
    const classes = useStyles();
    const { api } = useAppContext();

    const [dataSource, setDataSource] = useState<DataSource>();
    const [models, setModels] = useState<{ value: string; label: string }[]>([]);
    const [templates, setTemplates] = useState<{ value: string; label: string }[]>([]);
    const [orgUnitTreeRootIds, setOrgUnitTreeRootIds] = useState<string[]>([]);
    const [selectedOrgUnits, setSelectedOrgUnits] = useState<string[]>([]);
    const [state, setState] = useState<Partial<TemplateSelectorState>>({
        startYear: "2010",
        endYear: moment().year().toString(),
        populate: false,
    });

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
        CompositionRoot.attach().orgUnits.getRoots.execute().then(setOrgUnitTreeRootIds);
    }, []);

    useEffect(() => {
        const { type, id, theme, startYear, endYear, populate = false } = state;
        if (type && id && selectedOrgUnits.length > 0) {
            const orgUnits = cleanOrgUnitPaths(selectedOrgUnits);
            onChange({ type, id, theme, orgUnits, startYear, endYear, populate });
        } else {
            onChange(null);
        }
    }, [state, selectedOrgUnits, onChange]);

    const showModelSelector = models.length > 1;
    const elementLabel = showModelSelector ? i18n.t("elements") : models[0]?.label;
    const themeOptions = dataSource ? modelToSelectOption(themes) : [];

    const onModelChange = ({ value }: SelectOption) => {
        if (!dataSource) return;

        const model = value as TemplateType;
        const options = modelToSelectOption(dataSource[model]);

        setState(state => ({ ...state, type: model, id: undefined }));
        setTemplates(options);
    };

    const onTemplateChange = ({ value }: SelectOption) => {
        setState(state => ({ ...state, id: value }));
    };

    const onThemeChange = ({ value }: SelectOption) => {
        setState(state => ({ ...state, theme: value }));
    };

    const onStartYearChange = ({ value }: SelectOption) => {
        setState(state => ({
            ...state,
            startYear: value,
        }));
    };

    const onEndYearChange = ({ value }: SelectOption) => {
        setState(state => ({
            ...state,
            endYear: value,
        }));
    };

    const onOrgUnitChange = (orgUnitPaths: string[]) => {
        setSelectedOrgUnits(orgUnitPaths);
    };

    const onPopulateChange = (_event: React.ChangeEvent, checked: boolean) => {
        setState(state => ({ ...state, populate: checked }));
    };

    return (
        <React.Fragment>
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
                        placeholder={i18n.t("Select {{elementLabel}} to export...", {
                            elementLabel,
                        })}
                        onChange={onTemplateChange}
                        options={templates}
                    />
                </div>

                {themeOptions.length > 0 && (
                    <div className={classes.themeSelect}>
                        <Select
                            placeholder={i18n.t("Theme")}
                            onChange={onThemeChange}
                            options={themeOptions}
                            allowEmpty={true}
                            emptyLabel={i18n.t("No theme")}
                        />
                    </div>
                )}
            </div>
            {state.type === "dataSets" && (
                <div className={classes.row}>
                    <div className={classes.startYearSelect}>
                        <Select
                            placeholder={i18n.t("Start Year")}
                            options={buildPossibleYears("1970", state.endYear)}
                            defaultValue={{
                                value: moment("2010-01-01").year().toString(),
                                label: moment("2010-01-01").year().toString(),
                            }}
                            onChange={onStartYearChange}
                        />
                    </div>
                    <div className={classes.endYearSelect}>
                        <Select
                            placeholder={i18n.t("End Year")}
                            options={buildPossibleYears(
                                state.startYear,
                                moment().year().toString()
                            )}
                            defaultValue={{
                                value: moment().year().toString(),
                                label: moment().year().toString(),
                            }}
                            onChange={onEndYearChange}
                        />
                    </div>
                </div>
            )}
            {!_.isEmpty(orgUnitTreeRootIds) ? (
                settings.showOrgUnitsOnGeneration && state.type !== "custom" ? (
                    <div className={classes.orgUnitSelector}>
                        <OrgUnitsSelector
                            api={api}
                            onChange={onOrgUnitChange}
                            selected={selectedOrgUnits}
                            controls={{
                                filterByLevel: false,
                                filterByGroup: false,
                                selectAll: false,
                            }}
                            rootIds={orgUnitTreeRootIds}
                            fullWidth={false}
                            height={220}
                        />
                    </div>
                ) : null
            ) : (
                i18n.t("No capture organisations units")
            )}

            <FormControlLabel
                className={classes.populateCheckbox}
                control={<Checkbox checked={state.populate} onChange={onPopulateChange} />}
                label="Populate template with instance data"
            />
        </React.Fragment>
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
    startYearSelect: { flexBasis: "30%", margin: "1em", marginLeft: 0 },
    endYearSelect: { flexBasis: "30%", margin: "1em" },
    populateCheckbox: { marginTop: "1em" },
    orgUnitSelector: { marginTop: "1em" },
});

function modelToSelectOption<T extends { id: string; name: string }>(array: T[]) {
    return array.map(({ id, name }) => ({
        value: id,
        label: name,
    }));
}
