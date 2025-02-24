import _ from "lodash";
import XlsxPopulate from "@eyeseetea/xlsx-populate";
import { command, number, string, option, run } from "cmd-ts";
import { fromFileAsync } from "@eyeseetea/xlsx-populate";
import { getUid } from "../data/dhis2-uid";

type HIVDataGeneratorOptions = {
    templateFile: string;
    maxTeis: number;
    maxConsultations: number;
    closurePercentage: number;
    output: string;
};

type Tei = {
    id: string;
    enrollmentDate: string;
    age: number;
    currentWhoStage: number;
    arvLine: number;
};

type Consultation = {
    id: string;
    teiId: string;
    consultationDate: string;
};

class HIVDataGenerator {
    private workbook: XlsxPopulate.Workbook | null = null;
    private tables: Record<string, XlsxPopulate.Sheet> = {};

    constructor(
        private options: { templateFile: string; maxTeis: number; maxConsultations: number; closurePercentage: number }
    ) {}

    private log(message: string): void {
        console.log(message);
    }

    private error(message: string): void {
        console.error(message);
    }

    async loadTemplate(): Promise<void> {
        this.log("Loading template file");
        this.workbook = await fromFileAsync(this.options.templateFile);
        this.tables = {
            "TEI Instances": this.workbook.sheet("TEI Instances"),
            "(1) HIV Consultation": this.workbook.sheet("(1) HIV Consultation"),
            "(2) Closure": this.workbook.sheet("(2) Closure"),
        };
    }

