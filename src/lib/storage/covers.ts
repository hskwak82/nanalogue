import { createClient } from '@/lib/supabase/client'

const BUCKET_NAME = 'photos'

export interface CoverUploadResult {
  success: boolean
  url?: string
  error?: string
}

/**
 * Generate storage path for a cover image
 */
export function generateCoverPath(userId: string, diaryId: string): string {
  return `${userId}/${diaryId}/cover.png`
}

/**
 * Get public URL for a cover image
 */
export function getCoverPublicUrl(path: string): string {
  const supabase = createClient()
  const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(path)
  return data.publicUrl
}

/**
 * Upload cover image to Supabase Storage
 */
export async function uploadCoverImage(
  userId: string,
  diaryId: string,
  imageBlob: Blob
): Promise<CoverUploadResult> {
  const supabase = createClient()
  const path = generateCoverPath(userId, diaryId)

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(path, imageBlob, {
      cacheControl: '60', // Short cache for cover updates
      upsert: true,
      contentType: 'image/png',
    })

  if (error) {
    console.error('Cover upload error:', error)
    return {
      success: false,
      error: error.message,
    }
  }

  // Add timestamp to bust cache
  const url = `${getCoverPublicUrl(path)}?t=${Date.now()}`

  return {
    success: true,
    url,
  }
}

/**
 * Delete cover image from storage
 */
export async function deleteCoverImage(
  userId: string,
  diaryId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient()
  const path = generateCoverPath(userId, diaryId)

  const { error } = await supabase.storage.from(BUCKET_NAME).remove([path])

  if (error) {
    console.error('Cover delete error:', error)
    return {
      success: false,
      error: error.message,
    }
  }

  return { success: true }
}
