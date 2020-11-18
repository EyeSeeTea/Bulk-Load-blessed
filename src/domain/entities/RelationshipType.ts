import { Id, Ref } from "./ReferenceObject";

export interface RelationshipType {
    id: Id;
    name: string;
    constraints: {
        from: RelationshipConstraint;
        to: RelationshipConstraint;
    };
}

export interface RelationshipConstraint {
    name: string;
    program?: Ref;
    teis: Ref[];
}
