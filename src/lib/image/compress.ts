/**
 * Image compression and processing utilities
 */

const MAX_DIMENSION = 1920
const THUMBNAIL_SIZE = 200
const JPEG_QUALITY = 0.85
const PNG_QUALITY = 0.9

export interface CompressOptions {
  maxDimension?: number
  quality?: number
  format?: 'jpeg' | 'png' | 'webp'
}

export interface CompressResult {
  blob: Blob
  width: number
  height: number
  originalWidth: number
  originalHeight: number
}

/**
 * Load an image from a File or Blob
 */
export function loadImage(source: File | Blob | string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'

    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('이미지를 불러올 수 없습니다.'))

    if (typeof source === 'string') {
      img.src = source
    } else {
      img.src = URL.createObjectURL(source)
    }
  })
}

/**
 * Calculate new dimensions while maintaining aspect ratio
 */
function calculateDimensions(
  width: number,
  height: number,
  maxSize: number
): { width: number; height: number } {
  if (width <= maxSize && height <= maxSize) {
    return { width, height }
  }

  const ratio = Math.min(maxSize / width, maxSize / height)
  return {
    width: Math.round(width * ratio),
    height: Math.round(height * ratio),
  }
}

/**
 * Compress an image file
 */
export async function compressImage(
  file: File | Blob,
  options: CompressOptions = {}
): Promise<CompressResult> {
  const {
    maxDimension = MAX_DIMENSION,
    quality = JPEG_QUALITY,
    format = 'jpeg',
  } = options

  const img = await loadImage(file)
  const originalWidth = img.width
  const originalHeight = img.height

  const { width, height } = calculateDimensions(originalWidth, originalHeight, maxDimension)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Canvas context를 생성할 수 없습니다.')
  }

  // Use high-quality image smoothing
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'

  ctx.drawImage(img, 0, 0, width, height)

  // Clean up object URL if created
  if (file instanceof Blob) {
    URL.revokeObjectURL(img.src)
  }

  const mimeType = `image/${format}`
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob)
        } else {
          reject(new Error('이미지 압축에 실패했습니다.'))
        }
      },
      mimeType,
      quality
    )
  })

  return {
    blob,
    width,
    height,
    originalWidth,
    originalHeight,
  }
}

/**
 * Create a thumbnail from an image
 */
export async function createThumbnail(
  file: File | Blob,
  size: number = THUMBNAIL_SIZE
): Promise<Blob> {
  const result = await compressImage(file, {
    maxDimension: size,
    quality: 0.8,
    format: 'png',
  })
  return result.blob
}

/**
 * Convert a canvas with transparency to PNG blob
 */
export async function canvasToBlob(
  canvas: HTMLCanvasElement,
  format: 'png' | 'jpeg' | 'webp' = 'png',
  quality: number = PNG_QUALITY
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob)
        } else {
          reject(new Error('Canvas를 이미지로 변환할 수 없습니다.'))
        }
      },
      `image/${format}`,
      quality
    )
  })
}

/**
 * Apply a clip path (shape mask) to an image
 */
export async function applyShapeMask(
  imageSource: File | Blob | string,
  shapePath: string,
  outputSize: number = 400
): Promise<Blob> {
  const img = await loadImage(imageSource)

  const canvas = document.createElement('canvas')
  canvas.width = outputSize
  canvas.height = outputSize

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Canvas context를 생성할 수 없습니다.')
  }

  // Create clip path
  const path = new Path2D(shapePath)
  ctx.clip(path)

  // Calculate source dimensions to cover the canvas (center crop)
  const imgRatio = img.width / img.height
  let sx = 0, sy = 0, sw = img.width, sh = img.height

  if (imgRatio > 1) {
    // Wider than tall: crop sides
    sw = img.height
    sx = (img.width - sw) / 2
  } else {
    // Taller than wide: crop top/bottom
    sh = img.width
    sy = (img.height - sh) / 2
  }

  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outputSize, outputSize)

  // Clean up
  if (imageSource instanceof Blob) {
    URL.revokeObjectURL(img.src)
  }

  return canvasToBlob(canvas, 'png')
}

/**
 * Apply a lasso path (custom drawn shape) to an image
 */
export async function applyLassoMask(
  imageSource: File | Blob | string,
  lassoPath: string,
  canvasWidth: number,
  canvasHeight: number
): Promise<Blob> {
  const img = await loadImage(imageSource)

  const canvas = document.createElement('canvas')
  canvas.width = canvasWidth
  canvas.height = canvasHeight

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Canvas context를 생성할 수 없습니다.')
  }

  // Draw image first
  ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight)

  // Apply lasso as clip path using compositing
  ctx.globalCompositeOperation = 'destination-in'

  const path = new Path2D(lassoPath)
  ctx.fill(path)

  // Clean up
  if (imageSource instanceof Blob) {
    URL.revokeObjectURL(img.src)
  }

  return canvasToBlob(canvas, 'png')
}

/**
 * Get image dimensions without loading full image
 */
export async function getImageDimensions(
  file: File | Blob
): Promise<{ width: number; height: number }> {
  const img = await loadImage(file)
  const result = { width: img.width, height: img.height }
  URL.revokeObjectURL(img.src)
  return result
}

/**
 * Check if file is a valid image type
 */
export function isValidImageType(file: File): boolean {
  const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  return validTypes.includes(file.type)
}

/**
 * Generate SVG path for common shapes
 */
export const SHAPE_PATHS: Record<string, string> = {
  circle: 'M 200 0 A 200 200 0 1 1 200 400 A 200 200 0 1 1 200 0',
  square: 'M 0 0 L 400 0 L 400 400 L 0 400 Z',
  diamond: 'M 200 0 L 400 200 L 200 400 L 0 200 Z',
  heart: 'M 200 360 C 40 240 0 140 0 100 C 0 40 60 0 120 0 C 160 0 200 30 200 80 C 200 30 240 0 280 0 C 340 0 400 40 400 100 C 400 140 360 240 200 360 Z',
  star: 'M 200 0 L 244 152 L 400 152 L 276 248 L 316 400 L 200 304 L 84 400 L 124 248 L 0 152 L 156 152 Z',
}
