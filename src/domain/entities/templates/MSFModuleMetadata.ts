import { NamedRef } from "../ReferenceObject";

export interface MSFModuleMetadata {
    dataSet: NamedRef;
}

export interface DataElement extends NamedRef {
    categoryCombo: CategoryCombo;
}

export interface CategoryCombo extends NamedRef {
    categoryOptionCombos: NamedRef[];
}
