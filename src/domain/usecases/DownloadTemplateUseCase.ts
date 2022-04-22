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
import { Id } from "../entities/ReferenceObject";
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
                startDate: populateStartDate?.toDate(),
                endDate: populateEndDate?.toDate(),
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
                  translateCodes: template.type !== "custom",
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
    downloadRelationships,
    relationshipsOuFilter,
}: {
    element: any;
    api: D2Api;
    orgUnitIds: string[];
    startDate?: Date;
    endDate?: Date;
    downloadRelationships: boolean;
    relationshipsOuFilter?: RelationshipOrgUnitFilter;
}) {
    const elementMetadata = new Map();
    const endpoint = element.type === "dataSets" ? "dataSets" : "programs";
    const rawMetadata = await api.get(`/${endpoint}/${element.id}/metadata.json`).getData();
    _.forOwn(rawMetadata, (value, type) => {
        if (Array.isArray(value)) {
            _.forEach(value, (object: any) => {
                if (object.id) elementMetadata.set(object.id, { ...object, type });
            });
        }
    });

    // FIXME: This is needed for getting all possible org units for a program/dataSet
    const requestOrgUnits =
        relationshipsOuFilter === "DESCENDANTS" || relationshipsOuFilter === "CHILDREN"
            ? elementMetadata.get(element.id)?.organisationUnits?.map(({ id }: { id: string }) => id) ?? orgUnitIds
            : orgUnitIds;

    const responses = await promiseMap(_.chunk(_.uniq(requestOrgUnits), 400), orgUnits =>
        api
            .get<{ organisationUnits: { id: string; displayName: string; translations: unknown }[] }>("/metadata", {
                fields: "id,displayName,translations",
                filter: `id:in:[${orgUnits}]`,
            })
            .getData()
    );

    const organisationUnits = _.flatMap(responses, ({ organisationUnits }) => organisationUnits);
    const metadata =
        element.type === "trackerPrograms" && downloadRelationships
            ? await getRelationshipMetadata(element, api, {
                  organisationUnits,
                  startDate,
                  endDate,
                  ouMode: relationshipsOuFilter,
              })
            : {};

    return { element, metadata, elementMetadata, organisationUnits, rawMetadata };
}
