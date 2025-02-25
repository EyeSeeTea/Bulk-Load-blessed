import XlsxPopulate from "@eyeseetea/xlsx-populate";
import { command, number, string, option, run, optional } from "cmd-ts";
import { fromFileAsync } from "@eyeseetea/xlsx-populate";
import _ from "lodash";

import { getUid } from "../data/dhis2-uid";

const config = {
    yearsInPast: 8,
    chunkSize: 100,
    teisPerMonth: 50,
    maxConsultationsDefault: 8 * 12,
    closurePercentageDefault: 5,
    orgUnits: ["MALAKAL HIV - PoC - Linelist"],
    addresses: [
        "SOUTH SUDAN / MALAKAL / CANAL",
        "SOUTH SUDAN / MALAKAL / POAM",
        "SOUTH SUDAN / MALAKAL / GELACHEL",
        "SOUTH SUDAN / MALAKAL / ULANG",
        "SOUTH SUDAN / MALAKAL / MUDERIA",
        "SOUTH SUDAN / MALAKAL / KOLIET",
        "SOUTH SUDAN / MALAKAL / KHORWAI",
    ],
    reasonOfClosure: ["Lost to follow-up", "Dead"],
    typeOfVisit: "starts_art",
    ages: { min: 5, max: 80 },
    nextConsultationsDaysOffset: 5,
    advancedHivWhoStages: [3, 4],
    percentageOfAdvancedHiv: 20,
    percentageOfViralLoadPresence: 80,
    viralLoad: { min: 100, max: 100_000 },
};

const app = command({
    name: "hiv-data-generator",
    args: {
        templateFile: option({ type: string, long: "template" }),
        maxTeis: option({ type: optional(number), long: "max-tracked-entities" }),
        maxConsultations: option({
            type: number,
            long: "max-consultations",
            defaultValue: () => config.maxConsultationsDefault,
        }),
        closurePercentage: option({
            type: number,
            long: "closure-percentage",
            defaultValue: () => config.closurePercentageDefault,
        }),
        output: option({ type: string, long: "output" }),
    },
    handler: async args => {
        const generator = await HIVDataGenerator.build(args);
        await generator.execute({ output: args.output });
    },
});

class HIVDataGenerator {
    sheets = {
        trackedEntities: "TEI Instances",
        consultationEvents: "(1) HIV Consultation",
        closureEvents: "(2) Closure",
    };

    constructor(private workbook: XlsxPopulate.Workbook, private options: Omit<HIVDataGeneratorOptions, "output">) {}

    public async execute(options: Pick<HIVDataGeneratorOptions, "output">): Promise<void> {
        const { chunkSize } = config;
        const teis = this.buildTeis();
        const sheetsCount = Math.ceil(teis.length / chunkSize);
        const indexedGroups = _.chunk(teis, chunkSize).map((teisGroup, index) => ({ index, teisGroup }));
        this.log(`trackedEntities: ${teis.length} (${sheetsCount} files in chunks of ${chunkSize})`);

        for (const item of indexedGroups) {
            const { index, teisGroup } = item;

            this.generateTrackedEntitiesSheet(teisGroup);

            const consultations = this.buildConsultations(teisGroup);
            this.generateConsultationsSheet(consultations);

            const closures = this.buildClosures(teisGroup, consultations);
            this.generateClosureSheet(closures);

            const indexWithPadding = (index + 1).toString().padStart(3, "0");
            const outputFileName = options.output.replace("INDEX", indexWithPadding);
            await this.workbook?.toFileAsync(outputFileName);

            this.log(`Written: ${outputFileName}`);
        }
    }

    private log(message: string): void {
        console.info(message);
    }

    private getSheet(sheetName: string): XlsxPopulate.Sheet {
        const sheet = this.workbook.sheet(sheetName);
        if (!sheet) throw new Error("TEI Instances sheet not found");
        return sheet;
    }

    private generateTrackedEntitiesSheet(trackedEntities: TrackedEntity[]) {
        const sheet = this.getSheet(this.sheets.trackedEntities);
        const rowIndexStart = 6;

        trackedEntities.forEach((tei, rowIndex) => {
            const row = sheet.row(rowIndexStart + rowIndex);

            row.cell("A").value(tei.id);
            row.cell("B").value(tei.orgUnitName);
            row.cell("D").value(getIsoDate(tei.enrollmentDate));
            row.cell("E").value(getIsoDate(tei.enrollmentDate));
            row.cell("F").value(tei.code);
            row.cell("G").value(tei.address);
            row.cell("J").value(tei.sex);
            row.cell("K").value(tei.birthYear);
            row.cell("L").value(tei.age);
        });
    }

