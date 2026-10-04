export type GuideLink = { path: string; label: string; description: string }
export type GuideSection = {
  heading: string
  paragraphs?: string[]
  subheadings?: { heading: string; paragraphs: string[]; bullets?: string[] }[]
  bullets?: string[]
  steps?: { title: string; text: string }[]
}
export type Guide = {
  slug: string
  topic: 'OCR' | 'Compression' | 'Conversion'
  title: string
  seoTitle: string
  description: string
  intro: string
  shortAnswer: string
  datePublished: string
  primaryTool: GuideLink
  relatedTools: GuideLink[]
  sections: GuideSection[]
  faq: { question: string; answer: string }[]
}

const tool = (path: string, label: string, description: string): GuideLink => ({ path, label, description })

export const guides: Guide[] = [
  {
    slug: 'make-scanned-pdf-searchable',
    topic: 'OCR',
    title: 'How to Make a Scanned PDF Searchable Without Uploading It',
    seoTitle: 'How to Make a Scanned PDF Searchable Without Uploading It | PDFHope',
    description: 'Learn why scanned PDFs are not searchable, how OCR adds an invisible text layer, and how to create a searchable PDF locally in your browser.',
    intro: 'A scan can look like a normal page while behaving like a photograph. This guide explains how to identify image-only pages, add searchable text with OCR, and check the result without sending the document to a conversion server.',
    shortAnswer: 'To make a scanned PDF searchable, run optical character recognition on the image-only pages and add the recognized words as an invisible text layer while retaining the original page image. PDFHope can do this locally in your browser.',
    datePublished: '2026-10-05',
    primaryTool: tool('/ocr-pdf', 'Make your scanned PDF searchable', 'Run Smart OCR locally and download a searchable copy.'),
    relatedTools: [
      tool('/pdf-reader', 'PDF Reader', 'Check whether search, selection, and copying work.'),
      tool('/pdf-health-check', 'PDF Health Check', 'Inspect text presence and other document properties.'),
      tool('/pdf-to-word', 'PDF to Word', 'Reconstruct an editable DOCX when search alone is not enough.'),
    ],
    sections: [
      {
        heading: 'Why Ctrl+F fails on a scanned PDF',
        paragraphs: [
          'A PDF is a container, not a guarantee that its visible letters are stored as text. A digitally created PDF often contains character codes, font information, and coordinates for each word. A scanner usually captures each page as an image and places that image inside a PDF. To a person, both documents show the same words. To a PDF viewer, the scan may contain only pixels.',
          'Search, selection, screen-reader access, and reliable copy and paste depend on a usable text layer. If Ctrl+F finds nothing even though you can see the term, try selecting an individual word. A selection box covering the whole page, or no selection at all, usually indicates an image-only scan. Some mixed PDFs contain selectable cover pages and scanned pages later in the file, so test more than one page.',
        ],
        subheadings: [
          { heading: 'Image-only PDF versus searchable PDF', paragraphs: ['An image-only PDF stores the visual page but no machine-readable representation of its words. A searchable PDF can retain that same page image and add text at matching positions. The added layer is normally invisible, so the scan remains the visible source while the recognized words support search and copying.'] },
          { heading: 'What OCR actually does', paragraphs: ['Optical character recognition renders a page, detects shapes that resemble characters and words, and estimates their text and position. It does not recover the original word-processing file, editorial history, font semantics, or document structure. OCR output is a new interpretation of the image, which is why it must be checked.'] },
        ],
      },
      {
        heading: 'How PDFHope Smart OCR works',
        paragraphs: [
          'PDFHope first checks each selected page for a usable existing text layer. In Smart OCR mode, pages that already contain text are skipped and likely image-only pages are processed. This avoids needless work and reduces the risk of placing a second text layer over words that are already searchable. Force mode is available for unusual cases, but forcing OCR on a page with text can create duplicate search or copy results.',
          'For a page that needs OCR, PDFHope renders it in the browser, recognizes printed English with the OCR engine, and places recognized words into the PDF at their estimated coordinates with zero opacity. The original visible page content remains. The output is reopened and checked for page count, page dimensions, and extractable text before it is offered for download.',
          'The PDF itself, rendered page images, and recognized text remain in the browser tab. The site downloads the OCR engine and verified English language data when needed; it does not upload the document pages. This local-processing statement applies to the OCR tool. It should not be generalized to Office conversions such as PDF to Word, which use a clearly labeled secure server workflow.',
        ],
      },
      {
        heading: 'Step by step: create a searchable copy',
        steps: [
          { title: 'Keep the original', text: 'OCR creates a rewritten copy and can invalidate a certificate-based digital signature. Preserve the signed or archival source before processing.' },
          { title: 'Open OCR PDF', text: 'Choose the PDF. Analysis runs locally and reports total pages, pages already searchable, and likely scans.' },
          { title: 'Start with Smart OCR', text: 'Let PDFHope skip pages that already expose usable text. Choose a custom page range when only part of a long document needs recognition.' },
          { title: 'Choose rendering quality', text: 'Balanced renders at about 220 DPI and is the practical first choice. High accuracy renders at about 300 DPI and may help small print, but it uses more memory and takes longer.' },
          { title: 'Run OCR and download the copy', text: 'Wait for recognition and validation to finish. Download the searchable PDF; an extracted text file is also available when you want a quick way to review the recognized words.' },
          { title: 'Test the result', text: 'Open the copy in PDF Reader, search for several distinctive terms, and copy a paragraph into a plain-text editor. Compare names, dates, amounts, and punctuation with the visible scan.' },
        ],
      },
      {
        heading: 'Scan quality determines recognition quality',
        paragraphs: [
          'OCR cannot infer detail that is absent from the image. Clear, upright printed text with strong contrast generally gives the engine more usable evidence than faint carbon copies, blurred phone photos, or pages with shadows across the binding. Very small characters may improve with High accuracy, but a higher rendering setting cannot restore letters that were clipped or smeared in the original scan.',
        ],
        bullets: [
          'Rotate sideways pages before OCR; character recognition expects readable orientation.',
          'Use the cleanest available source rather than repeatedly processing a compressed copy.',
          'Crop or rescan pages with dark borders, fingers, glare, or severe background texture when possible.',
          'Prefer printed text. Handwriting, decorative type, mathematical notation, and tightly packed tables are less predictable.',
          'Process a representative page first when the file is large, then inspect the output before committing time to every page.',
        ],
      },
      {
        heading: 'What changes—and what does not',
        paragraphs: [
          'The visible appearance should continue to come from the original page graphics. PDFHope adds invisible recognized words rather than rebuilding the page with a new visible font. That means the output can look unchanged even when search and selection now work. It also means a recognition error may be hidden until you search or paste the text.',
          'OCR does not turn a scan into a semantically structured Word document. Paragraphs, headings, columns, reading order, and tables may not be represented as they would be in an authored file. If the goal is extensive editing, use the searchable copy as an intermediate result and then consider PDF to Word, understanding that layout reconstruction is a separate process.',
          'Copy and paste follows the recognized text layer, not the pixels you see. A viewer may select words in an unexpected order on multi-column pages. Hyphenation can remain, and visually similar characters—such as O and 0, l and 1, or rn and m—can be confused. Review copied text before quoting, indexing, or relying on it.',
        ],
      },
      {
        heading: 'Common problems and practical fixes',
        subheadings: [
          { heading: 'The PDF already appears searchable', paragraphs: ['Open it in PDF Reader and test several pages. If search works, OCR is unnecessary. Forcing recognition over existing text can create duplicates. A page can still contain a small text object while most of its visible content is a scan, so inspect the specific pages that matter.'] },
          { heading: 'OCR finds no words', paragraphs: ['Confirm that the selected range includes the scanned page and that the text is printed English. Try High accuracy for small type. If the page is extremely faint, skewed, handwritten, or damaged, a better scan is more useful than repeated OCR attempts.'] },
          { heading: 'Search works but copy and paste is messy', paragraphs: ['Search only needs a matching word; useful copying also needs accurate characters and reading order. Columns, tables, marginal notes, and irregular spacing can produce a surprising sequence. Copy smaller selections or use the extracted text download for review.'] },
          { heading: 'The browser runs out of memory', paragraphs: ['Use Balanced quality, process a smaller custom range, close memory-heavy tabs, or split a very large document before OCR. Browser processing avoids uploading the document, but it is still limited by the device.'] },
        ],
      },
      {
        heading: 'When OCR is the right choice',
        paragraphs: [
          'Choose OCR when the document looks correct and your main need is finding, selecting, copying, or indexing printed words. It is especially appropriate for scanned letters, reports, manuals, and archives where preserving the visible page image matters. Run PDF Health Check first when you are unsure whether the problem is missing text, encryption, unusual page sizes, or another structural issue.',
          'Choose PDF to Word instead when you need a draft that can be substantially edited, while expecting formatting review. Choose a dedicated table conversion only when spreadsheet cells are the real goal. OCR supplies recognized characters; it does not recreate the original authoring application or guarantee a correct reading order.',
        ],
      },
    ],
    faq: [
      { question: 'Can I make a scanned PDF searchable without changing its appearance?', answer: 'Usually, yes. PDFHope retains the original visible page and adds an invisible recognized text layer. Advanced PDF features can still change when a new copy is written, so keep the source.' },
      { question: 'Why can I see text but Ctrl+F cannot find it?', answer: 'The visible page is probably an image. Search needs embedded character data; OCR creates that data from the image.' },
      { question: 'Can OCR read handwriting?', answer: 'PDFHope OCR is designed for printed English. Handwriting may be inaccurate and should not be relied on without careful review.' },
      { question: 'Will OCR let me copy text from the PDF?', answer: 'Yes, where recognition succeeds and the viewer supports selection. The copied characters and their order can contain errors, especially in columns and tables.' },
      { question: 'Does PDFHope upload my scanned PDF?', answer: 'No. The OCR PDF workflow runs in the browser. OCR engine and English language assets are downloaded, but the selected PDF pages are not uploaded.' },
      { question: 'Will OCR preserve a digital signature?', answer: 'Not reliably. Adding a text layer rewrites the file and can invalidate a certificate-based signature. Keep the signed original.' },
    ],
  },
  {
    slug: 'compress-pdf-without-losing-searchable-text',
    topic: 'Compression',
    title: 'How to Compress a PDF Without Losing Searchable Text',
    seoTitle: 'How to Compress a PDF Without Losing Searchable Text | PDFHope',
    description: 'Learn how PDF compression affects text, images, OCR layers, and signatures, and how to reduce file size without unnecessarily rasterizing searchable pages.',
    intro: 'A smaller PDF is only useful if it keeps the qualities you need. This guide explains the difference between structural optimization and page rasterization, why results vary, and how to protect searchable text while reducing file size.',
    shortAnswer: 'Start with structural optimization that preserves PDF text and vectors, then recompress only image-only scan pages when appropriate. Avoid full-page rasterization if selection, search, links, forms, or accessibility structure must remain.',
    datePublished: '2026-10-05',
    primaryTool: tool('/compress-pdf', 'Compress PDF', 'Compare validated output with the original and keep searchable text where practical.'),
    relatedTools: [
      tool('/pdf-size-breakdown', 'PDF Size Breakdown', 'Inspect likely contributors before choosing a compression strategy.'),
      tool('/ocr-pdf', 'OCR PDF', 'Add searchable text to an image-only scan before preservation-oriented compression.'),
      tool('/pdf-health-check', 'PDF Health Check', 'Review document structure and text presence before or after compression.'),
    ],
    sections: [
      {
        heading: 'Searchable text and file size are separate concerns',
        paragraphs: [
          'A PDF can contain text objects, vector graphics, photographs, scanned page images, fonts, annotations, forms, bookmarks, and metadata in one container. Compression does not have one universal switch. An operation that saves substantial space on a photo-heavy scan may do almost nothing to a compact text report, while an aggressive method can make a document much smaller by discarding interactive structure.',
          'Searchable text is usually inexpensive compared with high-resolution page images. Removing or flattening the text layer is therefore not a sensible first step when searchability matters. The larger savings often come from recompressing images, eliminating inefficient stream encoding, or reorganizing the file. The correct method depends on what the PDF actually contains.',
        ],
      },
      {
        heading: 'Structural optimization versus rasterization',
        subheadings: [
          { heading: 'Structural PDF optimization', paragraphs: ['Structural optimization rewrites internal PDF streams and object organization more efficiently without intentionally turning pages into pictures. It can recompress compatible streams, remove avoidable overhead, and use efficient object storage. Text and vector content remain text and vectors when validation succeeds. Savings may be modest because an already optimized PDF has little redundant structure.'] },
          { heading: 'Image recompression', paragraphs: ['Image-heavy files can shrink when photographs or scanned pages are encoded at a lower resolution or JPEG quality. This is not mathematically lossless: pixel detail can change. On an image-only scan, however, there is no text layer to lose on that page. A mixed document needs page-aware treatment so searchable pages are not needlessly flattened.'] },
          { heading: 'Full-page rasterization', paragraphs: ['Rasterization renders each page as an image and builds a new PDF from those images. It often reduces complex pages to a predictable visual form, but text selection, searchability, links, form fields, annotations, bookmarks, and accessibility structure can be lost. Strong and Maximum compression use this tradeoff in PDFHope.'] },
        ],
      },
      {
        heading: 'How PDFHope Recommended compression behaves',
        paragraphs: [
          'Recommended first attempts structural optimization in the browser. PDFHope then reopens the candidate and validates page count, sampled page dimensions, and extracted text against the source. A candidate that fails those checks is not accepted as a preservation-oriented result.',
          'The tool also analyzes pages for text and image content. When it finds likely image-only scan pages and the PDF has no detected outline, form fields, attachments, or annotations that make rebuilding unsafe, it can recompress those scan pages while copying other pages. That candidate is validated with text preservation required. PDFHope compares real byte sizes and keeps a candidate only when it is smaller than the original.',
          'This behavior is why Recommended is the sensible starting point for a searchable PDF. It favors structure and preserves existing searchable pages rather than flattening the entire document immediately. It is still compression, not a promise that every internal document feature will survive every unusual PDF. Keep the source and test the result.',
        ],
      },
      {
        heading: 'Step by step: reduce size while protecting text',
        steps: [
          { title: 'Preserve the source file', text: 'Work on a copy, especially when the PDF is signed, contains forms, or is an archival record.' },
          { title: 'Check whether text is searchable', text: 'Open several pages in PDF Reader and search for distinctive words. For a scan that is not searchable, consider OCR before compression and preserve the searchable OCR result.' },
          { title: 'Inspect likely size contributors', text: 'Use PDF Size Breakdown when you need context. Numerous large images suggest more opportunity than a small text-and-vector document.' },
          { title: 'Choose Recommended first', text: 'Let PDFHope try structural optimization and safe scan-page recompression. Do not start with Strong or Maximum when text search and interactivity matter.' },
          { title: 'Read the measured result', text: 'The tool reports original and output sizes, pages rasterized or preserved, optimization methods, and whether a smaller result was found. A no-gain result is useful evidence that this preset should not replace the original.' },
          { title: 'Verify the downloaded PDF', text: 'Search and copy text, zoom into small type and diagrams, follow important links, inspect forms, and compare page count. Keep the original if any required behavior changed.' },
        ],
      },
      {
        heading: 'Why some PDFs barely compress',
        paragraphs: [
          'A digitally generated report may already use compressed fonts, compact content streams, and appropriately sized images. Rewriting the same information cannot guarantee a meaningful reduction. Some files are large because they contain information that is genuinely expensive to store: many photographs, detailed maps, transparencies, or embedded resources.',
          'Scanned PDFs often have more room to shrink because each page may be a high-resolution color image even when the page is mostly black text on white paper. Re-encoding those pixels can save space, but it also changes them. Fine print, stamps, faint pencil marks, and halftone patterns deserve close review. A clean monochrome scan and a noisy phone photo can respond very differently to the same settings.',
          'File size can occasionally increase after a rewrite. PDFHope compares candidates with the source and does not present a larger file as a successful smaller copy. If Recommended reports no gain, the original may already be compact or the safe options may not reduce it.',
        ],
      },
      {
        heading: 'Recommended, Strong, Maximum, and target size',
        paragraphs: [
          'Recommended prioritizes preserving text and starts with structural optimization. Strong renders every page to a compressed image at a lower quality profile. Maximum uses a still more aggressive image profile. Those visual presets can be appropriate for disposable review copies, email attachments, or image-only material, but they are the wrong choice when selectable text, live links, forms, or accessibility are requirements.',
          'Target size is a best-effort search, not a guarantee. PDFHope first tries preservation-oriented candidates. If those cannot meet the target, it requires acknowledgment before testing progressively lower-resolution full-page rasterization profiles. It chooses the highest-quality valid candidate it can find at or below the requested size, or reports the best valid result above the target.',
          'An exact target may be impossible because a valid PDF has unavoidable overhead and the page images may not fit the byte budget at usable quality. Compression is not a deterministic dial: two files with the same page count and original size can have completely different content and outcomes.',
        ],
      },
      {
        heading: 'When compression harms searchability',
        paragraphs: [
          'Searchability is harmed when searchable page content is replaced with an image and no text layer is added back. Full-page rasterization does exactly that. A PDF created by OCR may look identical after rasterization but lose the invisible layer that made Ctrl+F and copy and paste work. This is why an OCR result should be kept separately before trying aggressive compression.',
          'Even when text survives, other useful structure may not. Reading order, tagged-PDF accessibility, form controls, links, annotations, bookmarks, and attachments are different from visible pixels. A visual spot check is not enough when those features matter. Test the actual interactions or keep the preservation-oriented version.',
        ],
      },
      {
        heading: 'Digital signatures and document integrity',
        paragraphs: [
          'Compression creates a new PDF. A certificate-based digital signature covers specific bytes in the signed document, so rewriting streams or pages can invalidate the signature even when the displayed content appears unchanged. Do not replace the signed original with a compressed copy. Preserve the original and treat any smaller version as a derivative.',
          'A visible signature image is not the same as a certificate-based signature, but it can also become softer under rasterization. Legal, compliance, archival, and accessibility requirements should take priority over attachment size. When a recipient has a strict limit, sharing through an approved document system may be preferable to destructive compression.',
        ],
      },
      {
        heading: 'Choose a strategy by document type',
        bullets: [
          'For a text-heavy report: use Recommended and accept that savings may be small.',
          'For a mixed report with a few scanned appendices: use Recommended so likely scans can be treated separately while text pages remain searchable.',
          'For an image-only scan: run OCR first if search matters, keep that version, and then try Recommended.',
          'For a temporary visual proof: Strong or Maximum may be acceptable after checking small details.',
          'For a signed, fillable, linked, tagged, or archival PDF: keep the original and verify every required feature in any derivative.',
        ],
      },
    ],
    faq: [
      { question: 'Can a PDF be compressed without losing searchable text?', answer: 'Yes, when structural optimization or page-aware image recompression produces a smaller valid file while searchable pages remain intact. Not every PDF will become meaningfully smaller.' },
      { question: 'Is PDFHope Recommended compression lossless?', answer: 'No blanket lossless claim is made. Structural optimization preserves validated text and dimensions, while recompressing likely scan images can change pixels. Review the output.' },
      { question: 'Why did my PDF not get smaller?', answer: 'It may already be efficient, contain little compressible image data, or require features that prevent safe rebuilding. PDFHope reports no gain instead of claiming an unmeasured reduction.' },
      { question: 'Will Strong or Maximum keep Ctrl+F working?', answer: 'Do not rely on it. Those presets rasterize pages and can remove searchable text and other interactive features.' },
      { question: 'Can PDFHope guarantee an exact target file size?', answer: 'No. Target mode is best-effort and reports whether the target was reached. A valid, readable PDF may not fit an arbitrary byte limit.' },
      { question: 'Does compression preserve digital signatures?', answer: 'Not reliably. Rewriting a PDF can invalidate certificate-based signatures. Keep the signed original.' },
    ],
  },
  {
    slug: 'pdf-to-word-formatting-changes',
    topic: 'Conversion',
    title: 'Why PDF to Word Formatting Changes — and How to Fix It',
    seoTitle: 'Why PDF to Word Formatting Changes — and How to Fix It | PDFHope',
    description: 'Understand why PDF-to-Word conversion changes fonts, paragraphs, columns, tables, images, and page breaks, plus practical ways to improve the DOCX.',
    intro: 'A PDF describes a finished page, while Word describes an editable document that can reflow. Converting between them means reconstructing structure that may no longer exist. This guide shows what changes, why it happens, and which fixes are worth making.',
    shortAnswer: 'PDF-to-Word formatting changes because a normal PDF stores positioned page content, not the original Word paragraphs, styles, tables, and section rules. A converter must infer those structures, so complex layouts and scans require review and correction.',
    datePublished: '2026-10-05',
    primaryTool: tool('/pdf-to-word', 'Convert PDF to Word', 'Create an editable DOCX draft through PDFHope’s secure conversion workflow.'),
    relatedTools: [
      tool('/ocr-pdf', 'OCR PDF', 'Make an image-only scan searchable when a DOCX is not necessary.'),
      tool('/pdf-reader', 'PDF Reader', 'Inspect text, columns, page order, and images before conversion.'),
      tool('/pdf-to-excel', 'PDF to Excel', 'Use table-focused reconstruction when rows and columns are the real goal.'),
    ],
    sections: [
      {
        heading: 'A PDF is a page description, not a saved Word document',
        paragraphs: [
          'Word stores an editable model: paragraphs, runs, styles, lists, tables, headers, footers, sections, margins, and rules for flowing content from one page to the next. A PDF is designed to preserve a finished appearance. It can say, in effect, “draw these glyphs at these coordinates” without identifying a paragraph, heading, or table cell.',
          'When a DOCX is exported to PDF, much of the original authoring structure may be simplified or discarded. A normal PDF does not secretly contain the original DOCX. Converting it back requires the engine to group positioned characters into words, lines, paragraphs, columns, and other editable objects. That reconstruction can be useful, but it cannot be perfect for every file because more than one document structure can produce the same visible page.',
        ],
      },
      {
        heading: 'How PDFHope converts PDF to Word',
        paragraphs: [
          'PDFHope accepts a PDF up to 20 MB and sends it only after you choose Convert. The file travels through a secure server workflow to the conversion provider in zero-storage mode; it is not the same local-only boundary used by tools such as PDF Reader and OCR PDF. The current conversion requests a flowing Word layout so recovered text can behave like document content rather than a screenshot of each page.',
          'Automatic provider-native OCR is enabled for scanned pages. That can recover editable words where recognition succeeds, but OCR and layout reconstruction are separate uncertainties. The engine must first recognize characters and then decide how those characters belong in paragraphs, columns, tables, and pages. The resulting DOCX is a draft to inspect, not proof that the source structure has been recovered exactly.',
        ],
      },
      {
        heading: 'Why specific formatting changes happen',
        subheadings: [
          { heading: 'Paragraphs and line breaks', paragraphs: ['A PDF may store each line—or even each character—at fixed coordinates. The converter has to decide which lines form a paragraph and whether a short line is a deliberate break. Justified text, hyphenation, indents, and closely spaced blocks can lead to extra breaks or paragraphs that merge.'] },
          { heading: 'Fonts and character spacing', paragraphs: ['The PDF may embed only a subset of a font, use a custom encoding, or draw letter shapes as vectors. If the exact font is unavailable to Word, it is substituted. Different font metrics change word width, wrapping, and page count even when the words are correct.'] },
          { heading: 'Columns and text boxes', paragraphs: ['Columns in a PDF can be independent groups of positioned text with no explicit “column” property. The converter must infer reading order and boundaries. Sidebars, captions, pull quotes, and overlapping boxes can be placed in the wrong sequence or rebuilt as separate text boxes.'] },
          { heading: 'Tables', paragraphs: ['Some PDFs contain table ruling lines and separately positioned text, not logical rows and cells. Borderless tables are harder because alignment is the main clue. Merged cells, multiline entries, and repeated headers can be reconstructed incorrectly. If the goal is data rather than prose, PDF to Excel may be a better starting point.'] },
          { heading: 'Headers, footers, and page numbers', paragraphs: ['Repeated content may be recognized as a Word header or footer, or it may appear as ordinary text on every page. A running title close to body text is difficult to classify. Section-specific headers add more ambiguity.'] },
          { heading: 'Images and drawings', paragraphs: ['Photographs are usually extractable as images, but clipping masks, transparency, diagrams, and text embedded inside graphics may be flattened or repositioned. A logo made from many vector paths may not become one convenient editable object.'] },
          { heading: 'Page breaks and reflow', paragraphs: ['PDF pages are fixed. Word pages are recalculated from fonts, margins, paragraph spacing, and printer settings. A small metric difference can move a line to the next page and cascade through the document. A converter can add breaks to imitate the source, but those breaks may become awkward as soon as you edit the text.'] },
        ],
      },
      {
        heading: 'Scanned PDFs add an OCR problem',
        paragraphs: [
          'A scan may contain no character data at all. Before the converter can rebuild Word paragraphs, OCR must recognize printed marks as characters. Blur, skew, shadows, faint type, handwriting, and complex forms can introduce spelling or punctuation errors. Then layout analysis must decide where the recognized words belong. A visually simple scan can therefore require two layers of inference.',
          'If your real goal is only search, selection, or copying while preserving the page image, creating a searchable PDF with local OCR is often more direct than rebuilding a DOCX. Choose PDF to Word when you need to revise content, reformat it, or reuse substantial prose, and plan to proofread the output against the source.',
        ],
      },
      {
        heading: 'Step by step: get a better Word result',
        steps: [
          { title: 'Inspect the source PDF', text: 'Use PDF Reader to test selection and reading order across several pages. Note scans, columns, tables, unusual fonts, rotated pages, and repeated headers before conversion.' },
          { title: 'Choose the right destination', text: 'Use Word for prose and general document editing. Use PDF to Excel for table-centric data. Use OCR PDF when preserving appearance with searchable text is enough.' },
          { title: 'Use the cleanest source', text: 'Prefer the original digital PDF over a print-and-scan copy. Remove password protection only when authorized, and correct visibly rotated scan pages before conversion.' },
          { title: 'Convert once', text: 'Choose the PDF and start the clearly labeled secure server conversion. Repeated PDF-to-Word-to-PDF cycles accumulate layout changes.' },
          { title: 'Open the DOCX with formatting marks visible', text: 'Show paragraph marks, section breaks, and manual line breaks. These reveal why text refuses to reflow or why a blank page appears.' },
          { title: 'Fix structure before cosmetic details', text: 'Correct reading order, paragraphs, headings, tables, and section boundaries first. Font sizes and minor spacing are easier to fix after the document model is sound.' },
          { title: 'Compare every critical page', text: 'Check names, numbers, footnotes, captions, tables, page references, and any passage recovered by OCR. Save the PDF as the visual reference.' },
        ],
      },
      {
        heading: 'Practical fixes in Word',
        bullets: [
          'Replace repeated manual line breaks with real paragraphs, but review lists, addresses, poetry, and captions where line breaks are intentional.',
          'Apply Word heading and body styles instead of formatting each paragraph individually. This restores consistent spacing and navigation.',
          'Install an appropriately licensed matching font when available, or choose one substitute for the whole document to stop inconsistent reflow.',
          'Rebuild unstable multi-column passages using Word columns or a simple table rather than dozens of floating text boxes.',
          'For important tables, correct row and column structure before adjusting borders. Compare every numeric value with the PDF.',
          'Move genuinely repeated content into Word headers and footers, then remove duplicate body copies.',
          'Set page size and margins to match the source before chasing individual line wraps.',
          'Anchor images deliberately and add alternative text when accessibility matters. Inline placement is often easier to maintain than floating objects.',
        ],
      },
      {
        heading: 'Common conversion problems',
        subheadings: [
          { heading: 'Every line is a separate paragraph', paragraphs: ['The source likely encoded lines independently or the layout strongly suggested fixed line endings. Use find-and-replace carefully or merge paragraphs by section. Do not remove all breaks globally without reviewing lists and headings.'] },
          { heading: 'Text appears in the wrong order', paragraphs: ['The page may contain multiple columns, sidebars, or overlapping objects. Rebuild that section in a simpler Word structure and compare it with the PDF. Reading order errors are especially important for assistive technology.'] },
          { heading: 'The page count is different', paragraphs: ['Font substitution, changed margins, paragraph spacing, and flowing layout can alter pagination. Match page setup and fonts first. If exact visual pagination matters more than editing, the PDF should remain the distribution format.'] },
          { heading: 'A table is a collection of text boxes', paragraphs: ['The PDF may not have encoded table semantics. Recreate the table manually or try PDF to Excel when the values are more important than the surrounding page design.'] },
          { heading: 'Scanned text contains mistakes', paragraphs: ['OCR output needs proofreading. Compare names, account numbers, dates, decimal separators, and similar-looking characters. A cleaner scan may be the only reliable improvement for severely degraded pages.'] },
        ],
      },
      {
        heading: 'When perfect reconstruction is impossible',
        paragraphs: [
          'Some page designs do not have a single correct editable equivalent. A magazine page with layered images, irregular captions, rotated labels, and decorative type can be represented as many floating objects for visual similarity or as simpler flowing text for editability. Improving one goal can reduce the other.',
          'Outlined text has no characters to recover without OCR. Subset fonts may omit mappings needed for copy and paste. Complex equations, forms, scripts, and diagrams may need specialist reconstruction. In these cases, decide what must be preserved: exact appearance, editable prose, tabular data, or accessible reading order. Use the PDF as the visual authority and rebuild only the content you genuinely need to edit.',
        ],
      },
      {
        heading: 'Choose the workflow that matches the goal',
        paragraphs: [
          'Use PDF to Word for an editable draft of document-style prose, especially when modest cleanup is acceptable. Use local OCR when the page already looks right and only needs searchable text. Use PDF to Excel for rows, columns, and values, and expect to verify formulas because a typical PDF contains displayed results rather than the original spreadsheet logic.',
          'If the document must look exactly like the source, keep and share the PDF. Word is valuable because it reflows and can be edited; those same qualities make exact reverse conversion impossible in some files. The safest workflow treats conversion as reconstruction, keeps the source nearby, and verifies the parts that carry meaning.',
        ],
      },
    ],
    faq: [
      { question: 'Why does PDF to Word change the formatting?', answer: 'A PDF stores fixed page content, while Word needs paragraphs, styles, tables, and flow rules. The converter must infer structure that may not exist in the PDF.' },
      { question: 'Does a PDF contain the original Word document?', answer: 'Normally, no. Exporting to PDF preserves appearance but often discards or simplifies the original DOCX structure.' },
      { question: 'Can a scanned PDF become an editable Word file?', answer: 'Automatic OCR may recover printed text, after which layout is reconstructed. Accuracy and formatting depend on scan quality and page complexity, so review is essential.' },
      { question: 'How can I keep the same fonts and page breaks?', answer: 'Use matching fonts when properly available and set the same page size and margins. Exact pagination can still change because Word reflows content using different layout rules.' },
      { question: 'Should I convert a PDF table to Word or Excel?', answer: 'Choose Excel when rows, columns, and values are the main goal. Choose Word when the table belongs within a prose document and only modest editing is needed.' },
      { question: 'Does PDFHope process PDF-to-Word locally?', answer: 'No. PDF-to-Word uses a clearly labeled secure server/provider workflow after you choose Convert. Local tools such as PDF Reader and OCR PDF have a different processing boundary.' },
    ],
  },
]

export const guideBySlug = Object.fromEntries(guides.map((guide) => [guide.slug, guide])) as Record<string, Guide>
export const guideByPath = Object.fromEntries(guides.map((guide) => [`/guides/${guide.slug}`, guide])) as Record<string, Guide>
export const guidePaths = ['/guides', ...guides.map((guide) => `/guides/${guide.slug}`)]

function guideText(guide: Guide) {
  return [guide.title, guide.intro, guide.shortAnswer, ...guide.sections.flatMap((section) => [section.heading, ...(section.paragraphs ?? []), ...(section.bullets ?? []), ...(section.steps ?? []).flatMap((step) => [step.title, step.text]), ...(section.subheadings ?? []).flatMap((subheading) => [subheading.heading, ...subheading.paragraphs, ...(subheading.bullets ?? [])])]), ...guide.faq.flatMap((item) => [item.question, item.answer])].join(' ')
}

export function guideWordCount(guide: Guide) {
  return guideText(guide).trim().split(/\s+/).filter(Boolean).length
}

export function guideReadingMinutes(guide: Guide) {
  return Math.max(1, Math.ceil(guideWordCount(guide) / 200))
}
