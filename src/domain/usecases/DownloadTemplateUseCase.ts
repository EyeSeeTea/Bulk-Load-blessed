import { saveAs } from "file-saver";
import fs from "fs";
import _ from "lodash";
import { Moment } from "moment";
import { UseCase } from "../../CompositionRoot";
import { getRelationshipMetadata, RelationshipOrgUnitFilter } from "../../data/Dhis2RelationshipTypes";
import i18n from "../../locales";
import { D2Api } from "../../types/d2-api";
import { promiseMap } from "../../utils/promises";
import Settings from "../../webapp/logic/settings";
import { getGeneratedTemplateId, SheetBuilder } from "../../webapp/logic/sheetBuilder";
import { DataFormType } from "../entities/DataForm";
import { Id, Ref } from "../entities/ReferenceObject";
import { TemplateType } from "../entities/Template";
import { ExcelBuilder } from "../helpers/ExcelBuilder";
import { ExcelRepository } from "../repositories/ExcelRepository";
import { InstanceRepository } from "../repositories/InstanceRepository";
import { TemplateRepository } from "../repositories/TemplateRepository";

export interface DownloadTemplateProps {
    type: DataFormType;
    id: Id;
    language: string;
    orgUnits?: string[];
    theme?: Id;
    startDate?: Moment;
    endDate?: Moment;
    populate: boolean;
    populateStartDate?: Moment;
    populateEndDate?: Moment;
    writeFile?: string;
    settings: Settings;
    downloadRelationships: boolean;
    filterTEIEnrollmentDate?: boolean;
    relationshipsOuFilter?: RelationshipOrgUnitFilter;
    templateId?: string;
    templateType?: TemplateType;
    splitDataEntryTabsBySection: boolean;
    useCodesForMetadata: boolean;
}

export class DownloadTemplateUseCase implements UseCase {
    constructor(
        private instanceRepository: InstanceRepository,
        private templateRepository: TemplateRepository,
        private excelRepository: ExcelRepository
    ) {}

    public async execute(
        api: D2Api,
        {
            type,
            id,
            theme: themeId,
            orgUnits = [],
            startDate,
            endDate,
            language,
            populate,
            populateStartDate,
            populateEndDate,
            writeFile,
            settings,
            downloadRelationships,
            filterTEIEnrollmentDate,
            relationshipsOuFilter,
            templateId: customTemplateId,
            templateType,
            splitDataEntryTabsBySection,
            useCodesForMetadata,
        }: DownloadTemplateProps
    ): Promise<void> {
        i18n.setDefaultNamespace("bulk-load");
        const templateId =
            templateType === "custom" && customTemplateId ? customTemplateId : getGeneratedTemplateId(type);
        const template = await this.templateRepository.getTemplate(templateId);

        const theme = themeId ? await this.templateRepository.getTheme(themeId) : undefined;

        const element = await getElement(api, type, id);
        const name = element.displayName ?? element.name;

        if (template.type === "custom") {
            await this.excelRepository.loadTemplate({
                type: "file-base64",
                contents: template.file.contents,
                templateId: template.id,
            });
        } else {
            const result = await getElementMetadata({
                api,
                element,
                downloadRelationships,
                orgUnitIds: orgUnits,
                startDate: startDate?.toDate(),
                endDate: endDate?.toDate(),
                populateStartDate: populateStartDate?.toDate(),
                populateEndDate: populateEndDate?.toDate(),
                relationshipsOuFilter,
            });

            // FIXME: Legacy code, sheet generator
            const sheetBuilder = new SheetBuilder({
                ...result,
                startDate,
                endDate,
                language,
                theme,
                template,
                settings,
                downloadRelationships,
                splitDataEntryTabsBySection,
                useCodesForMetadata,
            });
            const workbook = await sheetBuilder.generate();

            const file = await workbook.writeToBuffer();

            await this.excelRepository.loadTemplate({ type: "file", file });
        }

        const enablePopulate = populate && !!populateStartDate && !!populateEndDate;

        const dataPackage = enablePopulate
            ? await this.instanceRepository.getDataPackage({
                  type,
                  id,
                  orgUnits,
                  startDate: populateStartDate,
                  endDate: populateEndDate,
                  filterTEIEnrollmentDate,
                  relationshipsOuFilter,
              })
            : undefined;

        const builder = new ExcelBuilder(this.excelRepository, this.instanceRepository);
        await builder.templateCustomization(template, { populate, dataPackage, orgUnits });

        if (theme) await builder.applyTheme(template, theme);

        if (enablePopulate && dataPackage) {
            if (template.type === "custom" && template.fixedOrgUnit) {
                await this.excelRepository.writeCell(
                    template.id,
                    template.fixedOrgUnit,
                    dataPackage.dataEntries[0]?.orgUnit ?? ""
                );
            }

            if (template.type === "custom" && template.fixedPeriod) {
                await this.excelRepository.writeCell(
                    template.id,
                    template.fixedPeriod,
                    dataPackage.dataEntries[0]?.period ?? ""
                );
            }

            await builder.populateTemplate(template, dataPackage, settings);
        }

        const filename = `${name}.xlsx`;

        if (writeFile) {
            const buffer = await this.excelRepository.toBuffer(templateId);
            fs.writeFileSync(writeFile, buffer);
        } else {
            const data = await this.excelRepository.toBlob(templateId);
            saveAs(data, filename);
        }
    }
}

