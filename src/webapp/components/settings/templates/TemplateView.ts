import _ from "lodash";
import i18n from "@eyeseetea/d2-ui-components/locales";
import {
    CellRef,
    ColumnRef,
    CustomTemplate,
    DataSource,
    DataSourceValue,
    GeneratedTemplate,
    Range,
    RowDataSource,
    RowRef,
    SheetRef,
    StyleSource,
    TeiRowDataSource,
    Template,
    TrackerEventRowDataSource,
    TrackerRelationship,
    ValueRef,
} from "../../../../domain/entities/Template";
import { Maybe, ofType } from "../../../../types/utils";
import { fromBase64, getStringFromFile, toBase64 } from "../../../../utils/files";
import { DataFormType } from "../../../../domain/entities/DataForm";
import { getTemplateId } from "../../../logic/sheetBuilder";

export interface TemplateView extends BasicViewModel, AdvancedViewModel {
    mode: "basic" | "advanced";
}

type ValidViewModel = { [K in keyof TemplateView]: NonNullable<TemplateView[K]> };

const baseFields: Array<keyof BaseViewModel> = ["code", "name", "dataFormId", "spreadsheet"];
const advancedFields: Array<keyof AdvancedViewModel> = ["dataSources", "styleSources"];

interface BaseViewModel {
    code: string;
    name: string;
    description: string;
    dataFormType: Maybe<DataFormType>;
    dataFormId: Maybe<string>;
    spreadsheet: Maybe<File>;
}

export interface AdvancedViewModel extends BaseViewModel {
    dataSources: Maybe<File>;
    styleSources: Maybe<File>;
}

export interface BasicViewModel extends BaseViewModel {
    // Data Source (dataSets and programs)
    eventIdSheet: string;
    eventIdColumn: string;
    orgUnitSheet: string;
    orgUnitColumn: string;
    attributeSheet: string;
    attributeColumn: string;
    periodSheet: string;
    periodColumn: string;
    rangeSheet: string;
    rangeRowStart: number;
    rangeColumnStart: string;
    dataElementSheet: string;
    dataElementRow: number;
    categoryOptionSheet: string;
    categoryOptionRow: number;
    coordinatesLatitudeSheet: string;
    coordinatesLatitudeColumn: string;
    coordinatesLongitudeSheet: string;
    coordinatesLongitudeColumn: string;

    // Data Source (trackerPrograms)
    teiIdSheet: string;
    teiIdColumn: string;
    teiOrgUnitSheet: string;
    teiOrgUnitColumn: string;
    teiGeometrySheet: string;
    teiGeometryColumn: string;
    teiEnrollmentDateSheet: string;
    teiEnrollmentDateColumn: string;
    teiIncidentDateSheet: string;
    teiIncidentDateColumn: string;
    teiAttributesSheet: string;
    teiAttributesRowStart: number;
    teiAttributesColumnStart: string;
    teiAttributeIdSheet: string;
    teiAttributeIdRow: number;
    teiRelRangeSheet: string;
    teiRelRangeRowStart: number;
    teiRelRangeColumnStart: string;
    teiRelRelationshipTypeSheet: string;
    teiRelRelationshipTypeCell: string;
    teiRelFromSheet: string;
    teiRelFromColumn: string;
    teiRelToSheet: string;
    teiRelToColumn: string;
    teiEventEventIdSheet: string;
    teiEventEventIdColumn: string;
    teiEventTeiIdSheet: string;
    teiEventTeiIdColumn: string;
    teiEventCategoryOptionComboSheet: string;
    teiEventCategoryOptionComboColumn: string;
    teiEventDateSheet: string;
    teiEventDateColumn: string;
    teiEventProgramStageSheet: string;
    teiEventProgramStageCell: string;
    teiEventDataElementsSheet: string;
    teiEventDataElementsRowStart: number;
    teiEventDataElementsRowEnd: number;
    teiEventDataElementsColumnStart: string;
    teiEventDataValuesSheet: string;
    teiEventDataValuesRowStart: number;
    teiEventDataValuesColumnStart: string;

    // Styles
    stylesTitleSheet: string;
    stylesTitleRange: string;
    stylesSubtitleSheet: string;
    stylesSubtitleRange: string;
    stylesLogoSheet: string;
    stylesLogoRange: string;
}

const dataEntryDefaultSheet = "Data Entry";

