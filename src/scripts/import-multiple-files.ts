import _ from "lodash";
import path from "path";
import { command, run, string, option } from "cmd-ts";
import { resolve } from "node:path";
import { readdir, readFile, writeFile } from "node:fs/promises";

import { D2Api } from "./../types/d2-api";
import appConfig from "../../public/app-config.json";
import { getCompositionRoot } from "../CompositionRoot";
import { JsonConfig } from "../data/ConfigWebRepository";
import { getD2APiFromInstance } from "../utils/d2-api";
import Settings from "../webapp/logic/settings";
import { promiseMap } from "../utils/promises";
import { isExcelFile } from "../utils/files";

type BufferWithFileName = {
    content: Buffer;
    fileName: string;
};

async function readExcelFilesInFolder(fullPathFolder: string): Promise<BufferWithFileName[]> {
    const fileNames = await readdir(fullPathFolder);
    console.debug(`Looking for excel files in: ${fullPathFolder}`);
    const filesContent = await promiseMap(fileNames, async fileName => {
        const filePath = resolve(fullPathFolder, fileName);
        const content = isExcelFile(fileName) ? await readFile(filePath) : undefined;
        if (!content) return undefined;
        return {
            content,
            fileName,
        };
    });
    const excelFiles = _(filesContent).compact().value();
    console.debug(`${excelFiles.length} excel files found.`);
    return excelFiles;
}

function main() {
    const cmd = command({
        name: path.basename(__filename),
        description: "Import data from multiples excel files",
        args: {
            url: option({
                type: string,
                short: "u",
                long: "dhis2-url",
                description: "DHIS2 base URL. Example: http://USERNAME:PASSWORD@localhost:8080",
            }),
            folderPath: option({
                type: string,
                short: "fp",
                long: "folder-path",
                description: "folder path with excel files to import data",
            }),
            resultsPath: option({
                type: string,
                short: "rp",
                long: "results-path",
                description: "folder where import results will be saved",
            }),
        },
        handler: async args => {
            const filesContent = await readExcelFilesInFolder(args.folderPath);
            const api: D2Api = getD2APiFromInstance({ type: "local", url: args.url });

            await promiseMap(filesContent, async file => {
                const compositionRoot = getCompositionRoot({
                    appConfig: appConfig as unknown as JsonConfig,
                    dhisInstance: { type: "local", url: args.url },
                    importSource: "node",
                });
                const settings = await Settings.build(api, compositionRoot);
                console.debug(`Importing file ${file.fileName}`);
                const results = await compositionRoot.templates.import({
                    // @ts-ignore
                    file: file.content,
                    settings,
                    duplicateStrategy: "ERROR",
                    organisationUnitStrategy: "ERROR",
                    selectedOrgUnits: [],
                    useBuilderOrgUnits: false,
                });
                const resultPath = resolve(args.resultsPath, `${file.fileName}.json`);
                results.match({
                    success: async syncResults => {
                        const resultDetails = JSON.stringify(syncResults, null, 2);
                        await writeFile(resultPath, resultDetails);
                        console.debug(`Results saved to ${resultPath}`);
                    },
                    error: async errorResults => {
                        await writeFile(resultPath, errorResults.type);
                    },
                });
                return results;
            });
        },
    });

    run(cmd, process.argv.slice(2));
}

main();
