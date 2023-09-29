import { ImportSource } from "../domain/entities/FileResource";
import { ImportSourceRepository } from "../domain/repositories/ImportSourceRepository";

export class ImportSourceNodeRepository implements ImportSourceRepository {
    async import(blob: Blob): Promise<ImportSource> {
        return { images: [], spreadSheet: blob };
    }
}
