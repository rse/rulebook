/*
**  Rulebook - Policy Rule Rendering Application
**  Copyright (c) 2025 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

import { type } from "arktype"

/*  internal dependencies  */
import {
    type Rulebook,
    RulebookArtifact
} from "./rulebook"
import {
    IndexSchema,
    AspectSchema
} from "./rulebook-schema"

/*  rulebook serializer  */
export class RulebookSerializer {
    constructor (
        private repo: Rulebook
    ) {}

    /*  export rulebook to JSON  */
    export () {
        const index = this.repo.getIndex()
        const aspects = this.repo.getAspects()

        /*  export to JSON  */
        return JSON.stringify({
            index:   index?.obj ?? null,
            aspects: aspects.map((aspect) => aspect.obj)
        })
    }

    /*  import rulebook from JSON  */
    import (json: string) {
        /*  parse JSON  */
        let obj: any
        try {
            obj = JSON.parse(json)
        }
        catch (err: any) {
            const message = err instanceof Error ? err.message : String(err)
            throw new Error(`failed to parse JSON: ${message}`)
        }

        /*  check top-level structure  */
        if (typeof obj !== "object" || obj === null)
            throw new Error("import structure not an object")
        if (!(typeof obj.index === "object" && obj.index !== null))
            throw new Error("import structure does not contain top-level 'index' field")
        if (!Array.isArray(obj.aspects))
            throw new Error("import structure does not contain top-level 'aspects' field")

        /*  parse sub-level index structure  */
        const index = IndexSchema(obj.index)
        if (index instanceof type.errors)
            throw new Error(`failed to import index: ${index.summary}`)
        this.repo.setIndex(new RulebookArtifact(index))

        /*  parse sub-level aspects structure  */
        this.repo.clearAspects()
        for (const _aspect of obj.aspects) {
            const aspect = AspectSchema(_aspect)
            if (aspect instanceof type.errors)
                throw new Error(`failed to import aspect: ${aspect.summary}`)
            this.repo.addAspect(new RulebookArtifact(aspect))
        }
    }
}
