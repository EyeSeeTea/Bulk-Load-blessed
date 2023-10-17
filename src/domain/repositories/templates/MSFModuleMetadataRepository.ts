import { Id } from "../../entities/ReferenceObject";
import { MSFModuleMetadata } from "../../entities/templates/MSFModuleMetadata";

export interface MSFModuleMetadataRepository {
    get(options: { dataSetId: Id; catOptionCombinationIds: Id[] }): Promise<MSFModuleMetadata>;
}
