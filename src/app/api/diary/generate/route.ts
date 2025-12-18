import { createClient } from '@/lib/supabase/server'
import { isCalendarConnected, createDiaryEvent } from '@/lib/google-calendar'
import type { ConversationMessage } from '@/types/database'

const DIARY_PROMPT = `대화 내용을 바탕으로 1인칭 일기를 작성해주세요.
- 편안한 구어체, 2-3문단
- 감정과 생각을 자연스럽게 표현
일기 본문만 작성하세요.`

const METADATA_PROMPT = `다음 일기를 분석해서 JSON으로 응답하세요:
{"summary":"한줄요약","emotions":["감정태그"],"gratitude":["감사한점"],"tomorrow_plan":"내일다짐"}`

export async function POST(request: Request) {
  const encoder = new TextEncoder()

  try {
    const { sessionId, messages } = await request.json()

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not configured')
    }

    const conversationText = messages
      .map((m: ConversationMessage) => `${m.role === 'user' ? '나' : 'AI'}: ${m.content}`)
      .join('\n')

    // Create streaming response
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Step 1: Stream diary content
          const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'gpt-4o-mini',
              messages: [
                { role: 'system', content: DIARY_PROMPT },
                { role: 'user', content: conversationText },
              ],
              stream: true,
            }),
          })

          if (!response.ok) {
            throw new Error(`OpenAI API error: ${response.status}`)
          }

          const reader = response.body?.getReader()
          if (!reader) throw new Error('No response body')

          let diaryContent = ''
          const decoder = new TextDecoder()

          // Stream the content
          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            const chunk = decoder.decode(value)
            const lines = chunk.split('\n').filter(line => line.startsWith('data: '))

            for (const line of lines) {
              const data = line.slice(6)
              if (data === '[DONE]') continue

              try {
                const parsed = JSON.parse(data)
                const content = parsed.choices?.[0]?.delta?.content
                if (content) {
                  diaryContent += content
                  // Send content chunk to client
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'content', text: content })}\n\n`))
                }
              } catch {
                // Skip invalid JSON
              }
            }
          }

          // Step 2: Get metadata (quick, non-streaming)
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'status', text: '메타데이터 생성 중...' })}\n\n`))

          const metaResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'gpt-4o-mini',
              messages: [
                { role: 'system', content: METADATA_PROMPT },
                { role: 'user', content: diaryContent },
              ],
              response_format: { type: 'json_object' },
            }),
          })

          let metadata = { summary: '', emotions: [], gratitude: [], tomorrow_plan: '' }
          if (metaResponse.ok) {
            const metaData = await metaResponse.json()
            const metaContent = metaData.choices?.[0]?.message?.content
            if (metaContent) {
              try {
                metadata = JSON.parse(metaContent)
              } catch {
                // Use defaults
              }
            }
          }

          // Step 3: Save to database
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'status', text: '저장 중...' })}\n\n`))

          const today = new Date().toISOString().split('T')[0]
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const client = supabase as any

          const { data: existingEntry } = await client
            .from('diary_entries')
            .select('id')
            .eq('user_id', user.id)
            .eq('entry_date', today)
            .single()

          const diaryData = {
            session_id: sessionId,
            content: diaryContent,
            summary: metadata.summary || diaryContent.slice(0, 50) + '...',
            emotions: metadata.emotions || [],
            gratitude: metadata.gratitude || [],
            schedule_review: {},
            tomorrow_plan: metadata.tomorrow_plan || '',
          }

          if (existingEntry) {
            await client.from('diary_entries').update(diaryData).eq('id', existingEntry.id)
          } else {
            await client.from('diary_entries').insert({
              user_id: user.id,
              entry_date: today,
              ...diaryData,
            })
          }

          // Sync to Google Calendar
          try {
            const hasCalendar = await isCalendarConnected(user.id)
            if (hasCalendar) {
              await createDiaryEvent(user.id, today, metadata.summary || diaryContent.slice(0, 50))
            }
          } catch {
            // Ignore calendar errors
          }

          // Send completion
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'done',
            diary: { content: diaryContent, ...metadata }
          })}\n\n`))

          controller.close()
        } catch (error) {
          console.error('Streaming error:', error)
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'error',
            message: error instanceof Error ? error.message : '일기 생성 실패'
          })}\n\n`))
          controller.close()
        }
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    console.error('Error generating diary:', error)
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : '일기 생성에 실패했습니다.'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
