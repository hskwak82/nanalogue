import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { ThumbnailCropData } from '@/types/database'

export async function PUT(request: Request) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { sessionId, cropData } = body as {
      sessionId: string
      cropData: ThumbnailCropData
    }

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 })
    }

    if (!cropData || !cropData.type || !cropData.crop) {
      return NextResponse.json({ error: 'Valid crop data is required' }, { status: 400 })
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

    // Validate crop data bounds
    const { x, y, width, height } = cropData.crop
    if (x < 0 || y < 0 || width <= 0 || height <= 0 || x + width > 100 || y + height > 100) {
      return NextResponse.json({ error: 'Invalid crop bounds' }, { status: 400 })
    }

    // Update session with crop data
    const { error: updateError } = await supabase
      .from('daily_sessions')
      .update({ thumbnail_crop_data: cropData })
      .eq('id', sessionId)

    if (updateError) {
      console.error('Failed to update crop data:', updateError)
      return NextResponse.json(
        { error: '크롭 설정 저장에 실패했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      cropData,
    })
  } catch (error) {
    console.error('Thumbnail crop error:', error)
    return NextResponse.json(
      { error: '썸네일 설정 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
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
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 })
    }

    // Get session with crop data
    const { data: session, error: sessionError } = await supabase
      .from('daily_sessions')
      .select('id, user_id, session_image_url, thumbnail_crop_data')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    if (session.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    return NextResponse.json({
      sessionId: session.id,
      imageUrl: session.session_image_url,
      cropData: session.thumbnail_crop_data as ThumbnailCropData | null,
    })
  } catch (error) {
    console.error('Get thumbnail crop error:', error)
    return NextResponse.json(
      { error: '썸네일 정보 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
