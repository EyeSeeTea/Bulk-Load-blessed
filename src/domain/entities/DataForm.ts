import { Id } from "./ReferenceObject";

export type DataFormType = "dataSet" | "program" | "tracker";

export interface DataForm {
    type: DataFormType;
    id: Id;
    name: string;
    attributeValues: {
        attribute: { code: string };
        value: string;
    }[];
}
