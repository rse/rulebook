/*
**  Rulebook - Policy Rule Rendering Application
**  Copyright (c) 2025 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

/*  built-in dependencies  */
import path              from "node:path"
import fs                from "node:fs"

/*  external dependencies  */
import CLIio             from "cli-io"
import syspath           from "syspath"
import yargs             from "yargs"
import { hideBin }       from "yargs/helpers"
import chalk             from "chalk"
import { glob }          from "glob"
import axios             from "axios"

/*  internal dependencies  */
// @ts-ignore
import pkgJSON from "../../package.json?raw" with { type: "json" }
import { Rulebook, RulebookParseError } from "../../rulebook-3-lib"

/*  central CLI context  */
let cli: CLIio | null = null

/*  parse rulebook  */
const parseRulebook = async (cli: CLIio, dir: string) => {
    /*  create rulebook repository  */
    const rulebook = new Rulebook()

    /*  sanity check source directory  */
    cli.log("info", `loading rulebook source "${dir}"`)
    const stat = await fs.promises.stat(dir).catch(() => null)
    if (stat === null)
        throw new Error(`rulebook source path ${dir} not existing`)
    if (!stat.isDirectory())
        throw new Error(`rulebook source path ${dir} not a directory`)

    /*  read index  */
    const indexFile = path.join(dir, "INDEX.yaml")
    cli.log("info", `loading rulebook index  "${indexFile}"`)
    const exists = await fs.promises.access(indexFile, fs.constants.R_OK)
        .then(() => true).catch(() => false)
    if (!exists)
        throw new Error(`rulebook index "${indexFile}" not found`)
    const indexYAML = await fs.promises.readFile(indexFile, "utf8")
    try {
        rulebook.parseIndex(indexFile, indexYAML)
    }
    catch (err: any) {
        if (err instanceof RulebookParseError)
            cli.log("error", err.render(true))
        else
            cli.log("error", String(err))
        throw new Error("failed to parse rulebook index")
    }

    /*  iterate over all aspects  */
    const aspectFiles = (await glob([ "*.yaml" ], { cwd: dir }))
        .filter((p) => p !== "INDEX.yaml")
        .map((p) => path.join(dir, p))
        .toSorted()
    for (const aspectFile of aspectFiles) {
        cli.log("info", `loading rulebook aspect "${aspectFile}"`)
        const aspectYAML = await fs.promises.readFile(aspectFile, "utf8")
        try {
            rulebook.parseAspect(aspectFile, aspectYAML)
        }
        catch (err: any) {
            if (err instanceof RulebookParseError)
                cli.log("error", err.render(true))
            else
                cli.log("error", String(err))
            throw new Error("failed to parse rulebook aspect")
        }
    }

    /*  validate rulebook  */
    cli.log("info", "validating rulebook cross-references")
    rulebook.validateCrossRefs()

    return rulebook
}

/*  format rulebook  */
const formatRulebook = async (cli: CLIio, rulebook: Rulebook, format: string) => {
    cli.log("info", `formatting rulebook into format "${format}"`)
    const output = await rulebook.print(format)
    return output
}

/*  command handler: make  */
const cmdMake = async (
    cli:        CLIio,
    globalOpts: { verbose: boolean },
    cmdOpts:    { output: string, format: string },
    cmdArgs:    { dir: string }
) => {
    cli.log("info", `make: output=${cmdOpts.output} format=${cmdOpts.format} dir=${cmdArgs.dir} verbose=${globalOpts.verbose}`)
    const rulebook = await parseRulebook(cli, cmdArgs.dir)
    const output = await formatRulebook(cli, rulebook, cmdOpts.format)
    cli.log("info", `saving rulebook output "${cmdOpts.output}"`)
    await fs.promises.writeFile(cmdOpts.output, output, "utf8")
}

/*  command handler: serve  */
const cmdServe = async (
    cli:        CLIio,
    globalOpts: { verbose: boolean },
    cmdOpts:    { addr: string, port: number },
    cmdArgs:    { dir: string }
) => {
    cli.log("info", `serve: address=${cmdOpts.addr} port=${cmdOpts.port} dir=${cmdArgs.dir} verbose=${globalOpts.verbose}`)
    /*  TODO: implement serve functionality  */
}

