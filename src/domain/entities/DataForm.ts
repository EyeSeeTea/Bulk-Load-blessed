import { Id } from "./ReferenceObject";

export type DataFormType = "dataSet" | "program" | "tracker";

export interface DataForm {
    type: DataFormType;
    id: Id;
    name: string;
    periodType?: "Daily" | "Monthly" | "Yearly" | "Weekly";
    attributeValues: {
        attribute: { code: string };
        value: string;
    }[];
    readAccess: boolean;
    writeAccess: boolean;
}
