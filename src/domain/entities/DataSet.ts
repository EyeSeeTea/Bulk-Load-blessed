import { D2DataSetSchema, SelectedPick } from "d2-api";

const include = true as const;

export const DataSetFields = {
    id: include,
    name: include,
    code: include,
    dataSetElements: {
        dataElement: {
            id: include,
            name: include,
            valueType: include,
            zeroIsSignificant: include,
            optionSet: {
                id: include,
                options: {
                    id: include,
                    name: include,
                    code: include,
                },
            },
        },
        categoryCombo: {
            id: include,
            name: include,
            categoryOptionCombos: {
                id: include,
                name: include,
            },
        },
    },
};

export type DataSet = SelectedPick<D2DataSetSchema, typeof DataSetFields>;
