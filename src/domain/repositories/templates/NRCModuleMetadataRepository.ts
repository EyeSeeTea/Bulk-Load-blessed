import { Id } from "../../entities/ReferenceObject";
import { NRCModuleMetadata } from "../../entities/templates/NRCModuleMetadata";

export interface NRCModuleMetadataRepository {
    get(options: { dataSetId: Id }): Promise<NRCModuleMetadata>;
}
