import React from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import Select from "react-select";
import Dropzone from "react-dropzone";

import MuiThemeProvider from "material-ui/styles/MuiThemeProvider";
import { Button, Paper, withStyles } from "@material-ui/core";
import CloudUploadIcon from "@material-ui/icons/CloudUpload";
import CloudDoneIcon from "@material-ui/icons/CloudDone";

import { HeaderBar } from "@dhis2/ui-widgets";
import LoadingMask from "@dhis2/d2-ui-core/loading-mask/LoadingMask.component";

import * as sheetImport from "../logic/sheetImport";
import { SheetBuilder } from "../logic/sheetBuilder";
import * as dhisConnector from "../logic/dhisConnector";

import "./App.css";
import theme from "./Theme";
import * as actionTypes from "../actions/actionTypes";
import OrgUnitTreeMultipleSelectAndSearch from "./OrgUnitTreeMultipleSelectAndSearch";
import AlertSnackbar from "./AlertSnackbar";
import moment from "moment";
import { buildPossibleYears } from "../utils/periods";

const styles = theme => ({
    root: {
        ...theme.mixins.gutters(),
        paddingTop: theme.spacing(2),
        paddingBottom: theme.spacing(2),
    },
});

class App extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            username: undefined,
            dataSets: [],
            programs: [],
            orgUnitTreeSelected: [],
            orgUnitTreeSelected2: [],
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

        this.loadUserInformation();
        this.searchForOrgUnits();

        this.handleOrgUnitTreeClick = this.handleOrgUnitTreeClick.bind(this);
        this.handleOrgUnitTreeClick2 = this.handleOrgUnitTreeClick2.bind(this);
        this.handleTemplateDownloadClick = this.handleTemplateDownloadClick.bind(this);
        this.handleDataImportClick = this.handleDataImportClick.bind(this);
    }

    getChildContext() {
        return {
            d2: this.props.d2,
        };
    }

    loadUserInformation() {
        dhisConnector
            .getUserInformation({
                d2: this.props.d2,
            })
            .then(result => {
                this.setState({
                    ...result,
                });
            });
    }

    handleOrgUnitTreeClick(event, orgUnit) {
        if (this.state.orgUnitTreeSelected.includes(orgUnit.path)) {
            this.setState(state => {
                state.orgUnitTreeSelected.splice(
                    state.orgUnitTreeSelected.indexOf(orgUnit.path),
                    1
                );
                return { orgUnitTreeSelected: state.orgUnitTreeSelected };
            });
        } else {
            this.setState(state => {
                state.orgUnitTreeSelected.push(orgUnit.path);
                return { orgUnitTreeSelected: state.orgUnitTreeSelected };
            });
        }
    }

    handleOrgUnitTreeClick2(event, orgUnit) {
        this.setState(state => {
            state.orgUnitTreeSelected2=[];
            state.orgUnitTreeSelected2.push(orgUnit.path);
            return { orgUnitTreeSelected2: state.orgUnitTreeSelected2 };
        });
    }

    searchForOrgUnits(searchValue = "") {
        let fields = "id,displayName,path,children::isNotEmpty,access";

        if (searchValue.trim().length === 0) {
            this.props.d2.models.organisationUnits
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
            this.props.d2.models.organisationUnits
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
        let orgUnits = this.state.orgUnitTreeSelected.map(element =>
            element.substr(element.lastIndexOf("/") + 1)
        );

        // TODO: Add validation error message
        if (orgUnits.length === 0) return;
        if (this.state.selectedProgramOrDataSet1 === undefined) return;

        this.props.setLoading(true);
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

                template.downloadSheet().then(() => this.props.setLoading(false));
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
        if (this.state.orgUnitTreeSelected2===undefined) return;
        //console.log(this.state.orgUnitTreeSelected2);
        let orgUnits = this.state.orgUnitTreeSelected2.map(element =>
            element.substr(element.lastIndexOf("/") + 1)
        );
        

        this.props.setLoading(true);
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
                if (result.organisationUnits[0].dataSets.filter(e => e.id === result.element.id).length ===0) {
                    console.log("dataset no encontrado en la orgUnit seleccionada");
                    return 
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
                this.props.setLoading(false);
                console.log(response);
                let imported =
                    response.data.response !== undefined
                        ? response.data.response.imported
                        : response.data.importCount.imported;
                let updated =
                    response.data.response !== undefined
                        ? response.data.response.updated
                        : response.data.importCount.updated;
                let ignored =
                    response.data.response !== undefined
                        ? response.data.response.ignored
                        : response.data.importCount.ignored;
                       // console.log("response");
                       // console.log(response);
                this.props.showSnackbar(
                    response.data.description +
                        " Imported: " +
                        imported +
                        ", Updated: " +
                        updated +
                        ", Ignored: " +
                        ignored
                );
            })
            .catch(reason => {
                this.props.setLoading(false);
                console.error(reason);
                this.props.showSnackbar(reason.message);
            });
    }

    render() {
        const { snackbarOpen, snackbarMessage } = this.props.dialog;

        let handleModelChange1 = selectedOption => {
            this.setState({
                model1: selectedOption.value,
                elementSelectOptions1: this.state[selectedOption.value],
            });
        };

        let handleElementChange1 = selectedOption => {
            this.setState({ selectedProgramOrDataSet1: selectedOption });
        };

        let handleModelChange2 = selectedOption => {
            this.setState({ elementSelectOptions2: this.state[selectedOption.value] });
        };

        let handleElementChange2 = selectedOption => {
            this.setState({ selectedProgramOrDataSet2: selectedOption });
        };

        let handleStartYear = selectedOption => {
            this.setState({ startYear: selectedOption.value });
        };

        let handleEndYear = selectedOption => {
            this.setState({ endYear: selectedOption.value });
        };

        return (
            <MuiThemeProvider muiTheme={theme} theme={theme}>
                <div>
                    <div id="loading" hidden={!this.props.loading}>
                        <LoadingMask large={true} />
                    </div>
                    <div>
                        <HeaderBar appName={"Bulk Load"} />
                        <div className="main-container" style={{ margin: "1em", marginTop: "3em" }}>
                            
                            <Paper
                                style={{
                                    margin: "2em",
                                    marginTop: "2em",
                                    padding: "2em",
                                    width: "50%",
                                }}
                            >
                                <h1>Template Generation</h1>
                                <div
                                    className="row"
                                    style={{
                                        marginTop: "1em",
                                        marginLeft: "1em",
                                        marginRight: "1em",
                                    }}
                                >
                                    <div style={{ flexBasis: "30%", margin: "1em" }}>
                                        <Select
                                            placeholder={"Model"}
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
                                            placeholder={"Select element to export..."}
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
                                        <div style={{ flexBasis: "30%", margin: "1em" }}>
                                            <Select
                                                placeholder={"Start Year"}
                                                options={buildPossibleYears(
                                                    1970,
                                                    this.state.endYear
                                                )}
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
                                                placeholder={"End Year"}
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
                                <OrgUnitTreeMultipleSelectAndSearch
                                    roots={this.state.orgUnitTreeRoots}
                                    onUpdateInput={this.searchForOrgUnits.bind(this)}
                                    initiallyExpanded={this.state.orgUnitTreeBaseRoot}
                                    selected={this.state.orgUnitTreeSelected}
                                    onSelectClick={this.handleOrgUnitTreeClick}
                                   noHitsLabel={"No Organisation Units found"}
                                />
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
                                        Download template
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
                                <h1>Bulk Import</h1>
                                <div
                                    className="row"
                                    style={{
                                        marginTop: "1em",
                                        marginLeft: "1em",
                                        marginRight: "1em",
                                    }}
                                >
                                    <div style={{ flexBasis: "30%", margin: "1em" }}>
                                        <Select
                                            placeholder={"Model"}
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
                                            placeholder={"Select element to import..."}
                                            onChange={handleElementChange2}
                                            options={this.state.elementSelectOptions2}
                                        />
                                    </div>
                                </div>
                                <Dropzone
                                    accept={
                                      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel.sheet.macroEnabled.12"
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
                                            {"Drag and drop file to import"}
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
                                <OrgUnitTreeMultipleSelectAndSearch
                                    roots={this.state.orgUnitTreeRoots}
                                    onUpdateInput={this.searchForOrgUnits.bind(this)}
                                    initiallyExpanded={this.state.orgUnitTreeBaseRoot}
                                    selected={this.state.orgUnitTreeSelected2}
                                    onSelectClick={this.handleOrgUnitTreeClick2}
                                    hideCheckboxes={true}
                                    noHitsLabel={"No Organisation Units found"}
                                />
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
                                        Import data
                                    </Button>
                                </div>
                            </Paper>
                        </div>
                    </div>
                    <AlertSnackbar
                        open={snackbarOpen}
                        message={snackbarMessage}
                        onClose={this.props.hideSnackbar}
                    />
                </div>
            </MuiThemeProvider>
        );
    }
}

App.childContextTypes = {
    d2: PropTypes.object,
};

const mapStateToProps = state => ({
    d2: state.d2,
    database: state.database,
    loading: state.loading,
    dialog: state.dialog,
});

const mapDispatchToProps = dispatch => ({
    setLoading: loading => dispatch({ type: actionTypes.LOADING, loading: loading }),
    hideSnackbar: () => {
        dispatch({ type: actionTypes.SNACKBAR_SHOW, show: false });
    },
    showSnackbar: message => {
        dispatch({ type: actionTypes.SNACKBAR_UPDATE, message });
        dispatch({ type: actionTypes.SNACKBAR_SHOW, show: true });
    },
});

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(withStyles(styles)(App));
