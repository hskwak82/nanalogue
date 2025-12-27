import { NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/admin'
import { getAllPrompts, getPromptsByCategory } from '@/lib/ai-prompts'
import JSZip from 'jszip'
import { AI_PROMPT_CATEGORIES } from '@/types/ai-prompts'

// GET /api/admin/prompts/export - Export prompts as ZIP with MD files
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

    // Create metadata.json for import compatibility
    const metadata = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      prompts: prompts.map(p => ({
        prompt_key: p.prompt_key,
        category: p.category,
        name: p.name,
        description: p.description,
        variables: p.variables,
        filename: `${p.category}/${p.prompt_key.replace('.', '_')}.md`
      }))
    }
    zip.file('metadata.json', JSON.stringify(metadata, null, 2))

    // Create category folders and MD files
    for (const prompt of prompts) {
      const categoryLabel = AI_PROMPT_CATEGORIES[prompt.category as keyof typeof AI_PROMPT_CATEGORIES] || prompt.category
      const filename = prompt.prompt_key.replace('.', '_')

      // Build MD content
      const mdContent = `# ${prompt.name}

## 정보
- **키**: \`${prompt.prompt_key}\`
- **카테고리**: ${categoryLabel} (${prompt.category})
- **설명**: ${prompt.description || '없음'}
${prompt.variables.length > 0 ? `- **변수**: ${prompt.variables.join(', ')}` : ''}

## 프롬프트 내용

\`\`\`
${prompt.content}
\`\`\`
`

      zip.file(`${prompt.category}/${filename}.md`, mdContent)
    }

    // Add README
    const readme = `# AI 프롬프트 내보내기

내보내기 일시: ${new Date().toLocaleString('ko-KR')}

## 파일 구조
- \`metadata.json\`: 가져오기용 메타데이터
- \`chat/\`: 대화 관련 프롬프트
- \`diary/\`: 일기 관련 프롬프트
- \`schedule/\`: 일정 관련 프롬프트

## 프롬프트 목록
${prompts.map(p => `- \`${p.prompt_key}\`: ${p.name}`).join('\n')}

## 가져오기 방법
1. MD 파일 수정
2. 수정한 파일들을 다시 ZIP으로 압축
3. 관리자 페이지에서 가져오기
`
    zip.file('README.md', readme)

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
