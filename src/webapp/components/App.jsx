import { Button, makeStyles, Paper } from "@material-ui/core";
import CloudDoneIcon from "@material-ui/icons/CloudDone";
import CloudUploadIcon from "@material-ui/icons/CloudUpload";
import { ConfirmationDialog, OrgUnitsSelector, useLoading, useSnackbar } from "d2-ui-components";
import _ from "lodash";
import moment from "moment";
import React from "react";
import Dropzone from "react-dropzone";
import { CompositionRoot } from "../../CompositionRoot";
import i18n from "../../locales";
import { useAppContext } from "../contexts/api-context";
import { deleteDataValues, getDataValuesFromData } from "../logic/dataValues";
import * as dhisConnector from "../logic/dhisConnector";
import Settings from "../logic/settings";
import { SheetBuilder } from "../logic/sheetBuilder";
import * as sheetImport from "../logic/sheetImport";
import { buildPossibleYears } from "../utils/periods";
import "./App.css";
import { Select } from "./select/Select";
import SettingsComponent from "./settings/SettingsDialog";
import { TemplateSelector } from "./template-selector/TemplateSelector";

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
            settings: undefined,
            isTemplateGenerationVisible: true,
            confirmOnExistingData: undefined,
        };

        this.handleOrgUnitTreeClick = this.handleOrgUnitTreeClick.bind(this);
        this.handleOrgUnitTreeClick2 = this.handleOrgUnitTreeClick2.bind(this);
        this.handleTemplateDownloadClick = this.handleTemplateDownloadClick.bind(this);
        this.handleDataImportClick = this.handleDataImportClick.bind(this);
        this.onTemplateChange = this.onTemplateChange.bind(this);
        this.onSettingsChange = this.onSettingsChange.bind(this);
        this.onDrop = this.onDrop.bind(this);
    }

    async componentDidMount() {
        this.props.loading.show();
        await this.loadUserInformation();
        await this.getUserOrgUnits();
        await this.loadSettings();

        await this.props.loading.hide();
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

    async handleTemplateDownloadClick() {
        if (!this.state.template) return;
        const { type, id, theme } = this.state.template;
        this.props.loading.show(true);

        if (type === "custom") {
            await CompositionRoot.attach().templates.downloadCustom.execute(id, theme);
        } else {
            const orgUnits = this.state.orgUnitTreeSelected.map(element =>
                element.substr(element.lastIndexOf("/") + 1)
            );

            const element = await dhisConnector.getElement(this.props.d2, type, id);

            const result = await dhisConnector.getElementMetadata({
                d2: this.props.d2,
                element: { ...element, endpoint: type, type },
                organisationUnits: orgUnits,
            });

            const template = new SheetBuilder({
                ...result,
                startYear: this.state.startYear,
                endYear: this.state.endYear,
            });

            const name = element.displayName ?? element.name;
            const file = await template.toBlob();
            await CompositionRoot.attach().templates.downloadGenerated.execute(name, file, theme);
        }

        this.props.loading.show(false);
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
            // TODO: AUTO_GEN_OFFSET
            const info = await sheetImport.getBasicInfoFromSheet(file, { dataSets, programs }, 4);
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
                    // TODO: AUTO_GEN_OFFSET
                    rowOffset: 4,
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
        this.setState({
            settings,
            isTemplateGenerationVisible: settings.isTemplateGenerationVisible(),
            importObject: undefined,
        });
    }

    onTemplateChange = template => {
        this.setState({ template });
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

                    <TemplateSelector settings={settings} onChange={this.onTemplateChange} />

                    {this.state.template?.type === "dataSets" && (
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
                        this.state.template?.type !== "custom" ? (
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
                        onDrop={this.onDrop}
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
                                </div>
                            </section>
                        )}
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
