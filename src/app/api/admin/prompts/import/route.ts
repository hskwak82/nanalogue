import { NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/admin'
import { getPromptByKey, updatePrompt, clearPromptCache } from '@/lib/ai-prompts'

interface ParsedPrompt {
  prompt_key: string
  name: string
  description: string | null
  variables: string[]
  content: string
}

interface ImportResult {
  key: string
  status: 'updated' | 'skipped' | 'failed'
  reason?: string
  version?: number
}

// Parse multiple prompts from unified category MD file
function parseMultiplePromptsFromMd(mdContent: string): ParsedPrompt[] {
  const prompts: ParsedPrompt[] = []

  // Split by `---` separator
  const sections = mdContent.split(/^---$/m)

  for (const section of sections) {
    const trimmed = section.trim()
    if (!trimmed) continue

    // Extract prompt_key from `## chat.greeting`
    const keyMatch = trimmed.match(/^## ([a-z]+\.[a-z_]+)/m)
    if (!keyMatch) continue

    const prompt_key = keyMatch[1]

    // Extract name from `- **이름**: 첫 인사말`
    const nameMatch = trimmed.match(/- \*\*이름\*\*:\s*(.+)/)
    const name = nameMatch ? nameMatch[1].trim() : prompt_key

    // Extract description from `- **설명**: ...`
    const descMatch = trimmed.match(/- \*\*설명\*\*:\s*(.+)/)
    const description = descMatch ? descMatch[1].trim() : null

    // Extract variables from `- **변수**: {{today}}, {{userName}}`
    const varsMatch = trimmed.match(/- \*\*변수\*\*:\s*(.+)/)
    let variables: string[] = []
    if (varsMatch) {
      const varsStr = varsMatch[1]
      const varMatches = varsStr.match(/\{\{([^}]+)\}\}/g)
      if (varMatches) {
        variables = varMatches.map(v => v.slice(2, -2))
      }
    }

    // Extract content from `### 프롬프트 내용` code block
    const contentMatch = trimmed.match(/### 프롬프트 내용\s*\n\s*```\n([\s\S]*?)\n```/)
    if (!contentMatch) continue

    prompts.push({
      prompt_key,
      name,
      description,
      variables,
      content: contentMatch[1]
    })
  }

  return prompts
}

// POST /api/admin/prompts/import - Import prompts from MD file(s)
export async function POST(request: Request) {
  const auth = await checkAdminAuth()
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const files = formData.getAll('file') as File[]

    if (files.length === 0) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const results: ImportResult[] = []

    for (const file of files) {
      // Check file type - only MD allowed
      const isMd = file.name.endsWith('.md') || file.type === 'text/markdown'
      if (!isMd) {
        results.push({
          key: file.name,
          status: 'failed',
          reason: 'not_md_file'
        })
        continue
      }

      const mdContent = await file.text()
      const parsedPrompts = parseMultiplePromptsFromMd(mdContent)

      for (const parsed of parsedPrompts) {
        const existing = await getPromptByKey(parsed.prompt_key)
        if (!existing) {
          results.push({
            key: parsed.prompt_key,
            status: 'failed',
            reason: 'not_found'
          })
          continue
        }

        if (existing.content === parsed.content) {
          results.push({
            key: parsed.prompt_key,
            status: 'skipped',
            reason: 'no_change'
          })
          continue
        }

        const updated = await updatePrompt(
          existing.id,
          parsed.content,
          parsed.variables,
          'Imported from MD file',
          auth.userId
        )

        if (updated) {
          results.push({
            key: parsed.prompt_key,
            status: 'updated',
            version: updated.version
          })
        } else {
          results.push({
            key: parsed.prompt_key,
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