/*  command handler: preview  */
const cmdPreview = async (
    cli:        CLIio,
    globalOpts: { verbose: boolean },
    cmdOpts:    { format: string, addr: string, port: number },
    cmdArgs:    { dir: string }
) => {
    cli.log("info", `preview: format=${cmdOpts.format} address=${cmdOpts.addr} port=${cmdOpts.port} dir=${cmdArgs.dir} verbose=${globalOpts.verbose}`)
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

    /*  establish CLI environment  */
    const setupCLI = (verbose: boolean) => {
        const logLevel = verbose ? "info" : "warning"
        cli = new CLIio({
            encoding:  "utf8",
            logLevel,
            logTime:   false,
            logPrefix: "rulebook"
        })
    }

    /*  once perform a version check  */
    const pkg = JSON.parse(pkgJSON)
    const response = await axios({
        method: "GET",
        url:    "https://api.github.com/repos/rse/rundown/tagsx"
    }).then((response) => response.data).catch(() => [])
    if (typeof response === "object"
        && response !== null
        && response instanceof Array
        && response.length > 0) {
        const tag = response[0].name
        if (tag !== pkg.version) {
            const url = `https://github.com/rse/rundown/releases/tag/${tag}`
            process.stderr.write(`rulebook: ${chalk.red("WARNING")}: You are using Rulebook version ${chalk.red(pkg.version)}, ` +
                `but newer version ${chalk.blue(tag)} is available\n`)
            process.stderr.write(`rulebook: ${chalk.blue("NOTICE")}: Get this latest version from ${chalk.blue(url)}\n`)
        }
    }

    /*  parse command-line arguments  */
    const coerce = (arg: string) => Array.isArray(arg) ? arg[arg.length - 1] : arg
    const args = await yargs()
        /* eslint @stylistic/indent: off */
        .usage("Usage: $0 [<global-options>] <command> [<command-options>] [<command-arguments>]")
        .version(false)
        .option("verbose", {
            alias:    "v",
            type:     "boolean",
            array:    false,
            coerce,
            default:  false,
            describe: "enable verbose logging"
        })
        .command("version", "show program version", (yargs) => yargs, async (argv: any) => {
            const pkg = JSON.parse(pkgJSON)
            process.stderr.write(`Rulebook ${pkg.version} <${pkg.homepage}>\n`)
            process.stderr.write(`Copyright (c) 2025 ${pkg.author.name} <${pkg.author.url}>\n`)
            process.stderr.write(`Licensed under ${pkg.license} <http://spdx.org/licenses/${pkg.license}.html>\n`)
            process.exit(0)
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
                .option("format", {
                    alias:        "f",
                    type:         "string",
                    array:        false,
                    nargs:        1,
                    default:      "card",
                    describe:     "output format (\"card\", \"prose\", \"app\")"
                })
                .positional("dir", {
                    type:         "string",
                    describe:     "rulebook source directory"
                })
        }, async (argv: any) => {
            setupCLI(argv.verbose)
            cmdMake(cli!,
                { verbose: argv.verbose },
                { output:  argv.output, format: argv.format },
                { dir:     argv.dir }
            ).catch((err) => {
                if (err instanceof Error)
                    cli!.log("error", err.message)
                else
                    cli!.log("error", String(err))
                process.exit(1)
            })
        })
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
        }, async (argv: any) => {
            setupCLI(argv.verbose)
            return cmdServe(cli!,
                { verbose: argv.verbose },
                { addr:    argv.addr, port: argv.port },
                { dir:     argv.dir }
            )
        })
        .command("preview <dir>", "preview rulebook rendering from source", (yargs) => {
            return yargs
                .option("format", {
                    alias:        "f",
                    type:         "string",
                    array:        false,
                    nargs:        1,
                    default:      "card",
                    describe:     "output format (\"card\", \"prose\", \"app\")"
                })
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
        }, async (argv: any) => {
            setupCLI(argv.verbose)
            return cmdPreview(cli!,
                { verbose: argv.verbose },
                { format:  argv.format, addr: argv.addr, port: argv.port },
                { dir:     argv.dir }
            )
        })
        .help("h", "show usage help")
        .alias("h", "help")
        .showHelpOnFail(true)
        .strict()
        .demandCommand(1, "Please specify a command")
        .parse(hideBin(process.argv))
})().catch((err: Error) => {
    if (cli !== null)
        cli.log("error", err.message)
    else
        process.stderr.write(`rulebook: ${chalk.red("ERROR")}: ${err.message} ${err.stack}\n`)
    process.exit(1)
})

