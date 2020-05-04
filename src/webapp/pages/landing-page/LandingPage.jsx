import { Button, Paper } from "@material-ui/core";
import CloudDoneIcon from "@material-ui/icons/CloudDone";
import CloudUploadIcon from "@material-ui/icons/CloudUpload";
import { ConfirmationDialog, OrgUnitsSelector, useLoading, useSnackbar } from "d2-ui-components";
import _ from "lodash";
import moment from "moment";
import React, { useCallback, useEffect, useState } from "react";
import Dropzone from "react-dropzone";
import { CompositionRoot } from "../../../CompositionRoot";
import i18n from "../../../locales";
import { Select } from "../../components/select/Select";
import SettingsComponent from "../../components/settings/SettingsDialog";
import { TemplateSelector } from "../../components/template-selector/TemplateSelector";
import ThemeListDialog from "../../components/theme-list/ThemeListDialog";
import { useAppContext } from "../../contexts/api-context";
import { deleteDataValues, getDataValuesFromData } from "../../logic/dataValues";
import * as dhisConnector from "../../logic/dhisConnector";
import Settings from "../../logic/settings";
import { SheetBuilder } from "../../logic/sheetBuilder";
import * as sheetImport from "../../logic/sheetImport";
import { buildPossibleYears } from "../../utils/periods";
import "./LandingPage.css";

const controls = {
    filterByLevel: false,
    filterByGroup: false,
    selectAll: false,
};

