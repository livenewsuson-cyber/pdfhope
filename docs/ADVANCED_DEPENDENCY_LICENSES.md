# Browser converter dependencies

Reviewed 2026-10-16. Versions are pinned by pnpm-lock.yaml; no runtime CDN scripts or document-processing API is used.

| Dependency | Selected version | License | Purpose |
| --- | --- | --- | --- |
| postal-mime | 4.0.6 | MIT | Standard MIME email parsing with nesting/part/header limits |
| @kenjiuno/msgreader | 1.29.0 | Apache-2.0 | Outlook MSG compound-file parsing |
| papaparse | 5.7.0 | MIT | CSV quoting and delimiter detection |
| htmlparser2 | 12.0.0 | MIT | Inert HTML token parsing; never inserts HTML into the browser DOM |
| marked | 18.1.1 | MIT | Notebook Markdown parsing before the safe block renderer |
| tiff | 7.1.3 | MIT | Bounded TIFF image decoding in a worker |
| @pdf-lib/fontkit | 1.1.1 | MIT | Embedded Unicode PDF font subsets |
| buffer / stream-browserify / events | 6.0.3 / 3.0.0 / 3.3.0 | MIT | Browser compatibility for the MSG encoding dependency |
| Noto Sans Regular/Bold | bundled static fonts | SIL Open Font License 1.1 | Local PDF typography; license included in public/fonts/OFL.txt |
| cfb | 1.2.2 | Apache-2.0 | Development-only synthetic MSG fixture writing |

Existing pdf-lib, PDF.js, fflate and vendored qpdf licenses remain in place. Transitive licenses are retained in installed package distributions; this review does not replace ongoing dependency/security updates.

Primary documentation: https://github.com/postalsys/postal-mime , https://github.com/HiraokaHyperTools/msgreader , https://www.papaparse.com/docs , https://github.com/image-js/tiff , https://github.com/notofonts/noto-fonts . MSG browser interoperability was tested against the built worker, rather than inferred from Node tests.
