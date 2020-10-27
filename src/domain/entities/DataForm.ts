import { Id } from "./ReferenceObject";

export type DataFormType = "dataSets" | "programs" | "trackerPrograms";
export type DataFormPeriod = "Daily" | "Monthly" | "Yearly" | "Weekly";

export interface DataForm {
    type: DataFormType;
    id: Id;
    name: string;
    periodType?: DataFormPeriod;
    dataElements: {
        id: Id;
        name: string;
    }[];
    attributeValues: {
        attribute: { code: string };
        value: string;
    }[];
    readAccess: boolean;
    writeAccess: boolean;
}