const viewModelEmpty: TemplateView = {
    mode: "basic",
    code: "",
    name: "",
    dataFormType: undefined,
    dataFormId: undefined,
    description: "",
    eventIdSheet: dataEntryDefaultSheet,
    eventIdColumn: "",
    orgUnitSheet: dataEntryDefaultSheet,
    orgUnitColumn: "",
    attributeSheet: dataEntryDefaultSheet,
    attributeColumn: "",
    periodSheet: dataEntryDefaultSheet,
    periodColumn: "",
    rangeSheet: dataEntryDefaultSheet,
    rangeRowStart: 1,
    rangeColumnStart: "",
    dataElementSheet: dataEntryDefaultSheet,
    dataElementRow: 1,
    categoryOptionSheet: dataEntryDefaultSheet,
    categoryOptionRow: 1,
    coordinatesLatitudeSheet: dataEntryDefaultSheet,
    coordinatesLatitudeColumn: "",
    coordinatesLongitudeSheet: dataEntryDefaultSheet,
    coordinatesLongitudeColumn: "",

    teiIdSheet: "",
    teiIdColumn: "",
    teiOrgUnitSheet: "",
    teiOrgUnitColumn: "",
    teiGeometrySheet: "",
    teiGeometryColumn: "",
    teiEnrollmentDateSheet: "",
    teiEnrollmentDateColumn: "",
    teiIncidentDateSheet: "",
    teiIncidentDateColumn: "",
    teiAttributesSheet: "",
    teiAttributesRowStart: 1,
    teiAttributesColumnStart: "",
    teiAttributeIdSheet: "",
    teiAttributeIdRow: 1,
    teiRelRangeSheet: "",
    teiRelRangeRowStart: 1,
    teiRelRangeColumnStart: "",
    teiRelRelationshipTypeSheet: "",
    teiRelRelationshipTypeCell: "",
    teiRelFromSheet: "",
    teiRelFromColumn: "",
    teiRelToSheet: "",
    teiRelToColumn: "",
    teiEventEventIdSheet: "",
    teiEventEventIdColumn: "",
    teiEventTeiIdSheet: "",
    teiEventTeiIdColumn: "",
    teiEventCategoryOptionComboSheet: "",
    teiEventCategoryOptionComboColumn: "",
    teiEventDateSheet: "",
    teiEventDateColumn: "",
    teiEventProgramStageSheet: "",
    teiEventProgramStageCell: "",
    teiEventDataElementsSheet: "",
    teiEventDataElementsRowStart: 1,
    teiEventDataElementsRowEnd: 1,
    teiEventDataElementsColumnStart: "",
    teiEventDataValuesSheet: "",
    teiEventDataValuesRowStart: 1,
    teiEventDataValuesColumnStart: "",
    stylesTitleSheet: dataEntryDefaultSheet,
    stylesTitleRange: "",
    stylesSubtitleSheet: dataEntryDefaultSheet,
    stylesSubtitleRange: "",
    stylesLogoSheet: dataEntryDefaultSheet,
    stylesLogoRange: "",

    spreadsheet: undefined,
    dataSources: undefined,
    styleSources: undefined,
};

const fieldsByKey = {
    // dataSets and programs
    eventId: ["eventIdSheet", "eventIdColumn"],
    orgUnit: ["orgUnitSheet", "orgUnitColumn"],
    attribute: ["attributeSheet", "attributeColumn"],
    period: ["periodSheet", "periodColumn"],
    coordinatesLatitude: ["coordinatesLatitudeSheet", "coordinatesLatitudeColumn"],
    coordinatesLongitude: ["coordinatesLongitudeSheet", "coordinatesLongitudeColumn"],
    dataElement: ["dataElementSheet", "dataElementRow"],
    categoryOption: ["categoryOptionSheet", "categoryOptionRow"],
    range: ["rangeSheet", "rangeColumnStart", "rangeRowStart"],
    // trackerPrograms
    teiId: ["teiIdSheet", "teiIdColumn"],
    teiOrgUnit: ["teiOrgUnitSheet", "teiOrgUnitColumn"],
    teiGeometry: ["teiGeometrySheet", "teiGeometryColumn"],
    teiEnrollmentDate: ["teiEnrollmentDateSheet", "teiEnrollmentDateColumn"],
    teiIncidentDate: ["teiIncidentDateSheet", "teiIncidentDateColumn"],
    teiAttributes: ["teiAttributesSheet", "teiAttributesRowStart", "teiAttributesColumnStart"],
    teiAttributeId: ["teiAttributeIdSheet", "teiAttributeIdRow"],
    teiRelRange: ["teiRelRangeRowStart", "teiRelRangeColumnStart"],
    teiRelRelationshipType: ["teiRelRelationshipTypeCell"],
    teiRelFrom: ["teiRelFromColumn"],
    teiRelTo: ["teiRelToColumn"],
    teiEventEventId: ["teiEventEventIdColumn"],
    teiEventTeiId: ["teiEventTeiIdColumn"],
    teiEventCategoryOptionCombo: ["teiEventCategoryOptionComboColumn"],
    teiEventDateSheet: ["teiEventDateColumn"],
    teiEventProgramStage: ["teiEventProgramStageCell"],
    teiEventDataElements: [
        "teiEventDataElementsRowStart",
        "teiEventDataElementsRowEnd",
        "teiEventDataElementsColumnStart",
    ],
    teiEventDataValues: ["teiEventDataValuesRowStart", "teiEventDataValuesColumnStart"],
} as const;

