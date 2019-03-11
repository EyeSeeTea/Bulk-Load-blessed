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
        let options = [];
        let categoryCombo = builder.elementMetadata.get(builder.element.categoryCombo.id);
        _.forEach(categoryCombo.categories.map(e => builder.elementMetadata.get(e.id)), category => {
            _.forEach(category.categoryOptions.map(e => builder.elementMetadata.get(e.id)), categoryOption => {
                options.push({value: categoryOption.id, label: categoryOption.name});
            });
        });
        result['options'] = options;

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