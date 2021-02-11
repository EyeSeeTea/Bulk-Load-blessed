import moment from "moment";

export function buildAllPossiblePeriods(periodType, startDate, endDate) {
    let unit, format;
    switch (periodType) {
        case "Daily":
            unit = "days";
            format = "YYYYMMDD";
            break;
        case "Monthly":
            unit = "months";
            format = "YYYYMM";
            break;
        case "Yearly":
            unit = "years";
            format = "YYYY";
            break;
        case "Weekly":
            unit = "weeks";
            format = "YYYY[W]W";
            break;
        default:
            throw new Error("Unsupported period type");
    }

    const dates = [];
    for (const current = moment(startDate); current.isSameOrBefore(moment(endDate)); current.add(1, unit)) {
        dates.push(current.format(format));
    }

    return dates;
}
