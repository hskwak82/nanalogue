import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@/lib/supabase/server'
import { isCalendarConnected, createDiaryEvent } from '@/lib/google-calendar'
import type { ConversationMessage } from '@/types/database'

function getGeminiClient() {
  return new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')
}

export async function POST(request: Request) {
  try {
    const { sessionId, messages } = await request.json()

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Format conversation for diary generation
    const conversationText = messages
      .map(
        (m: ConversationMessage) =>
          `${m.role === 'user' ? '나' : 'AI'}: ${m.content}`
      )
      .join('\n')

    const genAI = getGeminiClient()
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

    const prompt = `당신은 따뜻하고 세심한 일기 작성 도우미입니다.
사용자와의 대화 내용을 바탕으로 1인칭 시점의 일기를 작성해주세요.

일기 작성 가이드라인:
- 1인칭 시점으로 작성 (나는, 내가, 나의)
- 문어체가 아닌 편안한 구어체로 작성
- 감정과 생각을 자연스럽게 녹여내기
- 3-5개 문단, 적당한 길이 유지
- 사실만 나열하지 말고 그때의 감정과 생각도 포함

다음 대화를 바탕으로 오늘의 일기를 작성해주세요:

${conversationText}

응답은 반드시 다음 JSON 형식으로 출력하세요:
{
  "content": "일기 본문",
  "summary": "하루 한줄 요약",
  "emotions": ["감정 태그들"],
  "gratitude": ["감사한 점들"],
  "tomorrow_plan": "내일 계획이나 다짐"
}`

    const result = await model.generateContent(prompt)
    const response = await result.response
    let diaryContent = response.text()

    if (!diaryContent) {
      throw new Error('Failed to generate diary content')
    }

    // Remove markdown code blocks if present
    diaryContent = diaryContent.trim()
    if (diaryContent.startsWith('```json')) {
      diaryContent = diaryContent.slice(7)
    } else if (diaryContent.startsWith('```')) {
      diaryContent = diaryContent.slice(3)
    }
    if (diaryContent.endsWith('```')) {
      diaryContent = diaryContent.slice(0, -3)
    }
    diaryContent = diaryContent.trim()

    // Parse JSON with error handling - Gemini sometimes returns newlines in strings
    let diary
    try {
      diary = JSON.parse(diaryContent)
    } catch {
      // Try to fix common JSON issues - newlines inside string values
      try {
        // Replace newlines inside strings only (between quotes, using [\s\S] to match newlines)
        const fixedContent = diaryContent.replace(
          /"([\s\S]*?)"/g,
          (match, content) => {
            const fixed = content
              .replace(/\n/g, '\\n')
              .replace(/\r/g, '\\r')
              .replace(/\t/g, '\\t')
            return `"${fixed}"`
          }
        )
        diary = JSON.parse(fixedContent)
      } catch (parseError) {
        console.error('JSON parse error:', parseError)
        console.error('Raw content:', diaryContent.substring(0, 500))
        throw new Error('일기 생성 결과를 파싱할 수 없습니다.')
      }
    }
    const today = new Date().toISOString().split('T')[0]

    // Save diary entry - check if exists first
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = supabase as any
    const { data: existingEntry } = await client
      .from('diary_entries')
      .select('id')
      .eq('user_id', user.id)
      .eq('entry_date', today)
      .single()

    let insertError = null

    if (existingEntry) {
      // Update existing entry
      const { error } = await client
        .from('diary_entries')
        .update({
          session_id: sessionId,
          content: diary.content,
          summary: diary.summary,
          emotions: diary.emotions || [],
          gratitude: diary.gratitude || [],
          schedule_review: {},
          tomorrow_plan: diary.tomorrow_plan,
        })
        .eq('id', existingEntry.id)
      insertError = error
    } else {
      // Insert new entry
      const { error } = await client.from('diary_entries').insert({
        user_id: user.id,
        session_id: sessionId,
        entry_date: today,
        content: diary.content,
        summary: diary.summary,
        emotions: diary.emotions || [],
        gratitude: diary.gratitude || [],
        schedule_review: {},
        tomorrow_plan: diary.tomorrow_plan,
      })
      insertError = error
    }

    if (insertError) {
      console.error('Failed to save diary:', insertError)
      throw insertError
    }

    // Sync to Google Calendar if connected
    try {
      const hasCalendar = await isCalendarConnected(user.id)
      if (hasCalendar) {
        await createDiaryEvent(user.id, today, diary.summary)
      }
    } catch (calendarError) {
      // Log but don't fail the request if calendar sync fails
      console.error('Failed to sync to calendar:', calendarError)
    }

    return NextResponse.json({
      success: true,
      diary,
    })
  } catch (error) {
    console.error('Error generating diary:', error)
    const errorMessage = error instanceof Error ? error.message : '일기 생성에 실패했습니다.'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
