import { D2Api, MetadataPick } from "@eyeseetea/d2-api/2.33";
import { Id } from "../../../domain/entities/ReferenceObject";
import { MSFModuleMetadata } from "../../../domain/entities/templates/MSFModuleMetadata";
import { MSFModuleMetadataRepository } from "../../../domain/repositories/templates/MSFModuleMetadataRepository";

export class MSFModuleMetadataD2Repository implements MSFModuleMetadataRepository {
    constructor(private api: D2Api) {}

    async get(options: { dataSetId: Id }): Promise<MSFModuleMetadata> {
        const dataSet = await this.getDataSet(options);

        return {
            dataSet: dataSet,
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
        } else if (!dataSet.code) {
            throw new Error(`Data set has no code, it's required to get the project category option`);
        } else {
            return dataSet;
        }
    }
}

const dataSetFields = {
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
    sections: { greyedFields: { dataElement: { id: true }, categoryOptionCombo: { id: true } } },
} as const;

type D2DataSet = MetadataPick<{ dataSets: { fields: typeof dataSetFields } }>["dataSets"][number];
