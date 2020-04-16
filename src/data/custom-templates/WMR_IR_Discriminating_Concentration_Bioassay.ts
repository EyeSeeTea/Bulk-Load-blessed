import { StyleSource } from "../../domain/entities/Template";
import { XLSXPopulateTemplate } from "../XLSXPopulateTemplate";

export default class extends XLSXPopulateTemplate {
    public readonly id = "WMR_IR_v0";
    public readonly name = "WMR_IR_Discriminating_Concentration_Bioassay";
    public readonly url = "templates/WMR_IR_discriminating_concentration_bioassays_v0_EN.xlsx";

    public readonly styleSources: StyleSource[] = [
        {
            section: "title",
            source: {
                type: "range",
                ref: "H3:N3",
                sheet: "DiscriminatingBioassays",
            },
        },
    ];
}
