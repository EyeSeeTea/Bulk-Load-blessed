import { Button, Checkbox, FormControlLabel, makeStyles } from "@material-ui/core";
import CloudDoneIcon from "@material-ui/icons/CloudDone";
import CloudUploadIcon from "@material-ui/icons/CloudUpload";
import {
    ConfirmationDialog,
    ConfirmationDialogProps,
    OrgUnitsSelector,
    useLoading,
    useSnackbar,
} from "d2-ui-components";
import { saveAs } from "file-saver";
import _ from "lodash";
import moment from "moment";
import React, { useCallback, useEffect, useState } from "react";
import Dropzone from "react-dropzone";
import { CompositionRoot } from "../../../CompositionRoot";
import { DataForm, DataFormType } from "../../../domain/entities/DataForm";
import { Data, DataValue } from "../../../domain/entities/DataPackage";
import i18n from "../../../locales";
import { cleanOrgUnitPaths } from "../../../utils/dhis";
import { useAppContext } from "../../contexts/api-context";
import { deleteDataValues, SheetImportResponse } from "../../logic/dataValues";
import * as dhisConnector from "../../logic/dhisConnector";
import * as sheetImport from "../../logic/sheetImport";
import { RouteComponentProps } from "../root/RootPage";

interface ImportState {
    dataForm: DataForm;
    file: File;
    summary: {
        period: string;
        count: number;
        id: string;
    }[];
}

