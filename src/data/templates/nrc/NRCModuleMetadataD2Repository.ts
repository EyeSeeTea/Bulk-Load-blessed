import _ from "lodash";
import { D2Api } from "@eyeseetea/d2-api/2.33";
import { Id } from "../../../domain/entities/ReferenceObject";
import { DataElement, NRCModuleMetadata } from "../../../domain/entities/templates/NRCModuleMetadata";
import { NRCModuleMetadataRepository } from "../../../domain/repositories/templates/NRCModuleMetadataRepository";

export class NRCModuleMetadataD2Repository implements NRCModuleMetadataRepository {
    constructor(private api: D2Api) {}

    async get(options: { dataSetId: Id }): Promise<NRCModuleMetadata> {
        const { dataSets } = await this.api.metadata
            .get({
                dataSets: {
                    fields: {
                        id: true,
                        name: true,
                        code: true,
                        categoryCombo: { id: true, categories: { id: true, code: true } },
                        dataSetElements: {
                            dataElement: { id: true, name: true, categoryCombo: { id: true } },
                            categoryCombo: { id: true },
                        },
                        organisationUnits: { id: true, name: true },
                        dataInputPeriods: { period: { id: true } },
                    },
                    filter: { id: { eq: options.dataSetId } },
                },
            })
            .getData();

        const dataSet = dataSets[0];
        if (!dataSet) throw new Error(`Data set not found: ${options.dataSetId}`);
        if (!dataSet.code) throw new Error(`Data set has no code`);
        const categoryOptionPrefix = dataSet.code.replace(/Data Set$/, "").trim();

        const res2 = await this.api.metadata
            .get({
                categoryOptions: {
                    fields: { id: true, name: true },
                    filter: { code: { $like: categoryOptionPrefix } },
                },
            })
            .getData();

        const projectCategoryCombo = res2.categoryOptions[0];
        if (!projectCategoryCombo)
            throw new Error(`Project category combo not found: code:$like:${categoryOptionPrefix}}`);

        const categoryCodes = ["GL_CORECOMP_CATCOMBO", "GL_Actual_Targets"];

        const { categories } = await this.api.metadata
            .get({
                categories: {
                    fields: { id: true, code: true, categoryOptions: { id: true, name: true } },
                    filter: { code: { in: categoryCodes } },
                },
            })
            .getData();

        const categoriesByCode = _.keyBy(categories, category => category.code);

        const categoryOptions = {
            project: [projectCategoryCombo],
            phasesOfEmergency: categoriesByCode["GL_CORECOMP_CATCOMBO"]?.categoryOptions || [],
            targetActual: categoriesByCode["GL_Actual_Targets"]?.categoryOptions || [],
        };

        const { categoryOptionCombos } = await this.api.metadata
            .get({
                categoryOptionCombos: {
                    fields: { id: true, name: true, categoryOptions: { id: true } },
                    filter: {
                        "categoryOptions.id": { eq: projectCategoryCombo.id },
                        "categoryCombo.code": { eq: "GL_CATBOMBO_ProjectCCTarAct" },
                    },
                },
            })
            .getData();

        const dataElements = dataSet.dataSetElements.map(dse => dse.dataElement);
        const categoryComboByDataElement = _.keyBy(dataElements, dataElement => dataElement.id);
        const categoryCombosFromDataElements = _(dataSet.dataSetElements)
            .map(dse => {
                return dse.categoryCombo || categoryComboByDataElement[dse.dataElement.id]?.categoryCombo;
            })
            .compact()
            .value();

        const categoryComboIds = _(categoryCombosFromDataElements)
            .map(o => o.id)
            .uniq()
            .value();

        const { categoryCombos } = await this.api.metadata
            .get({
                categoryCombos: {
                    fields: { id: true, name: true, categoryOptionCombos: { id: true, name: true } },
                    filter: { id: { in: categoryComboIds } },
                },
            })
            .getData();

        const categoryCombosById = _.keyBy(categoryCombos, cc => cc.id);
        const dataElementsById = _.keyBy(dataElements, cc => cc.id);

        const dataElementsWithDisaggregation = _(dataSet.dataSetElements)
            .map((dse): DataElement | undefined => {
                const dataElement = dataElementsById[dse.dataElement.id];
                const categoryComboRef =
                    dse.categoryCombo || categoryComboByDataElement[dse.dataElement.id]?.categoryCombo;
                if (!dataElement || !categoryComboRef) return undefined;
                const categoryCombo = categoryCombosById[categoryComboRef.id];
                if (!categoryCombo) return undefined;
                return { ...dataElement, categoryCombo };
            })
            .compact()
            .value();

        return {
            dataSet: dataSet,
            dataElements: dataElementsWithDisaggregation,
            organisationUnits: dataSet.organisationUnits,
            periods: dataSet.dataInputPeriods.map(dip => ({ id: dip.period.id, name: dip.period.id })),
            categoryCombo: {
                categories: {
                    project: { categoryOption: projectCategoryCombo },
                    phasesOfEmergency: { categoryOptions: categoryOptions.phasesOfEmergency },
                    targetActual: { categoryOptions: categoryOptions.targetActual },
                },
                categoryOptionCombos: categoryOptionCombos,
            },
        };
    }
}
