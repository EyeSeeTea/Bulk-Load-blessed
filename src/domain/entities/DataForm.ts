import { Id, NamedRef } from "./ReferenceObject";

export type DataFormType = "dataSets" | "programs" | "trackerPrograms";
export type DataFormPeriod = "Daily" | "Monthly" | "Yearly" | "Weekly";

export interface DataForm {
    type: DataFormType;
    id: Id;
    name: string;
    periodType?: DataFormPeriod;
    dataElements: DataElement[];
    sections: {
        id: Id;
        name: string;
        dataElements: DataElement[];
        repeatable: boolean;
    }[];
    attributeValues: {
        attribute: { code: string };
        value: string;
    }[]; // Only used for versioning, is really being used by any client?
    teiAttributes?: NamedRef[];
    trackedEntityType?: TrackedEntityType;
    readAccess: boolean;
    writeAccess: boolean;
}

export interface TrackedEntityType {
    id: Id;
    featureType: TrackedEntityTypeFeatureType;
}

export type TrackedEntityTypeFeatureType = "none" | "point" | "polygon";

export interface DataElement {
    id: Id;
    name: string;
    valueType: DataElementType;
    categoryOptionCombos?: Array<{ id: Id; name: string }>;
    options: Array<{ id: Id; code: string }>;
}

export type DataElementType =
    | "TEXT"
    | "LONG_TEXT"
    | "LETTER"
    | "PHONE_NUMBER"
    | "EMAIL"
    | "BOOLEAN"
    | "TRUE_ONLY"
    | "DATE"
    | "DATETIME"
    | "TIME"
    | "NUMBER"
    | "UNIT_INTERVAL"
    | "PERCENTAGE"
    | "INTEGER"
    | "INTEGER_POSITIVE"
    | "INTEGER_NEGATIVE"
    | "INTEGER_ZERO_OR_POSITIVE"
    | "TRACKER_ASSOCIATE"
    | "USERNAME"
    | "COORDINATE"
    | "ORGANISATION_UNIT"
    | "AGE"
    | "URL"
    | "FILE_RESOURCE"
    | "IMAGE";

export interface OrganisationUnit {
    id: Id;
    name: string;
    path: string;
}