export default function ImportTemplatePage({ settings }: RouteComponentProps) {
    const loading = useLoading();
    const snackbar = useSnackbar();
    const classes = useStyles();
    const { api } = useAppContext();

    const [orgUnitTreeRootIds, setOrgUnitTreeRootIds] = useState<string[]>([]);
    const [selectedOrgUnits, setSelectedOrgUnits] = useState<string[]>([]);
    const [overwriteOrgUnits, setOverwriteOrgUnits] = useState<boolean>(false);
    const [orgUnitTreeFilter, setOrgUnitTreeFilter] = useState<string[]>([]);
    const [importState, setImportState] = useState<ImportState>();
    const [messages, setMessages] = useState<string[]>([]);
    const [dialogProps, updateDialog] = useState<ConfirmationDialogProps | null>(null);

    useEffect(() => {
        CompositionRoot.attach().orgUnits.getUserRoots.execute().then(setOrgUnitTreeRootIds);
    }, []);

    const onOrgUnitChange = (orgUnitPaths: string[]) => {
        setSelectedOrgUnits(_.takeRight(orgUnitPaths, 1));
    };

    const onDrop = async (files: File[]) => {
        loading.show(true, i18n.t("Reading file..."));
        setMessages([]);
        setSelectedOrgUnits([]);
        setOrgUnitTreeFilter([]);

        const file = files[0];
        if (!file) {
            snackbar.error(i18n.t("Cannot read file"));
            loading.show(false);
            return;
        }

        try {
            const {
                object,
                dataValues,
                orgUnits,
            } = await CompositionRoot.attach().templates.analyze.execute(file);

            if (!object.writeAccess) {
                throw new Error(
                    i18n.t("You don't have write permissions for {{type}} {{name}}", object)
                );
            }

            setOrgUnitTreeFilter(orgUnits.map(({ id }) => id));
            setImportState({
                dataForm: object,
                file,
                summary: dataValues,
            });
        } catch (err) {
            console.error(err);
            const msg = err.message || err.toString();
            snackbar.error(msg);
            setImportState(undefined);
        }

        loading.show(false);
    };

    const handleDataImportClick = async () => {
        if (!importState) return;

        try {
            const { dataForm, file } = importState;

            loading.show(true, i18n.t("Reading data..."));
            const result = await dhisConnector.getElementMetadata({
                api,
                element: dataForm,
                orgUnitIds: cleanOrgUnitPaths(selectedOrgUnits),
            });

            const useBuilderOrgUnits =
                settings.orgUnitSelection !== "generation" && overwriteOrgUnits;

            if (useBuilderOrgUnits && selectedOrgUnits.length === 0) {
                throw new Error(i18n.t("Select at least one organisation unit to import data"));
            }

            const {
                rowOffset,
                colOffset,
                orgUnits,
                object,
            } = await CompositionRoot.attach().templates.analyze.execute(file);

            //const organisationUnits = result.organisationUnits;
            const orgUnitCoordMap = new Map();

            if (result.element.type === "programs") {
                const usedOrgUnitsUIDs = await sheetImport.getUsedOrgUnits({
                    ...result,
                    file,
                    useBuilderOrgUnits,
                    rowOffset,
                });

                for (const uid of usedOrgUnitsUIDs.values()) {
                    const orgUnitData = await dhisConnector.importOrgUnitByUID(api, uid);
                    orgUnitCoordMap.set(uid, orgUnitData);
                }
            }

            const data = await sheetImport.readSheet({
                ...result,
                file,
                useBuilderOrgUnits,
                orgUnitCoordMap,
                rowOffset,
                colOffset,
            });

            const filterOrgUnits = useBuilderOrgUnits
                ? cleanOrgUnitPaths(selectedOrgUnits)
                : _.map(orgUnits, "id");

            const removedDataValues = _.remove(
                //@ts-ignore FIXME Create typings for sheet import code
                data.dataValues ?? data.events,
                ({ orgUnit }) => !filterOrgUnits.find(id => id === orgUnit)
            );

            if (removedDataValues.length === 0) {
                await checkExistingData(object.type, data);
            } else {
                updateDialog({
                    title: i18n.t("Invalid organisation units found"),
                    description: i18n.t(
                        "There are {{number}} data values with an invalid organisation unit that will be ignored during import.\nYou can still download them and send them to your administrator.",
                        { number: removedDataValues.length }
                    ),
                    onCancel: () => {
                        updateDialog(null);
                    },
                    onSave: () => {
                        checkExistingData(object.type, data);
                        updateDialog(null);
                    },
                    onInfoAction: () => {
                        downloadInvalidOrganisations(object.type, removedDataValues);
                    },
                    cancelText: i18n.t("Cancel"),
                    saveText: i18n.t("Proceed"),
                    infoActionText: i18n.t("Download data values with invalid organisation units"),
                });
            }
        } catch (reason) {
            console.error(reason);
            snackbar.error(reason.message || reason.toString());
        }

        loading.show(false);
    };

    const downloadInvalidOrganisations = (type: DataFormType, elements: unknown) => {
        const object = type === "dataSets" ? { dataValues: elements } : { events: elements };
        const json = JSON.stringify(object, null, 4);
        const blob = new Blob([json], { type: "application/json" });
        const date = moment().format("YYYYMMDDHHmm");
        saveAs(blob, `invalid-organisations-${date}.json`);
    };

    const checkExistingData = async (type: DataFormType, data: any) => {
        loading.show(true, i18n.t("Checking duplicates..."));
        const { newValues, existingValues } = await getDataValuesFromData(data);
        loading.reset();

        if (existingValues.length === 0) {
            await performImport(newValues);
        } else {
            const dataSetConfig = {
                title: i18n.t("Existing data values"),
                message: i18n.t(
                    "There are {{totalExisting}} data values in the database for this organisation unit and periods. If you proceed, all those data values will be deleted and only the ones in the spreadsheet will be saved. Are you sure?",
                    { totalExisting: existingValues.length }
                ),
                save: i18n.t("Proceed"),
                cancel: i18n.t("Cancel"),
                info: i18n.t("Import only new data values"),
            };

            const programConfig = {
                title: i18n.t("Warning: Your upload may result in the generation of duplicates", {
                    nsSeparator: "-",
                }),
                message: i18n.t(
                    "There are {{totalExisting}} records in your template with very similar or exact values as other records that already exist. If you proceed, you risk creating duplicates. What would you like to do?",
                    { totalExisting: existingValues.length }
                ),
                save: i18n.t("Import everything anyway"),
                cancel: i18n.t("Cancel import"),
                info: i18n.t("Import only new records"),
            };

            const { title, message, save, cancel, info } =
                type === "dataSets" ? dataSetConfig : programConfig;

            updateDialog({
                title,
                description: message,
                onSave: () => {
                    performImport([...newValues, ...existingValues]);
                    updateDialog(null);
                },
                onInfoAction: () => {
                    performImport(newValues);
                    updateDialog(null);
                },
                onCancel: () => {
                    updateDialog(null);
                },
                saveText: save,
                cancelText: cancel,
                infoActionText: info,
            });
        }
    };

    const getDataValuesFromData = async ({
        program,
        dataSet,
        events,
        dataValues,
    }: SheetImportResponse): Promise<{
        newValues: any;
        existingValues: any;
    }> => {
        const isProgram = !!program && !!events && !dataSet && !dataValues;
        const isDataSet = !program && !events && !!dataSet && !!dataValues;
        const type = isProgram ? "programs" : "dataSets";
        const id = isProgram ? program : dataSet;

        if (!isProgram && !isDataSet) throw new Error("Invalid form type");
        if (!id) throw new Error("Invalid program or dataSet");

        const periods = isProgram
            ? undefined
            : _.uniq(dataValues?.map(({ period }) => period.toString()));
        const orgUnits = isProgram
            ? _.uniq(events?.map(({ orgUnit }) => orgUnit))
            : _.uniq(dataValues?.map(({ orgUnit }) => orgUnit));

        const result = await CompositionRoot.attach().form.getDataPackage.execute({
            id,
            periods,
            orgUnits,
            type,
            translateCodes: false,
        });

        if (isProgram) {
            const existingEvents = _.remove(
                events ?? [],
                ({ event, eventDate, orgUnit, attributeOptionCombo: attribute, dataValues }) => {
                    return result.dataEntries.find(dataPackage =>
                        compareDataPackages(
                            id,
                            {
                                id: event,
                                period: String(eventDate),
                                orgUnit,
                                attribute,
                                dataValues,
                            },
                            dataPackage,
                            1
                        )
                    );
                }
            );

            return { newValues: events, existingValues: existingEvents };
        } else {
            const existingDataValues = _.remove(
                dataValues ?? [],
                ({ period, orgUnit, attributeOptionCombo: attribute }) => {
                    return result.dataEntries.find(dataPackage =>
                        compareDataPackages(
                            id,
                            { period: String(period), orgUnit, attribute },
                            dataPackage
                        )
                    );
                }
            );

            return { newValues: dataValues, existingValues: existingDataValues };
        }
    };

    // TODO: This should be simplified and moved into a use-case but we need to migrate the old code first
    const compareDataPackages = (
        id: string,
        base: Partial<Data>,
        compare: Partial<Data>,
        periodDays = 0
    ): boolean => {
        const properties = _.compact([
            periodDays === 0 ? "period" : undefined,
            "orgUnit",
            "attribute",
        ]);

        for (const property of properties) {
            const baseValue = _.get(base, property);
            const compareValue = _.get(compare, property);
            const areEqual = _.isEqual(baseValue, compareValue);
            if (baseValue && compareValue && !areEqual) return false;
        }

        if (
            periodDays > 0 &&
            moment
                .duration(moment(base.period).diff(moment(compare.period)))
                .abs()
                .as(settings.duplicateToleranceUnit) > settings.duplicateTolerance
        ) {
            return false;
        }

        // Ignore data packages with event id set
        if (base.id && compare.id) return false;

        const exclusions = settings.duplicateExclusion[id] ?? [];
        const filter = (values: DataValue[]) =>
            values.filter(({ dataElement }) => !exclusions.includes(dataElement));

        if (
            base.dataValues &&
            compare.dataValues &&
            !_.isEqualWith(
                filter(base.dataValues),
                filter(compare.dataValues),
                (base: DataValue[], compare: DataValue[]) => {
                    const values = ({ dataElement, value }: DataValue) => `${dataElement}-${value}`;
                    const intersection = _.intersectionBy(base, compare, values);
                    return base.length === compare.length && intersection.length === base.length;
                }
            )
        ) {
            return false;
        }

        return true;
    };

    const performImport = async (dataValues: any[]) => {
        if (!importState) return;

        loading.show(true, i18n.t("Importing data..."));

        try {
            const deletedCount =
                importState.dataForm.type === "dataSets"
                    ? await deleteDataValues(api, dataValues)
                    : 0;
            const { response, importCount, description } = await dhisConnector.importData({
                api,
                element: importState.dataForm,
                data: dataValues,
            });

            const { imported, updated, ignored } = response ?? importCount;
            const messages = _.compact([
                description,
                [
                    `${i18n.t("Imported")}: ${imported}`,
                    `${i18n.t("Updated")}: ${updated}`,
                    `${i18n.t("Ignored")}: ${ignored}`,
                    `${i18n.t("Deleted")}: ${deletedCount}`,
                ].join(", "),
            ]);

            snackbar.info(messages.join(" - "));
            setMessages(messages);
        } catch (reason) {
            console.error(reason);
            snackbar.error(reason.message || reason.toString());
        }

        loading.show(false);
    };

    const getNameForModel = (key: DataFormType) => {
        switch (key) {
            case "dataSets":
                return i18n.t("Data Set");
            case "programs":
                return i18n.t("Program");
        }
    };

    const onOverwriteOrgUnitsChange = useCallback((_event, overwriteOrgUnits) => {
        setOverwriteOrgUnits(overwriteOrgUnits);
    }, []);

    return (
        <React.Fragment>
            {dialogProps && <ConfirmationDialog isOpen={true} maxWidth={"xl"} {...dialogProps} />}

            <h3>{i18n.t("Bulk data import")}</h3>

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
                                    ? `${classes.stripes} ${
                                          isDragAccept
                                              ? classes.acceptStripes
                                              : classes.rejectStripes
                                      }`
                                    : classes.dropzone,
                            })}
                        >
                            <input {...getInputProps()} />
                            <div
                                className={classes.dropzoneTextStyle}
                                hidden={importState?.file !== undefined}
                            >
                                <p className={classes.dropzoneParagraph}>
                                    {i18n.t("Drag and drop file to import")}
                                </p>
                                <br />
                                <CloudUploadIcon className={classes.uploadIconSize} />
                            </div>
                            <div
                                className={classes.dropzoneTextStyle}
                                hidden={importState?.file === undefined}
                            >
                                {importState?.file !== undefined && (
                                    <p className={classes.dropzoneParagraph}>
                                        {importState?.file.name}
                                    </p>
                                )}
                                <br />
                                <CloudDoneIcon className={classes.uploadIconSize} />
                            </div>
                        </div>
                    </section>
                )}
            </Dropzone>

            {importState?.dataForm && (
                <div
                    style={{
                        marginTop: 35,
                        marginBottom: 15,
                        marginLeft: 0,
                        fontSize: "1.2em",
                    }}
                >
                    {getNameForModel(importState.dataForm.type)}: {importState.dataForm.name} (
                    {importState.dataForm.id})
                    {importState.summary.map((group, idx) => (
                        <li key={idx} style={{ marginLeft: 10, fontSize: "1em" }}>
                            {moment(String(group.period)).format("DD/MM/YYYY")}:{" "}
                            {group.id ? i18n.t("Update") : i18n.t("Create")} {group.count}{" "}
                            {i18n.t("data values")} {group.id && `(${group.id})`}
                        </li>
                    ))}
                </div>
            )}

            {settings.orgUnitSelection !== "generation" && (
                <div>
                    <FormControlLabel
                        style={{ marginTop: "1em" }}
                        control={
                            <Checkbox
                                checked={overwriteOrgUnits}
                                onChange={onOverwriteOrgUnitsChange}
                            />
                        }
                        label={i18n.t("Select import Organisation Unit")}
                    />
                </div>
            )}

            {overwriteOrgUnits &&
                (orgUnitTreeRootIds.length > 0 ? (
                    <OrgUnitsSelector
                        api={api}
                        onChange={onOrgUnitChange}
                        selected={selectedOrgUnits}
                        rootIds={orgUnitTreeRootIds}
                        selectableIds={orgUnitTreeFilter}
                        fullWidth={false}
                        height={220}
                        controls={{
                            filterByLevel: false,
                            filterByGroup: false,
                            selectAll: false,
                        }}
                    />
                ) : (
                    i18n.t("No capture org unit match element org units")
                ))}

            {messages.length > 0 && (
                <div
                    style={{
                        marginTop: "1em",
                        marginRight: "2em",
                        fontSize: "1.2em",
                        border: "1px solid",
                        padding: "1em",
                    }}
                >
                    {messages.map(msg => (
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
                    disabled={!importState?.dataForm}
                >
                    {i18n.t("Import data")}
                </Button>
            </div>
        </React.Fragment>
    );
}

const useStyles = makeStyles({
    dropzoneTextStyle: { textAlign: "center", top: "15%", position: "relative" },
    dropzoneParagraph: { fontSize: 20 },
    uploadIconSize: { width: 50, height: 50, color: "#909090" },
    dropzone: {
        position: "relative",
        width: "100%",
        height: 270,
        backgroundColor: "#f0f0f0",
        border: "dashed",
        borderColor: "#c8c8c8",
        cursor: "pointer",
    },
    stripes: {
        width: "100%",
        height: 270,
        cursor: "pointer",
        border: "solid",
        borderColor: "#c8c8c8",
        "-webkit-animation": "progress 2s linear infinite !important",
        "-moz-animation": "progress 2s linear infinite !important",
        animation: "progress 2s linear infinite !important",
        backgroundSize: "150% 100%",
    },
    acceptStripes: {
        backgroundImage: `repeating-linear-gradient(
            -45deg,
            #f0f0f0,
            #f0f0f0 25px,
            #c8c8c8 25px,
            #c8c8c8 50px
        )`,
    },
    rejectStripes: {
        backgroundImage: `repeating-linear-gradient(
            -45deg,
            #fc8785,
            #fc8785 25px,
            #f4231f 25px,
            #f4231f 50px
        )`,
    },
});
