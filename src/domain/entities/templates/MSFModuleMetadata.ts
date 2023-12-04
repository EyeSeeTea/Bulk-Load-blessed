import { NamedRef, Ref } from "../ReferenceObject";

export interface MSFModuleMetadata {
    dataSet: DataSet;
    categoryOptionCombos: CategoryOptionCombo[];
}

export interface DataSet extends NamedRef {
    description: string;
    dataSetElements: { dataElement: DataElement; categoryCombo: CategoryCombo }[];
    sections: DataSetSection[];
}

export interface DataElement extends NamedRef {}

export interface CategoryCombo extends NamedRef {
    categories: Category[];
}

export interface Category extends NamedRef {
    categoryOptions: CategoryOption[];
}

export interface CategoryOption extends NamedRef {}

export interface DataSetSection extends NamedRef {
    dataElements: Pick<DataElement, "id" | "name">[];
}

export interface CategoryOptionCombo extends Ref {
    categoryOptions: CategoryOption[];
}
