// Client-side PDF generator using html-to-image + pdf-lib
// This runs in the browser to leverage DOM rendering for Korean text support

import { toPng } from 'html-to-image'
import { PDFDocument } from 'pdf-lib'
import { PRINT_SPECS, CAPTURE_PIXEL_RATIO } from './print-constants'

interface DiaryData {
  id: string
  user_id: string
  volume_number: number
  title: string | null
  start_date: string
  end_date: string | null
  cover_image_url: string | null
  spine_color: string | null
  spine_position: number | null
  cover_template?: {
    image_url: string
  } | null
  paper_template?: {
    line_style: string
    line_color: string
    background_color: string
    background_image?: string | null
  } | null
}

interface DiaryEntry {
  id: string
  entry_date: string
  content: string
  summary: string | null
  emotions: string[]
  gratitude: string[]
  tomorrow_plan: string | null
}

// Helper to capture DOM element as PNG
async function captureElement(element: HTMLElement, width: number, height: number): Promise<string> {
  // Suppress cssRules errors from external fonts
  const originalError = console.error
  console.error = (...args) => {
    if (args[0]?.toString().includes('cssRules')) return
    originalError.apply(console, args)
  }

  try {
    return await toPng(element, {
      width,
      height,
      pixelRatio: CAPTURE_PIXEL_RATIO,
      cacheBust: true,
      skipFonts: true,
    })
  } finally {
    console.error = originalError
  }
}

// Convert base64 PNG to PDF
async function pngToPdf(pngDataUrl: string, widthMm: number, heightMm: number): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create()

  // Convert mm to points (1 point = 1/72 inch, 1mm = 2.835 points)
  const mmToPoints = 2.835
  const pageWidth = widthMm * mmToPoints
  const pageHeight = heightMm * mmToPoints

  const page = pdfDoc.addPage([pageWidth, pageHeight])

  // Embed image
  const pngBytes = await fetch(pngDataUrl).then(r => r.arrayBuffer())
  const image = await pdfDoc.embedPng(pngBytes)

  // Draw image to fill page
  page.drawImage(image, {
    x: 0,
    y: 0,
    width: pageWidth,
    height: pageHeight,
  })

  return pdfDoc.save()
}

// Create a temporary container for rendering
function createRenderContainer(): HTMLDivElement {
  const container = document.createElement('div')
  container.style.position = 'fixed'
  container.style.left = '-9999px'
  container.style.top = '0'
  container.style.zIndex = '-1'
  document.body.appendChild(container)
  return container
}

// Generate front cover PDF
export async function generateFrontCoverPDF(
  diary: DiaryData,
  onProgress?: (message: string) => void
): Promise<Uint8Array> {
  onProgress?.('앞표지 렌더링 중...')

  const container = createRenderContainer()
  const widthWithBleed = PRINT_SPECS.COVER_WIDTH_MM + PRINT_SPECS.BLEED_MM * 2
  const heightWithBleed = PRINT_SPECS.COVER_HEIGHT_MM + PRINT_SPECS.BLEED_MM * 2

  // Render cover at preview size (will be scaled up by pixelRatio)
  const previewWidth = 300
  const previewHeight = Math.round(previewWidth / PRINT_SPECS.PRINT_ASPECT_RATIO)

  container.innerHTML = `
    <div style="
      width: ${previewWidth}px;
      height: ${previewHeight}px;
      position: relative;
      overflow: hidden;
      background: ${diary.cover_template?.image_url?.startsWith('solid:')
        ? diary.cover_template.image_url.replace('solid:', '')
        : diary.cover_template?.image_url?.startsWith('gradient:')
        ? diary.cover_template.image_url.replace('gradient:', '')
        : '#f3f0ff'};
    ">
      ${diary.cover_image_url ? `
        <img src="${diary.cover_image_url}" style="
          width: 100%;
          height: 100%;
          object-fit: cover;
        " crossorigin="anonymous" />
      ` : `
        <div style="
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          font-size: 24px;
          font-weight: bold;
          color: #4a4a6a;
          font-family: 'Pretendard', sans-serif;
        ">
          ${diary.title || `일기장 ${diary.volume_number}권`}
        </div>
      `}
    </div>
  `

  // Wait for images to load
  const images = container.querySelectorAll('img')
  await Promise.all(Array.from(images).map(img =>
    img.complete ? Promise.resolve() : new Promise(resolve => {
      img.onload = resolve
      img.onerror = resolve
    })
  ))

  const element = container.firstElementChild as HTMLElement
  const pngDataUrl = await captureElement(element, previewWidth, previewHeight)

  document.body.removeChild(container)

  onProgress?.('앞표지 PDF 생성 중...')
  return pngToPdf(pngDataUrl, widthWithBleed, heightWithBleed)
}

