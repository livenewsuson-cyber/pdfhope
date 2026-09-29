export type CategoryId = 'convert' | 'organize' | 'optimize' | 'edit' | 'security' | 'intelligence' | 'advanced'
export type CategoryHub = {
  id: CategoryId
  path: string
  label: string
  h1: string
  title: string
  description: string
  intro: string[]
  choosing: { title: string; text: string; tool: string }[]
  useCases: string[]
  details: { title: string; text: string }[]
  faq: { question: string; answer: string }[]
  related: CategoryId[]
}

export const categoryHubs: CategoryHub[] = [
  {
    id: 'convert', path: '/pdf-converters', label: 'PDF Converters', h1: 'Free PDF Converters Online',
    title: 'PDF Converters – Convert PDF, Word, Excel & Images | PDFHope',
    description: 'Choose a PDF converter for Word, Excel, PowerPoint, JPG, PNG or WebP. Compare editable document conversion with image-based output and review processing before you convert.',
    intro: [
      'Conversion has two different goals: preserving a document’s appearance and recovering content you can edit. Word, Excel and PowerPoint conversions attempt to reconstruct or render document structure; image conversions turn pages or pictures into visual files. Choose the destination format based on what you need to do next, not just the file extension.',
      'Image-to-PDF and PDF-to-image tools run in your browser. Office conversions use a secure server workflow after you select Convert. Each tool page explains its own input limits, output format and processing boundary. Scanned PDFs may need OCR for editable text; a picture of text does not become an editable Word document simply by changing formats.',
    ],
    choosing: [
      { title: 'Edit document text', text: 'Use PDF to Word when you need a DOCX draft. Complex columns, fonts and scans may need review after conversion.', tool: 'pdf-to-word' },
      { title: 'Reuse table values', text: 'Use PDF to Excel for recognizable tables. A PDF usually cannot restore the original spreadsheet formulas.', tool: 'pdf-to-excel' },
      { title: 'Share a static copy', text: 'Use Word, Excel or PowerPoint to PDF when recipients need a PDF rather than an editable Office file.', tool: 'word-to-pdf' },
      { title: 'Work with images', text: 'Use JPG, PNG or WebP to PDF to combine pictures, or PDF to JPG/PNG to export visual page images.', tool: 'images-to-pdf' },
    ],
    useCases: [
      'Turn a report in DOCX into a PDF for consistent sharing, then inspect the exported pages in PDF Reader.',
      'Extract a table from a PDF to XLSX for analysis, checking numeric separators and merged cells before calculations.',
      'Bundle photographed receipts into one PDF, or export selected PDF pages as JPG images for a visual presentation.',
    ],
    details: [
      { title: 'Conversion is not the same as OCR', text: 'OCR recognizes printed words in an image-only scan. It can make a PDF searchable, but layout reconstruction into Word, Excel or PowerPoint is a separate and less predictable task. If search and copy are enough, OCR PDF may be a better first step than converting formats.' },
      { title: 'Review fidelity and privacy', text: 'A converted PDF can differ when fonts, charts, wide worksheets or slide effects are unsupported. PDF-to-image creates a visual rendering and does not preserve selectable text in the image. Browser-local tools keep selected document bytes on your device; Office conversion sends the chosen file through the disclosed secure server process.' },
    ],
    faq: [
      { question: 'Which converter should I use for an editable file?', answer: 'Choose PDF to Word for document text, PDF to Excel for tables, or PDF to PowerPoint for slides. Editability depends on the source and should be checked in the downloaded file.' },
      { question: 'Can a scanned PDF become editable?', answer: 'OCR may recognize printed text in a scan, but fonts, columns and tables may still need manual correction after conversion. For search and copy without rebuilding layout, use OCR PDF.' },
      { question: 'Are all conversions local?', answer: 'No. Image conversions run in the browser. Word, Excel and PowerPoint conversion tools clearly identify their secure server step on the individual tool page.' },
    ], related: ['organize', 'optimize', 'intelligence'],
  },
  {
    id: 'organize', path: '/organize-pdf', label: 'Organize PDF', h1: 'Organize PDF Pages Online',
    title: 'Organize PDF Pages – Merge, Split, Reorder & Rotate | PDFHope',
    description: 'Organize PDF pages with merge, split, extract, delete, reorder and rotate tools. Choose the page operation you need and keep your original file for comparison.',
    intro: [
      'Page organization changes the sequence or membership of a PDF without rewriting its prose. Merge joins files in an order you choose; split makes separate files; extract keeps selected pages in a new PDF; delete removes specified pages. Reorder changes sequence, while rotate fixes the displayed orientation of selected pages.',
      'These workflows run locally in the browser. They are useful when assembling packets, removing unwanted pages, or preparing a scan for reading. Always keep the source document: page changes can affect bookmarks, interactive features or certificate-based signatures, depending on the file.',
    ],
    choosing: [
      { title: 'Combine whole files', text: 'Merge PDF takes two or more PDFs and lets you arrange the file queue before producing one document.', tool: 'merge-pdf' },
      { title: 'Make separate documents', text: 'Split PDF exports individual pages, fixed-size groups or custom ranges as a ZIP of PDFs.', tool: 'split-pdf' },
      { title: 'Keep or remove selected pages', text: 'Extract PDF Pages copies the pages you want; Delete PDF Pages removes pages you do not want.', tool: 'extract-pdf-pages' },
      { title: 'Correct sequence or orientation', text: 'Reorder PDF changes page order; Rotate PDF changes page orientation without reflowing its content.', tool: 'reorder-pdf' },
    ],
    useCases: [
      'Merge a cover letter and attachments in the required order, then reorder an individual page if needed.',
      'Extract only the pages a colleague needs from a long report instead of forwarding the entire document.',
      'Rotate sideways scan pages before reading, OCR or conversion while leaving other pages as they are.',
    ],
    details: [
      { title: 'Choose page numbers carefully', text: 'Check the page count and preview before removing or extracting pages. Deleting a page is different from redacting sensitive information: content elsewhere in the PDF may still remain. Blank Page Detector can help identify likely empty scan pages, but it does not delete them automatically.' },
      { title: 'What the output preserves', text: 'These tools create new PDF copies rather than editing the original file in place. Page graphics remain, but document-level bookmarks, labels, forms or signatures may need review. Rotation changes page metadata; it does not straighten skewed content inside a page image.' },
    ],
    faq: [
      { question: 'Should I use Split PDF or Extract PDF Pages?', answer: 'Split creates multiple output PDFs from a page pattern or ranges. Extract creates one new PDF containing the selected pages.' },
      { question: 'Can I rearrange pages after merging?', answer: 'Yes. Download the merged PDF and open it in Reorder PDF to change individual page positions.' },
      { question: 'Will deleting a page securely erase private information?', answer: 'The selected page is omitted from the new copy, but this is not a substitute for checking the entire output for sensitive data or using proper redaction.' },
    ], related: ['intelligence', 'edit', 'advanced'],
  },
  {
    id: 'optimize', path: '/optimize-pdf', label: 'Optimize PDF', h1: 'Optimize and Compress PDF Files',
    title: 'Optimize PDF – Compress & Analyze File Size | PDFHope',
    description: 'Reduce PDF size with clear quality tradeoffs and inspect likely size contributors. Compare compression methods before downloading a smaller copy.',
    intro: [
      'A PDF may be large because of scanned page images, embedded fonts, complex graphics or simply inefficient structure. Start with PDF Size Breakdown when you want clues about the document; use Compress PDF when the goal is a measured smaller file. A small text-based PDF and a photo-heavy scan respond very differently to compression.',
      'PDFHope runs these checks in your browser. The compression tool compares actual output size with the original and tells you when no smaller safe result was found. It does not promise an arbitrary target size or a universal reduction percentage.',
    ],
    choosing: [
      { title: 'Understand the source', text: 'PDF Size Breakdown reports page counts, average bytes and likely image-only pages. Its findings are estimates, not an exact object-by-object accounting.', tool: 'pdf-size-breakdown' },
      { title: 'Preserve text where practical', text: 'Start with Recommended compression. It favors structural savings and preservation-oriented treatment of searchable pages.', tool: 'compress-pdf' },
      { title: 'Prioritize visual size', text: 'Strong or Maximum may flatten pages and reduce fine detail. Use these only when the loss of searchability or interactivity is acceptable.', tool: 'compress-pdf' },
    ],
    useCases: [
      'Reduce a scan-heavy report before attaching it to an email, then inspect the result at readable zoom.',
      'Check why a nominally short PDF is large before trying aggressive compression.',
      'Keep a searchable archival copy and make a separate smaller visual copy for sharing when necessary.',
    ],
    details: [
      { title: 'Searchability is a quality dimension', text: 'Aggressive rasterization can turn selectable text into page images. If a scanned document was processed with OCR PDF, preserve that searchable original before trying Strong or Maximum compression. A smaller file is not always a better file for accessibility or reuse.' },
      { title: 'Check the actual result', text: 'Inspect the original and output sizes shown by the tool. A PDF that is already optimized may not shrink, and high-resolution scans may trade sharpness for bytes. Review small text, diagrams, links and forms after download. Rewriting can invalidate certificate-based signatures.' },
    ],
    faq: [
      { question: 'Why did my PDF not get smaller?', answer: 'The source may already use efficient compression, or a safe rewrite may not save enough bytes. PDFHope reports measured results rather than claiming a reduction it did not achieve.' },
      { question: 'Will compression keep searchable text?', answer: 'Recommended aims to preserve text-based pages where practical. Strong and Maximum can flatten content, so inspect the output before sharing.' },
      { question: 'Is PDF Size Breakdown an exact file-object report?', answer: 'No. It uses page-level and image-complexity clues available in the browser; exact internal object sizes are not exposed by the current workflow.' },
    ], related: ['intelligence', 'convert', 'organize'],
  },
  {
    id: 'edit', path: '/edit-pdf-tools', label: 'Edit PDF', h1: 'PDF Editing Tools Online',
    title: 'PDF Editing Tools – Editor, Page Numbers & Watermarks | PDFHope',
    description: 'Choose the right PDF editing workflow: edit supported content in PDF Editor or add page numbers, headers, footers and watermarks to a new copy.',
    intro: [
      '“Edit PDF” can mean different operations. PDFHope’s PDF Editor handles supported on-page changes and overlays; the focused tools add repeated or positioned content such as page numbers, headers, footers and text watermarks. Choose the smallest workflow that matches the change you actually need.',
      'The tools create a new PDF copy locally in the browser. Adding an overlay does not necessarily replace the original embedded text underneath it. A rectangle over private information is an annotation, not secure redaction. Review the exported file before relying on it.',
    ],
    choosing: [
      { title: 'Edit supported page content', text: 'Use PDF Editor for supported text, images, drawings, annotations and page-level controls. Confirm what changed in the exported copy.', tool: 'edit-pdf' },
      { title: 'Number pages', text: 'Add Page Numbers provides starting number, range and placement settings without opening the full editor.', tool: 'add-page-numbers' },
      { title: 'Repeat document furniture', text: 'Header & Footer PDF places repeated text, dates or number placeholders on selected pages.', tool: 'header-footer-pdf' },
      { title: 'Mark a draft or copy', text: 'Watermark PDF adds visible text with size, angle and opacity controls; it does not enforce usage rights.', tool: 'watermark-pdf' },
    ],
    useCases: [
      'Number a packet after merging several source documents.',
      'Add a consistent date or document reference to each page of a report.',
      'Mark a review copy as a draft while keeping the untouched original.',
    ],
    details: [
      { title: 'Overlays versus existing text', text: 'A new text box, header or watermark is extra page content. It does not by itself remove embedded words or images. For substantial rewriting of prose, PDF to Word may be a better draft workflow, followed by review of formatting when converting back.' },
      { title: 'Limitations worth checking', text: 'Large or unusual PDFs can render differently in a browser. Existing forms, annotations and cryptographic signatures may be affected by a rewrite. PDFHope does not present decorative overlays as a secure redaction method or watermarking as digital rights management.' },
    ],
    faq: [
      { question: 'Can the PDF Editor replace any existing text?', answer: 'It supports specific on-page editing workflows, but not arbitrary replacement of every embedded text object in every PDF. Check the editor controls and exported result.' },
      { question: 'Is a box over text a secure redaction?', answer: 'No. An overlay may leave source content in the PDF. Do not use it to remove confidential information.' },
      { question: 'Do page numbers change the document page labels?', answer: 'The tool adds visible numbers as new page content; it does not rebuild interactive PDF page-label metadata.' },
    ], related: ['organize', 'convert', 'security'],
  },
  {
    id: 'security', path: '/pdf-security-tools', label: 'PDF Security', h1: 'PDF Security and Privacy Tools',
    title: 'PDF Security Tools – Protect, Unlock, Sign & Clean | PDFHope',
    description: 'Protect PDFs with a known password, unlock documents you are authorized to access, place a visible signature, or remove standard metadata fields.',
    intro: [
      'Security tasks require precise expectations. Protect PDF adds an opening password; Unlock PDF removes protection only when you provide the correct password. Sign PDF places a visible electronic signature, while PDF Metadata Cleaner removes common document-information fields. These are distinct operations, not a general promise of confidentiality or anonymity.',
      'These PDF workflows run locally in the browser. Keep the original, choose a strong password, and review the downloaded copy. Changing a signed PDF can invalidate an existing certificate-based signature even when the visible page looks the same.',
    ],
    choosing: [
      { title: 'Restrict opening', text: 'Protect PDF encrypts a copy with a password. It helps control access but is not DRM and cannot stop someone who knows the password from making another copy.', tool: 'protect-pdf' },
      { title: 'Remove a known password', text: 'Unlock PDF requires a valid password supplied by someone authorized to access the document. It does not crack unknown passwords.', tool: 'unlock-pdf' },
      { title: 'Add a visible signature', text: 'Sign PDF can draw, type or upload a signature and place it on the page. It is not a certificate-based cryptographic digital signature.', tool: 'sign-pdf' },
      { title: 'Clean standard fields', text: 'PDF Metadata Cleaner removes common title, author and producer information; it cannot guarantee removal of every identifier in a complex PDF.', tool: 'pdf-metadata-cleaner' },
    ],
    useCases: [
      'Add an opening password before sharing a document through an appropriate channel.',
      'Create an accessible copy of a password-protected file when you have the correct password and permission.',
      'Place a visible approval signature or remove standard document metadata before distribution.',
    ],
    details: [
      { title: 'Know what protection covers', text: 'A PDF password is one access control, not a complete sharing policy. Send passwords separately where appropriate and keep an unencrypted backup. PDFHope cannot retrieve a forgotten opening password. For confidential data, review the entire document, including attachments and visible content.' },
      { title: 'Signatures and metadata have limits', text: 'A visible mark can communicate intent, but it does not provide the cryptographic verification of a digital certificate. Removing standard metadata fields does not remove every possible embedded identifier, revision artifact or content clue. Neither tool should be represented as a legal or forensic guarantee.' },
    ],
    faq: [
      { question: 'Can PDFHope recover a forgotten PDF password?', answer: 'No. Unlock PDF works only with the correct password; it does not guess, crack or bypass unknown passwords.' },
      { question: 'Is a visible signature digitally certified?', answer: 'No. Sign PDF adds a visible electronic signature, not a certificate-backed cryptographic signature.' },
      { question: 'Does metadata cleaning make a PDF anonymous?', answer: 'No. It removes standard document-information fields, but content and other embedded identifiers may remain.' },
    ], related: ['edit', 'intelligence', 'organize'],
  },
  {
    id: 'intelligence', path: '/pdf-analysis-tools', label: 'PDF Analysis & OCR', h1: 'PDF Analysis and OCR Tools',
    title: 'PDF Analysis & OCR Tools – Inspect and Search PDFs | PDFHope',
    description: 'Read PDFs, make scanned pages searchable with OCR, and inspect page health, likely blanks, duplicates, sizes and orientation with transparent browser-based checks.',
    intro: [
      'Before changing a PDF, find out what is actually in it. PDF Reader opens and searches existing text. OCR PDF can add an invisible text layer to image-only scans. The analysis tools report document health, likely blank or duplicate pages, page dimensions and orientation. Each tool answers a different diagnostic question.',
      'These checks run in your browser. Some results are heuristics, not guarantees: faint marks can confuse blank-page detection, visually similar pages are not always duplicates, and a health score is not a certification. Use the findings to decide what to inspect manually or which editing tool to use next.',
    ],
    choosing: [
      { title: 'Read or search a PDF', text: 'Start with PDF Reader when the document already has searchable text. Its find and selection features depend on the source text layer.', tool: 'pdf-reader' },
      { title: 'Recognize a scan', text: 'OCR PDF identifies likely image-only pages and adds searchable printed English words while preserving the visible page image.', tool: 'ocr-pdf' },
      { title: 'Investigate document condition', text: 'PDF Health Check summarizes page and text clues; Blank Page Detector and Duplicate Page Finder focus on likely cleanup candidates.', tool: 'pdf-health-check' },
      { title: 'Check page geometry', text: 'Page Size Analyzer and Orientation Analyzer help locate mixed dimensions or sideways pages before printing or conversion.', tool: 'page-size-analyzer' },
    ],
    useCases: [
      'Determine whether a scanned archive can be searched and use OCR only on the pages that need it.',
      'Find likely empty pages in a batch scan, then review before using Delete PDF Pages.',
      'Locate duplicate-looking pages or mixed sizes before assembling a final packet.',
    ],
    details: [
      { title: 'OCR and scan detection', text: 'An image-only PDF can look readable while containing no machine-readable words. Smart OCR skips pages with usable existing text and processes likely scans. Recognition accuracy depends on print clarity and layout; copied text needs review. English is the verified OCR language in the current release.' },
      { title: 'Interpret reports carefully', text: 'Blank-page checks look for near-white pages with little detected ink. Duplicate detection compares visual similarity, not legal or semantic equivalence. Health, size and orientation findings are guides for human review; they do not silently delete or rewrite pages.' },
    ],
    faq: [
      { question: 'Why can I see words but not search them?', answer: 'The PDF may contain page images instead of a text layer. OCR PDF can recognize printed English and add a searchable layer to a copy.' },
      { question: 'Are blank or duplicate findings definitive?', answer: 'No. Faint content and similar forms can affect the visual heuristics. Review flagged pages before deleting or combining anything.' },
      { question: 'Will these analysis tools upload my PDF?', answer: 'The reader, OCR and inspection workflows on this page process selected PDF content in the browser; OCR engine assets download when needed.' },
    ], related: ['organize', 'optimize', 'convert'],
  },
  {
    id: 'advanced', path: '/advanced-pdf-tools', label: 'Advanced PDF', h1: 'Advanced PDF Tools',
    title: 'Advanced PDF Tools – Interleave, N-Up & Contact Sheets | PDFHope',
    description: 'Handle specialist PDF page workflows: interleave two files, separate alternating pages, place multiple pages per sheet, or create a visual contact sheet.',
    intro: [
      'Advanced page operations solve particular document-production problems. Interleave PDF alternates pages from two files, often to combine front and back scans. Deinterleave PDF separates alternating pages. N-Up PDF places multiple source pages on each output sheet; PDF Contact Sheet creates thumbnail overview pages.',
      'These are not general editing tools. Choose one when you know the required page pattern or output layout, and verify the sequence afterward. The operations run locally in the browser and create new PDF copies so the original remains available for comparison.',
    ],
    choosing: [
      { title: 'Combine duplex sides', text: 'Interleave PDF alternates pages from two source PDFs. Confirm whether one scan stack needs its order reversed before combining.', tool: 'interleave-pdf' },
      { title: 'Separate alternating pages', text: 'Deinterleave PDF divides odd and even pages into separate outputs for a two-sided scan workflow.', tool: 'deinterleave-pdf' },
      { title: 'Fit pages on fewer sheets', text: 'N-Up PDF creates a handout with two or four original pages per output sheet, reducing page size for print.', tool: 'n-up-pdf' },
      { title: 'Survey a document visually', text: 'PDF Contact Sheet arranges small page previews into an overview; use the original PDF when full-resolution reading matters.', tool: 'pdf-contact-sheet' },
    ],
    useCases: [
      'Recombine front-side and back-side scan stacks into a correctly ordered duplex document.',
      'Prepare a compact two-up or four-up print handout from a slide PDF.',
      'Create an at-a-glance thumbnail index for a long visual PDF.',
    ],
    details: [
      { title: 'Check ordering before sharing', text: 'Interleaving assumes that page stacks align with the intended alternating sequence. Different scanner feed directions can reverse a stack, so inspect several pages in PDF Reader after export. If the result is wrong, reorder or rotate the copy rather than editing the source scans.' },
      { title: 'Layout changes have consequences', text: 'N-Up and contact-sheet outputs are visual arrangements, not a replacement for the full-size original. Fine text may be harder to read and interactive document features may not survive a page rewrite. Keep the source PDF when accessibility, high-resolution inspection or signatures matter.' },
    ],
    faq: [
      { question: 'What is the difference between interleave and merge?', answer: 'Merge appends whole files in the chosen order. Interleave alternates individual pages from two files.' },
      { question: 'Does N-Up change the original document?', answer: 'No. It makes a new PDF with multiple reduced source pages on each output sheet.' },
      { question: 'Can a contact sheet replace the source PDF?', answer: 'It is best used as an overview. Small previews may not preserve enough detail for reading or archival use.' },
    ], related: ['organize', 'intelligence', 'optimize'],
  },
]

export const categoryHubById = Object.fromEntries(categoryHubs.map((hub) => [hub.id, hub])) as Record<CategoryId, CategoryHub>
export const categoryHubByPath = Object.fromEntries(categoryHubs.map((hub) => [hub.path, hub])) as Record<string, CategoryHub>
