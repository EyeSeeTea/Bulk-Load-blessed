import { command, run, string, option } from "cmd-ts";
import path from "path";
import appConfig from "../../public/app-config.json";
import { getCompositionRoot } from "../CompositionRoot";
import { JsonConfig } from "../data/ConfigWebRepository";

function main() {
    const cmd = command({
        name: path.basename(__filename),
        description: "Persist custom modules as template in storage backend",
        args: {
            url: option({
                type: string,
                short: "u",
                long: "dhis2-url",
                description: "DHIS2 base URL. Example: http://USERNAME:PASSWORD@localhost:8080",
            }),
        },
        handler: async args => {
            const compositionRoot = getCompositionRoot({
                appConfig: appConfig as unknown as JsonConfig,
                dhisInstance: { type: "local", url: args.url },
            });
            const modules = await compositionRoot.templates.persistFromStaticModules();
            console.debug(`Custom templates persisted:\n${modules.map(m => m.id).join("\n")}`);
        },
    });

    run(cmd, process.argv.slice(2));
}

main();
