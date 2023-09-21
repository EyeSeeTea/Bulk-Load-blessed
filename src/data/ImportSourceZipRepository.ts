import { ImportSource } from "../domain/entities/FileResource";
import { ImportSourceRepository } from "../domain/repositories/ImportSourceRepository";
import { extractImagesFromZip, getExcelOrThrow } from "./../utils/files";

export class ImportSourceZipRepository implements ImportSourceRepository {
    async import(file: File): Promise<ImportSource> {
        const excelFile = await getExcelOrThrow(file);
        const images = await extractImagesFromZip(file);

        return {
            images,
            spreadSheet: excelFile,
        };
    }
}
