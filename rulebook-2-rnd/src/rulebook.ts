/*
**  Rulebook - Policy Rule Rendering Application
**  Copyright (c) 2025 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

/*  bootstrap once the DOM is ready  */
let initialized = false
const bootstrap = () => {
    if (initialized)
        return
    initialized = true
}

if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", bootstrap, { once: true })
else
    bootstrap()