export type TemplateViewKey = keyof TemplateView;

type Validation = { isValid: true; object: ValidViewModel } | { isValid: false; errors: string[] };

export class TemplateViewActions {
    constructor(private generatedTemplates: GeneratedTemplate[]) {}

    async build(options: { dataFormType: DataFormType | undefined }): Promise<TemplateView> {
        const { dataFormType } = options;
        if (!dataFormType) return viewModelEmpty;
        const generatedTemplate = this.getGenerateTemplate(dataFormType);

        return { ...viewModelEmpty, ...this.get(generatedTemplate) };
    }

    private getGenerateTemplate(dataFormType: DataFormType): GeneratedTemplate {
        const templateId = getTemplateId(dataFormType, null).id;
        const generatedTemplate = this.generatedTemplates.find(t => t.id === templateId);
        if (!generatedTemplate) throw new Error("Cannot find generated template");
        return generatedTemplate;
    }

    async fromCustomTemplate(template: CustomTemplate): Promise<TemplateView> {
        const base: Partial<TemplateView> = {
            code: template.id,
            name: template.name,
            dataFormId: template.dataFormId.type === "value" ? template.dataFormId.id : undefined,
            dataFormType: template.dataFormType.type === "value" ? template.dataFormType.id : undefined,
            description: template.description,
            spreadsheet: await getFile(template.file),
        };

        return { ...viewModelEmpty, ...base, ...this.get(template) };
    }

    getFieldsForDataFormType(dataFormType: Maybe<DataFormType>): Array<readonly TemplateViewKey[]> {
        const f = fieldsByKey;

        switch (dataFormType) {
            case "programs":
                return [
                    f.eventId,
                    f.orgUnit,
                    f.attribute,
                    f.period,
                    f.range,
                    f.dataElement,
                    f.coordinatesLatitude,
                    f.coordinatesLongitude,
                ];
            case "dataSets":
                return [f.orgUnit, f.period, f.attribute, f.range, f.dataElement, f.categoryOption];
            case "trackerPrograms":
                return [
                    f.teiId,
                    f.teiOrgUnit,
                    f.teiGeometry,
                    f.teiEnrollmentDate,
                    f.teiIncidentDate,
                    f.teiAttributes,
                    f.teiAttributeId,
                    f.teiRelRange,
                    f.teiRelRelationshipType,
                    f.teiRelFrom,
                    f.teiRelTo,
                    f.teiEventEventId,
                    f.teiEventTeiId,
                    f.teiEventCategoryOptionCombo,
                    f.teiEventDateSheet,
                    f.teiEventProgramStage,
                    f.teiEventDataElements,
                    f.teiEventDataValues,
                ];
            default:
                return [];
        }
    }

