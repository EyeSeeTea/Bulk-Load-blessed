import { Id } from "./ReferenceObject";

export type FileResource = {
    id: Id;
    name: string;
    data: Blob;
};

export type ImportSource = { spreadSheet: Blob; images: FileResource[] };