    private buildTeis(): TrackedEntity[] {
        const { maxTeis } = this.options;
        const year = new Date().getFullYear() - config.yearsInPast;
        const allDates = generateDates({
            startDate: new Date(year, 0, 1),
            perMonth: config.teisPerMonth,
        });
        const dates = maxTeis ? _.take(allDates, maxTeis) : allDates;

        return dates.map((enrollmentDate, rowIndex): TrackedEntity => {
            const teiId = getUid(`tei-${rowIndex}`);
            const age = random(`age-${rowIndex}`, config.ages.min, config.ages.max);

            return {
                id: teiId,
                enrollmentDate: enrollmentDate,
                age: age,
                currentWhoStage: sample(`whoStage-${teiId}`, [1, 2, 3]),
                arvLine: sample(`arvLine-${teiId}`, [1, 2, 3]),
                orgUnitName: sample(`orgUnit-${rowIndex}`, config.orgUnits),
                code: generateCode(rowIndex),
                address: sample(`address-${rowIndex}`, config.addresses),
                sex: sample(`sex-${rowIndex}`, ["Female", "Male"]),
                birthYear: new Date().getFullYear() - age,
            };
        });
    }

    private buildConsultations(teis: TrackedEntity[]): Consultation[] {
        const now = new Date();

        return teis.flatMap(tei => {
            let consultationDate = new Date(tei.enrollmentDate);

            return _.range(0, this.options.maxConsultations).map((index): Consultation => {
                const eventId = getUid(`event-consultation-${tei.id}-${index}`);

                const nextConsultationDate = new Date(consultationDate);
                nextConsultationDate.setMonth(nextConsultationDate.getMonth() + 1);
                const offset = config.nextConsultationsDaysOffset;
                const newDate = nextConsultationDate.getDate() + random(`next-${index}`, -offset, +offset);
                nextConsultationDate.setDate(newDate);

                const ageAtConsultation = Math.max(1, new Date(consultationDate).getFullYear() - tei.birthYear);

                const advancedHiv =
                    ageAtConsultation < 5 ||
                    config.advancedHivWhoStages.includes(tei.currentWhoStage) ||
                    random(`advancedHiv-${index}`, 0, 100) < config.percentageOfAdvancedHiv;

                const viralLoad =
                    random(`hasViralLoad-${index}`, 0, 100) < config.percentageOfViralLoadPresence
                        ? undefined
                        : random(`viralLoad-${index}`, config.viralLoad.min, config.viralLoad.max);

                const consultation: Consultation = {
                    id: eventId,
                    tei: tei,
                    consultationDate: consultationDate,
                    nextConsultationDate: nextConsultationDate,
                    typeOfVisit: config.typeOfVisit,
                    advancedHiv: advancedHiv,
                    viralLoad: viralLoad,
                    arvLine: tei.arvLine,
                    ageAtConsultation: ageAtConsultation,
                    arv1StartDate: tei.arvLine === 1 ? tei.enrollmentDate : undefined,
                    arv2StartDate: tei.arvLine === 2 ? tei.enrollmentDate : undefined,
                    arv3StartDate: tei.arvLine === 3 ? tei.enrollmentDate : undefined,
                    pvlDate: viralLoad ? consultationDate : undefined,
                };

                consultationDate = nextConsultationDate;
                return consultation;
            });
        });
    }

    private generateConsultationsSheet(consultations: Consultation[]) {
        const sheet = this.getSheet(this.sheets.consultationEvents);
        const rowIndexStart = 3;
        this.log(`Consultations: ${consultations.length}`);

        _(consultations).forEach((consultation, rowIndex) => {
            const { tei, consultationDate } = consultation;
            const row = sheet.row(rowIndexStart + rowIndex);
            const enrollmentDateS = getIsoDate(tei.enrollmentDate);

            row.cell("A").value(consultation.id);
            row.cell("B").value(tei.id);
            row.cell("C").value("default");
            row.cell("D").value(getIsoDate(consultationDate));
            row.cell("E").value(getIsoDate(consultation.nextConsultationDate));
            row.cell("F").value(consultation.ageAtConsultation);
            row.cell("G").value(config.typeOfVisit);
            row.cell("H").value(tei.currentWhoStage);
            row.cell("P").value(tei.arvLine);
            row.cell("Q").value(enrollmentDateS);
            row.cell("AC").value(consultation.advancedHiv ? "Yes" : "No");
            row.cell("AM").value(consultation.viralLoad);

            row.cell("AW").value(getIsoDate(consultationDate));
            row.cell("AX").value(getIsoDate(consultation.arv1StartDate));
            row.cell("AY").value(getIsoDate(consultation.arv2StartDate));
            row.cell("AZ").value(getIsoDate(consultation.arv3StartDate));
            row.cell("BA").value(getIsoDate(consultation.pvlDate));
        });
    }