    private get(template: Template): Partial<TemplateView> {
        const { dataSources, styleSources } = template;
        const dataFormType = template.dataFormType.type === "value" ? template.dataFormType.id : undefined;
        if (!dataFormType) return {};

        const advancedViewModel: Partial<TemplateView> = {
            mode: "advanced",
            dataSources: getFileFromTemplateField(template, "Data Sources", template.dataSources),
            styleSources: getFileFromTemplateField(template, "Styles Sources", template.styleSources),
        };

        const stylesBySection = _.keyBy(styleSources, styleSource => styleSource.section);
        const stylesAttrs = _.pickBy({
            stylesTitleSheet: stylesBySection["title"]?.source.sheet,
            stylesTitleRange: stylesBySection["title"]?.source.ref,
            stylesSubtitleSheet: stylesBySection["subtitle"]?.source.sheet,
            stylesSubtitleRange: stylesBySection["subtitle"]?.source.ref,
            stylesLogoSheet: stylesBySection["logo"]?.source.sheet,
            stylesLogoRange: stylesBySection["logo"]?.source.ref,
        });

        switch (dataFormType) {
            case "dataSets":
            case "programs": {
                const dataSource = dataSources?.[0];
                const dataSourceHasTypeRow = dataSource && "type" in dataSource && dataSource.type === "row";
                if (!dataSourceHasTypeRow || dataSources?.length !== 1) return advancedViewModel;

                const viewModel: Partial<TemplateView> = {
                    mode: "basic",
                    ...getColumnAttrs(dataSource.eventId, "eventId"),
                    ...getColumnAttrs(dataSource.orgUnit, "orgUnit"),
                    ...getColumnAttrs(dataSource.attribute, "attribute"),
                    ...getColumnAttrs(dataSource.period, "period"),
                    ...getRangeAttrs(dataSource.range, "range"),
                    ...getRowAttrs(dataSource.dataElement, "dataElement"),
                    ...getRowAttrs(dataSource.categoryOption, "categoryOption"),
                    ...getColumnAttrs(dataSource.coordinates?.latitude, "coordinatesLatitude"),
                    ...getColumnAttrs(dataSource.coordinates?.longitude, "coordinatesLongitude"),
                    ...stylesAttrs,
                };

                return viewModel;
            }
            case "trackerPrograms": {
                if (!dataSources || dataSources.length !== 3) return advancedViewModel;

                const rowTei = findDataSourceByType(dataSources, "rowTei");
                const rowTeiRelationship = findDataSourceByType(dataSources, "rowTeiRelationship");
                const rowTrackedEvent = findDataSourceByType(dataSources, "rowTrackedEvent");

                if (!(rowTei && rowTeiRelationship && rowTrackedEvent)) return advancedViewModel;

                const viewModel: Partial<TemplateView> = {
                    mode: "basic",
                    ...getColumnAttrs(rowTei.teiId, "teiId"),
                    ...getColumnAttrs(rowTei.orgUnit, "teiOrgUnit"),
                    ...getColumnAttrs(rowTei.geometry, "teiGeometry"),
                    ...getColumnAttrs(rowTei.enrollmentDate, "teiEnrollmentDate"),
                    ...getColumnAttrs(rowTei.incidentDate, "teiIncidentDate"),
                    ...getRangeAttrs(rowTei.attributes, "teiAttributes"),
                    ...getRowAttrs(rowTei.attributeId, "teiAttributeId"),

                    ...getRangeAttrs(rowTeiRelationship.range, "teiRelRange"),
                    ...getCellAttrs(rowTeiRelationship.relationshipType, "teiRelRelationshipType"),
                    ...getColumnAttrs(rowTeiRelationship.from, "teiRelFrom"),
                    ...getColumnAttrs(rowTeiRelationship.to, "teiRelTo"),

                    ...getColumnAttrs(rowTrackedEvent.eventId, "teiEventEventId"),
                    ...getColumnAttrs(rowTrackedEvent.teiId, "teiEventTeiId"),
                    ...getColumnAttrs(rowTrackedEvent.date, "teiEventDate"),
                    ...getColumnAttrs(rowTrackedEvent.categoryOptionCombo, "teiEventCategoryOptionCombo"),
                    ...getRangeAttrs(rowTrackedEvent.dataValues, "teiEventDataValues"),
                    ...getCellAttrs(rowTrackedEvent.programStage, "teiEventProgramStage"),
                    ...getRangeAttrs(rowTrackedEvent.dataElements, "teiEventDataElements"),

                    ...stylesAttrs,
                };

                return viewModel;
            }
        }
    }

