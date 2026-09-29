import { PDFDocument, degrees } from 'pdf-lib'

export type SignaturePlacement = { id: number; pageIndex: number; x: number; y: number; width: number; height: number; image: string }
export type PageGeometry = { width: number; height: number; rotation: number; toPdfPoint: (x: number, y: number) => [number, number] }

export function placementToPdf(placement: SignaturePlacement, page: PageGeometry) {
  const left = placement.x * page.width, bottom = (placement.y + placement.height) * page.height
  const [x, y] = page.toPdfPoint(left, bottom)
  return { x, y, width: placement.width * page.width, height: placement.height * page.height, rotate: degrees(((page.rotation % 360) + 360) % 360) }
}

export async function exportSignedPdf(file: File, placements: SignaturePlacement[]): Promise<Blob> {
  if (!placements.length) throw new Error('Place at least one signature.')
  const { openRenderedPdf } = await import('./render')
  const preview = await openRenderedPdf(file)
  try {
    const output = await PDFDocument.load(await file.arrayBuffer())
    const images = new Map<string, Awaited<ReturnType<typeof output.embedPng>>>()
    for (const placement of placements) {
      const pdfPage = output.getPage(placement.pageIndex)
      if (!pdfPage) throw new Error('Signature page is unavailable.')
      const view = (await preview.getPage(placement.pageIndex + 1)).getViewport({ scale: 1 })
      let image = images.get(placement.image)
      if (!image) {
        const base64 = placement.image.split(',')[1]
        const bytes = Uint8Array.from(atob(base64), (letter) => letter.charCodeAt(0))
        image = await output.embedPng(bytes)
        images.set(placement.image, image)
      }
      pdfPage.drawImage(image, placementToPdf(placement, { width: view.width, height: view.height, rotation: view.rotation, toPdfPoint: (x, y) => view.convertToPdfPoint(x, y) as [number, number] }))
    }
    return new Blob([await output.save() as BlobPart], { type: 'application/pdf' })
  } finally { await preview.cleanup() }
}
