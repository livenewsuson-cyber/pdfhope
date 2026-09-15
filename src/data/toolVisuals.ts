import { BookOpen, FilePenLine, Combine, Scissors, FileOutput, FileMinus2, ListOrdered, RotateCw, ImagePlus, Images, FileImage, FileType2, FileInput, ChartNoAxesColumn, Hash, Stamp, ShieldCheck, ScanSearch, FileSearch, Ruler, ScanLine, Copy, Shuffle, Ungroup, PanelsTopLeft, LayoutGrid, type LucideIcon } from 'lucide-react'

type Accent = 'blue' | 'red' | 'purple' | 'teal' | 'orange' | 'pink' | 'green'
export const icons: Record<string, [LucideIcon, Accent]> = {
  'pdf-reader': [BookOpen, 'blue'], 'edit-pdf': [FilePenLine, 'blue'],
  'merge-pdf': [Combine, 'red'], 'split-pdf': [Scissors, 'purple'],
  'extract-pdf-pages': [FileOutput, 'purple'], 'delete-pdf-pages': [FileMinus2, 'red'],
  'reorder-pdf': [ListOrdered, 'teal'], 'rotate-pdf': [RotateCw, 'orange'],
  'jpg-to-pdf': [ImagePlus, 'teal'], 'png-to-pdf': [ImagePlus, 'teal'],
  'webp-to-pdf': [ImagePlus, 'teal'], 'images-to-pdf': [Images, 'teal'],
  'pdf-to-jpg': [FileImage, 'orange'], 'pdf-to-png': [FileImage, 'orange'],
  'word-to-pdf': [FileInput, 'orange'], 'pdf-to-word': [FileType2, 'blue'],
  'pdf-size-breakdown': [ChartNoAxesColumn, 'green'], 'add-page-numbers': [Hash, 'blue'],
  'watermark-pdf': [Stamp, 'pink'], 'pdf-metadata-cleaner': [ShieldCheck, 'green'],
  'pdf-health-check': [ScanSearch, 'blue'], 'blank-page-detector': [FileSearch, 'blue'],
  'page-size-analyzer': [Ruler, 'teal'], 'orientation-analyzer': [ScanLine, 'teal'],
  'duplicate-page-finder': [Copy, 'purple'], 'interleave-pdf': [Shuffle, 'purple'],
  'deinterleave-pdf': [Ungroup, 'purple'], 'n-up-pdf': [PanelsTopLeft, 'teal'],
  'pdf-contact-sheet': [LayoutGrid, 'teal'],
}

export function toolAccent(slug: string): Accent { return icons[slug]?.[1] ?? 'blue' }
