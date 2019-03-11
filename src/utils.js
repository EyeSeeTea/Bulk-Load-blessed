import _ from "lodash";

/**
 * Creates the string describing the period for the selected period type.
 * @returns string describing the period.
 */
export function getPeriod(periodType, selected) {
    switch (periodType) {
        case "Daily":
            return (selected['year'].value * 10000 + selected['month'].value * 100 + selected['day'].value).toString();
        case "Monthly":
            return (selected['year'].value * 100 + selected['month'].value).toString();
        case "Yearly":
            return (selected['year'].value).toString();
        case "Weekly":
            return selected['year'].value + "W" + selected['week'].value;
        default:
            throw new Error("Invalid period type: " + periodType);
    }
}

export function prepareDataSetOptions(builder) {
    let result = {
        options: [],
        years: [],
        months: [],
        weeks: [],
        days: []
    };

    if (builder.element.type === 'dataSet') {
        let dataSetOptionComboId = builder.element.categoryCombo.id;
        builder.elementMetadata.forEach(e => {
            if (e.type === 'categoryOptionCombo' && e.categoryCombo.id === dataSetOptionComboId) {
                result['options'].push({value: e.id, label: e.name});
            }
        });

        switch (builder.element.periodType) {
            case "Daily":
                result['days'] = _.range(1, 32).map(n => buildOption(n));
                result['months'] = _.range(1, 13).map(n => buildOption(n));
                result['years'] = _.range(1970, 2100).map(n => buildOption(n));
                break;
            case "Monthly":
                result['months'] = _.range(1, 13).map(n => buildOption(n));
                result['years'] = _.range(1970, 2100).map(n => buildOption(n));
                break;
            case "Yearly":
                result['years'] = _.range(1970, 2100).map(n => buildOption(n));
                break;
            case "Weekly":
                result['years'] = _.range(1970, 2100).map(n => buildOption(n));
                result['weeks'] = _.range(1, 53).map(n => buildOption(n));
                break;
            default:
                break;
        }
    }
    return result;
}

function buildOption(n) {
    return {value: n, label: n};
}