async function getElement(api: D2Api, type: DataFormType, id: string) {
    const endpoint = type === "dataSets" ? "dataSets" : "programs";
    const fields = [
        "id",
        "displayName",
        "organisationUnits[id,path]",
        "attributeValues[attribute[code],value]",
        "categoryCombo",
        "dataSetElements",
        "formType",
        "sections[id,sortOrder,dataElements[id]]",
        "periodType",
        "programStages[id,access]",
        "programType",
        "enrollmentDateLabel",
        "incidentDateLabel",
        "trackedEntityType[id,featureType]",
        "captureCoordinates",
        "programTrackedEntityAttributes[trackedEntityAttribute[id,name,valueType,confidential,optionSet[id,name,options[id]]]],",
    ].join(",");
    const response = await api.get<any>(`/${endpoint}/${id}`, { fields }).getData();
    return { ...response, type };
}

async function getElementMetadata({
    element,
    api,
    orgUnitIds,
    startDate,
    endDate,
    populateStartDate,
    populateEndDate,
    downloadRelationships,
    relationshipsOuFilter,
}: {
    element: any;
    api: D2Api;
    orgUnitIds: string[];
    startDate: Date | undefined;
    endDate: Date | undefined;
    populateStartDate?: Date;
    populateEndDate?: Date;
    downloadRelationships: boolean;
    relationshipsOuFilter?: RelationshipOrgUnitFilter;
}) {
    const elementMetadataMap = new Map();
    const endpoint = element.type === "dataSets" ? "dataSets" : "programs";
    const elementMetadata = await api.get<ElementMetadata>(`/${endpoint}/${element.id}/metadata.json`).getData();

    const rawMetadata = await filterRawMetadata({ api, element, elementMetadata, orgUnitIds, startDate, endDate });

    _.forOwn(rawMetadata, (value, type) => {
        if (Array.isArray(value)) {
            _.forEach(value, (object: any) => {
                if (object.id) elementMetadataMap.set(object.id, { ...object, type });
            });
        }
    });

    // FIXME: This is needed for getting all possible org units for a program/dataSet
    const requestOrgUnits =
        relationshipsOuFilter === "DESCENDANTS" || relationshipsOuFilter === "CHILDREN"
            ? elementMetadataMap.get(element.id)?.organisationUnits?.map(({ id }: { id: string }) => id) ?? orgUnitIds
            : orgUnitIds;

    const responses = await promiseMap(_.chunk(_.uniq(requestOrgUnits), 400), orgUnits =>
        api
            .get<{ organisationUnits: { id: string; displayName: string; code?: string; translations: unknown }[] }>(
                "/metadata",
                {
                    fields: "id,displayName,code,translations",
                    filter: `id:in:[${orgUnits}]`,
                }
            )
            .getData()
    );

    const organisationUnits = _.flatMap(responses, ({ organisationUnits }) =>
        organisationUnits.map(orgUnit => ({
            type: "organisationUnits",
            ...orgUnit,
        }))
    );

    const metadata =
        element.type === "trackerPrograms" && downloadRelationships
            ? await getRelationshipMetadata(element, api, {
                  organisationUnits,
                  startDate: populateStartDate,
                  endDate: populateEndDate,
                  ouMode: relationshipsOuFilter,
              })
            : {};

    return { element, metadata, elementMetadata: elementMetadataMap, organisationUnits, rawMetadata };
}

