import { Id } from "./ReferenceObject";

export interface Relationship {
    id?: Id;
    typeId: Id;
    typeName: string;
    fromId: Id;
    toId: Id;
}

export interface RelationshipType {
    id: Id;
    name: string;
}
