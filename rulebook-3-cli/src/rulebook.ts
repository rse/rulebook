/*
**  Rulebook - Policy Rule Rendering Application
**  Copyright (c) 2025 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

/*  internal dependencies  */
import path              from "node:path"

/*  external dependencies  */
import CLIio             from "cli-io"
import syspath           from "syspath"
import yargs             from "yargs"
import { hideBin }       from "yargs/helpers"
import chalk             from "chalk"

/*  internal dependencies  */
// @ts-ignore
import pkgJSON           from "../../package.json?raw" with { type: "json" }

/*  central CLI context  */
let cli: CLIio | null = null

/*  establish asynchronous environment  */
;(async () => {
    /*  determine system paths  */
    const { dataDir } = syspath({
        appName: "speechflow",
        dataDirAutoCreate: true
    })

    /*  parse command-line arguments  */
    const coerce = (arg: string) => Array.isArray(arg) ? arg[arg.length - 1] : arg
    const args = await yargs()
        /* eslint @stylistic/indent: off */
        .usage(
            "Usage: $0 " +
            "[-h|--help] " +
            "[-V|--version] " +
            "[-a|--address <ip-address>] " +
            "[-p|--port <tcp-port>] " +
            "[-T|--tmpdir <directory>] " +
            "[<argument> [...]]"
        )
        .version(false)
        .option("V", {
            alias:    "version",
            type:     "boolean",
            array:    false,
            coerce,
            default:  false,
            describe: "show program version information"
        })
        .option("v", {
            alias:    "log-level",
            type:     "string",
            array:    false,
            coerce,
            nargs:    1,
            default:  "warning",
            describe: "level for verbose logging ('none', 'error', 'warning', 'info', 'debug')"
        })
        .option("a", {
            alias:    "address",
            type:     "string",
            array:    false,
            coerce,
            nargs:    1,
            default:  "0.0.0.0",
            describe: "IP address for REST/WebSocket API"
        })
        .option("p", {
            alias:    "port",
            type:     "number",
            array:    false,
            coerce,
            nargs:    1,
            default:  8484,
            describe: "TCP port for REST/WebSocket API"
        })
        .option("T", {
            alias:    "tmpdir",
            type:     "string",
            array:    false,
            coerce,
            nargs:    1,
            default:  path.join(dataDir, "tmp"),
            describe: "directory for temporary files"
        })
        .help("h", "show usage help")
        .alias("h", "help")
        .showHelpOnFail(true)
        .strict()
        .demand(0)
        .parse(hideBin(process.argv))

    /*  short-circuit version request  */
    if (args.V) {
        const pkg = JSON.parse(pkgJSON)
        process.stderr.write(`Rulebook ${pkg.version} <${pkg.homepage}>\n`)
        process.stderr.write(`Copyright (c) 2025 ${pkg.author.name} <${pkg.author.url}>\n`)
        process.stderr.write(`Licensed under ${pkg.license} <http://spdx.org/licenses/${pkg.license}.html>\n`)
        process.exit(0)
    }

    /*  establish CLI environment  */
    cli = new CLIio({
        encoding:  "utf8",
        logLevel:  args.v,
        logTime:   false,
        logPrefix: "rulebook"
    })
})().catch((err: Error) => {
    if (cli !== null)
        cli.log("error", err.message)
    else
        process.stderr.write(`rulebook: ${chalk.red("ERROR")}: ${err.message} ${err.stack}\n`)
    process.exit(1)
})

