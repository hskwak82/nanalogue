import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const BUCKET_NAME = 'photos'

export async function POST(request: Request) {
  try {
    // Verify user authentication
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { diaryId, imageBase64 } = body

    if (!diaryId || !imageBase64) {
      return NextResponse.json(
        { error: 'diaryId and imageBase64 are required' },
        { status: 400 }
      )
    }

    // Verify diary belongs to user
    const { data: diary } = await supabase
      .from('diaries')
      .select('id')
      .eq('id', diaryId)
      .eq('user_id', user.id)
      .single()

    if (!diary) {
      return NextResponse.json({ error: 'Diary not found' }, { status: 404 })
    }

    // Convert base64 to buffer
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '')
    const buffer = Buffer.from(base64Data, 'base64')

    // Upload using admin client (bypasses RLS)
    const adminClient = createAdminClient()
    const path = `${user.id}/${diaryId}/cover.png`

    const { error: uploadError } = await adminClient.storage
      .from(BUCKET_NAME)
      .upload(path, buffer, {
        cacheControl: '60',
        upsert: true,
        contentType: 'image/png',
      })

    if (uploadError) {
      console.error('Cover upload error:', uploadError)
      return NextResponse.json(
        { error: 'Failed to upload cover image' },
        { status: 500 }
      )
    }

    // Get public URL
    const { data: urlData } = adminClient.storage
      .from(BUCKET_NAME)
      .getPublicUrl(path)

    const coverImageUrl = `${urlData.publicUrl}?t=${Date.now()}`

    return NextResponse.json({
      success: true,
      url: coverImageUrl,
    })
  } catch (error) {
    console.error('Error uploading cover:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
