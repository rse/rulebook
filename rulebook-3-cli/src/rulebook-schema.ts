/*
**  Rulebook - Policy Rule Rendering Application
**  Copyright (c) 2025 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

import { type } from "arktype"

/*  ==== utility schema definitions ====  */

const RefURL = type("string").narrow((s, ctx) =>
    /^https?:.+$/.test(s)
        || ctx.mustBe("a URL reference (e.g. https://foo.bar.quux/)"))

const RefEmail = type("string").narrow((s, ctx) =>
    /^.+?@[a-z0-9_][a-z0-9_-]+(?:\.[a-z0-9_][a-z0-9_-]+)*$/.test(s)
        || ctx.mustBe("an email address (e.g. foo@bar.quux)"))

const RefMD = type("string").narrow((s, ctx) =>
    /^md:.+$/.test(s)
        || ctx.mustBe("a prose reference in Markdown format"))

const RefCtx = type("string").narrow((s, ctx) =>
    /^ctx:([A-Za-z][A-Za-z0-9_-]*(?:\.[A-Za-z][A-Za-z0-9_-]*)*)(?:#(.+))?$/.test(s)
        || ctx.mustBe("a context reference (e.g. ctx:Foo.Bar.Quux)"))

const RefAspect = type("string").narrow((s, ctx) =>
    /^aspect:[A-Za-z0-9_-]+(?:#.+)?$/.test(s)
        || ctx.mustBe("an aspect reference (e.g. aspect:FOO-BAR-QUUX)"))

const Date = type("string").narrow((s, ctx) =>
    /^20\d{2}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(s)
        || ctx.mustBe("a date in YYYY-MM-DD format"))

const Editing  = type({ "Created": Date, "Modified": Date })
const Validity = type({ "From": Date, "Until": type.or(Date, type("'...'")) })

/*  ==== index schema definition ====  */

export const IndexSchema = type({
    "Editing":          Editing,
    "Validity":         Validity,
    "Id":               "string",
    "Name":             "string",
    "Logo?":            type({
        "Light":        "string",
        "Dark":         "string"
    }),
    "Version":          "string",
    "Author":           type({
        "Name":         "string",
        "Email":        RefEmail,
        "Web":          RefURL
    }),
    "Description":      "string",
    "Context":          type({
        "[string]":     type({
            "[string]": "string"
        })
    }),
    "+":                "reject"
})

export type IndexType = typeof IndexSchema.infer

/*  ==== aspect schema definition ====  */

const AssessStatement = type({
    "MUST?":            RefCtx,
    "SHOULD?":          RefCtx,
    "MAY?":             RefCtx,
    "WONT?":            RefCtx,
    "+":                "reject"
})

const AssessmentLevel = type({
    "Id":               "string",
    "What":             "string",
    "Why?":             "string",
    "Assess?":          AssessStatement.array(),
    "SotA?":            "string",
    "Optimize?":        "string",
    "+":                "reject"
})

const Assessment = type({
    "Level-9?":         AssessmentLevel,
    "Level-8?":         AssessmentLevel,
    "Level-7?":         AssessmentLevel,
    "Level-6?":         AssessmentLevel,
    "Level-5?":         AssessmentLevel,
    "Level-4?":         AssessmentLevel,
    "Level-3?":         AssessmentLevel,
    "Level-2?":         AssessmentLevel,
    "Level-1?":         AssessmentLevel,
    "Level-0?":         AssessmentLevel,
    "+":                "reject"
})

const Relation = type({
    "Scope?":           RefAspect,
    "Support?":         RefCtx,
    "Demand?":          RefCtx,
    "Context?":         RefCtx,
    "Responsible?":     RefCtx,
    "See-Also?":        type.or(RefCtx, RefAspect, RefURL, RefMD),
    "+":                "reject"
})

export const AspectSchema = type({
    "Editing?":         Editing,
    "Validity?":        Validity,
    "Id":               "string",
    "Name":             "string",
    "Icons?":           "string[]",
    "Objective":        "string",
    "Assessment":       Assessment,
    "Relations?":       Relation.array(),
    "+":                "reject"
})

export type AspectType = typeof AspectSchema.infer
