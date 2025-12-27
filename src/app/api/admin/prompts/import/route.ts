import { NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/admin'
import { getPromptByKey, updatePrompt, clearPromptCache } from '@/lib/ai-prompts'
import JSZip from 'jszip'

interface MetadataPrompt {
  prompt_key: string
  category: string
  name: string
  description: string | null
  variables: string[]
  filename: string
}

interface Metadata {
  version: string
  exportedAt: string
  prompts: MetadataPrompt[]
}

interface ImportResult {
  key: string
  status: 'updated' | 'skipped' | 'failed'
  reason?: string
  version?: number
}

// Extract content from MD file (content between ``` blocks)
function extractContentFromMd(mdContent: string): string | null {
  const match = mdContent.match(/## 프롬프트 내용\s*\n\s*```\n([\s\S]*?)\n```/)
  if (match && match[1]) {
    return match[1]
  }
  return null
}

// POST /api/admin/prompts/import - Import prompts from ZIP file
export async function POST(request: Request) {
  const auth = await checkAdminAuth()
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Check file type - only ZIP allowed
    const isZip = file.name.endsWith('.zip') || file.type === 'application/zip'
    if (!isZip) {
      return NextResponse.json({ error: 'ZIP 파일만 가져올 수 있습니다.' }, { status: 400 })
    }

    // Get category filter (optional)
    const categoryFilter = formData.get('category') as string | null

    const results: ImportResult[] = []

    // Handle ZIP file
    const arrayBuffer = await file.arrayBuffer()
    const zip = await JSZip.loadAsync(arrayBuffer)

    // Read metadata.json
    const metadataFile = zip.file('metadata.json')
    if (!metadataFile) {
      return NextResponse.json({ error: 'Invalid ZIP: missing metadata.json' }, { status: 400 })
    }

    const metadataContent = await metadataFile.async('string')
    const metadata: Metadata = JSON.parse(metadataContent)

    // Process each prompt from metadata
    for (const promptMeta of metadata.prompts) {
      // Skip if category filter is set and doesn't match
      if (categoryFilter && promptMeta.category !== categoryFilter) {
        continue
      }

      const mdFile = zip.file(promptMeta.filename)
      if (!mdFile) {
        results.push({
          key: promptMeta.prompt_key,
          status: 'failed',
          reason: 'md_file_not_found'
        })
        continue
      }

      const mdContent = await mdFile.async('string')
      const extractedContent = extractContentFromMd(mdContent)

      if (!extractedContent) {
        results.push({
          key: promptMeta.prompt_key,
          status: 'failed',
          reason: 'content_extraction_failed'
        })
        continue
      }

      const existing = await getPromptByKey(promptMeta.prompt_key)
      if (!existing) {
        results.push({
          key: promptMeta.prompt_key,
          status: 'failed',
          reason: 'not_found'
        })
        continue
      }

      // Skip if content is the same
      if (existing.content === extractedContent) {
        results.push({
          key: promptMeta.prompt_key,
          status: 'skipped',
          reason: 'no_change'
        })
        continue
      }

      // Update the prompt
      const updated = await updatePrompt(
        existing.id,
        extractedContent,
        promptMeta.variables || [],
        'Imported from ZIP file',
        auth.userId
      )

      if (updated) {
        results.push({
          key: promptMeta.prompt_key,
          status: 'updated',
          version: updated.version
        })
      } else {
        results.push({
          key: promptMeta.prompt_key,
          status: 'failed',
          reason: 'update_failed'
        })
      }
    }

    // Clear cache after import
    clearPromptCache()

    return NextResponse.json({
      success: true,
      updated: results.filter(r => r.status === 'updated').length,
      skipped: results.filter(r => r.status === 'skipped').length,
      failed: results.filter(r => r.status === 'failed').length,
      details: results
    })
  } catch (error) {
    console.error('Error importing prompts:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to import prompts'
    }, { status: 500 })
  }
}
