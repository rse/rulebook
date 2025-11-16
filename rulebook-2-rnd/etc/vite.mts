/*
**  Rulebook - Policy Rule Rendering Application
**  Copyright (c) 2025 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

import fs                    from "node:fs"
import * as Vite             from "vite"
import { tscPlugin }         from "@wroud/vite-plugin-tsc"
import { viteStaticCopy }    from "vite-plugin-static-copy"
import { viteSingleFile }    from "vite-plugin-singlefile"
import { nodePolyfills }     from "vite-plugin-node-polyfills"
import runTask               from "@m5nv/vite-plugin-run-task"
import inlineAssets          from "inline-assets"
import { mkdirp }            from "mkdirp"
import stylus                from "stylus"
import * as CSSO             from "csso"
import * as SVGO             from "svgo"

const SVGGen = (indir: string, input: string, outdir: string, output: string) => {
    return runTask({
        watch: [],
        async task (context, event) {
            let content = await fs.promises.readFile(`${indir}/${input}`, "utf8")
            content = SVGO.optimize(content, {}).data
            await mkdirp(outdir)
            await fs.promises.writeFile(`${outdir}/${output}`, content, "utf8")
        }
    })
}

export default Vite.defineConfig(({ command, mode }) => ({
    logLevel: "info",
    appType:  "custom",
    base:     "",
    root:     "",
    plugins: [
        runTask({
            watch: [],
            async task (context, event) {
                const input  = "src/rulebook.styl"
                const outdir = "dst-stage1"
                const output = "rulebook.css"
                let content = await fs.promises.readFile(input, "utf8")
                content = await new Promise((resolve, reject) => {
                    stylus.render(content, { filename: input }, (err, css) => {
                        if (err) reject(err)
                        else     resolve(css)
                    })
                })
                content = inlineAssets("", input.replace(/\.styl/, ".css"), content, {
                    verbose: true,
                    htmlmin: false,
                    cssmin:  false,
                    jsmin:   false,
                    pattern: [ ".+" ],
                    purge:   false
                })
                content = CSSO.minify(content, {
                    restructure: false,
                    sourceMap:   false
                }).css
                await mkdirp(outdir)
                await fs.promises.writeFile(`${outdir}/${output}`, content, "utf8")
            }
        }),
        SVGGen("src", "rulebook-icon.svg", "dst-stage1", "rulebook-icon.svg"),
        viteStaticCopy({
            hook: "buildStart",
            targets: [ {
                src: [ "src/rulebook.html" ],
                dest: "../dst-stage1/",
                overwrite: true
            } ],
            silent: false
        }),
        tscPlugin({
            tscArgs:        [ "--project", "etc/tsc.json", ...(mode === "development" ? [ "--sourceMap" ] : []) ],
            packageManager: "npx",
            prebuild:       true
        }),
        nodePolyfills(),
        viteSingleFile()
    ],
    build: {
        lib: {
            entry:    "dst-stage1/rulebook.js",
            formats:  [ "umd" ],
            name:     "Rundown",
            fileName: (format) => "rulebook.umd.js"
        },
        target:                 "es2022",
        outDir:                 "dst-stage2",
        assetsDir:              "",
        emptyOutDir:            true,
        chunkSizeWarningLimit:  5000,
        assetsInlineLimit:      0,
        sourcemap:              (mode === "development"),
        minify:                 (mode === "production"),
        reportCompressedSize:   (mode === "production"),
        rollupOptions: {
            external: [],
            onwarn (warning, warn) {
                if (warning.message.match(/annotation that Rollup cannot interpret/))
                    return
                if (warning.message.match(/Use of eval.*?is strongly discouraged/))
                    return
                warn(warning)
            }
        }
    }
}))

