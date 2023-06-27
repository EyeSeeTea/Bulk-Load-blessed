import { Id } from "./ReferenceObject";

export type FileResource = {
    id: Id;
    name: string;
    data: Blob;
};
