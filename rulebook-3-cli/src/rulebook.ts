/*
**  Rulebook - Policy Rule Rendering Application
**  Copyright (c) 2025 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

/*  internal dependencies  */
// import path              from "node:path"

/*  external dependencies  */
import CLIio             from "cli-io"
import syspath           from "syspath"
import yargs             from "yargs"
import { hideBin }       from "yargs/helpers"
import chalk             from "chalk"
// import jsYAML            from "js-yaml"
// import { type }          from "arktype"

/*  internal dependencies  */
// @ts-ignore
import pkgJSON           from "../../package.json?raw" with { type: "json" }

/*  central CLI context  */
let cli: CLIio | null = null

/*  command handler: make  */
async function cmdMake (
    globalOpts: { verbose: boolean },
    cmdOpts:    { output: string },
    cmdArgs:    { dir: string }
) {
    if (cli === null)
        throw new Error("CLI not initialized")
    cli.log("info", `make: output=${cmdOpts.output} dir=${cmdArgs.dir} verbose=${globalOpts.verbose}`)
    /*  TODO: implement make functionality  */
}

/*  command handler: serve  */
async function cmdServe (
    globalOpts: { verbose: boolean },
    cmdOpts:    { addr: string, port: number },
    cmdArgs:    { dir: string }
) {
    if (cli === null)
        throw new Error("CLI not initialized")
    cli.log("info", `serve: address=${cmdOpts.addr} port=${cmdOpts.port} dir=${cmdArgs.dir} verbose=${globalOpts.verbose}`)
    /*  TODO: implement serve functionality  */
}

/*  command handler: preview  */
async function cmdPreview (
    globalOpts: { verbose: boolean },
    cmdOpts:    { addr: string, port: number },
    cmdArgs:    { dir: string }
) {
    if (cli === null)
        throw new Error("CLI not initialized")
    cli.log("info", `preview: address=${cmdOpts.addr} port=${cmdOpts.port} dir=${cmdArgs.dir} verbose=${globalOpts.verbose}`)
    /*  TODO: implement preview functionality  */
}

/*  establish asynchronous environment  */
;(async () => {
    /*  determine system paths  */
    /* eslint no-unused-vars: off */
    const { dataDir } = syspath({
        appName: "rulebook",
        dataDirAutoCreate: true
    })

    /*  parse command-line arguments  */
    const coerce = (arg: string) => Array.isArray(arg) ? arg[arg.length - 1] : arg
    const args = await yargs()
        /* eslint @stylistic/indent: off */
        .usage("Usage: $0 [<global-options>] <command> [<command-options>] [<command-arguments>]")
        .version(false)
        .option("version", {
            alias:    "V",
            type:     "boolean",
            array:    false,
            coerce,
            default:  false,
            describe: "show program version information"
        })
        .option("verbose", {
            alias:    "v",
            type:     "boolean",
            array:    false,
            coerce,
            default:  false,
            describe: "enable verbose logging"
        })
        .command("make <dir>", "make rulebook rendering from source", (yargs) => {
            return yargs
                .option("output", {
                    alias:        "o",
                    type:         "string",
                    array:        false,
                    nargs:        1,
                    demandOption: true,
                    describe:     "output directory"
                })
                .positional("dir", {
                    type:         "string",
                    describe:     "rulebook source directory"
                })
        }, async (argv: any) => cmdMake(
            { verbose: argv.verbose },
            { output:  argv.output },
            { dir:     argv.dir }
        ))
        .command("serve <dir>", "serve rulebook rendering", (yargs) => {
            return yargs
                .option("address", {
                    alias:    "a",
                    type:     "string",
                    array:    false,
                    nargs:    1,
                    default:  "0.0.0.0",
                    describe: "IP address to bind to"
                })
                .option("port", {
                    alias:    "p",
                    type:     "number",
                    array:    false,
                    nargs:    1,
                    default:  8484,
                    describe: "TCP port to bind to"
                })
                .positional("dir", {
                    type:     "string",
                    describe: "rulebook source directory"
                })
        }, async (argv: any) => cmdServe(
            { verbose: argv.v },
            { addr: argv.a, port: argv.p },
            { dir: argv.dir }
        ))
        .command("preview <dir>", "preview rulebook rendering from source", (yargs) => {
            return yargs
                .option("address", {
                    alias:    "a",
                    type:     "string",
                    array:    false,
                    nargs:    1,
                    default:  "0.0.0.0",
                    describe: "IP address to bind to"
                })
                .option("port", {
                    alias:    "p",
                    type:     "number",
                    array:    false,
                    nargs:    1,
                    default:  8484,
                    describe: "TCP port to bind to"
                })
                .positional("dir", {
                    type:     "string",
                    describe: "rulebook source directory"
                })
        }, async (argv: any) => cmdPreview(
            { verbose: argv.v },
            { addr: argv.a, port: argv.p },
            { dir: argv.dir }
        ))
        .help("h", "show usage help")
        .alias("h", "help")
        .showHelpOnFail(true)
        .strict()
        .demandCommand(1, "Please specify a command")
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
    const logLevel = args.v ? "info" : "warning"
    cli = new CLIio({
        encoding:  "utf8",
        logLevel,
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

