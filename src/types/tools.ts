export type ToolCategory = 'Organize' | 'Convert' | 'Optimize' | 'Secure' | 'Edit' | 'Inspect' | 'Advanced'

export type ToolKind =
  | 'merge' | 'split' | 'extract' | 'delete' | 'reorder' | 'rotate'
  | 'images-to-pdf' | 'pdf-to-image' | 'page-numbers' | 'watermark'
  | 'metadata' | 'health' | 'blank' | 'page-size' | 'orientation'
  | 'duplicate' | 'interleave' | 'deinterleave' | 'n-up' | 'contact-sheet'

export interface ToolDefinition {
  slug: string
  name: string
  short: string
  description: string
  category: ToolCategory
  kind: ToolKind
  accepts: string
  multiple?: boolean
  output: string
  instructions: string[]
  limitations: string
  popular?: boolean
}
