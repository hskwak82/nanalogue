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

// Extract prompt_key from MD file
function extractPromptKeyFromMd(mdContent: string): string | null {
  const match = mdContent.match(/- \*\*키\*\*:\s*`([^`]+)`/)
  if (match && match[1]) {
    return match[1]
  }
  return null
}

// Extract category from MD file
function extractCategoryFromMd(mdContent: string): string | null {
  const match = mdContent.match(/- \*\*카테고리\*\*:\s*[^\(]+\(([^)]+)\)/)
  if (match && match[1]) {
    return match[1]
  }
  return null
}

// Extract variables from MD file
function extractVariablesFromMd(mdContent: string): string[] {
  const match = mdContent.match(/- \*\*변수\*\*:\s*(.+)/)
  if (match && match[1]) {
    return match[1].split(',').map(v => v.trim()).filter(v => v.length > 0)
  }
  return []
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

    // Try to read metadata.json
    const metadataFile = zip.file('metadata.json')

    if (metadataFile) {
      // Use metadata.json for import
      const metadataContent = await metadataFile.async('string')
      const metadata: Metadata = JSON.parse(metadataContent)

      for (const promptMeta of metadata.prompts) {
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

        if (existing.content === extractedContent) {
          results.push({
            key: promptMeta.prompt_key,
            status: 'skipped',
            reason: 'no_change'
          })
          continue
        }

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
    } else {
      // No metadata.json - scan for MD files directly
      const mdFiles = Object.keys(zip.files).filter(name => name.endsWith('.md') && !name.endsWith('README.md'))

      if (mdFiles.length === 0) {
        return NextResponse.json({ error: 'ZIP 파일에 MD 파일이 없습니다.' }, { status: 400 })
      }

      for (const filename of mdFiles) {
        const mdFile = zip.file(filename)
        if (!mdFile) continue

        const mdContent = await mdFile.async('string')
        const promptKey = extractPromptKeyFromMd(mdContent)
        const category = extractCategoryFromMd(mdContent)
        const variables = extractVariablesFromMd(mdContent)

        if (!promptKey) {
          results.push({
            key: filename,
            status: 'failed',
            reason: 'key_extraction_failed'
          })
          continue
        }

        // Apply category filter
        if (categoryFilter && category !== categoryFilter) {
          continue
        }

        const extractedContent = extractContentFromMd(mdContent)

        if (!extractedContent) {
          results.push({
            key: promptKey,
            status: 'failed',
            reason: 'content_extraction_failed'
          })
          continue
        }

        const existing = await getPromptByKey(promptKey)
        if (!existing) {
          results.push({
            key: promptKey,
            status: 'failed',
            reason: 'not_found'
          })
          continue
        }

        if (existing.content === extractedContent) {
          results.push({
            key: promptKey,
            status: 'skipped',
            reason: 'no_change'
          })
          continue
        }

        const updated = await updatePrompt(
          existing.id,
          extractedContent,
          variables,
          'Imported from ZIP file',
          auth.userId
        )

        if (updated) {
          results.push({
            key: promptKey,
            status: 'updated',
            version: updated.version
          })
        } else {
          results.push({
            key: promptKey,
            status: 'failed',
            reason: 'update_failed'
          })
        }
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
