import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { CropType, ShapeType } from '@/types/customization'

const BUCKET_NAME = 'photos'

interface CropRequest {
  photo_id: string
  cropped_data: string // base64 encoded image
  crop_type: CropType
  shape_type?: ShapeType
  lasso_path?: string
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: CropRequest = await request.json()
    const { photo_id, cropped_data, crop_type, shape_type, lasso_path } = body

    if (!photo_id || !cropped_data) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Verify ownership
    const { data: photo, error: fetchError } = await supabase
      .from('user_photos')
      .select('*')
      .eq('id', photo_id)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !photo) {
      return NextResponse.json(
        { error: '사진을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // Decode base64 image
    const base64Data = cropped_data.replace(/^data:image\/\w+;base64,/, '')
    const buffer = Buffer.from(base64Data, 'base64')

    // Generate cropped file path
    const folder = photo.diary_id
      ? `${user.id}/${photo.diary_id}`
      : `${user.id}/general`
    const croppedPath = `${folder}/${photo_id}_cropped.png`

    // Delete existing cropped file if exists
    if (photo.cropped_path) {
      await supabase.storage.from(BUCKET_NAME).remove([photo.cropped_path])
    }

    // Upload new cropped file
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(croppedPath, buffer, {
        contentType: 'image/png',
        cacheControl: '3600',
        upsert: true,
      })

    if (uploadError) {
      console.error('Cropped upload error:', uploadError)
      return NextResponse.json(
        { error: '크롭 이미지 업로드에 실패했습니다.' },
        { status: 500 }
      )
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(croppedPath)

    // Update database
    const { error: updateError } = await supabase
      .from('user_photos')
      .update({
        cropped_path: croppedPath,
        crop_type: crop_type,
        shape_type: shape_type || null,
        lasso_path: lasso_path || null,
        is_premium_crop: crop_type === 'lasso',
        updated_at: new Date().toISOString(),
      })
      .eq('id', photo_id)

    if (updateError) {
      console.error('Update error:', updateError)
      return NextResponse.json(
        { error: '사진 정보 업데이트에 실패했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      cropped_url: urlData.publicUrl,
    })
  } catch (error) {
    console.error('Crop error:', error)
    return NextResponse.json(
      { error: '이미지 크롭 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
