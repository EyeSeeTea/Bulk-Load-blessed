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
        const mainDataElement: DataElementItem = dataElement;
        const disaggregatedDataElements: DataElementItem[] = _(categoryOptionCombos)
            .map(coc => ({ ...dataElement, categoryOptionCombo: coc }))
            .sortBy(de => de.categoryOptionCombo.name)
            .value();

        return _.compact([disaggregatedDataElements.length > 1 ? mainDataElement : null, ...disaggregatedDataElements]);
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
            const coc = item.categoryOptionCombo;
            const text = coc
                ? item.name + (coc.name === "default" ? "" : ` (${coc.name})`)
                : item.name + ` (${i18n.t("All")})`;

            return { value: getDataElementDisaggregatedId(dataElementDis), text };
        }
    );

    return _.sortBy(options, option => option.text);
}
