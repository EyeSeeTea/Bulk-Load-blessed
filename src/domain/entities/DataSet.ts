import { D2DataSetSchema, SelectedPick } from "d2-api";

export const DataSetFields = {
    id: true,
    name: true,
    code: true,
    dataSetElements: {
        dataElement: {
            id: true,
            name: true,
            valueType: true,
            zeroIsSignificant: true,
            optionSet: {
                id: true,
                options: {
                    id: true,
                    name: true,
                    code: true,
                },
            },
        },
        categoryCombo: {
            id: true,
            name: true,
            categoryOptionCombos: {
                id: true,
                name: true,
            },
        },
    },
} as const;

export type DataSet = SelectedPick<D2DataSetSchema, typeof DataSetFields>;
