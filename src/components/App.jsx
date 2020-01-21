import React from "react";
import _ from "lodash";
import PropTypes from "prop-types";
import Dropzone from "react-dropzone";

import { Button, Paper, withStyles } from "@material-ui/core";
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
import { OrgUnitsSelector, withSnackbar, withLoading } from "d2-ui-components";

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
            orgUnitTreeRoots: [],
            orgUnitTreeBaseRoot: [],
            elementSelectOptions1: [],
            elementSelectOptions2: [],
            selectedProgramOrDataSet1: undefined,
            selectedProgramOrDataSet2: undefined,
            importDataSheet: undefined,
            model1: undefined,
            startYear: 2010,
            endYear: moment().year(),
        };

        this.handleOrgUnitTreeClick = this.handleOrgUnitTreeClick.bind(this);
        this.handleTemplateDownloadClick = this.handleTemplateDownloadClick.bind(this);
        this.handleDataImportClick = this.handleDataImportClick.bind(this);
    }

    async componentDidMount() {
        this.props.loading.show();
        await Promise.all([this.loadUserInformation(), this.searchForOrgUnits()]);
        this.props.loading.hide();
    }

    getChildContext() {
        return {
            d2: this.props.d2,
        };
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
                        orgUnitTreeRoots: result.toArray(),
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
                        orgUnitTreeRoots: result.toArray(),
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

        this.props.loading.show(true);
        dhisConnector
            .getElementMetadata({
                d2: this.props.d2,
                element: this.state.selectedProgramOrDataSet2,
                organisationUnits: [],
            })
            .then(result => {
                return sheetImport.readSheet({
                    ...result,
                    d2: this.props.d2,
                    file: this.state.importDataSheet,
                });
            })
            .then(data => {
                console.log(data);
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
                        response.data.message,
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

    render() {
        const handleModelChange1 = selectedOption => {
            this.setState({
                model1: selectedOption.value,
                elementSelectOptions1: this.state[selectedOption.value],
            });
        };

        const handleElementChange1 = selectedOption => {
            this.setState({ selectedProgramOrDataSet1: selectedOption });
        };

        const handleModelChange2 = selectedOption => {
            this.setState({ elementSelectOptions2: this.state[selectedOption.value] });
        };

        const handleElementChange2 = selectedOption => {
            this.setState({ selectedProgramOrDataSet2: selectedOption });
        };

        const handleStartYear = selectedOption => {
            this.setState({ startYear: selectedOption.value });
        };

        const handleEndYear = selectedOption => {
            this.setState({ endYear: selectedOption.value });
        };

        return (
            <div className="main-container" style={{ margin: "1em", marginTop: "3em" }}>
                <Paper
                    style={{
                        margin: "2em",
                        marginTop: "2em",
                        padding: "2em",
                        width: "50%",
                    }}
                >
                    <h1>{i18n.t("Template Generation")}</h1>
                    <div
                        className="row"
                        style={{
                            marginTop: "1em",
                            marginRight: "1em",
                        }}
                    >
                        <div style={{ flexBasis: "30%", margin: "1em", marginLeft: 0 }}>
                            <Select
                                placeholder={i18n.t("Model")}
                                onChange={handleModelChange1}
                                options={[
                                    { value: "dataSets", label: "Data Set" },
                                    {
                                        value: "programs",
                                        label: "Program",
                                    },
                                ]}
                            />
                        </div>
                        <div style={{ flexBasis: "70%", margin: "1em" }}>
                            <Select
                                placeholder={i18n.t("Select element to export...")}
                                onChange={handleElementChange1}
                                options={this.state.elementSelectOptions1}
                            />
                        </div>
                    </div>
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
                                    onChange={handleStartYear}
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
                                    onChange={handleEndYear}
                                />
                            </div>
                        </div>
                    )}
                    {!_.isEmpty(this.state.orgUnitTreeRoots) ? (
                        <OrgUnitsSelector
                            d2={this.props.d2}
                            onChange={this.handleOrgUnitTreeClick}
                            selected={this.state.orgUnitTreeSelected}
                            controls={controls}
                            rootIds={this.state.orgUnitTreeRoots.map(ou => ou.id)}
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
                    <div
                        className="row"
                        style={{
                            marginTop: "1em",
                            marginRight: "1em",
                        }}
                    >
                        <div style={{ flexBasis: "30%", margin: "1em", marginLeft: 0 }}>
                            <Select
                                placeholder={i18n.t("Model")}
                                onChange={handleModelChange2}
                                options={[
                                    {
                                        value: "dataSets",
                                        label: "Data Set",
                                    },
                                    {
                                        value: "programs",
                                        label: "Program",
                                    },
                                ]}
                            />
                        </div>
                        <div style={{ flexBasis: "70%", margin: "1em" }}>
                            <Select
                                placeholder={i18n.t("Select element to import...")}
                                onChange={handleElementChange2}
                                options={this.state.elementSelectOptions2}
                            />
                        </div>
                    </div>
                    <Dropzone
                        accept={"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}
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

export default withStyles(styles)(withLoading(withSnackbar(App)));
