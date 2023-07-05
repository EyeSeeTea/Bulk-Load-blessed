import { ImportSource } from "../entities/FileResource";

export interface ImportSourceRepository {
    import(file: File): Promise<ImportSource>;
}
