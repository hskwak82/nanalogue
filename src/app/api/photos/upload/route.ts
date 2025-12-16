import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { CropType, ShapeType } from '@/types/customization'

const BUCKET_NAME = 'photos'
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const MAX_PHOTOS_FREE = 5

interface UploadResponse {
  photo_id: string
  original_url: string
  cropped_url?: string
  thumbnail_url?: string
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

    const formData = await request.formData()
    const file = formData.get('file') as File
    const diaryId = formData.get('diary_id') as string | null
    const croppedFile = formData.get('cropped_file') as File | null
    const cropType = (formData.get('crop_type') as CropType) || 'none'
    const shapeType = formData.get('shape_type') as ShapeType | null
    const lassoPath = formData.get('lasso_path') as string | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: '파일 크기는 5MB 이하여야 합니다.' },
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

    // Check photo count limit (for free users)
    // TODO: Add premium check
    if (diaryId) {
      const { count } = await supabase
        .from('user_photos')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('diary_id', diaryId)

      if (count && count >= MAX_PHOTOS_FREE) {
        return NextResponse.json(
          { error: `일기당 최대 ${MAX_PHOTOS_FREE}장의 사진만 업로드할 수 있습니다.` },
          { status: 400 }
        )
      }
    }

    const photoId = crypto.randomUUID()
    const folder = diaryId ? `${user.id}/${diaryId}` : `${user.id}/general`
    const extension = file.name.split('.').pop() || 'png'

    // Upload original file
    const originalPath = `${folder}/${photoId}_original.${extension}`
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(originalPath, file, {
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json(
        { error: '파일 업로드에 실패했습니다.' },
        { status: 500 }
      )
    }

    // Get original URL
    const { data: originalUrlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(originalPath)
    const originalUrl = originalUrlData.publicUrl

    let croppedUrl: string | undefined

    // Upload cropped file if provided
    if (croppedFile) {
      const croppedPath = `${folder}/${photoId}_cropped.png`
      const { error: croppedUploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(croppedPath, croppedFile, {
          cacheControl: '3600',
          upsert: false,
        })

      if (!croppedUploadError) {
        const { data: croppedUrlData } = supabase.storage
          .from(BUCKET_NAME)
          .getPublicUrl(croppedPath)
        croppedUrl = croppedUrlData.publicUrl
      }
    }

    // Save photo metadata to database
    const { error: dbError } = await supabase.from('user_photos').insert({
      id: photoId,
      user_id: user.id,
      diary_id: diaryId,
      original_path: originalPath,
      cropped_path: croppedUrl ? `${folder}/${photoId}_cropped.png` : null,
      crop_type: cropType,
      shape_type: shapeType,
      lasso_path: lassoPath,
      is_premium_crop: cropType === 'lasso',
    })

    if (dbError) {
      console.error('Database error:', dbError)
      // Try to clean up uploaded files
      await supabase.storage.from(BUCKET_NAME).remove([originalPath])
      return NextResponse.json(
        { error: '사진 정보 저장에 실패했습니다.' },
        { status: 500 }
      )
    }

    const response: UploadResponse = {
      photo_id: photoId,
      original_url: originalUrl,
      cropped_url: croppedUrl,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Photo upload error:', error)
    return NextResponse.json(
      { error: '사진 업로드 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
