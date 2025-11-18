/*
**  Rulebook - Policy Rule Rendering Application
**  Copyright (c) 2025 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

/*  external dependencies  */
import { marked }            from "marked"
import { markedSmartypants } from "marked-smartypants"

/*  cross dependencies  */
import iconSVG               from "../../rulebook-2-rnd/dst-stage1/rulebook-icon.svg"
import templateHTML          from "../../rulebook-2-rnd/dst-stage1/rulebook.html?raw"
import templateCSS           from "../../rulebook-2-rnd/dst-stage1/rulebook.css?raw"
import templateJS            from "../../rulebook-2-rnd/dst-stage2/rulebook.umd.js?raw"
import { Generator }         from "./rulebook-utils"

/*  internal dependencies  */
import {
    type Rulebook
} from "./rulebook"

/*  activate Marked plugin  */
marked.use(markedSmartypants())

/*  rulebook generator  */
export class RulebookGenerator {
    /*  constructor  */
    constructor (
        private repo: Rulebook
    ) {}

    /*  escape HTML special characters  */
    private escapeHtml (text: string) {
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;")
    }

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
            return `<a href="#ctx-${this.escapeHtml(m[1])}-${this.escapeHtml(m[2])}">${this.escapeHtml(m[1])}<span class="rarr">&#x25B6;</span>` +
                `<strong>${this.escapeHtml(m[2])}${m[3] ? " # " + this.escapeHtml(m[3]) : ""}</strong></a>`
        else if ((m = ref.match(/^aspect:(.+)$/)) !== null) {
            const name = m[1]
            if ((m = name.match(/^(.+)#(.+)$/)) !== null)
                return `<a href="#${this.escapeHtml(m[1])}-${this.escapeHtml(m[2])}"><strong>${this.escapeHtml(m[1])}</strong>` +
                    `<span class="rarr">&#x25B7;</span><strong>${this.escapeHtml(m[2])}</strong></a>`
            else
                return `<a href="#${this.escapeHtml(name)}"><strong>${this.escapeHtml(name)}</strong></a>`
        }
        else if (ref.match(/^https?:.+/))
            return `<a href="${this.escapeHtml(ref)}">${this.escapeHtml(ref)}</a>`
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

        const html = new Generator()

        /*  generate prolog from index  */
        html.group("<div class=\"cover\">", "</div>", (html) => {
            html.add(`<div class="title">${index.obj.Name}</div>`)
            const description = this.md2html(index.obj.Description)
            html.add(`<div class="description">${description}</div>`)
            html.add(`<div class="version">Version: ${index.obj.Version}</div>`)
            /*
            html.group("<div class=\"editing\">", "</div>", (html) => {
                html.add("<div class=\"label\">Editing:</div>")
                html.add(`<div class="created"><div class="label">Created:</div><div class="date">${index.obj.Editing.Created}</div></div>`)
                html.add(`<div class="modified"><div class="label">Modified:</div><div class="date">${index.obj.Editing.Modified}</div></div>`)
            })
            html.group("<div class=\"validity\">, "</div>", (html) => {
                html.add("<div class=\"label\">Validity:</div>")
                html.add(`<div class="from"><div class="label">From:</div><div class="date">${index.obj.Validity.From}</div></div>`)
                html.add(`<div class="until"><div class="label">Until:</div><div class="date">${index.obj.Validity.Until}</div></div>`)
            })
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
        })

        /*  generate individual aspects  */
        const aspects = this.repo.getAspects()
        if (format === "prose") {
            html.add("<ul>")
            html.open()
        }
        for (const aspect of aspects) {
            if (format === "prose") {
                html.add("<li>")
                html.open()
            }
            html.group(`<div class="aspect aspect-${format}">`, "</div>", (html) => {
                if (format === "card") {
                    html.add(`<div class="title"><a name="${aspect.obj.Id}">${aspect.obj.Id}: ${aspect.obj.Name}</a></div>`)
                    html.group("<div class=\"header\">", "</div>", (html) => {
                        html.group("<div class=\"header-left\">", "</div>", (html) => {
                            html.add("<div class=\"subtitle\">OBJECTIVE</div>")
                            const objective = this.md2html(aspect.obj.Objective)
                            html.add(`<div class="objective">${objective}</div>`)
                        })
                        if (aspect.obj.Editing !== undefined) {
                            html.group("<div class=\"header-right-1\">", "</div>", (html) => {
                                html.add("<div class=\"subtitle\">EDITING</div>")
                                html.group("<div class=\"row\">", "</div>", (html) => {
                                    html.add(`<div class="label">Created</div><div class="date">${aspect.obj.Editing!.Created}</div>`)
                                })
                                html.group("<div class=\"row\">", "</div>", (html) => {
                                    html.add(`<div class="label">Modified</div><div class="date">${aspect.obj.Editing!.Modified}</div>`)
                                })
                            })
                        }
                        if (aspect.obj.Validity !== undefined) {
                            html.group("<div class=\"header-right-2\">", "</div>", (html) => {
                                html.add("<div class=\"subtitle\">VALIDITY</div>")
                                html.group("<div class=\"row\">", "</div>", (html) => {
                                    html.add(`<div class="label">From</div><div class="date">${aspect.obj.Validity!.From}</div>`)
                                })
                                html.group("<div class=\"row\">", "</div>", (html) => {
                                    html.add(`<div class="label">Until</div><div class="date">${aspect.obj.Validity!.Until}</div>`)
                                })
                            })
                        }
                    })
                }
                else if (format === "prose") {
                    html.group(`<a name="${aspect.obj.Id}">`, "</a>", (html) => {
                        html.group("<span class=\"title\">", "</span>", (html) => {
                            html.add(`<span class="id">${aspect.obj.Id}</span>: `)
                            html.add(`<span class="name">${aspect.obj.Name}</span>`)
                        })
                    })
                    html.add("<br/>")
                    const objective = this.md2html(aspect.obj.Objective)
                    html.add(`<span class="objective">${objective}</span>`)
                }

                if (format === "card")
                    html.add("<div class=\"subtitle\">ASSESSMENT</div>")
                html.group(format === "card" ? "<div class=\"assessment\">" : "<ul>", format === "card" ? "</div>" : "</ul>", (html) => {
                    const assessmentLevels = this.typedKeys(aspect.obj.Assessment).toSorted((a, b) => b.localeCompare(a))
                    const assessments = assessmentLevels
                        .map((key) => aspect.obj.Assessment[key])
                        .filter((ass) => ass !== undefined)
                    if (format === "card") {
                        html.group("<div class=\"space\">", "</div>", (html) => {
                            if (assessments.length > 1) {
                                html.add(`<div class="bg">
                                    <svg viewBox="0 0 100 100" preserveAspectRatio="none">
                                        <polygon class="triangle-top" points="0,0 100,0 0,100"/>
                                        <polygon class="triangle-bottom" points="100,0 100,100 0,100"/>
                                    </svg>
                                </div>`)
                                const optimizeLabels = assessments
                                    .filter((ass) => ass.Optimize !== undefined)
                                    .map((ass) => ass.Optimize!)
                                const optimizeTop = optimizeLabels[0]
                                if (optimizeTop === undefined)
                                    throw new Error(`first/top Optimize information missing in assessment of aspect ${aspect.obj.Id}`)
                                const optimizeBottom = optimizeLabels[1]
                                if (optimizeBottom === undefined)
                                    throw new Error(`second/bottom Optimize information missing in assessment of aspect ${aspect.obj.Id}`)
                                html.add(`<div class="optimize-top">${optimizeTop}</div>`)
                                html.add(`<div class="optimize-bottom">${optimizeBottom}</div>`)
                            }
                            else
                                html.add("<div class=\"bg empty\"></div>")
                        })
                    }

                    if (format === "card") {
                        const types: string[] = []
                        for (let i = 0; i < assessments.length; i++)
                            types[i] = "NONE"
                        const A = assessmentLevels.map((key) => aspect.obj.Assessment[key]!)
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
                        html.group("<div class=\"levels\">", "</div>", (html) => {
                            let i = 0
                            for (const level of assessmentLevels) {
                                const assessment = aspect.obj.Assessment[level]!
                                const type = types[i++]
                                html.group(`<div class="level ${type}">`, "</div>", (html) => {
                                    html.add("<div class=\"color\"></div>")
                                    html.group("<div class=\"name\">", "</div>", (html) => {
                                        html.add(`<a name="${aspect.obj.Id}-${assessment.Id}">${assessment.Id}</a>`)
                                    })
                                    html.group("<div class=\"info\">", "</div>", (html) => {
                                        html.group("<div class=\"row\">", "</div>", (html) => {
                                            html.add("<div class=\"label what\">What</div>")
                                            html.add(`<div class="value what">${this.md2html(assessment.What)}</div>`)
                                        })
                                        if (assessment.Why) {
                                            html.group("<div class=\"row\">", "</div>", (html) => {
                                                html.add("<div class=\"label why\">Why</div>")
                                                html.add(`<div class="value why">${this.md2html(assessment.Why!)}</div>`)
                                            })
                                        }
                                        if (assessment.Assess) {
                                            html.group("<div class=\"row\">", "</div>", (html) => {
                                                html.add("<div class=\"label assess\">Assess</div>")
                                                html.group("<div class=\"value assess\">", "</div>", (html) => {
                                                    let first = true
                                                    for (const ass of assessment.Assess!) {
                                                        if (!first)
                                                            html.append(", ")
                                                        else
                                                            first = false
                                                        if (ass.MUST !== undefined)
                                                            html.append(`${this.ref2html(ass.MUST)}: <span class="assess">MUST</span>`)
                                                        else if (ass.SHOULD !== undefined)
                                                            html.append(`${this.ref2html(ass.SHOULD)}: <span class="assess">SHOULD</span>`)
                                                        else if (ass.MAY !== undefined)
                                                            html.append(`${this.ref2html(ass.MAY)}: <span class="assess">MAY</span>`)
                                                        else if (ass.WONT !== undefined)
                                                            html.append(`${this.ref2html(ass.WONT)}: <span class="assess">WONT</span>`)
                                                    }
                                                })
                                            })
                                        }
                                        if (assessment.SotA) {
                                            html.group("<div class=\"row\">", "</div>", (html) => {
                                                html.add("<div class=\"label sota\">SotA</div>")
                                                html.add(`<div class="value sota">${this.md2html(assessment.SotA!)}</div>`)
                                            })
                                        }
                                    })
                                })
                            }
                        })
                    }
                    if (format === "prose") {
                        for (const level of this.typedKeys(aspect.obj.Assessment).toSorted((a, b) => b.localeCompare(a))) {
                            const assessment = aspect.obj.Assessment[level]!
                            const types = [ "MUST", "SHOULD", "MAY"  ] as const
                            const idx = assessment.Assess?.findIndex((a) => types.some((x) => a[x] !== undefined)) ?? -1
                            if (idx === -1)
                                continue
                            html.group("<li>", "</li>", (html) => {
                                html.add("<span class=\"id\">" + assessment.Id + "</span>: ")
                                let first = true
                                for (const type of types) {
                                    for (const ass of assessment.Assess!) {
                                        if (ass[type] !== undefined) {
                                            if (!first)
                                                html.append(", and ")
                                            else
                                                first = false
                                            html.append(`${this.ref2html(ass[type])} demands you `)
                                            html.append(`<span class="assess">${type}</span>`)
                                        }
                                    }
                                }
                                html.append(": ")
                                html.append("<span class=\"quote\">&laquo;</span>")
                                html.append("<span class=\"what\">" + this.md2html(assessment.What) + "</span>")
                                html.append("<span class=\"quote\">&raquo;</span>")
                                if (assessment.Why) {
                                    html.append(", because of ")
                                    html.append("<span class=\"quote\">&laquo;</span>")
                                    html.append(this.md2html(assessment.Why))
                                    html.append("<span class=\"quote\">&raquo;</span>")
                                }
                                html.append(".")
                                if (assessment.SotA) {
                                    html.append(" <span class=\"sota\">For this you can use: ")
                                    html.append("<span class=\"quote\">&laquo;</span>")
                                    html.append(this.md2html(assessment.SotA))
                                    html.append("<span class=\"quote\">&raquo;</span>.</span>")
                                }
                            })
                        }
                    }
                })

                if (format === "card") {
                    if ((aspect.obj.Relations?.length ?? 0) > 0) {
                        html.add("<div class=\"subtitle\">RELATIONS</div>")
                        html.group("<div class=\"relations\">", "</div>", (html) => {
                            html.group("<div class=\"column\">", "</div>", (html) => {
                                for (const type of [ "Scope", "Context", "Support", "Demand", "Responsible", "See-Also" ] as const) {
                                    const entries = aspect.obj.Relations!.filter((relation) => relation[type])
                                    if (type === "Demand") {
                                        html.add("</div>")
                                        html.add("<div class=\"column\">")
                                    }
                                    if (entries.length > 0) {
                                        html.group("<div class=\"row\">\n", "</div>", (html) => {
                                            html.add(`<div class="type">${type}</div>\n`)
                                            html.group("<div class=\"refs\">", "</div>", (html) => {
                                                let refs = ""
                                                for (const entry of entries)
                                                    refs += (refs !== "" ? ", " : "") + this.ref2html(entry[type]!)
                                                html.add(refs)
                                            })
                                        })
                                    }
                                }
                            })
                        })
                    }
                }
            })
            if (format === "prose") {
                html.close()
                html.add("</li>")
            }
        }
        if (format === "prose") {
            html.close()
            html.add("</ul>")
        }

        /*  inject into HTML template  */
        let template = templateHTML
        template = template.replace(/@icon@/, iconSVG)
        template = template.replace(/@js@/,   templateJS)
        template = template.replace(/@css@/,  templateCSS)
        template = template.replace(/@html@/, html.render(4, 2))
        return template
    }
}

