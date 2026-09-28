// qpdf-run 0.2.1 is vendored because this checkout's node_modules junction points
// outside the workspace. The browser worker and 1.8 MB WASM are loaded on demand.
export async function structuralOptimize(file: File): Promise<Uint8Array> {
  const { createQpdfRunner } = await import('../../vendor/qpdf-run/src/index.js')
  const runner = await createQpdfRunner({
    workerUrl: new URL('../../vendor/qpdf-run/src/worker.js', import.meta.url),
    qpdfJsUrl: new URL('../../vendor/qpdf-run/vendor/qpdf/lib/qpdf.js', import.meta.url),
    wasmUrl: new URL('../../vendor/qpdf-run/vendor/qpdf/lib/qpdf.wasm', import.meta.url),
    timeoutMs: 10 * 60 * 1000,
  })
  try {
    return await runner.runOne({
      input: new Uint8Array(await file.arrayBuffer()),
      inputName: 'input.pdf',
      outputName: 'optimized.pdf',
      args: [
        '--compress-streams=y',
        '--decode-level=generalized',
        '--recompress-flate',
        '--compression-level=9',
        '--object-streams=generate',
        '--', 'input.pdf', 'optimized.pdf',
      ],
    })
  } finally {
    await runner.destroy()
  }
}
