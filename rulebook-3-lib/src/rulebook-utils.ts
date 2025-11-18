/*
**  Rulebook - Policy Rule Rendering Application
**  Copyright (c) 2025 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

/*  helper class for generation of nested text  */
export class Generator {
    private content: (string | Generator)[] = []
    private child: Generator | null = null

    /*  add content (on new line)  */
    add (content: string): void {
        if (this.child)
            return this.child.add(content)
        this.content.push(content)
    }

    /*  append content (on existing or new line)  */
    append (content: string): void {
        if (this.child)
            return this.child.append(content)
        if (this.content.length === 0)
            this.content.push(content)
        else
            this.content[this.content.length - 1] += content
    }

    /*  open a sub-level  */
    open (): Generator {
        if (this.child)
            return this.child.open()
        const generator = new Generator()
        this.content.push(generator)
        this.child = generator
        return generator
    }

    /*  close a sub-level  */
    close (): void {
        if (this.child === null)
            throw new Error("already at top-level")
        if (this.child.child !== null)
            return this.child.close()
        else
            this.child = null
    }

    /*  open/enter/close a sub-level  */
    sub (body: (generator: Generator) => void): void {
        if (this.child)
            return this.child.sub(body)
        const generator = this.open()
        body(generator)
        this.close()
    }

    /*  append prolog line, open/enter/close a sub-level, and append epilog  */
    group (open: string, close: string, body: (generator: Generator) => void): void {
        if (this.child)
            return this.child.group(open, close, body)
        this.add(open)
        this.sub(body)
        this.add(close)
    }

    /*  render the text  */
    render (indent = 4, level = 0): string {
        if (this.child)
            return this.child.render(indent)
        const pad = " ".repeat(indent)
        const renderLevel = (level: number, content: (string | Generator)[]) => {
            let text = ""
            for (const entry of content) {
                if (typeof entry === "string")
                    text += pad.repeat(level) + entry + "\n"
                else if (typeof entry === "object" && entry instanceof Generator)
                    text += renderLevel(level + 1, entry.content)
            }
            return text
        }
        return renderLevel(level, this.content)
    }
}
