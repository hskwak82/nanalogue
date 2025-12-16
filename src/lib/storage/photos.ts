import { createClient } from '@/lib/supabase/client'

const BUCKET_NAME = 'photos'
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

export interface UploadResult {
  success: boolean
  path?: string
  url?: string
  error?: string
}

export interface PhotoUploadOptions {
  userId: string
  diaryId?: string
  file: File | Blob
  filename?: string
  type: 'original' | 'cropped' | 'thumbnail'
}

/**
 * Generate storage path for a photo
 */
export function generatePhotoPath(
  userId: string,
  diaryId: string | undefined,
  photoId: string,
  type: 'original' | 'cropped' | 'thumbnail',
  extension: string = 'png'
): string {
  const folder = diaryId ? `${userId}/${diaryId}` : `${userId}/general`
  return `${folder}/${photoId}_${type}.${extension}`
}

/**
 * Get public URL for a photo in storage
 */
export function getPhotoPublicUrl(path: string): string {
  const supabase = createClient()
  const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(path)
  return data.publicUrl
}

/**
 * Upload a photo to Supabase Storage
 */
export async function uploadPhoto(options: PhotoUploadOptions): Promise<UploadResult> {
  const { userId, diaryId, file, filename, type } = options
  const supabase = createClient()

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      success: false,
      error: `파일 크기가 ${MAX_FILE_SIZE / 1024 / 1024}MB를 초과합니다.`,
    }
  }

  // Generate unique photo ID and path
  const photoId = filename || crypto.randomUUID()
  const extension = file instanceof File ? file.name.split('.').pop() || 'png' : 'png'
  const path = generatePhotoPath(userId, diaryId, photoId, type, extension)

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: true,
    })

  if (error) {
    console.error('Photo upload error:', error)
    return {
      success: false,
      error: error.message,
    }
  }

  const url = getPhotoPublicUrl(path)

  return {
    success: true,
    path,
    url,
  }
}

/**
 * Delete a photo from storage
 */
export async function deletePhoto(path: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient()

  const { error } = await supabase.storage.from(BUCKET_NAME).remove([path])

  if (error) {
    console.error('Photo delete error:', error)
    return {
      success: false,
      error: error.message,
    }
  }

  return { success: true }
}

/**
 * Delete all photos for a specific photo ID (original, cropped, thumbnail)
 */
export async function deletePhotoSet(
  userId: string,
  diaryId: string | undefined,
  photoId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient()
  const folder = diaryId ? `${userId}/${diaryId}` : `${userId}/general`

  const paths = [
    `${folder}/${photoId}_original.png`,
    `${folder}/${photoId}_original.jpg`,
    `${folder}/${photoId}_original.jpeg`,
    `${folder}/${photoId}_original.webp`,
    `${folder}/${photoId}_cropped.png`,
    `${folder}/${photoId}_thumbnail.png`,
  ]

  const { error } = await supabase.storage.from(BUCKET_NAME).remove(paths)

  if (error) {
    console.error('Photo set delete error:', error)
    return {
      success: false,
      error: error.message,
    }
  }

  return { success: true }
}

/**
 * List all photos for a user or diary
 */
export async function listPhotos(
  userId: string,
  diaryId?: string
): Promise<{ success: boolean; files?: string[]; error?: string }> {
  const supabase = createClient()
  const folder = diaryId ? `${userId}/${diaryId}` : userId

  const { data, error } = await supabase.storage.from(BUCKET_NAME).list(folder)

  if (error) {
    console.error('Photo list error:', error)
    return {
      success: false,
      error: error.message,
    }
  }

  const files = data?.map((file) => `${folder}/${file.name}`) || []
  return { success: true, files }
}

/**
 * Check if storage bucket exists (for setup verification)
 */
export async function checkBucketExists(): Promise<boolean> {
  const supabase = createClient()
  const { data, error } = await supabase.storage.getBucket(BUCKET_NAME)
  return !error && !!data
}
