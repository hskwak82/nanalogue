import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'
import type { ConversationMessage } from '@/types/database'

function getOpenAIClient() {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || '',
  })
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

    const completion = await getOpenAIClient().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `당신은 따뜻하고 세심한 일기 작성 도우미입니다.
사용자와의 대화 내용을 바탕으로 1인칭 시점의 일기를 작성해주세요.

일기 작성 가이드라인:
- 1인칭 시점으로 작성 (나는, 내가, 나의)
- 문어체가 아닌 편안한 구어체로 작성
- 감정과 생각을 자연스럽게 녹여내기
- 3-5개 문단, 적당한 길이 유지
- 사실만 나열하지 말고 그때의 감정과 생각도 포함

응답 형식 (JSON):
{
  "content": "일기 본문",
  "summary": "하루 한줄 요약",
  "emotions": ["감정 태그들"],
  "gratitude": ["감사한 점들"],
  "tomorrow_plan": "내일 계획이나 다짐"
}`,
        },
        {
          role: 'user',
          content: `다음 대화를 바탕으로 오늘의 일기를 작성해주세요:\n\n${conversationText}`,
        },
      ],
      max_tokens: 1000,
      temperature: 0.7,
      response_format: { type: 'json_object' },
    })

    const diaryContent = completion.choices[0].message.content
    if (!diaryContent) {
      throw new Error('Failed to generate diary content')
    }

    const diary = JSON.parse(diaryContent)
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

    return NextResponse.json({
      success: true,
      diary,
    })
  } catch (error) {
    console.error('Error generating diary:', error)
    return NextResponse.json(
      { error: 'Failed to generate diary' },
      { status: 500 }
    )
  }
}