interface ElementMetadata {
    categoryOptionCombos: CategoryOptionCombo[];
}

interface CategoryOptionCombo {
    categoryOptions: Ref[];
}

interface Element {
    type: "dataSets" | "programs";
    organisationUnits: Ref[];
}

/* Return the raw metadata filtering out non-relevant category option combos.

    /api/dataSets/ID/metadata returns categoryOptionCombos that may not be relevant for the
    data set. Here we filter out category option combos with categoryOptions not matching these
    conditions:

     - categoryOption.startDate/endDate outside the startDate -> endDate interval
     - categoryOption.orgUnit EMPTY or assigned to the dataSet orgUnits (intersected with the requested).
*/

async function filterRawMetadata(options: {
    api: D2Api;
    element: Element;
    elementMetadata: ElementMetadata;
    orgUnitIds: Id[];
    startDate: Date | undefined;
    endDate: Date | undefined;
}): Promise<ElementMetadata & unknown> {
    const { api, element, elementMetadata, orgUnitIds } = options;

    if (element.type === "dataSets") {
        const categoryOptions = await getCategoryOptions(api);
        const categoryOptionIdsToInclude = getCategoryOptionIdsToInclude(element, orgUnitIds, categoryOptions, options);

        const categoryOptionCombosFiltered = elementMetadata.categoryOptionCombos.filter(coc =>
            _(coc.categoryOptions).every(categoryOption => {
                return categoryOptionIdsToInclude.has(categoryOption.id);
            })
        );

        return { ...elementMetadata, categoryOptionCombos: categoryOptionCombosFiltered };
    } else {
        return elementMetadata;
    }
}

interface CategoryOption {
    id: Id;
    startDate?: string;
    endDate?: String;
    organisationUnits: Ref[];
}

function getCategoryOptionIdsToInclude(
    element: Element,
    orgUnitIds: string[],
    categoryOptions: CategoryOption[],
    options: { startDate: Date | undefined; endDate: Date | undefined }
) {
    const dataSetOrgUnitIds = element.organisationUnits.map(ou => ou.id);

    const orgUnitIdsToInclude = new Set(
        _.isEmpty(orgUnitIds) ? dataSetOrgUnitIds : _.intersection(orgUnitIds, dataSetOrgUnitIds)
    );

    const startDate = options.startDate?.toISOString();
    const endDate = options.endDate?.toISOString();

    const categoryOptionIdsToInclude = new Set(
        categoryOptions
            .filter(categoryOption => {
                const noStartDateIntersect = startDate && categoryOption.endDate && startDate > categoryOption.endDate;
                const noEndDateIntersect = endDate && categoryOption.startDate && endDate < categoryOption.startDate;
                const dateCondition = !noStartDateIntersect && !noEndDateIntersect;

                const categoryOptionOrgUnitCondition =
                    _.isEmpty(categoryOption.organisationUnits) ||
                    _(categoryOption.organisationUnits).some(orgUnit => orgUnitIdsToInclude.has(orgUnit.id));

                return dateCondition && categoryOptionOrgUnitCondition;
            })
            .map(categoryOption => categoryOption.id)
    );
    return categoryOptionIdsToInclude;
}

async function getCategoryOptions(api: D2Api): Promise<CategoryOption[]> {
    const { categoryOptions } = await api.metadata
        .get({
            categoryOptions: {
                fields: {
                    id: true,
                    startDate: true,
                    endDate: true,
                    organisationUnits: { id: true },
                },
            },
        })
        .getData();

    return categoryOptions;
}
