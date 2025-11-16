/*
**  Rulebook - Policy Rule Rendering Application
**  Copyright (c) 2025 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

import { parseDocument } from "yaml"

/*  internal dependencies  */
import { type IndexType, type AspectType }    from "./rulebook-schema"
import { RulebookParser, RulebookParseError } from "./rulebook-parser"
import { RulebookGenerator }                  from "./rulebook-generator"
import { RulebookSerializer }                 from "./rulebook-serializer"

/*  exported error class  */
export { RulebookParseError }

/*  CST type  */
export type RulebookArtifactCST = ReturnType<typeof parseDocument>

/*  artifact container  */
export class RulebookArtifact<T extends object> {
    constructor (
        public obj:  T,
        public file  = "",
        public yaml  = "",
        public cst:  RulebookArtifactCST | null = null
    ) {}
}

/*  rulebook  */
export class Rulebook {
    /*  internal state  */
    private index:   RulebookArtifact<IndexType> | null = null
    private aspects: RulebookArtifact<AspectType>[] = []

    /*  parser, generator, and serializer  */
    private parser:     RulebookParser
    private generator:  RulebookGenerator
    private serializer: RulebookSerializer

    /*  constructor  */
    constructor () {
        this.parser     = new RulebookParser(this)
        this.generator  = new RulebookGenerator(this)
        this.serializer = new RulebookSerializer(this)
    }

    /*  create artifact (used by parser)  */
    createArtifact<T extends object> (
        obj:  T,
        file: string,
        yaml: string,
        cst:  RulebookArtifactCST
    ): RulebookArtifact<T> {
        return new RulebookArtifact(obj, file, yaml, cst)
    }

    /*  access to index (used by parser and generator)  */
    getIndex (): RulebookArtifact<IndexType> | null {
        return this.index
    }

    /*  set index (used by parser)  */
    setIndex (index: RulebookArtifact<IndexType>) {
        this.index = index
    }

    /*  access to aspects (used by parser and generator)  */
    getAspects (): RulebookArtifact<AspectType>[] {
        return this.aspects
    }

    /*  add aspect (used by parser)  */
    addAspect (aspect: RulebookArtifact<AspectType>) {
        this.aspects.push(aspect)
    }

    /*  find aspect by id (used by parser)  */
    findAspectById (id: string): RulebookArtifact<AspectType> | undefined {
        return this.aspects.find((aspect) => aspect.obj.Id === id)
    }

    /*  clear aspects (used by serializer)  */
    clearAspects () {
        this.aspects = []
    }

    /*  export rulebook to JSON  */
    export () {
        return this.serializer.export()
    }

    /*  import rulebook from JSON  */
    import (json: string) {
        this.serializer.import(json)
    }

    /*  parse index YAML specification  */
    parseIndex (file: string, yaml: string) {
        this.parser.parseIndex(file, yaml)
    }

    /*  parse aspect YAML specification  */
    parseAspect (file: string, yaml: string) {
        this.parser.parseAspect(file, yaml)
    }

    /*  validate cross-references  */
    validateCrossRefs () {
        this.parser.validateCrossRefs()
    }

    /*  generate HTML output  */
    async print (format = "card") {
        return this.generator.print(format)
    }
}
