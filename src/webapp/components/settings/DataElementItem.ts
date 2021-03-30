import _ from "lodash";
import {
    DataElementDisaggregated,
    DataElementDisaggregatedId,
    getDataElementDisaggregatedId,
} from "../../../domain/entities/DataElementDisaggregated";
import { DataForm } from "../../../domain/entities/DataForm";
import { NamedRef } from "../../../domain/entities/ReferenceObject";
import i18n from "../../../locales";

type DataSet = DataForm;

export interface DataElementItem {
    id: string;
    name: string;
    hasDefaultDisaggregation: boolean;
    categoryOptionCombo?: NamedRef;
}

export interface DataElementOption {
    value: DataElementDisaggregatedId;
    text: string;
}

export function getDataElementItems(dataSet: DataSet | undefined): DataElementItem[] {
    const dataElements = dataSet ? dataSet.dataElements : [];

    return _.flatMap(dataElements, dataElement => {
        const categoryOptionCombos = dataElement.categoryOptionCombos || [];
        const hasDefaultDisaggregation =
            categoryOptionCombos.length === 1 && categoryOptionCombos[0]?.name === "default";
        const mainDataElement: DataElementItem = { ...dataElement, hasDefaultDisaggregation };
        const disaggregatedDataElements: DataElementItem[] = _(categoryOptionCombos)
            .map(coc => ({ ...dataElement, categoryOptionCombo: coc, hasDefaultDisaggregation }))
            .sortBy(de => de.categoryOptionCombo.name)
            .value();

        return [mainDataElement, ...(hasDefaultDisaggregation ? [] : disaggregatedDataElements)];
    });
}

export function getDataElementDisaggregatedFromItem(de: DataElementItem): DataElementDisaggregated {
    const categoryOptionCombo = de.categoryOptionCombo;
    return categoryOptionCombo ? { id: de.id, categoryOptionComboId: categoryOptionCombo.id } : { id: de.id };
}

export function getMultiSelectorDataElementOptions(dataElements: DataElementItem[]): DataElementOption[] {
    const options = dataElements.map(
        (item): DataElementOption => {
            const dataElementDis = getDataElementDisaggregatedFromItem(item);
            const text = !item.categoryOptionCombo
                ? item.name + (item.hasDefaultDisaggregation ? "" : ` (${i18n.t("All")})`)
                : `${item.name} (${item.categoryOptionCombo.name})`;

            return { value: getDataElementDisaggregatedId(dataElementDis), text };
        }
    );

    return _.sortBy(options, option => option.text);
}
