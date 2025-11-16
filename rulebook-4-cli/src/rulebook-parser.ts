/*
**  Rulebook - Policy Rule Rendering Application
**  Copyright (c) 2025 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

import { parse, parseDocument, YAMLParseError } from "yaml"
import { type }                                 from "arktype"
import sourceCodeError                          from "source-code-error"
import objectPath                               from "object-path"

/*  internal dependencies  */
import {
    type RulebookRepository,
    type RulebookArtifact,
    type RulebookArtifactCST
} from "./rulebook-repository"
import {
    type IndexType,
    IndexSchema,
    type AspectType,
    AspectSchema
} from "./rulebook-schema"

/*  custom parse error options type  */
type RulebookParseErrorOptions = {
    source?:   string
    file?:     string
    line?:     number
    column?:   number
    cause?:    Error
}

/*  custom parse error class  */
export class RulebookParseError extends Error {
    /*  additional information  */
    public source = ""
    public file   = ""
    public line   = 1
    public column = 1

    /*  extended constructor  */
    constructor (message: string, options?: RulebookParseErrorOptions) {
        super(message, options?.cause !== undefined ? { cause: options.cause } : undefined)
        this.source = options?.source ?? this.source
        this.file   = options?.file   ?? this.file
        this.line   = options?.line   ?? this.line
        this.column = options?.column ?? this.column
    }

    /*  additional rendering functionality  */
    render (colors = false) {
        if (this.source !== "" && this.file !== "" && this.line >= 1 && this.column >= 1)
            return sourceCodeError({
                message:  this.message,
                filename: this.file,
                code:     this.source,
                line:     this.line,
                column:   this.column,
                newline:  false,
                colors
            })
        else
            return `ERROR: ${this.message}`
    }
}

/*  helper function for determining line/column from YAML offset  */
const getLineColByOffset = (yaml: string, offset: number) => {
    const lines = yaml.substring(0, offset).split("\n")
    return {
        line:   lines.length,
        column: lines[lines.length - 1].length + 1
    }
}

/*  helper function for determining line/column from object path  */
const getLineColByPath = (yaml: string, cst: RulebookArtifactCST | null, path: string[]) => {
    if (yaml === "")
        return undefined
    if (cst === null)
        return undefined
    for (let i = path.length; i >= 0; i--) {
        const node = cst.getIn(path.slice(0, i), true)
        if (typeof node === "object"
            && node !== null
            && "range" in node
            && typeof node.range === "object"
            && node.range instanceof Array) {
            const [ start ] = node.range as number[]
            return getLineColByOffset(yaml, start)
        }
    }
    return undefined
}

/*  rulebook parser  */
export class RulebookParser {
    /*  constructor  */
    constructor (
        private repo: RulebookRepository
    ) {}

    /*  parse YAML specification  */
    parseYamlWithSchema<T extends ("index" | "aspect")> (
        filename:   string,
        yaml:       string,
        specType:   T,
        specSchema: T extends "index" ? typeof IndexSchema : typeof AspectSchema
    ): RulebookArtifact<T extends "index" ? IndexType : AspectType> {
        /*  syntactically parse YAML  */
        let obj: any
        try {
            obj = parse(yaml)
        }
        catch (err: any) {
            let line   = 1
            let column = 1
            let message: string
            let error:   Error
            if (err instanceof YAMLParseError) {
                message = err.message.replace(/:(?:.|\r?\n)*$/, "")
                line    = err.linePos?.[0]?.line ?? 1
                column  = err.linePos?.[0]?.col  ?? 1
                error   = err
            }
            else if (err instanceof Error) {
                message = err.message
                error   = err
            }
            else {
                message = String(err)
                error   = new Error(message)
            }
            throw new RulebookParseError(
                `failed to syntactically parse ${specType} YAML specification: ${message}`,
                { source: yaml, file: filename, line, column, cause: error })
        }

        /*  semantically parse YAML  */
        const cst = parseDocument(yaml)
        const response = specSchema(obj)
        if (response instanceof type.errors) {
            for (const error of response) {
                const path = Array.from(error.path.map((key) => key.toString()))
                const pos = getLineColByPath(yaml, cst, path)
                if (pos !== undefined)
                    throw new RulebookParseError(
                        `failed to semantically parse ${specType} YAML specification: ${error.message}`,
                        { source: yaml, file: filename, line: pos.line, column: pos.column })
            }
            throw new RulebookParseError(
                `failed to semantically parse ${specType} YAML specification`,
                { source: yaml, file: filename })
        }

        return this.repo.createArtifact(obj, filename, yaml, cst)
    }

    /*  parse index YAML specification  */
    parseIndex (file: string, yaml: string) {
        const index = this.parseYamlWithSchema(file, yaml, "index", IndexSchema)
        this.repo.setIndex(index as RulebookArtifact<IndexType>)
    }

    /*  parse aspect YAML specification  */
    parseAspect (file: string, yaml: string) {
        const aspect = this.parseYamlWithSchema(file, yaml, "aspect", AspectSchema)
        this.repo.addAspect(aspect as RulebookArtifact<AspectType>)
    }

    /*  helper function for typed object keys  */
    private typedKeys<T extends object> (obj: T): Array<keyof T> {
        return Object.keys(obj) as Array<keyof T>
    }

