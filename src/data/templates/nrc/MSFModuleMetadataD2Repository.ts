import { D2Api, MetadataPick } from "@eyeseetea/d2-api/2.33";
import { Id } from "../../../domain/entities/ReferenceObject";
import { CategoryOptionCombo, MSFModuleMetadata } from "../../../domain/entities/templates/MSFModuleMetadata";
import { MSFModuleMetadataRepository } from "../../../domain/repositories/templates/MSFModuleMetadataRepository";
import { promiseMap } from "../../../utils/promises";

export class MSFModuleMetadataD2Repository implements MSFModuleMetadataRepository {
    constructor(private api: D2Api) {}

    async get(options: { dataSetId: Id; catOptionCombinationIds: Id[] }): Promise<MSFModuleMetadata> {
        const d2DataSet = await this.getDataSet(options);
        const cagegoryOptionCombos = await this.getAllCategoryOptionCombos(options.catOptionCombinationIds);

        return {
            dataSet: {
                id: d2DataSet.id,
                name: d2DataSet.displayName,
                dataSetElements: d2DataSet.dataSetElements.map(d2SetElement => {
                    const categoryCombo = d2SetElement.categoryCombo
                        ? d2SetElement.categoryCombo
                        : d2SetElement.dataElement.categoryCombo;
                    return {
                        dataElement: {
                            id: d2SetElement.dataElement.id,
                            name: d2SetElement.dataElement.displayName,
                        },
                        categoryCombo: {
                            id: categoryCombo.id,
                            name: categoryCombo.displayName,
                            categories: categoryCombo.categories.map(d2Category => {
                                return {
                                    id: d2Category.id,
                                    name: d2Category.displayName,
                                    categoryOptions: d2Category.categoryOptions.map(d2CatOption => {
                                        return {
                                            id: d2CatOption.id,
                                            name: d2CatOption.displayName,
                                        };
                                    }),
                                };
                            }),
                        },
                    };
                }),
                sections: d2DataSet.sections.map(d2Section => {
                    return {
                        id: d2Section.id,
                        name: d2Section.displayName,
                        dataElements: d2Section.dataElements.map(d2SectionDe => {
                            return {
                                id: d2SectionDe.id,
                                name: d2SectionDe.displayName,
                            };
                        }),
                    };
                }),
            },
            categoryOptionCombos: cagegoryOptionCombos,
        };
    }

    private async getDataSet(options: { dataSetId: Id }): Promise<D2DataSet> {
        const { dataSets } = await this.api.metadata
            .get({
                dataSets: {
                    fields: dataSetFields,
                    filter: { id: { eq: options.dataSetId } },
                },
            })
            .getData();

        const dataSet = dataSets[0];

        if (!dataSet) {
            throw new Error(`Data set not found: ${options.dataSetId}`);
        } else {
            return dataSet;
        }
    }

    private async getAllCategoryOptionCombos(ids: Id[]): Promise<CategoryOptionCombo[]> {
        const result = await promiseMap(_.chunk(ids, 100), catOptionCombosIds => {
            return this.getPaginatedCategoryOptionCombos(catOptionCombosIds, 1, []);
        });
        return result.flat();
    }

    private async getPaginatedCategoryOptionCombos(
        ids: Id[],
        page: number,
        acum: CategoryOptionCombo[]
    ): Promise<CategoryOptionCombo[]> {
        const d2Response = await this.getCategoryOptionCombos(ids, page);
        const catOptionCombos = d2Response.objects.map(d2CatOptionCombo => {
            return {
                id: d2CatOptionCombo.id,
                name: d2CatOptionCombo.name,
                categoryOptions: d2CatOptionCombo.categoryOptions.map(d2CatOption => {
                    return {
                        id: d2CatOption.id,
                        name: d2CatOption.name,
                    };
                }),
            };
        });
        const newRecords = [...acum, ...catOptionCombos];
        if (d2Response.pager.page >= d2Response.pager.pageCount) {
            return newRecords;
        } else {
            return this.getPaginatedCategoryOptionCombos(ids, d2Response.pager.page + 1, newRecords);
        }
    }

    private async getCategoryOptionCombos(ids: Id[], page: number) {
        const response = await this.api.models.categoryOptionCombos
            .get({
                fields: {
                    id: true,
                    name: true,
                    categoryOptions: {
                        id: true,
                        name: true,
                    },
                },
                filter: {
                    id: {
                        in: ids,
                    },
                },
                page,
                pageSize: 100,
            })
            .getData();

        return response;
    }
}

const categoryComboFields = {
    id: true,
    displayName: true,
    categories: {
        id: true,
        displayName: true,
        categoryOptions: { id: true, displayName: true },
    },
};

const dataSetFields = {
    id: true,
    displayName: true,
    dataSetElements: {
        dataElement: {
            id: true,
            displayName: true,
            categoryCombo: categoryComboFields,
        },
        categoryCombo: categoryComboFields,
    },
    sections: {
        id: true,
        displayName: true,
        dataElements: {
            id: true,
            displayName: true,
        },
    },
} as const;

type D2DataSet = MetadataPick<{ dataSets: { fields: typeof dataSetFields } }>["dataSets"][number];
