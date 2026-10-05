export type ContextualLink = { before: string; slug: string; label: string; after: string }

export const contextualLinks: Record<string, ContextualLink[]> = {
  'compress-pdf': [
    { before: 'Not sure what is making the file large? Run ', slug: 'pdf-size-breakdown', label: 'PDF Size Breakdown', after: ' to inspect likely image-heavy pages before choosing a preset.' },
    { before: 'If your scan needs searchable text, use ', slug: 'ocr-pdf', label: 'OCR PDF', after: ' before aggressive compression, and keep the searchable original.' },
  ],
  'merge-pdf': [
    { before: 'Need to change individual page positions after combining files? Open the result in ', slug: 'reorder-pdf', label: 'Reorder PDF Pages', after: '.' },
    { before: 'To take only selected pages from the combined document, use ', slug: 'extract-pdf-pages', label: 'Extract PDF Pages', after: '.' },
  ],
  'pdf-reader': [
    { before: 'If a visible scan cannot be searched, run ', slug: 'ocr-pdf', label: 'OCR PDF', after: ' to add recognized text to a copy.' },
    { before: 'For page structure, dimensions and likely scan clues, open ', slug: 'pdf-health-check', label: 'PDF Health Check', after: '.' },
  ],
  'pdf-to-word': [
    { before: 'Sideways source pages? ', slug: 'rotate-pdf', label: 'Rotate PDF pages', after: ' before conversion and review the DOCX layout afterward.' },
    { before: 'If you only need search and copy on a scanned PDF, try ', slug: 'ocr-pdf', label: 'OCR PDF', after: ' instead of rebuilding the document in Word.' },
  ],
  'word-to-pdf': [
    { before: 'After conversion, inspect the exported pages with ', slug: 'pdf-reader', label: 'PDF Reader', after: ' before sending the file.' },
    { before: 'If the result is larger than expected, compare options in ', slug: 'compress-pdf', label: 'Compress PDF', after: ' while checking text preservation.' },
  ],
  'delete-pdf-pages': [
    { before: 'Cleaning a scan? Use ', slug: 'blank-page-detector', label: 'Blank Page Detector', after: ' to identify likely empty pages before removing any.' },
    { before: 'To keep only a few pages instead, choose ', slug: 'extract-pdf-pages', label: 'Extract PDF Pages', after: '.' },
  ],
  'split-pdf': [
    { before: 'If you need one PDF containing selected pages rather than several files, use ', slug: 'extract-pdf-pages', label: 'Extract PDF Pages', after: '.' },
    { before: 'To inspect range boundaries first, open the source in ', slug: 'pdf-reader', label: 'PDF Reader', after: '.' },
  ],
  'pdf-to-excel': [
    { before: 'For a scanned table, ', slug: 'ocr-pdf', label: 'OCR PDF', after: ' can help you inspect recognized words before reviewing extracted spreadsheet cells.' },
    { before: 'If you need editable prose rather than rows and columns, choose ', slug: 'pdf-to-word', label: 'PDF to Word', after: '.' },
  ],
  'jpg-to-pdf': [
    { before: 'Have JPG, PNG and WebP files together? Use ', slug: 'images-to-pdf', label: 'Images to PDF', after: ' for a mixed image set.' },
    { before: 'After combining pictures, review page order and margins in ', slug: 'pdf-reader', label: 'PDF Reader', after: '.' },
  ],
  'pdf-to-jpg': [
    { before: 'Need lossless page images instead of JPG? Choose ', slug: 'pdf-to-png', label: 'PDF to PNG', after: '.' },
    { before: 'If you need to keep selectable text, use ', slug: 'pdf-reader', label: 'PDF Reader', after: ' or share the PDF rather than an image.' },
  ],
  'edit-pdf': [
    { before: 'For simple repeated numbers, use ', slug: 'add-page-numbers', label: 'Add Page Numbers', after: ' instead of the full editor.' },
    { before: 'If you need editable document prose, compare ', slug: 'pdf-to-word', label: 'PDF to Word', after: ' and review the reconstructed DOCX.' },
  ],
  'ocr-pdf': [
    { before: 'Search and copy from the result with ', slug: 'pdf-reader', label: 'PDF Reader', after: ' to review recognition accuracy.' },
    { before: 'To inspect whether the source already has text, start with ', slug: 'pdf-health-check', label: 'PDF Health Check', after: '.' },
  ],
  'pdf-health-check': [
    { before: 'Found mixed portrait and landscape pages? Use ', slug: 'orientation-analyzer', label: 'PDF Orientation Analyzer', after: ' to see the affected page numbers.' },
    { before: 'If the report points to image-only pages, use ', slug: 'ocr-pdf', label: 'OCR PDF', after: ' when you need searchable text.' },
  ],
}
