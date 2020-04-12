import i18n from "@dhis2/d2-i18n";
import { Button, makeStyles, Paper } from "@material-ui/core";
import CloudDoneIcon from "@material-ui/icons/CloudDone";
import CloudUploadIcon from "@material-ui/icons/CloudUpload";
import { ConfirmationDialog, OrgUnitsSelector, useLoading, useSnackbar } from "d2-ui-components";
import _ from "lodash";
import moment from "moment";
import PropTypes from "prop-types";
import React from "react";
import Dropzone from "react-dropzone";
import { useAppContext } from "../contexts/api-context";
import { deleteDataValues, getDataValuesFromData } from "../logic/dataValues";
import * as dhisConnector from "../logic/dhisConnector";
import Settings from "../logic/settings";
import { SheetBuilder } from "../logic/sheetBuilder";
import * as sheetImport from "../logic/sheetImport";
import { ListTemplatesUseCase } from "../templates/usecases/listTemplates";
import { buildPossibleYears } from "../utils/periods";
import "./App.css";
import Select from "./select/Select";
import SettingsComponent from "./settings/Settings";
import { TemplateSelector } from "./template-selector/TemplateSelector";
import { DownloadTemplateUseCase } from "../templates/usecases/downloadTemplate";

const styles = theme => ({
    root: {
        ...theme.mixins.gutters(),
        paddingTop: theme.spacing(2),
        paddingBottom: theme.spacing(2),
    },
});

const controls = {
    filterByLevel: false,
    filterByGroup: false,
    selectAll: false,
};