    async toCustomTemplate(viewModel: ValidViewModel): Promise<CustomTemplate> {
        const base: Pick<
            CustomTemplate,
            "type" | "id" | "name" | "dataFormType" | "dataFormId" | "description" | "file" | "created" | "lastUpdated"
        > = {
            type: "custom",
            id: viewModel.code,
            name: viewModel.name,
            dataFormType: { type: "value", id: viewModel.dataFormType },
            dataFormId: { type: "value", id: viewModel.dataFormId },
            description: viewModel.description,
            file: { name: viewModel.spreadsheet.name, contents: await toBase64(viewModel.spreadsheet) },
            created: undefined,
            lastUpdated: undefined,
        };

        const styleSources: StyleSource[] = [
            {
                section: "title",
                source: { type: "range", ref: viewModel.stylesTitleRange, sheet: "Data Entry" },
            },
            {
                section: "subtitle",
                source: { type: "range", ref: viewModel.stylesSubtitleRange, sheet: "Data Entry" },
            },
            {
                section: "logo",
                source: { type: "range", ref: viewModel.stylesLogoRange, sheet: "Data Entry" },
            },
        ];

        switch (viewModel.mode) {
            case "basic": {
                switch (viewModel.dataFormType) {
                    case "dataSets": {
                        const dataSource: RowDataSource = {
                            type: "row",
                            orgUnit: getDataSourceColumnAttrs(viewModel, "orgUnit"),
                            period: getDataSourceColumnAttrs(viewModel, "period"),
                            attribute: getDataSourceColumnAttrs(viewModel, "attribute"),
                            range: getDataSourceRangeAttrs(viewModel, "range"),
                            dataElement: getDataSourceRowAttrs(viewModel, "dataElement"),
                            categoryOption: getDataSourceRowAttrs(viewModel, "categoryOption"),
                        };

                        return { ...base, dataSources: [dataSource], styleSources };
                    }
                    case "programs": {
                        const dataSource: RowDataSource = {
                            type: "row",
                            eventId: getDataSourceColumnAttrs(viewModel, "eventId"),
                            orgUnit: getDataSourceColumnAttrs(viewModel, "orgUnit"),
                            attribute: getDataSourceColumnAttrs(viewModel, "attribute"),
                            period: getDataSourceColumnAttrs(viewModel, "period"),
                            range: getDataSourceRangeAttrs(viewModel, "range"),
                            dataElement: getDataSourceRowAttrs(viewModel, "dataElement"),
                            coordinates: {
                                latitude: {
                                    type: "column",
                                    sheet: viewModel.coordinatesLatitudeSheet,
                                    ref: viewModel.coordinatesLatitudeColumn,
                                },
                                longitude: {
                                    type: "column",
                                    sheet: viewModel.coordinatesLongitudeSheet,
                                    ref: viewModel.coordinatesLongitudeColumn,
                                },
                            },
                        };

                        return { ...base, dataSources: [dataSource], styleSources };
                    }
                    case "trackerPrograms": {
                        const dataSource1: TeiRowDataSource = {
                            type: "rowTei",
                            teiId: getDataSourceColumnAttrs(viewModel, "teiId"),
                            orgUnit: getDataSourceColumnAttrs(viewModel, "teiOrgUnit"),
                            geometry: getDataSourceColumnAttrs(viewModel, "teiGeometry"),
                            enrollmentDate: getDataSourceColumnAttrs(viewModel, "teiEnrollmentDate"),
                            incidentDate: getDataSourceColumnAttrs(viewModel, "teiIncidentDate"),
                            attributes: getDataSourceRangeAttrs(viewModel, "teiAttributes"),
                            attributeId: getDataSourceRowAttrs(viewModel, "teiAttributeId"),
                        };

                        const dataSource2: TrackerRelationship = {
                            type: "rowTeiRelationship",
                            sheetsMatch: "^Rel",
                            range: getDataSourceRangeAttrs(viewModel, "teiRelRange"),
                            relationshipType: getDataSourceCellAttrs(viewModel, "teiRelRelationshipType"),
                            from: getDataSourceColumnAttrs(viewModel, "teiRelFrom"),
                            to: getDataSourceColumnAttrs(viewModel, "teiRelTo"),
                        };

                        const dataSource3: TrackerEventRowDataSource = {
                            type: "rowTrackedEvent",
                            sheetsMatch: "^(Stage|\\()",
                            eventId: getDataSourceColumnAttrs(viewModel, "teiEventEventId"),
                            teiId: getDataSourceColumnAttrs(viewModel, "teiEventTeiId"),
                            date: getDataSourceColumnAttrs(viewModel, "teiEventDate"),
                            categoryOptionCombo: getDataSourceColumnAttrs(viewModel, "teiEventCategoryOptionCombo"),
                            dataValues: getDataSourceRangeAttrs(viewModel, "teiEventDataValues"),
                            programStage: getDataSourceCellAttrs(viewModel, "teiEventProgramStage"),
                            dataElements: getDataSourceRangeAttrs(viewModel, "teiEventDataElements"),
                        };

                        const dataSources = [dataSource1, dataSource2, dataSource3];
                        return { ...base, dataSources: dataSources, styleSources };
                    }
                }
                break;
            }
            case "advanced":
                return {
                    ...base,
                    dataSources: await arrayFromFile<DataSource>(viewModel.dataSources),
                    styleSources: await arrayFromFile<StyleSource>(viewModel.styleSources),
                };
        }
    }

