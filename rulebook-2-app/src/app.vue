<!--
**
**  Rulebook - Policy Rule Rendering Application
**  Copyright (c) 2025 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
**
-->

<template>
    <div class="app">
        <div class="logo">
            <img class="logo-black" v-bind:src="logoB"/>
            <img class="logo-white" v-bind:src="logoW"/>
        </div>
        HELLO!
    </div>
</template>

<style lang="stylus">
.app
    position: relative
    width:   100vw
    height:  100vh
    margin:  0
    padding: 0
    display: flex
    flex-direction: column
    justify-content: center
    align-items: center
    .logo img
        height: 6rem
        width: auto
        margin-top: 1rem
        margin-bottom: 2rem
.app.theme-light .logo-white
    display: none
.app.theme-dark .logo-black
    display: none
</style>

<script setup lang="ts">
import { defineComponent }  from "vue"
import moment               from "moment"
import logoB                from "./app-logo-black.svg?url"
import logoW                from "./app-logo-white.svg?url"
import pkg                  from "../../package.json" with { type: "json" }
</script>

<script lang="ts">
export default defineComponent({
    name: "app",
    components: {
    },
    data: () => ({
        logoB,
        logoW,
        version: pkg.version
    }),
    created () {
    },
    mounted () {
        /*  remove the potentially existin hash (in case of an exit)  */
        history.replaceState(null, document.title, window.location.pathname + window.location.search)
    },
    methods: {
        log (level: string, msg: string, data: { [ key: string ]: any } | null = null) {
            const timestamp = moment().format("YYYY-MM-DD hh:mm:ss.SSS")
            let output = `${timestamp} [${level}]: ${msg}`
            if (data !== null)
                output += ` (${Object.keys(data)
                    .map((key) => key + ": " + JSON.stringify(data[key]))
                    .join(", ")
                })`
            console.log(output)
        }
    }
})
</script>

