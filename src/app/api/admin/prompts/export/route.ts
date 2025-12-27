import { NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/admin'
import { getAllPrompts, getPromptsByCategory } from '@/lib/ai-prompts'
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

// GET /api/admin/prompts/export - Export prompts as MD file(s)
export async function GET(request: Request) {
  const auth = await checkAdminAuth()
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')

    // Single category export - return MD file directly
    if (category && category !== 'all') {
      const prompts = await getPromptsByCategory(category)
      const mdContent = generateCategoryMd(category, prompts)

      return new Response(mdContent, {
        headers: {
          'Content-Type': 'text/markdown; charset=utf-8',
          'Content-Disposition': `attachment; filename="${category}.md"`
        }
      })
    }

    // All categories - return JSON with all MD contents for frontend to handle
    const prompts = await getAllPrompts()

    // Group prompts by category
    const groupedByCategory = prompts.reduce((acc, p) => {
      if (!acc[p.category]) acc[p.category] = []
      acc[p.category].push(p)
      return acc
    }, {} as Record<string, AIPrompt[]>)

    // Generate MD for each category
    const files: Record<string, string> = {}
    for (const [cat, catPrompts] of Object.entries(groupedByCategory)) {
      files[cat] = generateCategoryMd(cat, catPrompts)
    }

    return NextResponse.json({ files })
  } catch (error) {
    console.error('Error exporting prompts:', error)
    return NextResponse.json({ error: 'Failed to export prompts' }, { status: 500 })
  }
}