    update<Field extends keyof TemplateView>(
        viewModel: TemplateView,
        field: Field,
        value: TemplateView[Field]
    ): TemplateView {
        if (field === "dataFormType" && value && viewModel.dataFormType !== value) {
            const newDataFormType = value as DataFormType;
            const generatedTemplate = this.getGenerateTemplate(newDataFormType);
            return { ...viewModel, dataFormType: newDataFormType, ...this.get(generatedTemplate) };
        } else {
            return { ...viewModel, [field]: value };
        }
    }

    validate(viewModel: TemplateView): Validation {
        switch (viewModel.mode) {
            case "basic": {
                const fieldsByType = _.flatten(this.getFieldsForDataFormType(viewModel.dataFormType));
                return this.validatePresence(viewModel, _.concat(baseFields, fieldsByType));
            }
            case "advanced":
                return this.validatePresence(viewModel, _.concat(baseFields, advancedFields));
        }
    }

    private validatePresence(viewModel: TemplateView, fields: TemplateViewKey[]): Validation {
        const translations = TemplateViewActions.getTranslations();
        const emptyFields = fields.filter(field => !viewModel[field]);
        const errors = emptyFields.map(field => `${i18n.t("Field cannot be empty")}: ${translations[field]}`);

        return _.isEmpty(errors) ? { isValid: true, object: viewModel as ValidViewModel } : { isValid: false, errors };
    }

