import { createClient } from '@/lib/supabase/server'
import { isCalendarConnected, createDiaryEvent } from '@/lib/google-calendar'
import { getAIProvider, streamWithProvider, generateWithProvider } from '@/lib/ai/provider'
import { earnDiaryPoints } from '@/lib/points'
import { getPromptContent } from '@/lib/ai-prompts'
import type { ConversationMessage } from '@/types/database'

export async function POST(request: Request) {
  const encoder = new TextEncoder()

  try {
    const { sessionId, messages, timezone } = await request.json()
    const userTimezone = timezone || 'Asia/Seoul'

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Get the current AI provider
    const provider = await getAIProvider()
    console.log(`[diary/generate] Using AI provider: ${provider}`)

    const conversationText = messages
      .map((m: ConversationMessage) => `${m.role === 'user' ? '나' : 'AI'}: ${m.content}`)
      .join('\n')

    // Create streaming response
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Check if entry exists for today
          const today = new Date().toISOString().split('T')[0]
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const client = supabase as any

          const { data: existingEntry } = await client
            .from('diary_entries')
            .select('id, created_at, diary_id')
            .eq('user_id', user.id)
            .eq('entry_date', today)
            .single()

          // Get user's active diary for diary_id
          const { data: activeDiary } = await client
            .from('diaries')
            .select('id')
            .eq('user_id', user.id)
            .eq('status', 'active')
            .order('volume_number', { ascending: false })
            .limit(1)
            .single()

          // Format date/time for diary header
          const now = new Date()
          const formatDateTime = (date: Date) => {
            return date.toLocaleString('ko-KR', {
              timeZone: userTimezone,
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
            }).replace(/\. /g, '년 ').replace('.', '일 ').replace('. ', '월 ')
          }

          let dateInfo: string
          if (existingEntry) {
            const createdAt = new Date(existingEntry.created_at)
            dateInfo = `작성: ${formatDateTime(createdAt)} / 수정: ${formatDateTime(now)}`
          } else {
            dateInfo = `작성: ${formatDateTime(now)}`
          }

          // Step 1: Stream diary content
          let diaryContent = ''

          // Load prompts from DB
          const diaryPrompt = await getPromptContent('diary.write_style', { dateInfo })

          await streamWithProvider(
            provider,
            {
              messages: [
                { role: 'system', content: diaryPrompt },
                { role: 'user', content: conversationText },
              ],
            },
            {
              onChunk: (text) => {
                diaryContent += text
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'content', text })}\n\n`))
              },
              onDone: () => {
                // Continue to metadata step
              },
              onError: (error) => {
                throw error
              },
            }
          )

          // Step 2: Get metadata
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'status', text: '메타데이터 생성 중...' })}\n\n`))

          let metadata = { summary: '', emotions: [], gratitude: [], tomorrow_plan: '' }

          try {
            const metadataPrompt = await getPromptContent('diary.metadata_extraction')
            const metaResponse = await generateWithProvider(provider, {
              messages: [
                { role: 'system', content: metadataPrompt },
                { role: 'user', content: diaryContent },
              ],
              jsonMode: true,
            })

            if (metaResponse) {
              // Clean up response if needed
              let cleanedResponse = metaResponse.trim()
              if (cleanedResponse.startsWith('```json')) {
                cleanedResponse = cleanedResponse.slice(7)
              }
              if (cleanedResponse.startsWith('```')) {
                cleanedResponse = cleanedResponse.slice(3)
              }
              if (cleanedResponse.endsWith('```')) {
                cleanedResponse = cleanedResponse.slice(0, -3)
              }
              metadata = JSON.parse(cleanedResponse.trim())
            }
          } catch (e) {
            console.error('Metadata parsing error:', e)
            // Use defaults
          }

          // Step 3: Save to database
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'status', text: '저장 중...' })}\n\n`))

          const diaryData = {
            session_id: sessionId,
            content: diaryContent,
            summary: metadata.summary || diaryContent.slice(0, 50) + '...',
            emotions: metadata.emotions || [],
            gratitude: metadata.gratitude || [],
            schedule_review: {},
            tomorrow_plan: metadata.tomorrow_plan || '',
          }

          let newEntryId: string | null = null

          if (existingEntry) {
            // Update existing entry, also set diary_id if missing
            const updateData = existingEntry.diary_id ? diaryData : { ...diaryData, diary_id: activeDiary?.id }
            await client.from('diary_entries').update(updateData).eq('id', existingEntry.id)
          } else {
            // Insert new entry
            const { data: insertedEntry } = await client.from('diary_entries').insert({
              user_id: user.id,
              entry_date: today,
              diary_id: activeDiary?.id,
              ...diaryData,
            }).select('id').single()

            newEntryId = insertedEntry?.id

            // Award points for new diary entry
            if (newEntryId) {
              try {
                const pointResult = await earnDiaryPoints(user.id, newEntryId, today)
                if (pointResult) {
                  console.log(`[diary/generate] Points earned: ${pointResult.points_earned}, streak: ${pointResult.streak}`)
                }
              } catch (pointError) {
                console.error('[diary/generate] Error awarding points:', pointError)
                // Don't fail the diary generation if points fail
              }
            }
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
            diary: { content: diaryContent, ...metadata },
            provider, // Include which provider was used
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
