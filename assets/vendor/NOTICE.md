# Third-party browser assets

These files are copied from npm packages by `npm run vendor` and served locally by the application.

| File | Package | License |
| --- | --- | --- |
| `pdf.min.mjs`, `pdf.worker.min.mjs` | pdfjs-dist | Apache-2.0 |
| `mammoth.browser.min.js` | mammoth | BSD-2-Clause |
| `read-excel-file.min.js` | read-excel-file | MIT |
| `jszip.min.js` | jszip | MIT OR GPL-3.0 |
| `command-center.bundle.js` | three, d3-geo, topojson-client, world-atlas | MIT / ISC |
| `experience.bundle.js` | three | MIT |
| `森林交互/forest.bundle.js` | three, lenis | MIT |

The application does not load these libraries from a third-party CDN. Review the package-specific license files in `node_modules` before redistributing a modified bundle.