    /*  helper function for checking aspect references  */
    private checkRefAspect (
        where:    string,
        artifact: RulebookArtifact<IndexType | AspectType>,
        path:     string[],
        value:    string
    ) {
        const pos = getLineColByPath(artifact.yaml, artifact.cst, path)
        const m = value.match(/^aspect:([A-Za-z0-9_-]+)(?:#(.+))?$/)
        if (m === null)
            throw new RulebookParseError(`${where}: ${path.join(".")} has invalid aspect reference format`, {
                file:   artifact.file,
                source: artifact.yaml,
                line:   pos?.line   ?? 1,
                column: pos?.column ?? 1
            })
        const [ , id, sub ] = m
        const aspect = this.repo.findAspectById(id)
        if (aspect === undefined)
            throw new RulebookParseError(`${where}: ${path.join(".")} must be a valid reference: ` +
                `aspect with id "${id}" is not defined`, {
                file:   artifact.file,
                source: artifact.yaml,
                line:   pos?.line   ?? 1,
                column: pos?.column ?? 1
            })
        if (sub !== undefined) {
            const assessment = this.typedKeys(aspect.obj.Assessment).find((key) =>
                aspect.obj.Assessment[key]?.Id === sub)
            if (assessment === undefined)
                throw new RulebookParseError(`${where}: ${path.join(".")} must be a valid reference: ` +
                    `aspect with id "${id}" has no assessment with id "${sub}" defined`, {
                    file:   artifact.file,
                    source: artifact.yaml,
                    line:   pos?.line   ?? 1,
                    column: pos?.column ?? 1
                })
        }
    }

    /*  helper function for checking context references  */
    private checkRefCtx (
        where:    string,
        artifact: RulebookArtifact<IndexType | AspectType>,
        path:     string[],
        value:    string
    ) {
        const pos = getLineColByPath(artifact.yaml, artifact.cst, path)
        const m = value.match(/^ctx:([A-Za-z][A-Za-z0-9_-]*(?:\.[A-Za-z][A-Za-z0-9_-]*)*)(?:#(.+))?$/)
        if (m === null)
            throw new RulebookParseError(`${where}: ${path.join(".")} has invalid context reference format`, {
                file:   artifact.file,
                source: artifact.yaml,
                line:   pos?.line   ?? 1,
                column: pos?.column ?? 1
            })
        const [ , ref ] = m
        const index = this.repo.getIndex()
        if (index === null)
            throw new Error("index still not available")
        if (objectPath.get(index.obj.Context, ref) === undefined)
            throw new RulebookParseError(`${where}: ${path.join(".")} must be a valid reference: ` +
                `context "${ref}" is not defined in index`, {
                file:   artifact.file,
                source: artifact.yaml,
                line:   pos?.line   ?? 1,
                column: pos?.column ?? 1
            })
    }

    /*  validate cross-references  */
    validateCrossRefs () {
        const index = this.repo.getIndex()
        if (index === null)
            throw new Error("index still not available")

        /*  check all context references in aspect assessments  */
        const aspects = this.repo.getAspects()
        for (const aspect of aspects) {
            for (const key of this.typedKeys(aspect.obj.Assessment)) {
                const assessment = aspect.obj.Assessment[key]
                if (assessment === undefined)
                    continue
                if (assessment.Assess !== undefined)
                    for (let i = 0; i < assessment.Assess.length; i++)
                        for (const prop of [ "MUST", "SHOULD", "MAY", "WONT" ] as const)
                            if (assessment.Assess[i][prop] !== undefined)
                                this.checkRefCtx(`aspect with id ${aspect.obj.Id}`, aspect,
                                    [ "Assessment", key, "Assess", String(i), prop ], assessment.Assess[i][prop]!)
            }
        }

        /*  check all context and aspect references in aspect relations  */
        for (const aspect of aspects) {
            aspect.obj.Relations?.forEach((relation, i) => {
                if (relation.Scope !== undefined)
                    this.checkRefAspect(`aspect with id ${aspect.obj.Id}`, aspect,
                        [ "Relation", String(i), "Scope" ], relation.Scope)
                if (relation.Demand !== undefined)
                    this.checkRefCtx(`aspect with id ${aspect.obj.Id}`, aspect,
                        [ "Relation", String(i), "Demand" ], relation.Demand)
                if (relation.Context !== undefined)
                    this.checkRefCtx(`aspect with id ${aspect.obj.Id}`, aspect,
                        [ "Relation", String(i), "Context" ], relation.Context)
                if (relation.Responsible !== undefined)
                    this.checkRefCtx(`aspect with id ${aspect.obj.Id}`, aspect,
                        [ "Relation", String(i), "Responsible" ], relation.Responsible)
                if (relation["See-Also"] !== undefined && relation["See-Also"].match(/^ctx:/))
                    this.checkRefCtx(`aspect with id ${aspect.obj.Id}`, aspect,
                        [ "Relation", String(i), "See-Also" ], relation["See-Also"])
                if (relation["See-Also"] !== undefined && relation["See-Also"].match(/^aspect:/))
                    this.checkRefAspect(`aspect with id ${aspect.obj.Id}`, aspect,
                        [ "Relation", String(i), "See-Also" ], relation["See-Also"])
            })
        }
    }
}