    private buildClosures(teis: TrackedEntity[], consultations: Consultation[]): Closure[] {
        const closureCount = Math.max(1, (teis.length * this.options.closurePercentage) / 100);
        const teisInClosure = _.take(teis, closureCount);

        return teisInClosure.map((tei): Closure => {
            const lastConsultation = _.last(consultations.filter(c => c.tei.id === tei.id));
            if (!lastConsultation) throw new Error(`No consultation found for TEI ${tei.id}`);

            return {
                id: getUid(`event-closure-${tei.id}`),
                tei: tei,
                lastConsultation: lastConsultation,
                reason: sample(`reasonOfClosure-${tei.id}`, config.reasonOfClosure),
            };
        });
    }

    private generateClosureSheet(closures: Closure[]) {
        const sheet = this.getSheet(this.sheets.closureEvents);
        const rowIndexStart = 3;

        _(closures).forEach((closure, rowIndex) => {
            const { tei } = closure;
            const row = sheet.row(rowIndexStart + rowIndex);
            const closureStrDate = getIsoDate(closure.lastConsultation.consultationDate);

            row.cell("A").value(closure.id);
            row.cell("B").value(tei.id);
            row.cell("C").value("default");
            row.cell("D").value(closureStrDate);
            row.cell("E").value(tei.age);
            row.cell("F").value(closure.reason);
            row.cell("G").value(closureStrDate);
        });
    }

    static async build(options: HIVDataGeneratorOptions): Promise<HIVDataGenerator> {
        const workbook = await fromFileAsync(options.templateFile);
        return new HIVDataGenerator(workbook, options);
    }
}

// random("event-1-status", 1, 10)
//   // Generates a pseudo-random number between 1 and 10 (inclusive) using event-1-status as seed key
function random(key: string, min: number, max: number): number {
    // FNV-1a hash to generate a 32-bit seed from the key
    let hash = 2166136261;
    for (let i = 0; i < key.length; i++) {
        hash ^= key.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }

    // Further scramble using a simple xorshift
    hash ^= hash << 13;
    hash ^= hash >>> 17;
    hash ^= hash << 5;
    hash >>>= 0; // force unsigned 32-bit

    // Normalize to [0, 1)
    const normalized = hash / 4294967296;

    return min + Math.floor(normalized * (max - min + 1));
}

function sample<T>(key: string, xs: T[]): T {
    const index = random(key, 0, xs.length - 1);
    const value = xs[index];
    if (!value) throw new Error(`Cannot sample from empty list`);
    return value;
}

function generateCode(index: number): string {
    // Frm Excel formula: =TEXT(20+INT((ROW()-1)/10),"00")&"-HIV-MALAKAL-"&TEXT(MOD(ROW()-1,10)+1,"00")
    const prefix = (20 + Math.floor((index - 1) / 10)).toString().padStart(2, "0");
    const suffix = (1 + ((index - 1) % 10)).toString().padStart(2, "0");
    return `${prefix}-HIV-MALAKAL-${suffix}`;
}

function generateDates(options: { startDate: Date; perMonth: number }): Date[] {
    const { startDate, perMonth: numPerMonth } = options;
    const dates: Date[] = [];
    const currentDate = new Date();
    const current = new Date(startDate);

    while (current <= currentDate) {
        const year = current.getFullYear();
        const month = current.getMonth();

        for (let i = 0; i < numPerMonth; i++) {
            const randomDay = random(i.toString(), 1, 28);
            dates.push(new Date(year, month, randomDay));
        }

        current.setMonth(current.getMonth() + 1);
    }

    return dates;
}

function getIsoDate(date: Date | undefined): string | undefined {
    if (!date) return;
    const dateStr = date.toISOString().split("T")[0];
    if (!dateStr) throw new Error(`Invalid date: ${date}`);
    return dateStr;
}

type HIVDataGeneratorOptions = {
    templateFile: string;
    maxTeis?: number;
    maxConsultations: number;
    closurePercentage: number;
    output: string;
};

type TrackedEntity = {
    id: string;
    enrollmentDate: Date;
    age: number;
    currentWhoStage: number;
    arvLine: number;
    orgUnitName: string;
    code: string;
    address: string;
    sex: string;
    birthYear: number;
};

type Consultation = {
    id: string;
    tei: TrackedEntity;
    consultationDate: Date;
    ageAtConsultation: number;
    nextConsultationDate: Date;
    typeOfVisit: string;
    advancedHiv: boolean;
    viralLoad: number | undefined;
    arvLine: number;
    arv1StartDate: Date | undefined;
    arv2StartDate: Date | undefined;
    arv3StartDate: Date | undefined;
    pvlDate: Date | undefined;
};

type Closure = {
    id: string;
    tei: TrackedEntity;
    lastConsultation: Consultation;
    reason: string;
};

run(app, process.argv.slice(2));
