# PDFHope Search Console baseline — 2026-10-05

Property: `sc-domain:pdfhope.com` · Search type: Web · Source: Search Console API via GSC Wizard.

The latest complete date reported by Search Console was **2026-10-03** (America/Los_Angeles). The default 28-day query covered **2026-09-05 through 2026-10-02**. The difference between the reported settled-through date and the query end is retained here rather than silently shifting the window.

| Clicks | Impressions | CTR | Average position |
| ---: | ---: | ---: | ---: |
| 7 | 71 | 9.86% | 8.54 |

Page-level and query-level rows do not sum to the property totals; Search Console reports these dimensions separately and withholds some query detail. “Unreported” below means no page-query row was returned, not that the page had no searches.

## A. Quick wins and reviewed pages

Threshold: at least 5 impressions and position 4–15 on the canonical URL. The legacy split URL is shown separately because its redirect is an indexing-consolidation issue.

| Page | Impressions | Clicks | CTR | Position | Primary reported query | Secondary reported query | Decision |
| --- | ---: | ---: | ---: | ---: | --- | --- | --- |
| `/pdf-reader` | 23 | 0 | 0% | 8.00 | Unreported | Unreported | Clarify reading and search in snippet and opening copy. |
| `/orientation-analyzer` | 20 | 1 | 5% | 6.10 | Unreported | Unreported | Keep title and copy; inspect intent remains distinct from Rotate PDF. |
| `/pdf-to-word` | 14 | 0 | 0% | 11.57 | Unreported | Unreported | Clarify editable DOCX and OCR in opening copy; keep transactional title. |
| `/pdf-health-check` | 11 | 0 | 0% | 12.27 | `pdf health check`: 5 impressions, 0 clicks, 0% CTR, position 5.40 | Unreported | Clarify the report scope and snippet; link to relevant next actions. |
| `/watermark-pdf` | 9 | 0 | 0% | 11.33 | Unreported | Unreported | Clarify local processing and controls in snippet. |
| `/ocr-pdf` | 7 | 0 | 0% | 9.29 | `ocr pdf online`: 2 impressions, 0 clicks, 0% CTR, position 6.00 | `searchable pdf viewer`: 1 impression, 0 clicks, position 30; no targeting change | Clarify the outcome above the tool; retain strong title and snippet. |
| `http://www.pdfhope.com/split-pdf` | 16 | 0 | 0% | 9.25 | Unreported | Unreported | Legacy host. A single 301 leads to the matching canonical URL. |
| `/split-pdf` | 4 | 0 | 0% | 15.25 | Unreported | Unreported | Keep title and copy; canonical page is indexed. |

The first six canonical tool pages are the six quick wins reviewed in this release. `/split-pdf` was reviewed for host consolidation. `/orientation-analyzer` was deliberately left unchanged after confirming that its page describes inspection rather than rotation.

## B. Striking distance

| Page | Impressions | Position | Decision |
| --- | ---: | ---: | --- |
| `/pdf-to-jpg` | 12 | 16.92 | Observe; no reported query to support a targeted change yet. |
| `/delete-pdf-pages` | 10 | 16.90 | Observe; no reported query to support a targeted change yet. |
| `/pdf-size-breakdown` | 8 | 18.38 | Observe; no reported query to support a targeted change yet. |

## C. Discovery

`interleave pdf pages` appeared with 2 impressions at position 11.50 for `/organize-pdf`. This is a low-volume emerging query. No copy change was made from two impressions.

## Before and after copy

All seven reviewed tool titles remain unchanged. No tool canonical or slug changed. The guide for PDF to Word remains `/guides/pdf-to-word-formatting-changes`, with an informational title distinct from the `/pdf-to-word` converter.

| Page | Title before / after | Meta description before | Meta description after |
| --- | --- | --- | --- |
| `/pdf-reader` | PDF Reader – Read PDFs Privately in Your Browser \| PDFHope | Open, search, zoom, navigate, print, and inspect PDFs locally with thumbnails and document information. | Read PDFs online in your browser. Search and select existing text, navigate pages, zoom, and print locally without uploading your file. |
| `/orientation-analyzer` | Orientation Analyzer Online \| PDFHope | Find page orientations and mixed-orientation documents. | Unchanged. |
| `/pdf-to-word` | PDF to Word Converter – PDF to DOCX Online \| PDFHope | Convert PDF to editable Word DOCX with automatic OCR for scanned pages. Reconstruct text, tables, images, and layout where possible. | Unchanged. |
| `/pdf-health-check` | PDF Health Check & Document Inspector \| PDFHope | Inspect PDF size, pages, dimensions, orientation, text, metadata, and heuristic document-quality clues locally. | Check PDF health locally: file size, page count, dimensions, orientation, text presence, metadata, and likely scan clues. Download a report. |
| `/watermark-pdf` | Watermark PDF Online \| PDFHope | Apply a text watermark with opacity, angle, size, and page controls. | Add a text watermark to selected PDF pages in your browser. Set the wording, angle, size, and opacity, then download a new copy. |
| `/ocr-pdf` | OCR PDF Online – Make Scanned PDF Searchable \| PDFHope | Make scanned PDFs searchable with browser-based OCR. Recognize printed English text, preserve the original page appearance, and download a searchable PDF. | Unchanged. |
| `/split-pdf` | Split PDF by Pages or Ranges Online \| PDFHope | Split a PDF into individual pages, custom ranges, or fixed-size groups locally and download the results in a ZIP. | Unchanged. |

The opening copy changed on OCR PDF, PDF Reader, PDF to Word, and PDF Health Check. PDF Health Check gained contextual links to Orientation Analyzer and OCR PDF. No tool processing code changed.

## Indexing and sitemap at baseline

URL Inspection on 2026-10-05 returned **Submitted and indexed**, allowed indexing, successful mobile fetch, and a last crawl from 2026-09-29 to 2026-10-01 for the homepage and all seven reviewed tool pages. `/guides` and all four Batch 2 guides returned **URL is unknown to Google** with no crawl date and unspecified fetch state. The live URLs are 200, indexable, canonical, internally linked, and included in the sitemap; these are technical eligibility checks, not proof of Google indexing.

The production sitemap returned 200 and contained **64 unique canonical URLs**, including the guide index and all seven guides. Search Console's prior sitemap download (2026-10-04) still reported **56 submitted URLs**, zero warnings, and zero errors. The sitemap is to be re-submitted after this release and its later fetch checked separately. The “0 indexed” count in that sitemap report is not treated as a sitewide indexed count because individual URL Inspection results show indexed pages.

Compare the same property, Web search type, and settled 28-day window after **14–28 days**. Check query-level data and indexing again before another content change.
