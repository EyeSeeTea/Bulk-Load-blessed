import React from "react";
import _ from "lodash";
import PropTypes from "prop-types";
import Dropzone from "react-dropzone";

import { Button, Paper } from "@material-ui/core";
import CloudUploadIcon from "@material-ui/icons/CloudUpload";
import CloudDoneIcon from "@material-ui/icons/CloudDone";

import * as sheetImport from "../logic/sheetImport";
import { SheetBuilder } from "../logic/sheetBuilder";
import * as dhisConnector from "../logic/dhisConnector";

import "./App.css";
import moment from "moment";
import { buildPossibleYears } from "../utils/periods";
import i18n from "@dhis2/d2-i18n";
import Select from "./Select";
import { OrgUnitsSelector, useLoading, useSnackbar } from "d2-ui-components";
import Settings from "../logic/settings";
import SettingsComponent from "./settings/Settings";
import { makeStyles } from "@material-ui/styles";
import { useAppContext } from "../contexts/api-context";

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

class App extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            username: undefined,
            dataSets: [],
            programs: [],
            orgUnitTreeSelected: [],
            orgUnitTreeSelected2: [],
            orgUnitTreeRootIds: [],
            orgUnitTreeBaseRoot: [],
            elementSelectOptions1: [],
            elementSelectOptions2: [],
            selectedProgramOrDataSet1: undefined,
            selectedProgramOrDataSet2: undefined,
            importDataSheet: undefined,
            model1: undefined,
            startYear: 2010,
            endYear: moment().year(),
            settings: undefined,
            isTemplateGenerationVisible: true,
            modelOptions: [],
        };

        this.handleOrgUnitTreeClick = this.handleOrgUnitTreeClick.bind(this);
        this.handleOrgUnitTreeClick2 = this.handleOrgUnitTreeClick2.bind(this);
        this.handleTemplateDownloadClick = this.handleTemplateDownloadClick.bind(this);
        this.handleDataImportClick = this.handleDataImportClick.bind(this);
        this.onSettingsChange = this.onSettingsChange.bind(this);
    }

    async componentDidMount() {
        this.props.loading.show();
        await Promise.all([this.loadUserInformation(), this.searchForOrgUnits()]);
        // Load settings once data is already loaded so we can render the objects in single model
        await this.loadSettings();
        this.props.loading.hide();
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

    searchForOrgUnits(searchValue = "") {
        const fields = "id,displayName,path,children::isNotEmpty,access";

        if (searchValue.trim().length === 0) {
            return this.props.d2.models.organisationUnits
                .list({
                    fields,
                    level: 1,
                })
                .then(result => {
                    this.setState({
                        orgUnitTreeBaseRoot: result.toArray().map(model => model.path),
                        orgUnitTreeRootIds: result.toArray().map(ou => ou.id),
                    });
                });
        } else {
            return this.props.d2.models.organisationUnits
                .list({
                    fields,
                    query: searchValue,
                })
                .then(result => {
                    this.setState({
                        orgUnitTreeRootIds: result.toArray().map(ou => ou.id),
                    });
                });
        }
    }

    handleTemplateDownloadClick() {
        const orgUnits = this.state.orgUnitTreeSelected.map(element =>
            element.substr(element.lastIndexOf("/") + 1)
        );

        // TODO: Add validation error message
        if (orgUnits.length === 0) return;
        if (this.state.selectedProgramOrDataSet1 === undefined) return;

        this.props.loading.show(true);
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

    onDrop(file) {
        this.setState({
            importDataSheet: file[0],
        });
    }

    handleDataImportClick() {
        // TODO: Missing options error checking
        // TODO: Add validation error message
        if (this.state.selectedProgramOrDataSet2 === undefined) return;
        if (this.state.importDataSheet === undefined) return;
        if (this.state.orgUnitTreeSelected2 === undefined) return;
        const orgUnits = this.state.orgUnitTreeSelected2.map(path =>
            path.substr(path.lastIndexOf("/") + 1)
        );

        this.props.loading.show(true);
        dhisConnector
            .getElementMetadata({
                d2: this.props.d2,
                element: this.state.selectedProgramOrDataSet2,
                organisationUnits: orgUnits,
            })
            .then(result => {
                /*
                console.log("DATASET");
                console.log(result.element.id);
                console.log("ORG UNITS");
                console.log(result.organisationUnits);
                console.log("datasets");
                console.log(result.organisationUnits[0].dataSets);
                */
                if (
                    result.organisationUnits[0].dataSets.filter(e => e.id === result.element.id)
                        .length === 0
                ) {
                    console.log("dataset no encontrado en la orgUnit seleccionada");
                    return;
                }
                return sheetImport.readSheet({
                    ...result,
                    d2: this.props.d2,
                    file: this.state.importDataSheet,
                });
            })
            .then(data => {
                return dhisConnector.importData({
                    d2: this.props.d2,
                    element: this.state.selectedProgramOrDataSet2,
                    data: data,
                });
            })
            .then(response => {
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
                this.props.snackbar.info(
                    _.compact([
                        response.data.description,
                        [
                            `${i18n.t("Imported")}: ${imported}`,
                            `${i18n.t("Updated")}: ${updated}`,
                            `${i18n.t("Ignored")}: ${ignored}`,
                        ].join(", "),
                    ]).join(" - ")
                );
            })
            .catch(reason => {
                this.props.loading.show(false);
                console.error(reason);
                this.props.snackbar.error(reason.message);
            });
    }

    onSettingsChange(settings) {
        const isTemplateGenerationVisible = settings.isTemplateGenerationVisible();

        const modelOptions = _.compact([
            settings.isModelEnabled("dataSet") && {
                value: "dataSets",
                label: i18n.t("Data Set"),
            },
            settings.isModelEnabled("program") && {
                value: "programs",
                label: i18n.t("Program"),
            },
        ]);

        const model1 = _.isEqual(this.state.modelOptions, modelOptions)
            ? this.state.model1
            : modelOptions.length === 1
            ? modelOptions[0].value
            : undefined;

        if (this.state.model1 !== model1 && modelOptions.length === 1) {
            this.handleModelChange1(modelOptions[0]);
            this.handleModelChange2(modelOptions[0]);
        }

        this.setState({ settings, isTemplateGenerationVisible, modelOptions, model1 });
    }

    renderModelSelector = props => {
        const { action, onModelChange, onObjectChange, objectOptions } = props;
        const { modelOptions } = this.state;
        const showModelSelector = modelOptions.length > 1;

        const rowStyle = showModelSelector
            ? { marginTop: "1em", marginRight: "1em" }
            : { justifyContent: "left" };

        const elementLabel = showModelSelector ? i18n.t("elements") : modelOptions[0].label;
        const key = modelOptions.map(option => option.value).join("-");

        return (
            <div className="row" style={rowStyle}>
                {showModelSelector && (
                    <div style={{ flexBasis: "30%", margin: "1em", marginLeft: 0 }}>
                        <Select
                            key={key}
                            placeholder={i18n.t("Model")}
                            onChange={onModelChange}
                            options={modelOptions}
                        />
                    </div>
                )}

                <div style={{ flexBasis: "70%", margin: "1em" }}>
                    <Select
                        key={key}
                        placeholder={i18n.t("Select {{element}} to {{action}}...", {
                            element: elementLabel,
                            action,
                        })}
                        onChange={onObjectChange}
                        options={objectOptions}
                    />
                </div>
            </div>
        );
    };

    handleModelChange1 = selectedOption => {
        this.setState({
            model1: selectedOption.value,
            elementSelectOptions1: this.state[selectedOption.value],
        });
    };

    handleElementChange1 = selectedOption => {
        this.setState({ selectedProgramOrDataSet1: selectedOption });
    };

    handleModelChange2 = selectedOption => {
        this.setState({ elementSelectOptions2: this.state[selectedOption.value] });
    };

    handleElementChange2 = selectedOption => {
        this.setState({ selectedProgramOrDataSet2: selectedOption });
    };

    handleStartYear = selectedOption => {
        this.setState({ startYear: selectedOption.value });
    };

    handleEndYear = selectedOption => {
        this.setState({ endYear: selectedOption.value });
    };

    render() {
        const ModelSelector = this.renderModelSelector;
        const { settings, isTemplateGenerationVisible } = this.state;

        if (!settings) return null;

        return (
            <div className="main-container" style={{ margin: "1em", marginTop: "3em" }}>
                <SettingsComponent settings={settings} onChange={this.onSettingsChange} />

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

                    <ModelSelector
                        action={i18n.t("export")}
                        onModelChange={this.handleModelChange1}
                        onObjectChange={this.handleElementChange1}
                        objectOptions={this.state.elementSelectOptions1}
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
                                        label: moment("2010-01-01")
                                            .year()
                                            .toString(),
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
                                        label: moment()
                                            .year()
                                            .toString(),
                                    }}
                                    onChange={this.handleEndYear}
                                />
                            </div>
                        </div>
                    )}
                    {!_.isEmpty(this.state.orgUnitTreeRootIds) ? (
                        <OrgUnitsSelector
                            api={this.props.api}
                            onChange={this.handleOrgUnitTreeClick}
                            selected={this.state.orgUnitTreeSelected}
                            controls={controls}
                            rootIds={this.state.orgUnitTreeRootIds}
                            fullWidth={false}
                            height={192}
                        />
                    ) : (
                        i18n.t("No Organisation Units found")
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

                    <ModelSelector
                        action={i18n.t("import")}
                        onModelChange={this.handleModelChange2}
                        onObjectChange={this.handleElementChange2}
                        objectOptions={this.state.elementSelectOptions2}
                    />
                    <Dropzone
                        accept={
                            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel.sheet.macroEnabled.12"
                        }
                        className={"dropZone"}
                        acceptClassName={"stripes"}
                        rejectClassName={"rejectStripes"}
                        onDrop={this.onDrop.bind(this)}
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

                    {!_.isEmpty(this.state.orgUnitTreeRootIds) ? (
                        <OrgUnitsSelector
                            api={this.props.api}
                            onChange={this.handleOrgUnitTreeClick2}
                            selected={this.state.orgUnitTreeSelected2}
                            controls={controls}
                            rootIds={this.state.orgUnitTreeRootIds}
                            fullWidth={false}
                            height={192}
                        />
                    ) : (
                        i18n.t("No Organisation Units found")
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
                            onClick={this.handleDataImportClick}
                        >
                            {i18n.t("Import data")}
                        </Button>
                    </div>
                </Paper>
            </div>
        );
    }
}

App.childContextTypes = {
    d2: PropTypes.object,
};

const useStyles = makeStyles(styles);

export default function App2() {
    const classes = useStyles();
    const loading = useLoading();
    const snackbar = useSnackbar();
    const { d2, api } = useAppContext();

    return <App classes={classes} loading={loading} snackbar={snackbar} api={api} d2={d2} />;
}
