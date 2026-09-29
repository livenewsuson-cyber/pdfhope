OCR assets are loaded only when a visitor starts OCR PDF.

- `worker.min.js`: Tesseract.js 7.0.0 browser worker (Apache-2.0; bundled dependency notices in `worker.min.js.LICENSE.txt`).
- `core/`: Tesseract.js Core 7.0.0 LSTM-only WebAssembly variants (Apache-2.0; `core/LICENSE`).
- `eng.traineddata.gz`: English fast LSTM model from `https://tessdata.projectnaptha.com/4.0.0_fast/eng.traineddata.gz` (Tesseract tessdata_fast, Apache-2.0).

Only engine/model assets are fetched over the network. PDF bytes, rendered page images, and recognized text stay in the browser.
