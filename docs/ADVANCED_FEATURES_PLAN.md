# Advanced PDF features

2026-10-15. Feature branch codex/advanced-pdf-tools starts at production 8f54237. Original Agent and Office research checkout remains untouched. Homepage design and Coming Soon panel are retained.

## Audit and implementation order

1. Reuse PDF.js for a new /pdf-to-txt page. Extract digital text with line/page boundaries, detect empty/scanned pages and link to existing local OCR. Add Unicode and invalid-input coverage.
2. Extend Images to PDF with JFIF and bounded multipage TIFF decoding. Verify orientation, page order, unsupported compression and output page count before shipping.
3. Add isolated browser conversions for CSV, MIME EML, saved Jupyter notebooks and Outlook MSG. Use maintained parsers, bounded inputs and workers; render safe document content without executing code or loading remote content. Verify real PDF output and privacy behavior.
4. Extend existing /compress-pdf target mode rather than add a duplicate route. Add presets and quality preference, conservative minimum resolution, cancellation and bounded passes; retain selectable text unless explicitly permitted to flatten. Impossible targets must be reported honestly.
5. Extend /unlock-pdf using existing local qpdf for authorized removal of owner restrictions when empty opening password succeeds. Require authorization, retain known-password flow, inspect permissions and reopen result. Warn that rewriting invalidates signatures.
6. Document LibreOffice host design, operational limits and independently testable deployment instructions. No available managed native host is established; do not purchase, deploy or advertise live/unlimited Office conversion.

## Release gates

Commit completed features separately. Run meaningful unit and real-parser tests, typecheck, lint, build and SEO regression checks; inspect actual output files and responsive themes. Deploy verified browser tools in small batches after inspecting each diff. Preserve existing Worker configuration, encrypted secrets, rate limits and custom domains. No AI endpoints, paid AI traffic or billing changes. A feature is only reported live after actual production conversion tests.

## Feasibility

All digital text, CSV, notebook, email and image conversion work can execute on visitors' devices with no new conversion API fee. Exact email/browser HTML layout, arbitrary notebook rich widgets, encrypted MSG, scanned text without OCR and every TIFF encoding are not guaranteed. Reject unsupported content clearly and disclose formatting losses. Owner restrictions can be removed by qpdf only after successful legitimate open; no password guessing.

Existing Office conversion handlers depend on unavailable ConvertAPI. Leave them unchanged while preparing a separate isolated LibreOffice design. Native executables cannot run inside the existing standard Cloudflare Worker.
