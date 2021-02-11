import { Id } from "./ReferenceObject";

export type DataFormType = "dataSets" | "programs" | "trackerPrograms";
export type DataFormPeriod = "Daily" | "Monthly" | "Yearly" | "Weekly";

export interface DataForm {
    type: DataFormType;
    id: Id;
    name: string;
    periodType?: DataFormPeriod;
    dataElements: DataElement[];
    organisationUnits: OrganisationUnit[];
    sections?: {
        id: Id;
        name: string;
        dataElements: DataElement[];
    }[];
    attributeValues: {
        attribute: { code: string };
        value: string;
    }[];
    readAccess: boolean;
    writeAccess: boolean;
}

export interface DataElement {
    id: Id;
    name: string;
    categoryOptionCombos?: {
        id: Id;
        name: string;
    }[];
}

export interface OrganisationUnit {
    id: Id;
    name: string;
    path: string;
}