    static getTranslations() {
        return ofType<Record<TemplateViewKey, string>>({
            mode: i18n.t("Mode"),
            code: i18n.t("Code"),
            name: i18n.t("Name"),
            description: i18n.t("Description"),
            dataFormType: i18n.t("Type"),
            dataFormId: i18n.t("Program/Dataset"),
            spreadsheet: i18n.t("Spreadsheet template"),

            eventIdSheet: i18n.t("Event UID - Sheet"),
            eventIdColumn: i18n.t("Event UID - Column"),
            orgUnitSheet: i18n.t("Organisation Unit - Sheet"),
            orgUnitColumn: i18n.t("Organisation Unit - Column"),
            attributeSheet: i18n.t("Attribute - Sheet"),
            attributeColumn: i18n.t("Attribute - Column"),
            periodSheet: i18n.t("Period - Sheet"),
            periodColumn: i18n.t("Period - Column"),
            rangeSheet: i18n.t("Range - Sheet"),
            rangeRowStart: i18n.t("Range - Starting row"),
            rangeColumnStart: i18n.t("Range - Starting column"),
            dataElementSheet: i18n.t("Data Element - Sheet"),
            dataElementRow: i18n.t("Data Element - Row"),
            categoryOptionSheet: i18n.t("Category Option - Sheet"),
            categoryOptionRow: i18n.t("Category Option - Row"),
            coordinatesLatitudeSheet: i18n.t("Coordinates Latitude - Sheet"),
            coordinatesLatitudeColumn: i18n.t("Coordinates Latitude - Column"),
            coordinatesLongitudeSheet: i18n.t("Coordinates Longitude - Sheet"),
            coordinatesLongitudeColumn: i18n.t("Coordinates Longitude - Column"),
            stylesTitleSheet: i18n.t("Title - Sheet"),
            stylesTitleRange: i18n.t("Title Range (example D2:I2)", { nsSeparator: false }),
            stylesSubtitleSheet: i18n.t("Subtitle - Sheet"),
            stylesSubtitleRange: i18n.t("Title Range (example D3:I3)", { nsSeparator: false }),
            stylesLogoSheet: i18n.t("Logo - Sheet"),
            stylesLogoRange: i18n.t("Title Range (example A2:C3)", { nsSeparator: false }),

            teiIdSheet: i18n.t("TEI Id - Sheet"),
            teiIdColumn: i18n.t("TEI Id - Column"),
            teiOrgUnitSheet: i18n.t("TEI Organisation Unit - Sheet"),
            teiOrgUnitColumn: i18n.t("TEI Organisation Unit - Column"),
            teiGeometrySheet: i18n.t("TEI Geometry - Sheet"),
            teiGeometryColumn: i18n.t("TEI Geometry - Column"),
            teiEnrollmentDateSheet: i18n.t("TEI Enrolmment Date - Sheet"),
            teiEnrollmentDateColumn: i18n.t("TEI Enrolmment Date - Column"),
            teiIncidentDateSheet: i18n.t("TEI Incident Date - Sheet"),
            teiIncidentDateColumn: i18n.t("TEI Incident Date - Column"),
            teiAttributesSheet: i18n.t("TEI Attributes - Sheet"),
            teiAttributesRowStart: i18n.t("TEI Attributes - Row Start"),
            teiAttributesColumnStart: i18n.t("TEI Attributes - Column Start"),
            teiAttributeIdSheet: i18n.t("TEI Attribute ID - Sheet"),
            teiAttributeIdRow: i18n.t("TEI Attribute ID - Row"),
            teiRelRangeSheet: i18n.t("TEI Relationship Range - Sheet"),
            teiRelRangeRowStart: i18n.t("TEI Relationship Range - Row Start"),
            teiRelRangeColumnStart: i18n.t("TEI Relationship Range - Column Start"),
            teiRelRelationshipTypeSheet: i18n.t("TEI Relationship Type - Sheet"),
            teiRelRelationshipTypeCell: i18n.t("TEI Relationship Type - Cell"),
            teiRelFromSheet: i18n.t("TEI Relationship From - Sheet"),
            teiRelFromColumn: i18n.t("TEI Relationship From - Column"),
            teiRelToSheet: i18n.t("TEI Relationship To - Sheet"),
            teiRelToColumn: i18n.t("TEI Relationship To - Column"),
            teiEventEventIdSheet: i18n.t("TEI Event Event-Id - Sheet"),
            teiEventEventIdColumn: i18n.t("TEI Event Event-Id - Column"),
            teiEventTeiIdSheet: i18n.t("TEI Event TEI-Id - Sheet"),
            teiEventTeiIdColumn: i18n.t("TEI Event TEI-Id - Column"),
            teiEventCategoryOptionComboSheet: i18n.t("TEI Event Category Option Combo - Sheet"),
            teiEventCategoryOptionComboColumn: i18n.t("TEI Event Category Option Combo - Column"),
            teiEventDateSheet: i18n.t("TEI Event Date - Sheet"),
            teiEventDateColumn: i18n.t("TEI Event Date - Column"),
            teiEventProgramStageSheet: i18n.t("TEI Event Program Stage - Sheet"),
            teiEventProgramStageCell: i18n.t("TEI Event Program Stage - Cell"),
            teiEventDataElementsSheet: i18n.t("TEI Event Data Elements - Sheet"),
            teiEventDataElementsRowStart: i18n.t("TEI Event Data Elements - Row Start"),
            teiEventDataElementsRowEnd: i18n.t("TEI Event Data Elements - Row End"),
            teiEventDataElementsColumnStart: i18n.t("TEI Event Data Elements - Column Start"),
            teiEventDataValuesSheet: i18n.t("TEI Event Data Values - Sheet"),
            teiEventDataValuesRowStart: i18n.t("TEI Event Data Values - Row Start"),
            teiEventDataValuesColumnStart: i18n.t("TEI Event Data Values - Column Start"),

            dataSources: i18n.t("Data Source"),
            styleSources: i18n.t("Styles"),
        });
    }
}

/* Helpers */

type DataSourceColumnField =
    | "eventId"
    | "orgUnit"
    | "attribute"
    | "period"
    | "coordinatesLatitude"
    | "coordinatesLongitude"
    | "teiId"
    | "teiOrgUnit"
    | "teiGeometry"
    | "teiEnrollmentDate"
    | "teiIncidentDate"
    | "teiRelFrom"
    | "teiRelTo"
    | "teiEventTeiId"
    | "teiEventEventId"
    | "teiEventDate"
    | "teiEventCategoryOptionCombo";

function getColumnAttrs<Field extends DataSourceColumnField>(columnRef: SheetRef | ValueRef | undefined, field: Field) {
    if (columnRef?.type !== "column") return;

    const sheetField = (field + "Sheet") as `${typeof field}Sheet`;
    const columnField = (field + "Column") as `${typeof field}Column`;
    const attrs = { [sheetField]: columnRef.sheet.toString(), [columnField]: columnRef.ref };

    return attrs as Record<typeof sheetField | typeof columnField, string>;
}

type DataSourceRowField = "dataElement" | "categoryOption" | "teiAttributeId";

function getRowAttrs<Field extends DataSourceRowField>(rowRef: RowRef | ValueRef | undefined, field: Field) {
    if (rowRef?.type !== "row") return;

    const sheetField = (field + "Sheet") as `${typeof field}Sheet`;
    const columnField = (field + "Row") as `${typeof field}Row`;
    const attrs = { [sheetField]: rowRef.sheet.toString(), [columnField]: rowRef.ref };

    return attrs as Record<`${Field}Sheet`, string> & Record<`${Field}Row`, number>;
}

