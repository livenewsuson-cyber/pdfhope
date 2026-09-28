Vendored qpdf-run 0.2.1 from the npm package with SHA-512 integrity
`X4ZknJPl7av/o+VEX3XafWyzfOUm9qSoa+JqXS+hGSNVI1Wxk60bKhmLvvX/8gp7pCzbp3KW0zY8aLBjL5EkYQ==`.

The wrapper is MIT-licensed (see LICENSE). Its bundled QPDF 11.10.0 WASM
runtime is Apache-2.0-licensed (see QPDF-LICENSE.txt). PDFHope modified
`src/browserRunner.js` to terminate a worker if initialization fails.

The QPDF 11.10.0 bundle supports structural stream and object optimization,
but not `--jpeg-quality`; PDFHope does not use its default-quality lossy
`--optimize-images` pass in Recommended mode.