// Generate back cover PDF
export async function generateBackCoverPDF(
  diary: DiaryData,
  onProgress?: (message: string) => void
): Promise<Uint8Array> {
  onProgress?.('뒷표지 렌더링 중...')

  const container = createRenderContainer()
  const widthWithBleed = PRINT_SPECS.COVER_WIDTH_MM + PRINT_SPECS.BLEED_MM * 2
  const heightWithBleed = PRINT_SPECS.COVER_HEIGHT_MM + PRINT_SPECS.BLEED_MM * 2

  const previewWidth = 300
  const previewHeight = Math.round(previewWidth / PRINT_SPECS.PRINT_ASPECT_RATIO)

  // Get cover color for back (slightly lighter)
  let bgColor = '#f0eef5'
  if (diary.cover_template?.image_url?.startsWith('solid:')) {
    bgColor = diary.cover_template.image_url.replace('solid:', '')
  } else if (diary.cover_template?.image_url?.startsWith('gradient:')) {
    const match = diary.cover_template.image_url.match(/#[0-9A-Fa-f]{6}/)
    bgColor = match?.[0] || '#f0eef5'
  }

  // Calculate text color based on background luminance
  const hex = bgColor.replace('#', '')
  const r = parseInt(hex.substr(0, 2), 16) / 255
  const g = parseInt(hex.substr(2, 2), 16) / 255
  const b = parseInt(hex.substr(4, 2), 16) / 255
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b
  const textColor = luminance > 0.5 ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.9)'
  const subtextColor = luminance > 0.5 ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.6)'

  container.innerHTML = `
    <div style="
      width: ${previewWidth}px;
      height: ${previewHeight}px;
      background: ${bgColor};
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px 30px;
      box-sizing: border-box;
      font-family: 'Pretendard', sans-serif;
    ">
      <div style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center;">
        <div style="font-size: 20px; font-weight: 700; color: ${textColor}; margin-bottom: 12px;">
          나날로그
        </div>
        <div style="font-size: 11px; color: ${subtextColor}; margin-bottom: 24px;">
          글 쓰기 싫은 사람을 위한<br/>AI 대화형 일기 서비스
        </div>
        <div style="font-size: 9px; color: ${subtextColor}; line-height: 1.8; max-width: 200px;">
          <div style="margin-bottom: 8px;">🗣️ 대화로 기록</div>
          <div style="margin-bottom: 8px;">📅 일정까지 회고</div>
          <div style="margin-bottom: 8px;">✨ 아날로그 감성</div>
          <div>🧠 나만의 AI</div>
        </div>
      </div>
      <div style="font-size: 9px; color: ${subtextColor};">
        nanalogue.com
      </div>
    </div>
  `

  const element = container.firstElementChild as HTMLElement
  const pngDataUrl = await captureElement(element, previewWidth, previewHeight)

  document.body.removeChild(container)

  onProgress?.('뒷표지 PDF 생성 중...')
  return pngToPdf(pngDataUrl, widthWithBleed, heightWithBleed)
}

