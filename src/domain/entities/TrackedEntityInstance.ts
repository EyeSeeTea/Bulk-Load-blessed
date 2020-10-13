import { Id, Ref } from "./ReferenceObject";

export interface TrackedEntityInstance {
    program: Program;
    id: Id;
    orgUnit: Ref;
    disabled: boolean;
    attributeValues: AttributeValue[];
    enrollment: Enrollment | undefined;
}

export interface Enrollment {
    date: string;
}

export interface AttributeValue {
    id: Id;
    valueType: string;
    value: string;
}

export interface Program {
    id: Id;
    attributes: Attribute[];
}

export interface Attribute {
    id: Id;
    name: string;
}
