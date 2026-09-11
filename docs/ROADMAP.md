# PDFHope roadmap

This internal roadmap records intentionally unshipped work. These items do not have public, indexable “coming soon” routes.

## Needs additional browser engineering

- Image-heavy compression and grayscale output with explicit quality measurement
- Annotation and AcroForm flattening with fixture coverage
- Visual PDF compare with side-by-side, overlay, and difference views
- Manual crop controls and reviewed smart-crop suggestions
- Booklet imposition, collating patterns, separator pages, and page index generation
- Header/footer variables, image/logo placement, signature images, and drawing markup
- PDF inspection report as a generated PDF in addition to JSON
- Virtualized thumbnail rendering for documents with hundreds of pages

## Needs a reliable specialist library or backend

- Real PDF password encryption and authorized password removal
- OCR and OCR-readiness resolution analysis
- Content-aware compression that preserves selectable text
- Safe permanent redaction that removes underlying content and passes forensic tests
- Cryptographic digital signatures
- Accessibility-tag repair and PDF/UA validation

Server-supported work should use a clearly labeled Cloudflare Worker route and state when a file leaves the device. It must not silently change the privacy behavior of existing local tools.

## Release gates

Before any roadmap item is public:

1. Implement the complete workflow and truthful limitations.
2. Add representative fixtures and automated tests.
3. Check output in multiple PDF viewers.
4. Verify mobile, keyboard, and screen-reader behavior.
5. Add unique useful content and metadata only after the tool works.
6. Update privacy and security documentation if network processing is introduced.