// Generate spine PDF
export async function generateSpinePDF(
  diary: DiaryData,
  onProgress?: (message: string) => void
): Promise<Uint8Array> {
  onProgress?.('책등 렌더링 중...')

  const container = createRenderContainer()
  const heightWithBleed = PRINT_SPECS.COVER_HEIGHT_MM + PRINT_SPECS.BLEED_MM * 2

  // Spine preview dimensions
  const previewHeight = 400
  const previewWidth = Math.round(previewHeight * (PRINT_SPECS.SPINE_WIDTH_MM / heightWithBleed))

  // Check if we have a cover image to crop
  const hasCoverImage = !!diary.cover_image_url
  const spinePosition = diary.spine_position ?? 0

  // Fallback spine color if no cover image
  let spineColor = diary.spine_color || '#C9B8DA'
  if (!diary.spine_color && diary.cover_template?.image_url) {
    if (diary.cover_template.image_url.startsWith('solid:')) {
      spineColor = diary.cover_template.image_url.replace('solid:', '')
    } else if (diary.cover_template.image_url.startsWith('gradient:')) {
      const match = diary.cover_template.image_url.match(/#[0-9A-Fa-f]{6}/)
      spineColor = match?.[0] || '#C9B8DA'
    }
  }

  // Spine content - either cropped cover image or solid color with text
  let spineContent: string

  if (hasCoverImage) {
    // Use cropped cover image
    spineContent = `
      <div style="
        width: ${previewWidth}px;
        height: ${previewHeight}px;
        overflow: hidden;
        position: relative;
      ">
        <img
          src="${diary.cover_image_url}"
          crossorigin="anonymous"
          style="
            height: 100%;
            width: auto;
            max-width: none;
            display: block;
            transform: translateX(-${spinePosition}%);
          "
        />
      </div>
    `
  } else {
    // Fallback: solid color with text
    const hex = spineColor.replace('#', '')
    const r = parseInt(hex.substr(0, 2), 16) / 255
    const g = parseInt(hex.substr(2, 2), 16) / 255
    const b = parseInt(hex.substr(4, 2), 16) / 255
    const luminance = 0.299 * r + 0.587 * g + 0.114 * b
    const textColor = luminance > 0.5 ? '#333' : '#fff'

    const spineText = diary.title || `${diary.volume_number}권`
    const year = new Date(diary.start_date).getFullYear()

    spineContent = `
      <div style="
        width: ${previewWidth}px;
        height: ${previewHeight}px;
        background: ${spineColor};
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        position: relative;
      ">
        <div style="
          writing-mode: vertical-rl;
          text-orientation: mixed;
          font-size: 12px;
          font-weight: 500;
          color: ${textColor};
          font-family: 'Pretendard', sans-serif;
          letter-spacing: 2px;
        ">
          ${spineText}
        </div>
        <div style="
          position: absolute;
          bottom: 20px;
          font-size: 8px;
          color: ${textColor};
          opacity: 0.8;
          font-family: 'Pretendard', sans-serif;
        ">
          ${year}
        </div>
      </div>
    `
  }

  container.innerHTML = spineContent

  const element = container.firstElementChild as HTMLElement
  const pngDataUrl = await captureElement(element, previewWidth, previewHeight)

  document.body.removeChild(container)

  onProgress?.('책등 PDF 생성 중...')
  return pngToPdf(pngDataUrl, PRINT_SPECS.SPINE_WIDTH_MM, heightWithBleed)
}

// Format date for display
function formatDateKorean(dateStr: string): string {
  const date = new Date(dateStr)
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`
}

// Generate inner pages PDF
// Get paper line pattern CSS based on line_style
function getPaperLineStyle(lineStyle: string, lineColor: string): string {
  switch (lineStyle) {
    case 'lined':
      return `repeating-linear-gradient(transparent, transparent 27px, ${lineColor} 27px, ${lineColor} 28px)`
    case 'grid':
      return `linear-gradient(${lineColor} 1px, transparent 1px), linear-gradient(90deg, ${lineColor} 1px, transparent 1px)`
    case 'dotted':
      return `radial-gradient(circle, ${lineColor} 1px, transparent 1px)`
    default:
      return 'none'
  }
}

function getPaperBackgroundSize(lineStyle: string): string {
  switch (lineStyle) {
    case 'grid':
      return '28px 28px'
    case 'dotted':
      return '20px 20px'
    default:
      return 'auto'
  }
}

export async function generateInnerPagesPDF(
  diary: DiaryData,
  entries: DiaryEntry[],
  onProgress?: (message: string) => void
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create()

  const mmToPoints = 2.835
  const widthWithBleed = PRINT_SPECS.COVER_WIDTH_MM + PRINT_SPECS.BLEED_MM * 2
  const heightWithBleed = PRINT_SPECS.COVER_HEIGHT_MM + PRINT_SPECS.BLEED_MM * 2
  const pageWidthPt = widthWithBleed * mmToPoints
  const pageHeightPt = heightWithBleed * mmToPoints

  const container = createRenderContainer()

  // Sort entries by date
  const sortedEntries = [...entries].sort(
    (a, b) => new Date(a.entry_date).getTime() - new Date(b.entry_date).getTime()
  )

  // Preview dimensions
  const previewWidth = 300
  const previewHeight = Math.round(previewWidth / PRINT_SPECS.PRINT_ASPECT_RATIO)

  // Paper template styles
  const bgColor = diary.paper_template?.background_color || '#FFFEF0'
  const lineColor = diary.paper_template?.line_color || '#E5E7EB'
  const lineStyle = diary.paper_template?.line_style || 'lined'
  const backgroundImage = diary.paper_template?.background_image

  // Generate line pattern CSS
  const linePattern = getPaperLineStyle(lineStyle, lineColor)
  const backgroundSize = getPaperBackgroundSize(lineStyle)

  for (let i = 0; i < sortedEntries.length; i++) {
    const entry = sortedEntries[i]
    onProgress?.(`내지 렌더링 중... (${i + 1}/${sortedEntries.length})`)

    // Build background style
    let backgroundStyle = `background-color: ${bgColor};`
    if (linePattern !== 'none') {
      backgroundStyle += ` background-image: ${linePattern};`
      if (backgroundSize !== 'auto') {
        backgroundStyle += ` background-size: ${backgroundSize};`
      }
    }

    // Background image layer (if exists)
    const bgImageHtml = backgroundImage ? `
      <div style="
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-image: url('${backgroundImage}');
        background-size: cover;
        background-position: center;
        opacity: 0.3;
      "></div>
    ` : ''

    container.innerHTML = `
      <div style="
        width: ${previewWidth}px;
        height: ${previewHeight}px;
        ${backgroundStyle}
        padding: 30px 25px;
        box-sizing: border-box;
        position: relative;
        font-family: 'Pretendard', sans-serif;
      ">
        ${bgImageHtml}
        <div style="position: relative; z-index: 1;">
          <div style="
            font-size: 12px;
            font-weight: 600;
            color: #6B7280;
            margin-bottom: 8px;
          ">
            ${formatDateKorean(entry.entry_date)}
          </div>
          ${entry.summary ? `
            <div style="
              font-size: 14px;
              font-weight: 600;
              color: #374151;
              margin-bottom: 12px;
            ">
              ${entry.summary}
            </div>
          ` : ''}
          ${entry.emotions?.length > 0 ? `
            <div style="
              font-size: 10px;
              color: #9CA3AF;
              margin-bottom: 12px;
            ">
              ${entry.emotions.join(' ')}
            </div>
          ` : ''}
          <div style="
            font-size: 11px;
            color: #4B5563;
            line-height: 1.8;
            white-space: pre-wrap;
            word-break: break-word;
          ">
            ${entry.content?.substring(0, 800) || ''}${(entry.content?.length || 0) > 800 ? '...' : ''}
          </div>
        </div>
      </div>
    `

    const element = container.firstElementChild as HTMLElement
    const pngDataUrl = await captureElement(element, previewWidth, previewHeight)

    // Add page to PDF
    const page = pdfDoc.addPage([pageWidthPt, pageHeightPt])
    const pngBytes = await fetch(pngDataUrl).then(r => r.arrayBuffer())
    const image = await pdfDoc.embedPng(pngBytes)

    page.drawImage(image, {
      x: 0,
      y: 0,
      width: pageWidthPt,
      height: pageHeightPt,
    })
  }

  document.body.removeChild(container)

  onProgress?.('내지 PDF 저장 중...')
  return pdfDoc.save()
}

// Upload PDF via API (uses service role for storage access)
export async function uploadPdfToStorage(
  _supabaseClient: unknown,
  pdfBuffer: Uint8Array,
  path: string
): Promise<string | null> {
  try {
    const formData = new FormData()
    formData.append('file', new Blob([pdfBuffer], { type: 'application/pdf' }), 'file.pdf')
    formData.append('path', path)

    const response = await fetch('/api/admin/publishing/upload', {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const data = await response.json()
      console.error('Upload error:', data.error)
      return null
    }

    const { url } = await response.json()
    return url
  } catch (error) {
    console.error('Upload error:', error)
    return null
  }
}
