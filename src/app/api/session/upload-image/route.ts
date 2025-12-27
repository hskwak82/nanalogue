import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const BUCKET_NAME = 'photos'
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB (client compresses before upload)

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const sessionId = formData.get('session_id') as string

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!sessionId) {
      return NextResponse.json({ error: 'No session_id provided' }, { status: 400 })
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: '파일 크기는 10MB 이하여야 합니다.' },
        { status: 400 }
      )
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'JPG, PNG, WebP 형식만 지원합니다.' },
        { status: 400 }
      )
    }

    // Verify session belongs to user
    const { data: session, error: sessionError } = await supabase
      .from('daily_sessions')
      .select('id, user_id')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    if (session.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Generate path: {userId}/general/{sessionId}_session.{ext}
    // Use /general/ folder which matches existing RLS policies for photos
    const extension = file.name.split('.').pop() || 'jpg'
    const path = `${user.id}/general/${sessionId}_session.${extension}`

    // Upload to storage (upsert to allow replacement)
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: true,
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json(
        { error: '파일 업로드에 실패했습니다.' },
        { status: 500 }
      )
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(path)

    // Add cache-busting timestamp
    const imageUrl = `${urlData.publicUrl}?t=${Date.now()}`

    // Update session with image URL
    const { error: updateError } = await supabase
      .from('daily_sessions')
      .update({ session_image_url: imageUrl })
      .eq('id', sessionId)

    if (updateError) {
      console.error('Database update error:', updateError)
      return NextResponse.json(
        { error: '세션 정보 업데이트에 실패했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      image_url: imageUrl,
    })
  } catch (error) {
    console.error('Session image upload error:', error)
    return NextResponse.json(
      { error: '이미지 업로드 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('session_id')

    if (!sessionId) {
      return NextResponse.json({ error: 'No session_id provided' }, { status: 400 })
    }

    // Verify session belongs to user and get current image URL
    const { data: session, error: sessionError } = await supabase
      .from('daily_sessions')
      .select('id, user_id, session_image_url')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    if (session.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    if (!session.session_image_url) {
      return NextResponse.json({ success: true, message: 'No image to delete' })
    }

    // Extract path from URL and remove from storage
    // URL format: https://xxx.supabase.co/storage/v1/object/public/photos/{userId}/general/{sessionId}_session.jpg?t=xxx
    const urlWithoutQuery = session.session_image_url.split('?')[0]
    const pathMatch = urlWithoutQuery.match(/\/photos\/(.+)$/)

    if (pathMatch) {
      const storagePath = pathMatch[1]
      await supabase.storage.from(BUCKET_NAME).remove([storagePath])
    }

    // Clear session image URL
    const { error: updateError } = await supabase
      .from('daily_sessions')
      .update({ session_image_url: null })
      .eq('id', sessionId)

    if (updateError) {
      console.error('Database update error:', updateError)
      return NextResponse.json(
        { error: '세션 정보 업데이트에 실패했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Session image delete error:', error)
    return NextResponse.json(
      { error: '이미지 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