export default function LandingPage() {
    const loading = useLoading();
    const snackbar = useSnackbar();
    const { d2, api } = useAppContext();

    const [settings, setSettings] = useState();
    const [state, setState] = useState({
        template: null,
        dataSets: [],
        programs: [],
        orgUnitTreeSelected: [],
        orgUnitTreeSelected2: [],
        orgUnitTreeRootIds: [],
        importOrgUnitIds: undefined,
        importObject: undefined,
        importDataSheet: undefined,
        importMessages: [],
        importDataValues: [],
        startYear: 2010,
        endYear: moment().year(),
        isTemplateGenerationVisible: true,
        confirmOnExistingData: undefined,
    });

    useEffect(() => {
        Settings.build(api)
            .then(setSettings)
            .catch(err => snackbar.error(`Cannot load settings: ${err.message || err.toString()}`));

        dhisConnector.getUserInformation({ d2 }).then(result => {
            setState(state => ({
                ...state,
                ...result,
            }));
        });

        d2.models.organisationUnits
            .list({ fields: "id,displayName,path,children::isNotEmpty,access", userOnly: true })
            .then(result => {
                setState(state => ({
                    ...state,
                    orgUnitTreeRootIds: result.toArray().map(ou => ou.id),
                }));
            });
    }, [d2, api, snackbar]);

    const isImportEnabled =
        state.importObject &&
        (settings.showOrgUnitsOnGeneration || !_.isEmpty(state.orgUnitTreeSelected2));

    const handleOrgUnitTreeClick = orgUnitPaths => {
        setState(state => ({
            ...state,
            orgUnitTreeSelected: orgUnitPaths,
        }));
    };

    const handleOrgUnitTreeClick2 = orgUnitPaths => {
        setState(state => ({
            ...state,
            orgUnitTreeSelected2: _.takeRight(orgUnitPaths, 1),
        }));
    };

    const handleTemplateDownloadClick = async () => {
        if (!state.template) return;
        const { type, id, theme } = state.template;
        loading.show(true);

        if (type === "custom") {
            await CompositionRoot.attach().templates.downloadCustom.execute(id, theme);
        } else {
            const orgUnits = state.orgUnitTreeSelected.map(element =>
                element.substr(element.lastIndexOf("/") + 1)
            );

            const element = await dhisConnector.getElement(d2, type, id);

            const result = await dhisConnector.getElementMetadata({
                d2,
                element: { ...element, endpoint: type, type },
                organisationUnits: orgUnits,
            });

            const template = new SheetBuilder({
                ...result,
                startYear: state.startYear,
                endYear: state.endYear,
            });

            const name = element.displayName ?? element.name;
            const file = await template.toBlob();
            await CompositionRoot.attach().templates.downloadGenerated.execute(name, file, theme);
        }

        loading.show(false);
    };

    const onDrop = async files => {
        const { dataSets, programs, settings, orgUnitTreeRootIds } = state;
        loading.show(true);

        const file = files[0];
        if (!file) {
            snackbar.error(i18n.t("Cannot read file"));
            return;
        }

        try {
            const id = await sheetImport.getVersion(file);
            const { rowOffset } = CompositionRoot.attach().templates.getInfo.execute(id);

            const info = await sheetImport.getBasicInfoFromSheet(
                file,
                { dataSets, programs },
                rowOffset
            );
            const { object, dataValues } = info;

            let importOrgUnitIds = undefined;
            if (!settings.showOrgUnitsOnGeneration) {
                if (!object) throw new Error(i18n.t("Object not found in database"));
                // Get only object orgUnits selected as user capture (or their children)
                importOrgUnitIds = object.organisationUnits
                    .filter(ou =>
                        _(orgUnitTreeRootIds).some(userOuId => ou.path.includes(userOuId))
                    )
                    .map(ou => ou.id);
            }

            setState(state => ({
                ...state,
                importDataSheet: file,
                importObject: object,
                importDataValues: dataValues,
                importOrgUnitIds,
                importMessages: [],
            }));
        } catch (err) {
            console.error(err);
            const msg = err.message || err.toString();
            snackbar.error(msg);
            setState(state => ({
                ...state,
                importDataSheet: file,
                importObject: undefined,
                importDataValues: [],
                importOrgUnitIds: undefined,
                importMessages: [],
            }));
        }

        loading.show(false);
    };

    const handleDataImportClick = async () => {
        if (!state.importObject) return;
        if (!state.importDataSheet) return;
        if (!state.orgUnitTreeSelected2) return;

        const { showOrgUnitsOnGeneration } = state.settings;

        const orgUnits = state.orgUnitTreeSelected2.map(path =>
            path.substr(path.lastIndexOf("/") + 1)
        );

        try {
            loading.show(true);
            const result = await dhisConnector.getElementMetadata({
                d2,
                element: state.importObject,
                organisationUnits: orgUnits,
            });

            if (!showOrgUnitsOnGeneration) {
                const orgUnit = result.organisationUnits[0];
                if (!orgUnit) throw new Error(i18n.t("Select a organisation units to import data"));
                const dataSetsForElement = orgUnit.dataSets.filter(e => e.id === result.element.id);

                if (_.isEmpty(dataSetsForElement)) {
                    throw new Error(
                        i18n.t("Selected organisation unit is not associated with the dataset")
                    );
                }
            }

            const id = await sheetImport.getVersion(state.importDataSheet);
            const { rowOffset } = CompositionRoot.attach().templates.getInfo.execute(id);

            const data = await sheetImport.readSheet({
                ...result,
                d2,
                file: state.importDataSheet,
                useBuilderOrgUnits: !showOrgUnitsOnGeneration,
                rowOffset,
            });

            const dataValues = data.dataSet ? await getDataValuesFromData(api, data) : [];
            const info = { data, dataValues };

            if (_.isEmpty(dataValues)) {
                performImport(info);
            } else {
                setState(state => ({ ...state, confirmOnExistingData: info }));
            }
        } catch (reason) {
            console.error(reason);
            snackbar.error(reason.message || reason.toString());
        }

        loading.show(false);
    };

    const performImport = ({ data, dataValues }) => {
        loading.show(true);
        setState(state => ({ ...state, confirmOnExistingData: undefined }));

        return deleteDataValues(api, dataValues)
            .then(async deletedCount => {
                const response = await dhisConnector.importData({
                    d2,
                    element: state.importObject,
                    data: data,
                });
                return { response, deletedCount };
            })
            .then(({ deletedCount, response }) => {
                loading.show(false);
                console.log(response);
                const imported =
                    response.data.response !== undefined
                        ? response.data.response.imported
                        : response.data.importCount.imported;
                const updated =
                    response.data.response !== undefined
                        ? response.data.response.updated
                        : response.data.importCount.updated;
                const ignored =
                    response.data.response !== undefined
                        ? response.data.response.ignored
                        : response.data.importCount.ignored;
                const msgs = _.compact([
                    response.data.description,
                    [
                        `${i18n.t("Imported")}: ${imported}`,
                        `${i18n.t("Updated")}: ${updated}`,
                        `${i18n.t("Ignored")}: ${ignored}`,
                        `${i18n.t("Deleted")}: ${deletedCount}`,
                    ].join(", "),
                ]);
                snackbar.info(msgs.join(" - "));
                setState(state => ({ ...state, importMessages: msgs }));
            })
            .catch(reason => {
                loading.show(false);
                console.error(reason);
                snackbar.error(reason.message || reason.toString());
            });
    };

    const getNameForModel = key => {
        return {
            dataSet: i18n.t("Data Set"),
            program: i18n.t("Program"),
        }[key];
    };

    const onSettingsChange = settings => {
        setState(state => ({
            ...state,
            settings,
            isTemplateGenerationVisible: settings.isTemplateGenerationVisible(),
            importObject: undefined,
        }));
    };

    const onTemplateChange = useCallback(template => {
        setState(state => ({
            ...state,
            template,
        }));
    }, []);

    const handleStartYear = selectedOption => {
        setState(state => ({
            ...state,
            startYear: selectedOption.value,
        }));
    };

    const handleEndYear = selectedOption => {
        setState(state => ({
            ...state,
            endYear: selectedOption.value,
        }));
    };

    const ConfirmationOnExistingData = () => {
        const { confirmOnExistingData } = state;

        if (!confirmOnExistingData) return null;

        return (
            <ConfirmationDialog
                isOpen={true}
                title={i18n.t("Existing data values")}
                description={i18n.t(
                    "There are {{dataValuesSize}} data values in the database for this organisation unit and periods. If you proceed, all those data values will be deleted and only the ones in the spreadsheet will be saved. Are you sure?",
                    { dataValuesSize: confirmOnExistingData.dataValues.length }
                )}
                onCancel={() => setState(state => ({ ...state, confirmOnExistingData: undefined }))}
                onSave={() => performImport(confirmOnExistingData)}
                saveText={i18n.t("Proceed")}
                cancelText={i18n.t("Cancel")}
            />
        );
    };

    if (!settings) return null;

    return (
        <div className="main-container" style={{ margin: "1em", marginTop: "3em" }}>
            <ThemeListDialog />
            <SettingsComponent settings={settings} onChange={onSettingsChange} />
            <ConfirmationOnExistingData />

            <Paper
                style={{
                    margin: "2em",
                    marginTop: "2em",
                    padding: "2em",
                    width: "50%",
                    display: state.isTemplateGenerationVisible ? "block" : "none",
                }}
            >
                <h1>{i18n.t("Template Generation")}</h1>

                <TemplateSelector settings={settings} onChange={onTemplateChange} />

                {state.template?.type === "dataSets" && (
                    <div
                        className="row"
                        style={{
                            marginTop: "1em",
                            marginLeft: "1em",
                            marginRight: "1em",
                        }}
                    >
                        <div style={{ flexBasis: "30%", margin: "1em", marginLeft: 0 }}>
                            <Select
                                placeholder={i18n.t("Start Year")}
                                options={buildPossibleYears(1970, state.endYear)}
                                defaultValue={{
                                    value: moment("2010-01-01").year(),
                                    label: moment("2010-01-01").year().toString(),
                                }}
                                onChange={handleStartYear}
                            />
                        </div>
                        <div style={{ flexBasis: "30%", margin: "1em" }}>
                            <Select
                                placeholder={i18n.t("End Year")}
                                options={buildPossibleYears(state.startYear, moment().year())}
                                defaultValue={{
                                    value: moment().year(),
                                    label: moment().year().toString(),
                                }}
                                onChange={handleEndYear}
                            />
                        </div>
                    </div>
                )}
                {!_.isEmpty(state.orgUnitTreeRootIds) ? (
                    settings.showOrgUnitsOnGeneration && state.template?.type !== "custom" ? (
                        <OrgUnitsSelector
                            api={api}
                            onChange={handleOrgUnitTreeClick}
                            selected={state.orgUnitTreeSelected}
                            controls={controls}
                            rootIds={state.orgUnitTreeRootIds}
                            fullWidth={false}
                            height={220}
                        />
                    ) : null
                ) : (
                    i18n.t("No capture organisations units")
                )}

                <div
                    className="row"
                    style={{
                        marginTop: "2em",
                        marginLeft: "2em",
                        marginRight: "2em",
                    }}
                >
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={handleTemplateDownloadClick}
                    >
                        {i18n.t("Download template")}
                    </Button>
                </div>
            </Paper>
            <Paper
                style={{
                    margin: "2em",
                    marginTop: "2em",
                    padding: "2em",
                    width: "50%",
                }}
            >
                <h1>{i18n.t("Bulk Import")}</h1>

                <Dropzone
                    accept={
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel.sheet.macroEnabled.12"
                    }
                    onDrop={onDrop}
                    multiple={false}
                >
                    {({ getRootProps, getInputProps, isDragActive, isDragAccept }) => (
                        <section>
                            <div
                                {...getRootProps({
                                    className: isDragActive
                                        ? isDragAccept
                                            ? "stripes"
                                            : "rejectStripes"
                                        : "dropZone",
                                })}
                            >
                                <input {...getInputProps()} />
                                <div
                                    className={"dropzoneTextStyle"}
                                    hidden={state.importDataSheet !== undefined}
                                >
                                    <p className={"dropzoneParagraph"}>
                                        {i18n.t("Drag and drop file to import")}
                                    </p>
                                    <br />
                                    <CloudUploadIcon className={"uploadIconSize"} />
                                </div>
                                <div
                                    className={"dropzoneTextStyle"}
                                    hidden={state.importDataSheet === undefined}
                                >
                                    {state.importDataSheet !== undefined && (
                                        <p className={"dropzoneParagraph"}>
                                            {state.importDataSheet.name}
                                        </p>
                                    )}
                                    <br />
                                    <CloudDoneIcon className={"uploadIconSize"} />
                                </div>
                            </div>
                        </section>
                    )}
                </Dropzone>

                {state.importObject && (
                    <div
                        style={{
                            marginTop: 35,
                            marginBottom: 15,
                            marginLeft: 0,
                            fontSize: "1.2em",
                        }}
                    >
                        {getNameForModel(state.importObject.type)}: {state.importObject.displayName}{" "}
                        ({state.importObject.id})
                        {state.importDataValues.map((group, idx) => (
                            <li key={idx} style={{ marginLeft: 10, fontSize: "1em" }}>
                                {moment(group.period).format("DD/MM/YYYY")}: {group.count}{" "}
                                {i18n.t("data values")}
                            </li>
                        ))}
                    </div>
                )}

                {state.importObject &&
                    state.importOrgUnitIds &&
                    (state.importOrgUnitIds.length > 0 ? (
                        <OrgUnitsSelector
                            key={state.importOrgUnitIds.join(".")}
                            api={api}
                            onChange={handleOrgUnitTreeClick2}
                            selected={state.orgUnitTreeSelected2}
                            controls={controls}
                            rootIds={state.importOrgUnitIds}
                            fullWidth={false}
                            height={220}
                        />
                    ) : (
                        i18n.t("No capture org unit match element org units")
                    ))}

                {state.importMessages && state.importMessages.length > 0 && (
                    <div
                        style={{
                            marginTop: "1em",
                            marginRight: "2em",
                            fontSize: "1.2em",
                            border: "1px solid",
                            padding: "1em",
                        }}
                    >
                        {state.importMessages.map(msg => (
                            <div key={msg}>{msg}</div>
                        ))}
                    </div>
                )}

                <div
                    className="row"
                    style={{
                        marginTop: "1.5em",
                        marginLeft: "1em",
                        marginRight: "1em",
                    }}
                >
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={handleDataImportClick}
                        disabled={!isImportEnabled}
                    >
                        {i18n.t("Import data")}
                    </Button>
                </div>
            </Paper>
        </div>
    );
}
