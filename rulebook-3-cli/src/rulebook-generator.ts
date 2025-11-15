/*
**  Rulebook - Policy Rule Rendering Application
**  Copyright (c) 2025 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

/*  built-in dependencies  */
import path                  from "node:path"
import fs                    from "node:fs"

/*  external dependencies  */
import stylus                from "stylus"
import { marked }            from "marked"
import { markedSmartypants } from "marked-smartypants"

/*  internal dependencies  */
import {
    type RulebookRepository
} from "./rulebook-repository"

marked.use(markedSmartypants())

/*  rulebook generator  */
export class RulebookGenerator {
    /*  constructor  */
    constructor (
        private repo: RulebookRepository
    ) {}

    /*  convert markdown to HTML  */
    private md2html (markdown: string) {
        let html = marked(markdown, {
            async:     false,
            gfm:       true,
            breaks:    true
        })
        html = html.replace(/^\s*<p>/, "").replace(/<\/p>\s*$/, "")
        return html
    }

    /*  convert reference to HTML  */
    private ref2html (ref: string) {
        let m: RegExpMatchArray | null
        if ((m = ref.match(/^ctx:([^.]+)\.([^.]+)(?:#(.+))?$/)) !== null)
            return `<a href="#ctx-${m[1]}-${m[2]}">${m[1]}<span class="rarr">&#x25B6;</span>` +
                `<strong>${m[2]}${m[3] ? " # " + m[3] : ""}</strong></a>`
        else if ((m = ref.match(/^aspect:(.+)$/)) !== null) {
            const name = m[1]
            if ((m = name.match(/^(.+)#(.+)$/)) !== null)
                return `<a href="#${m[1]}-${m[2]}"><strong>${m[1]}</strong>` +
                    `<span class="rarr">&#x25B7;</span><strong>${m[2]}</strong></a>`
            else
                return `<a href="#${name}"><strong>${name}</strong></a>`
        }
        else if (ref.match(/^https?:.+/))
            return `<a href="${ref}">${ref}</a>`
        else if ((m = ref.match(/^md:(.+)$/)) !== null)
            return this.md2html(m[1])
        else
            throw new Error(`bad reference: "${ref}"`)
    }

    /*  helper function for typed object keys  */
    private typedKeys<T extends object> (obj: T): Array<keyof T> {
        return Object.keys(obj) as Array<keyof T>
    }

    /*  generate HTML output  */
    async print (format = "card") {
        const index = this.repo.getIndex()
        if (index === null)
            throw new Error("index still not loaded")

        let html = ""

        /*  generate stylesheet  */
        const styl = await fs.promises.readFile(path.join(__dirname, "..", "src", "rulebook-generator.styl"), "utf8")
        const css = await new Promise<string>((resolve, reject) => {
            stylus(styl).render((err, css) => {
                if (err) reject(err)
                else resolve(css)
            })
        })

        /*  generate prolog from index  */
        html += "<div class=\"cover\">"
        html += `<div class="title">${index.obj.Name}</div>`
        const description = this.md2html(index.obj.Description)
        html += `<div class="description">${description}</div>`
        html += `<div class="version">Version: ${index.obj.Version}</div>`
        /*
        html +=
            `<div class="editing">\n
                <div class="label">Editing:</div>
                <div class="created"><div class="label">Created:</div><div class="date">${index.obj.Editing.Created}</div></div>
                <div class="modified"><div class="label">Modified:</div><div class="date">${index.obj.Editing.Modified}</div></div>
            </div>
            <div class="validity">\n
                <div class="label">Validity:</div>
                <div class="from"><div class="label">From:</div><div class="date">${index.obj.Validity.From}</div></div>
                <div class="until"><div class="label">Until:</div><div class="date">${index.obj.Validity.Until}</div></div>
            </div>`
        html += "</div>"
        html += "<div class=\"context\">"
        html += "<div class=\"title\">Context References</div>"
        html += "<dl>"
        for (const key1 of this.typedKeys(index.obj.Context)) {
            const ns = index.obj.Context[key1]
            for (const key2 of this.typedKeys(ns)) {
                const value = ns[key2]
                html += `<dt><a name="ctx-${key1}-${key2}">${key1}<span class="rarr">&#x25B6;</span><strong>${key2}</strong></a></dt>
                    <dd>${value}</dd>`
            }
        }
        html += "</dl>"
        html += "</div>"
        */

        /*  generate individual aspects  */
        const aspects = this.repo.getAspects()
        if (format === "prose")
            html += "<ul>"
        for (const aspect of aspects) {
            html += `<div class="aspect aspect-${format}">`

            if (format === "card") {
                html += `<div class="title"><a name="${aspect.obj.Id}">${aspect.obj.Id}: ${aspect.obj.Name}</a></div>`

                html += "<div class=\"header\">"

                html += "<div class=\"header-left\">"
                html += "<div class=\"subtitle\">OBJECTIVE</div>"
                const objective = this.md2html(aspect.obj.Objective)
                html += `<div class="objective">${objective}</div>`
                html += "</div>"

                if (aspect.obj.Editing) {
                    html += "<div class=\"header-right-1\">"
                    html += "<div class=\"subtitle\">EDITING</div>"
                    html += `<div class="row"><div class="label">Created</div><div class="date">${aspect.obj.Editing.Created}</div></div>
                            <div class="row"><div class="label">Modified</div><div class="date">${aspect.obj.Editing.Modified}</div></div>`
                    html += "</div>"
                }

                if (aspect.obj.Validity) {
                    html += "<div class=\"header-right-2\">"
                    html += "<div class=\"subtitle\">VALIDITY</div>"
                    html += `<div class="row"><div class="label">From</div><div class="date">${aspect.obj.Validity.From}</div></div>
                            <div class="row"><div class="label">Until</div><div class="date">${aspect.obj.Validity.Until}</div></div>`
                    html += "</div>"
                }

                html += "</div>"
            }
            else if (format === "prose") {
                html += "<li>"
                html += `<span class="id"><a name="${aspect.obj.Id}">${aspect.obj.Id}</span>: `
                html += `<span class="name">${aspect.obj.Name}</a></span><br/>`
                const objective = this.md2html(aspect.obj.Objective)
                html += `<span class="objective">${objective}</span>`
            }

            if (format === "card") {
                html += "<div class=\"subtitle\">ASSESSMENT</div>"
                html += "<div class=\"assessment\">"
            }
            else if (format === "prose")
                html += "<ul>"

            const assessments = this.typedKeys(aspect.obj.Assessment).toSorted().toReversed()
                .map((key) => aspect.obj.Assessment[key])
                .filter((ass) => ass !== undefined)
            if (format === "card") {
                html += "<div class=\"space\">"
                if (assessments.length > 1) {
                    html += `<div class="bg">
                        <svg viewBox="0 0 100 100" preserveAspectRatio="none">
                            <polygon class="triangle-top" points="0,0 100,0 0,100"/>
                            <polygon class="triangle-bottom" points="100,0 100,100 0,100"/>
                        </svg>
                    </div>`
                    const label1 = assessments
                        .filter((ass) => ass.Optimize !== undefined)
                        .map((ass) => ass.Optimize!)
                        .find((_, i) => i === 0)
                    if (label1 === undefined)
                        throw new Error(`first/top Optimize information missing in assessment of aspect ${aspect.obj.Id}`)
                    const label2 = assessments
                        .filter((ass) => ass.Optimize !== undefined)
                        .map((ass) => ass.Optimize!)
                        .find((_, i) => i === 1) ?? "??"
                    if (label2 === undefined)
                        throw new Error(`second/buttom Optimize information missing in assessment of aspect ${aspect.obj.Id}`)
                    html += `<div class="optimize-top">${label1}</div>`
                    html += `<div class="optimize-bottom">${label2}</div>`
                }
                else
                    html += "<div class=\"bg empty\"></div>"
                html += "</div>"
            }

            if (format === "card") {
                const types: string[] = []
                for (let i = 0; i < assessments.length; i++)
                    types[i] = "NONE"
                const A = this.typedKeys(aspect.obj.Assessment)
                    .toSorted().toReversed()
                    .map((key) => aspect.obj.Assessment[key]!)
                for (let i = 0; i < A.length; i++) {
                    for (const type of [ "WONT", "MAY", "SHOULD", "MUST" ] as const) {
                        const idx = A[i].Assess?.findIndex((x) => (x as any)[type]?.match(/^ctx:Control\.msg-CTO$/)) ?? -1
                        if (idx !== -1) {
                            for (let j = i; j <= A.length; j++)
                                types[j] = (type === "MUST" && j > i ? "NONE" : type)
                            break
                        }
                    }
                }

                html += "<div class=\"levels\">"
                let i = 0
                for (const level of this.typedKeys(aspect.obj.Assessment).toSorted().toReversed()) {
                    const assessment = aspect.obj.Assessment[level]!
                    const type = types[i++]
                    html += `<div class="level ${type}">`
                    html += "<div class=\"color\">"
                    html += "</div>"
                    html += "<div class=\"name\">"
                    html += `    <a name="${aspect.obj.Id}-${assessment.Id}">${assessment.Id}</a>`
                    html += "</div>"
                    html += "<div class=\"info\">"
                    html += "    <div class=\"row\">"
                    html += "         <div class=\"label what\">What</div>"
                    html += `         <div class="value what">${this.md2html(assessment.What)}</div>`
                    html += "    </div>"
                    if (assessment.Why) {
                        html += "    <div class=\"row\">"
                        html += "         <div class=\"label why\">Why</div>"
                        html += `         <div class="value why">${this.md2html(assessment.Why)}</div>`
                        html += "    </div>"
                    }
                    if (assessment.Assess) {
                        html += "    <div class=\"row\">"
                        html += "         <div class=\"label assess\">Assess</div>"
                        html += "         <div class=\"value assess\">"
                        let first = true
                        for (const ass of assessment.Assess) {
                            if (!first)
                                html += ", "
                            else
                                first = false
                            if (ass.MUST !== undefined)
                                html += `${this.ref2html(ass.MUST)}: <span class="assess">MUST</span>`
                            else if (ass.SHOULD !== undefined)
                                html += `${this.ref2html(ass.SHOULD)}: <span class="assess">SHOULD</span>`
                            else if (ass.MAY !== undefined)
                                html += `${this.ref2html(ass.MAY)}: <span class="assess">MAY</span>`
                            else if (ass.WONT !== undefined)
                                html += `${this.ref2html(ass.WONT)}: <span class="assess">WONT</span>`
                        }
                        html += "         </div>"
                        html += "    </div>"
                    }
                    if (assessment.SotA) {
                        html += "    <div class=\"row\">"
                        html += "         <div class=\"label sota\">SotA</div>"
                        html += `         <div class="value sota">${this.md2html(assessment.SotA)}</div>`
                        html += "    </div>"
                    }
                    html += "</div>"
                    html += "</div>"
                }
                html += "</div>"
                html += "</div>"
            }
            if (format === "prose") {
                for (const level of this.typedKeys(aspect.obj.Assessment).toSorted().toReversed()) {
                    const assessment = aspect.obj.Assessment[level]!
                    const types = [ "MUST", "SHOULD", "MAY"  ] as const
                    const idx = assessment.Assess?.findIndex((a) => types.some((x) => a[x] !== undefined)) ?? -1
                    if (idx === -1)
                        continue
                    html += "<li>"
                    html += "<span class=\"id\">" + assessment.Id + "</span>: "
                    let first = true
                    for (const type of types) {
                        for (const ass of assessment.Assess!) {
                            if (ass[type] !== undefined) {
                                if (!first)
                                    html += ", and "
                                else
                                    first = false
                                html += `${this.ref2html(ass[type])} demands you `
                                html += `<span class="assess">${type}</span>`
                            }
                        }
                    }
                    html += ": "
                    html += "<span class=\"quote\">&laquo;</span>"
                    html += "<span class=\"what\">" + this.md2html(assessment.What) + "</span>"
                    html += "<span class=\"quote\">&raquo;</span>"
                    if (assessment.Why) {
                        html += ", because of "
                        html += "<span class=\"quote\">&laquo;</span>"
                        html += this.md2html(assessment.Why)
                        html += "<span class=\"quote\">&raquo;</span>"
                    }
                    html += "."
                    if (assessment.SotA) {
                        html += " <span class=\"sota\">For this you can use: "
                        html += "<span class=\"quote\">&laquo;</span>"
                        html += this.md2html(assessment.SotA)
                        html += "<span class=\"quote\">&raquo;</span>.</span>"
                    }
                    html += "</li>"
                }
                html += "</ul>"
            }

            if ((aspect.obj.Relations?.length ?? 0) > 0) {
                if (format === "card") {
                    html += "<div class=\"subtitle\">RELATIONS</div>"
                    html += "<div class=\"relations\">"
                    html += "<div class=\"column\">"
                    for (const type of [ "Scope", "Context", "Support", "Demand", "Responsible", "See-Also" ] as const) {
                        const entries = aspect.obj.Relations!.filter((relation) => relation[type])
                        if (type === "Demand") {
                            html += "</div>"
                            html += "<div class=\"column\">"
                        }
                        if (entries.length > 0) {
                            html += "<div class=\"row\">\n"
                            html += `    <div class="type">${type}</div>\n`
                            html += "    <div class=\"refs\">\n"
                            let refs = ""
                            for (const entry of entries)
                                refs += (refs !== "" ? ", " : "") + this.ref2html(entry[type]!)
                            html += refs
                            html += "    </div>\n"
                            html += "</div>\n"
                        }
                    }
                    html += "</div>"
                    html += "</div>"
                    html += "</div>"
                }
            }

            if (format === "prose")
                html += "</li>"
        }
        if (format === "prose")
            html += "</ul>"

        /*  inject into HTML template  */
        let template = await fs.promises.readFile(path.join(__dirname, "..", "src", "rulebook-generator.html"), "utf8")
        template = template.replace(/@css@/,  css)
        template = template.replace(/@html@/, html)
        return template
    }
}