    generateFirstSheet(): Tei[] {
        this.log("Generating first sheet");
        const sheet = this.tables["TEI Instances"];
        if (!sheet) throw new Error("TEI Instances sheet not found");

        const allowedValues = {
            "Org Unit *": ["MALAKAL HIV - PoC - Linelist"],
            Address: [
                "SOUTH SUDAN / MALAKAL / CANAL",
                "SOUTH SUDAN / MALAKAL / POAM",
                "SOUTH SUDAN / MALAKAL / GELACHEL",
                "SOUTH SUDAN / MALAKAL / ULANG",
                "SOUTH SUDAN / MALAKAL / MUDERIA",
                "SOUTH SUDAN / MALAKAL / KOLIET",
                "SOUTH SUDAN / MALAKAL / KHORWAI",
            ],
            "Sex *": ["Female", "Male"],
        };

        let rowIndexStart = 6;

        const teis: Tei[] = [];

        function generateCode(row: number): string {
            // =TEXT(20+INT((ROW()-1)/10),"00")&"-HIV-MALAKAL-"&TEXT(MOD(ROW()-1,10)+1,"00")
            const prefix = (20 + Math.floor((row - 1) / 10)).toString().padStart(2, "0");
            const suffix = (1 + ((row - 1) % 10)).toString().padStart(2, "0");
            return `${prefix}-HIV-MALAKAL-${suffix}`;
        }

        function generateDatesPerMonth(startDate: Date, numPerMonth: number): Date[] {
            const dates: Date[] = [];
            const currentDate = new Date();

            let current = new Date(startDate);

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

        const year = new Date().getFullYear() - 8;
        const dates = _.take(generateDatesPerMonth(new Date(year, 0, 1), 50), this.options.maxTeis);

        _(dates).forEach((date, rowIndex) => {
            const row = sheet.row(rowIndexStart + rowIndex);
            const id = getUid(`tei-${rowIndex}`);
            const enrollmentDate = date.toISOString().split("T")[0] || "";
            const code = generateCode(rowIndex);
            const age = random(`age-${rowIndex}`, 5, 80);
            console.log({ rowIndex, age });
            const birthYear = new Date().getFullYear() - age;

            row.cell("A").value(id);
            row.cell("B").value(sample(`orgUnit-${rowIndex}`, allowedValues["Org Unit *"]));
            row.cell("D").value(enrollmentDate);
            row.cell("E").value(enrollmentDate);
            row.cell("F").value(code);
            row.cell("G").value(sample(`address-${rowIndex}`, allowedValues.Address));
            row.cell("J").value(sample(`sex-${rowIndex}`, allowedValues["Sex *"]));
            row.cell("K").value(birthYear);
            row.cell("L").value(age);

            const tei: Tei = {
                id: id,
                enrollmentDate: enrollmentDate,
                age: age,
                currentWhoStage: random(`whoStage-${id}`, 1, 3),
                arvLine: random(`arvLine-${id}`, 1, 3),
            };
            teis.push(tei);
        });

        return teis;
    }

    generateSecondSheet(teis: Tei[]): Consultation[] {
        this.log("Generating Second sheet");
        const sheet = this.tables["(1) HIV Consultation"];
        if (!sheet) throw new Error();

        let rowIndexStart = 3;
        let rowIndex = 0;

        const allowedValues = {
            "default *": ["default"],
            "Type of visit *": [
                "Visit – Starts ART",
                "Visit – Continue ART",
                "Visit – stop ART",
                "Visit – restart ART",
            ],
            "Current WHO stage *": [1, 2, 3, 4],
        };

        const consultations: Consultation[] = [];

        _(teis).forEach(tei => {
            let consultationDate = new Date(tei.enrollmentDate);

            _.range(0, this.options.maxConsultations).forEach(() => {
                const row = sheet.row(rowIndexStart + rowIndex);
                const eventId = getUid(`event-consultation-${tei.id}`);
                const nextConsultationDate = new Date(consultationDate);
                nextConsultationDate.setMonth(nextConsultationDate.getMonth() + 1);
                nextConsultationDate.setDate(nextConsultationDate.getDate() + random(`next-${rowIndex}`, -5, 5));
                const advancedHiv = random(`advancedHiv-${rowIndex}`, 0, 100) < 20;
                const viralLoad =
                    random(`hasViralLoad-${rowIndex}`, 0, 100) < 80
                        ? undefined
                        : random(`viralLoad-${rowIndex}`, 100, 10000);

                row.cell("A").value(eventId);
                row.cell("B").value(tei.id);
                row.cell("C").value("default");
                const consultationDateStr = consultationDate.toISOString().split("T")[0] || "";
                const { arvLine, enrollmentDate } = tei;

                const consultation: Consultation = {
                    id: eventId,
                    teiId: tei.id,
                    consultationDate: consultationDateStr,
                };

                row.cell("D").value(consultationDateStr);
                row.cell("E").value(nextConsultationDate.toISOString().split("T")[0]);
                row.cell("F").value(tei.age);
                row.cell("G").value("Visit – Starts ART");
                row.cell("H").value(tei.currentWhoStage);
                row.cell("P").value(tei.arvLine);
                row.cell("Q").value(tei.enrollmentDate);
                row.cell("AC").value(advancedHiv ? "Yes" : "No");
                row.cell("AM").value(viralLoad);

                row.cell("AW").value(consultationDateStr); // Consultation date (YYYY-MM-DD)
                row.cell("AX").value(arvLine === 1 ? enrollmentDate : ""); // ARV1 start date (YYYY-MM-DD)
                row.cell("AY").value(arvLine === 2 ? enrollmentDate : ""); // ARV2 start date (YYYY-MM-DD)
                row.cell("AZ").value(arvLine === 3 ? enrollmentDate : ""); // ARV3 start date (YYYY-MM-DD)
                row.cell("BA").value(viralLoad ? consultationDateStr : ""); // pVL date (YYYY-MM-DD)

                consultationDate = nextConsultationDate;
                consultations.push(consultation);
                rowIndex++;
            });
        });

        return consultations;
    }

    generateThirdSheet(teis: Tei[], consultations: Consultation[]) {
        this.log("Generating third sheet");
        const sheet = this.tables["(2) Closure"];
        if (!sheet) throw new Error();

        const allowedValues = {
            reasonOfClosure: { lost: "Lost to follow-up", dead: "Dead" },
        };

        let rowIndexStart = 3;
        let rowIndex = 0;

        const n = Math.max(1, (teis.length * this.options.closurePercentage) / 100);
        const teisInClosure = _.take(teis, n);

        _(teisInClosure).forEach(tei => {
            const row = sheet.row(rowIndexStart + rowIndex);
            const eventId = getUid(`event-closure-${tei.id}`);
            const lastConsultation = _(consultations)
                .filter(c => c.teiId === tei.id)
                .last();
            const closureDate = lastConsultation?.consultationDate;

            row.cell("A").value(eventId);
            row.cell("B").value(tei.id);
            row.cell("C").value("default");
            row.cell("D").value(closureDate);
            row.cell("E").value(tei.age);
            row.cell("F").value(sample(`reasonOfClosure-${rowIndex}`, Object.values(allowedValues.reasonOfClosure)));
            row.cell("G").value(closureDate);

            rowIndex++;
        });
    }

    async generateAndSaveData(options: HIVDataGeneratorOptions): Promise<void> {
        try {
            await this.loadTemplate();
            const teis = this.generateFirstSheet();
            const consultations = this.generateSecondSheet(teis);
            this.generateThirdSheet(teis, consultations);

            const outputFileName = options.output;
            await this.workbook?.toFileAsync(outputFileName);
            this.log(`Data successfully generated and saved to ${outputFileName}`);
        } catch (error) {
            this.error(`Error generating data: ${error}`);
        }
    }
}

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

    // Scale to desired range [min, max]
    return min + Math.floor(normalized * (max - min + 1));
}

function sample<T>(key: string, xs: T[]): T {
    const index = random(key, 0, xs.length - 1);
    const value = xs[index];
    if (!value) throw new Error("");
    return value;
}

const app = command({
    name: "hiv-data-generator",
    args: {
        templateFile: option({ type: string, long: "template" }),
        maxTeis: option({ type: number, long: "max-tracked-entities" }),
        maxConsultations: option({ type: number, long: "max-consultations", defaultValue: () => 50 }),
        closurePercentage: option({ type: number, long: "closure-percentage", defaultValue: () => 0.05 }),
        output: option({ type: string, long: "output" }),
    },
    handler: async args => {
        const generator = new HIVDataGenerator(args);
        await generator.generateAndSaveData(args);
    },
});

run(app, process.argv.slice(2));