type DataSourceRangeField = "range" | "teiAttributes" | "teiRelRange" | "teiEventDataValues" | "teiEventDataElements";

function getRangeAttrs<Field extends DataSourceRangeField>(range: Range, field: Field) {
    const sheetField = (field + "Sheet") as `${Field}Sheet`;
    const rowStartField = (field + "RowStart") as `${Field}RowStart`;
    const rowEndField = (field + "RowEnd") as `${Field}RowEnd`;
    const columnStartField = (field + "ColumnStart") as `${Field}ColumnStart`;

    return {
        [sheetField]: range.sheet,
        [rowStartField]: range.rowStart,
        [rowEndField]: range.rowEnd,
        [columnStartField]: range.columnStart,
    } as Record<`${Field}RowStart`, number> &
        Record<`${Field}RowEnd`, number | undefined> &
        Record<`${Field}Sheet` | `${Field}ColumnStart`, string>;
}

type DataSourceCellField = "teiRelRelationshipType" | "teiEventProgramStage";

function getCellAttrs<Field extends DataSourceCellField>(range: CellRef, field: Field) {
    const sheetField = (field + "Sheet") as `${Field}Sheet`;
    const cellField = (field + "Cell") as `${Field}Cell`;

    return {
        [sheetField]: range.sheet,
        [cellField]: range.ref,
    } as Record<`${Field}Sheet` | `${Field}Cell`, string>;
}

//

function getDataSourceColumnAttrs<Field extends DataSourceColumnField>(
    viewModel: ValidViewModel,
    field: Field
): ColumnRef {
    const sheetField = (field + "Sheet") as `${Field}Sheet`;
    const columnField = (field + "Column") as `${Field}Column`;

    return {
        type: "column",
        sheet: viewModel[sheetField],
        ref: viewModel[columnField],
    };
}

function getDataSourceRangeAttrs<Field extends DataSourceRangeField>(viewModel: ValidViewModel, field: Field): Range {
    const sheetField = (field + "Sheet") as `${Field}Sheet`;
    const rowStartField = (field + "RowStart") as `${Field}RowStart`;
    const rowEndField = (field + "RowEnd") as `${Field}RowEnd`;
    const columnStartField = (field + "ColumnStart") as `${Field}ColumnStart`;

    return {
        sheet: viewModel[sheetField],
        rowStart: viewModel[rowStartField],
        rowEnd: viewModel[rowEndField as keyof ValidViewModel & `${string}RowEnd`],
        columnStart: viewModel[columnStartField],
    };
}

function getDataSourceRowAttrs<Field extends DataSourceRowField>(viewModel: ValidViewModel, field: Field): RowRef {
    const sheetField = (field + "Sheet") as `${Field}Sheet`;
    const rowField = (field + "Row") as `${Field}Row`;

    return {
        type: "row",
        sheet: viewModel[sheetField],
        ref: viewModel[rowField],
    };
}

function getDataSourceCellAttrs<Field extends DataSourceCellField>(viewModel: ValidViewModel, field: Field): CellRef {
    const sheetField = (field + "Sheet") as `${Field}Sheet`;
    const cellField = (field + "Cell") as `${Field}Cell`;
    return {
        type: "cell",
        sheet: viewModel[sheetField],
        ref: viewModel[cellField],
    };
}

//

async function getFile(file: CustomTemplate["file"]): Promise<File> {
    return fromBase64(file.contents, file.name);
}

function getFileFromTemplateField<T>(customTemplate: Template, name: string, obj: T[] | undefined): File {
    const json = JSON.stringify(obj || [], null, 4);
    const filename = `${customTemplate.name} - ${name}.json`;
    return new File([json], filename);
}

async function arrayFromFile<T>(file: File): Promise<T[]> {
    const contents = await getStringFromFile(file);
    const obj = JSON.parse(contents) || [];
    return obj as T[];
}

function findDataSourceByType<Type extends DataSourceValue["type"]>(
    dataSources: DataSource[] | undefined,
    type: Type
): Extract<DataSourceValue, { type: Type }> | undefined {
    return _(dataSources)
        .map(ds => {
            return "type" in ds && ds.type === type ? (ds as Extract<DataSourceValue, { type: Type }>) : null;
        })
        .compact()
        .first();
}
