import { UseCase } from "../../CompositionRoot";
import i18n from "../../locales";
import {
    checkVersion,
    getBasicInfoFromSheet,
    getDataValues,
    getVersion,
} from "../../webapp/logic/sheetImport";
import { InstanceRepository } from "../repositories/InstanceRepository";
import { TemplateRepository } from "../repositories/TemplateRepository";

export class AnalyzeTemplateUseCase implements UseCase {
    constructor(
        private instanceRepository: InstanceRepository,
        private templateRepository: TemplateRepository
    ) {}

    public async execute(file: File) {
        const { id, type } = await getBasicInfoFromSheet(file);
        if (!id) throw new Error(i18n.t("Element not found"));

        const templateVersion = await getVersion(file);
        const { rowOffset = 0, colOffset = 0 } = this.templateRepository.getTemplate(
            templateVersion
        );

        const [object] = await this.instanceRepository.getDataForms(type, [id]);
        if (!object) throw new Error(i18n.t("Program or DataSet not found in instance"));

        await checkVersion(file, object);
        const dataValues = await getDataValues(file, object, rowOffset, colOffset);
        const orgUnits = await this.instanceRepository.getDataFormOrgUnits(type, id);

        return { object, dataValues, orgUnits, rowOffset, colOffset };
    }
}
