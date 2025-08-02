
<img src="https://raw.githubusercontent.com/rse/rulebook/master/rulebook-1-art/rulebook-black.svg" width="400" align="right" alt=""/>

Rulebook
========

**Policy Rule Rendering Application**

[![github (author stars)](https://img.shields.io/github/stars/rse?logo=github&label=author%20stars&color=%233377aa)](https://github.com/rse)
[![github (author followers)](https://img.shields.io/github/followers/rse?label=author%20followers&logo=github&color=%234477aa)](https://github.com/rse)

Abstract
--------

**Rulebook** is a small application for rendering, filtering and
browsing policy rules.

FIXME

Installation
------------

```
$ git clone https://github.com/rse/rulebook
$ npm install
$ npm start build
```

Usage
-----

### Development

```
$ rulebook preview -a 127.0.0.1 -p 8080 src
```

### Production

```
$ rulebook make -o dist src
$ rulebook serve   -a 127.0.0.1 -p 8080 dist
$ open http://127.0.0.1:8080
```

Design Criterias
----------------

The design of **Rulebook** strictly followed the following particular
design criterias, driven by the demands in the *msg CTO Policy* project
of Dr. Ralf S. Engelschall:

- FIXME

License
-------

Copyright &copy; 2025 Dr. Ralf S. Engelschall (http://engelschall.com/)<br/>
Licensed under [GPL 3.0](https://spdx.org/licenses/GPL-3.0-only)