class AppComponent extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            username: undefined,
            dataSets: [],
            programs: [],
            customTemplates: [],
            orgUnitTreeSelected: [],
            orgUnitTreeSelected2: [],
            orgUnitTreeRootIds: [],
            elementSelectOptions1: [],
            importOrgUnitIds: undefined,
            selectedProgramOrDataSet1: undefined,
            importObject: undefined,
            importDataSheet: undefined,
            importMessages: [],
            importDataValues: [],
            model1: undefined,
            startYear: 2010,
            endYear: moment().year(),
            settings: undefined,
            isTemplateGenerationVisible: true,
            modelOptions: [],
            confirmOnExistingData: undefined,
        };

        this.handleOrgUnitTreeClick = this.handleOrgUnitTreeClick.bind(this);
        this.handleOrgUnitTreeClick2 = this.handleOrgUnitTreeClick2.bind(this);
        this.handleTemplateDownloadClick = this.handleTemplateDownloadClick.bind(this);
        this.handleDataImportClick = this.handleDataImportClick.bind(this);
        this.onSettingsChange = this.onSettingsChange.bind(this);
        this.onDrop = this.onDrop.bind(this).bind(this);
    }

    async componentDidMount() {
        this.props.loading.show();
        await Promise.all([this.loadUserInformation(), this.getUserOrgUnits()]);
        // Load settings once data is already loaded so we can render the objects in single model
        await this.loadSettings();
        const customTemplates = new ListTemplatesUseCase().execute();
        this.setState({ customTemplates });
        await this.props.loading.hide();
    }

    getChildContext() {
        return {
            d2: this.props.d2,
        };
    }

    loadSettings() {
        const { api, snackbar } = this.props;

        return Settings.build(api)
            .then(this.onSettingsChange)
            .catch(err => snackbar.error(`Cannot load settings: ${err.message || err.toString()}`));
    }

    loadUserInformation() {
        return dhisConnector
            .getUserInformation({
                d2: this.props.d2,
            })
            .then(result => {
                this.setState({
                    ...result,
                });
            });
    }

    handleOrgUnitTreeClick(orgUnitPaths) {
        this.setState({
            orgUnitTreeSelected: orgUnitPaths,
        });
    }

    handleOrgUnitTreeClick2(orgUnitPaths) {
        this.setState({
            orgUnitTreeSelected2: _.takeRight(orgUnitPaths, 1),
        });
    }

    getUserOrgUnits() {
        const fields = "id,displayName,path,children::isNotEmpty,access";
        const listOptions = { fields, userOnly: true };

        return this.props.d2.models.organisationUnits.list(listOptions).then(result => {
            this.setState({
                orgUnitTreeRootIds: result.toArray().map(ou => ou.id),
            });
        });
    }

    handleTemplateDownloadClick() {
        const orgUnits = this.state.orgUnitTreeSelected.map(element =>
            element.substr(element.lastIndexOf("/") + 1)
        );

        if (this.state.selectedProgramOrDataSet1 === undefined) return;

        this.props.loading.show(true);

        if (this.state.model1 === "customTemplates") {
            new DownloadTemplateUseCase(this.state.selectedProgramOrDataSet1.value)
                .execute()
                .then(() => this.props.loading.show(false));
        } else {
            dhisConnector
                .getElementMetadata({
                    d2: this.props.d2,
                    element: this.state.selectedProgramOrDataSet1,
                    organisationUnits: orgUnits,
                })
                .then(result => {
                    const template = new SheetBuilder({
                        ...result,
                        startYear: this.state.startYear,
                        endYear: this.state.endYear,
                    });

                    template.downloadSheet().then(() => this.props.loading.show(false));
                });
        }
    }

    async onDrop(files) {
        const { snackbar } = this.props;
        const { dataSets, programs, settings, orgUnitTreeRootIds } = this.state;

        const file = files[0];
        if (!file) {
            snackbar.error(i18n.t("Cannot read file"));
            return;
        }

        try {
            const info = await sheetImport.getBasicInfoFromSheet(file, { dataSets, programs });
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

            this.setState({
                importDataSheet: file,
                importObject: object,
                importDataValues: dataValues,
                importOrgUnitIds,
                importMessages: [],
            });
        } catch (err) {
            console.error(err);
            const msg = err.message || err.toString();
            snackbar.error(msg);
            this.setState({
                importDataSheet: file,
                importObject: undefined,
                importDataValues: [],
                importOrgUnitIds: undefined,
                importMessages: [],
            });
        }
    }

    handleDataImportClick() {
        // TODO: Missing options error checking
        // TODO: Add validation error message
        const { api } = this.props;

        if (!this.state.importObject) return;
        if (!this.state.importDataSheet) return;
        if (!this.state.orgUnitTreeSelected2) return;

        const { showOrgUnitsOnGeneration } = this.state.settings;

        const orgUnits = this.state.orgUnitTreeSelected2.map(path =>
            path.substr(path.lastIndexOf("/") + 1)
        );

        this.props.loading.show(true);
        dhisConnector
            .getElementMetadata({
                d2: this.props.d2,
                element: this.state.importObject,
                organisationUnits: orgUnits,
            })
            .then(result => {
                console.log({ result });
                if (!showOrgUnitsOnGeneration) {
                    const orgUnit = result.organisationUnits[0];
                    if (!orgUnit)
                        throw new Error(i18n.t("Select a organisation units to import data"));
                    const dataSetsForElement = orgUnit.dataSets.filter(
                        e => e.id === result.element.id
                    );

                    if (_.isEmpty(dataSetsForElement))
                        throw new Error(
                            i18n.t("Selected organisation unit is not associated with the dataset")
                        );
                }

                return sheetImport.readSheet({
                    ...result,
                    d2: this.props.d2,
                    file: this.state.importDataSheet,
                    useBuilderOrgUnits: !showOrgUnitsOnGeneration,
                });
            })
            .then(async data => {
                const dataValues = data.dataSet ? await getDataValuesFromData(api, data) : [];
                const info = { data, dataValues };

                if (_.isEmpty(dataValues)) {
                    this.performImport(info);
                } else {
                    this.props.loading.show(false);
                    this.setState({ confirmOnExistingData: info });
                }
            })
            .catch(reason => {
                this.props.loading.show(false);
                console.error(reason);
                this.props.snackbar.error(reason.message || reason.toString());
            });
    }

    performImport(info) {
        const { data, dataValues } = info;
        this.props.loading.show(true);
        this.setState({ confirmOnExistingData: undefined });

        return deleteDataValues(this.props.api, dataValues)
            .then(async deletedCount => {
                const response = await dhisConnector.importData({
                    d2: this.props.d2,
                    element: this.state.importObject,
                    data: data,
                });
                return { response, deletedCount };
            })
            .then(({ deletedCount, response }) => {
                this.props.loading.show(false);
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
                this.props.snackbar.info(msgs.join(" - "));
                this.setState({ importMessages: msgs });
            })
            .catch(reason => {
                this.props.loading.show(false);
                console.error(reason);
                this.props.snackbar.error(reason.message || reason.toString());
            });
    }

    getNameForModel(key) {
        return {
            dataSet: i18n.t("Data Set"),
            program: i18n.t("Program"),
        }[key];
    }

    onSettingsChange(settings) {
        const isTemplateGenerationVisible = settings.isTemplateGenerationVisible();

        const modelOptions = _.compact([
            settings.isModelEnabled("dataSet") && {
                value: "dataSets",
                label: this.getNameForModel("dataSet"),
            },
            settings.isModelEnabled("program") && {
                value: "programs",
                label: this.getNameForModel("program"),
            },
            {
                value: "customTemplates",
                label: i18n.t("Custom"),
            },
        ]);

        const model1 = modelOptions.length === 1 ? modelOptions[0].value : undefined;
        if (modelOptions.length === 1) this.handleModelChange1(modelOptions[0]);

        this.setState({
            settings,
            isTemplateGenerationVisible,
            modelOptions,
            model1,
            importObject: undefined,
        });
    }

    handleModelChange1 = selectedOption => {
        this.setState({
            model1: selectedOption.value,
            elementSelectOptions1: this.state[selectedOption.value],
        });
    };

    handleElementChange1 = selectedOption => {
        this.setState({ selectedProgramOrDataSet1: selectedOption });
    };

    handleStartYear = selectedOption => {
        this.setState({ startYear: selectedOption.value });
    };

    handleEndYear = selectedOption => {
        this.setState({ endYear: selectedOption.value });
    };

    renderConfirmationOnExistingData = () => {
        const { confirmOnExistingData } = this.state;

        if (!confirmOnExistingData) return null;

        return (
            <ConfirmationDialog
                isOpen={true}
                title={i18n.t("Existing data values")}
                description={i18n.t(
                    "There are {{dataValuesSize}} data values in the database for this organisation unit and periods. If you proceed, all those data values will be deleted and only the ones in the spreadsheet will be saved. Are you sure?",
                    { dataValuesSize: confirmOnExistingData.dataValues.length }
                )}
                onCancel={() => this.setState({ confirmOnExistingData: undefined })}
                onSave={() => this.performImport(confirmOnExistingData)}
                saveText={i18n.t("Proceed")}
                cancelText={i18n.t("Cancel")}
            />
        );
    };

    render() {
        const { settings, isTemplateGenerationVisible } = this.state;
        const { importObject, importDataValues, importMessages } = this.state;

        if (!settings) return null;

        const ConfirmationOnExistingData = this.renderConfirmationOnExistingData;

        const isImportEnabled =
            this.state.importObject &&
            (settings.showOrgUnitsOnGeneration || !_.isEmpty(this.state.orgUnitTreeSelected2));

        return (
            <div className="main-container" style={{ margin: "1em", marginTop: "3em" }}>
                <SettingsComponent settings={settings} onChange={this.onSettingsChange} />
                <ConfirmationOnExistingData />

                <Paper
                    style={{
                        margin: "2em",
                        marginTop: "2em",
                        padding: "2em",
                        width: "50%",
                        display: isTemplateGenerationVisible ? "block" : "none",
                    }}
                >
                    <h1>{i18n.t("Template Generation")}</h1>

                    <TemplateSelector
                        action={i18n.t("export")}
                        onModelChange={this.handleModelChange1}
                        onObjectChange={this.handleElementChange1}
                        objectOptions={this.state.elementSelectOptions1}
                        modelOptions={this.state.modelOptions}
                    />

                    {this.state.model1 === "dataSets" && (
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
                                    options={buildPossibleYears(1970, this.state.endYear)}
                                    defaultValue={{
                                        value: moment("2010-01-01").year(),
                                        label: moment("2010-01-01").year().toString(),
                                    }}
                                    onChange={this.handleStartYear}
                                />
                            </div>
                            <div style={{ flexBasis: "30%", margin: "1em" }}>
                                <Select
                                    placeholder={i18n.t("End Year")}
                                    options={buildPossibleYears(
                                        this.state.startYear,
                                        moment().year()
                                    )}
                                    defaultValue={{
                                        value: moment().year(),
                                        label: moment().year().toString(),
                                    }}
                                    onChange={this.handleEndYear}
                                />
                            </div>
                        </div>
                    )}
                    {!_.isEmpty(this.state.orgUnitTreeRootIds) ? (
                        settings.showOrgUnitsOnGeneration &&
                        this.state.model1 !== "customTemplates" ? (
                            <OrgUnitsSelector
                                api={this.props.api}
                                onChange={this.handleOrgUnitTreeClick}
                                selected={this.state.orgUnitTreeSelected}
                                controls={controls}
                                rootIds={this.state.orgUnitTreeRootIds}
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
                            onClick={this.handleTemplateDownloadClick}
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
                        className={"dropZone"}
                        acceptClassName={"stripes"}
                        rejectClassName={"rejectStripes"}
                        onDrop={this.onDrop}
                        multiple={false}
                    >
                        <div
                            className={"dropzoneTextStyle"}
                            hidden={this.state.importDataSheet !== undefined}
                        >
                            <p className={"dropzoneParagraph"}>
                                {i18n.t("Drag and drop file to import")}
                            </p>
                            <br />
                            <CloudUploadIcon className={"uploadIconSize"} />
                        </div>
                        <div
                            className={"dropzoneTextStyle"}
                            hidden={this.state.importDataSheet === undefined}
                        >
                            {this.state.importDataSheet !== undefined && (
                                <p className={"dropzoneParagraph"}>
                                    {this.state.importDataSheet.name}
                                </p>
                            )}
                            <br />
                            <CloudDoneIcon className={"uploadIconSize"} />
                        </div>
                    </Dropzone>

                    {importObject && (
                        <div
                            style={{
                                marginTop: 35,
                                marginBottom: 15,
                                marginLeft: 0,
                                fontSize: "1.2em",
                            }}
                        >
                            {this.getNameForModel(importObject.type)}: {importObject.displayName} (
                            {importObject.id})
                            {importDataValues.map((group, idx) => (
                                <li key={idx} style={{ marginLeft: 10, fontSize: "1em" }}>
                                    {group.period}: {group.count} {i18n.t("data values")}
                                </li>
                            ))}
                        </div>
                    )}

                    {this.state.importObject &&
                        this.state.importOrgUnitIds &&
                        (this.state.importOrgUnitIds.length > 0 ? (
                            <OrgUnitsSelector
                                key={this.state.importOrgUnitIds.join(".")}
                                api={this.props.api}
                                onChange={this.handleOrgUnitTreeClick2}
                                selected={this.state.orgUnitTreeSelected2}
                                controls={controls}
                                rootIds={this.state.importOrgUnitIds}
                                fullWidth={false}
                                height={220}
                            />
                        ) : (
                            i18n.t("No capture org unit match element org units")
                        ))}

                    {importMessages && importMessages.length > 0 && (
                        <div
                            style={{
                                marginTop: "1em",
                                marginRight: "2em",
                                fontSize: "1.2em",
                                border: "1px solid",
                                padding: "1em",
                            }}
                        >
                            {importMessages.map(msg => (
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
                            onClick={this.handleDataImportClick}
                            disabled={!isImportEnabled}
                        >
                            {i18n.t("Import data")}
                        </Button>
                    </div>
                </Paper>
            </div>
        );
    }
}

AppComponent.childContextTypes = {
    d2: PropTypes.object,
};

const useStyles = makeStyles(styles);

export default function App() {
    const classes = useStyles();
    const loading = useLoading();
    const snackbar = useSnackbar();
    const { d2, api } = useAppContext();

    return (
        <AppComponent classes={classes} loading={loading} snackbar={snackbar} api={api} d2={d2} />
    );
}
