import { NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/admin'
import { getAllPrompts, getPromptsByCategory } from '@/lib/ai-prompts'
import JSZip from 'jszip'
import { AI_PROMPT_CATEGORIES, AIPrompt } from '@/types/ai-prompts'

// Generate unified MD content for a category
function generateCategoryMd(category: string, prompts: AIPrompt[]): string {
  const categoryLabel = AI_PROMPT_CATEGORIES[category as keyof typeof AI_PROMPT_CATEGORIES] || category

  let md = `# ${categoryLabel} (${category})\n\n`

  for (const prompt of prompts) {
    md += `---\n\n`
    md += `## ${prompt.prompt_key}\n\n`
    md += `- **이름**: ${prompt.name}\n`
    md += `- **설명**: ${prompt.description || '없음'}\n`
    if (prompt.variables.length > 0) {
      md += `- **변수**: ${prompt.variables.map(v => `{{${v}}}`).join(', ')}\n`
    }
    md += `\n### 프롬프트 내용\n\n`
    md += '```\n'
    md += prompt.content
    md += '\n```\n\n'
  }

  return md
}

// GET /api/admin/prompts/export - Export prompts as ZIP with unified MD files per category
export async function GET(request: Request) {
  const auth = await checkAdminAuth()
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')

    // Get prompts based on category filter
    const prompts = category && category !== 'all'
      ? await getPromptsByCategory(category)
      : await getAllPrompts()

    const zip = new JSZip()

    // Group prompts by category
    const groupedByCategory = prompts.reduce((acc, p) => {
      if (!acc[p.category]) acc[p.category] = []
      acc[p.category].push(p)
      return acc
    }, {} as Record<string, AIPrompt[]>)

    // Create unified MD file for each category
    for (const [cat, catPrompts] of Object.entries(groupedByCategory)) {
      const mdContent = generateCategoryMd(cat, catPrompts)
      zip.file(`${cat}.md`, mdContent)
    }

    // Generate ZIP as base64 then convert
    const zipBase64 = await zip.generateAsync({ type: 'base64' })
    const zipBuffer = Buffer.from(zipBase64, 'base64')

    // Generate filename based on category
    const filename = category && category !== 'all'
      ? `nanalogue-prompts-${category}.zip`
      : 'nanalogue-prompts.zip'

    return new Response(zipBuffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    })
  } catch (error) {
    console.error('Error exporting prompts:', error)
    return NextResponse.json({ error: 'Failed to export prompts' }, { status: 500 })
  }
}
