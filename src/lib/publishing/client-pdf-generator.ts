// Client-side PDF generator using html-to-image + pdf-lib
// This runs in the browser to leverage DOM rendering for Korean text support
// Version: 2024-12-17 v2 - with nanalogue branding, spine crop, paper template

import { toPng } from 'html-to-image'
import { PDFDocument } from 'pdf-lib'
import JSZip from 'jszip'
import { PRINT_SPECS, CAPTURE_PIXEL_RATIO } from './print-constants'
import { getSpinePreset } from '@/lib/spine-renderer'

// Text metadata for text decorations
interface TextMeta {
  font_family: string
  font_size: number
  font_color: string
  font_weight?: 'normal' | 'bold'
  text_align?: 'left' | 'center' | 'right'
  opacity?: number
}

// Placed decoration on paper
interface PlacedDecoration {
  item_id: string
  type: 'emoji' | 'icon' | 'sticker' | 'photo' | 'text'
  content: string
  x: number
  y: number
  scale: number
  rotation: number
  z_index: number
  text_meta?: TextMeta
}

// Font family mapping
const FONT_FAMILY_MAP: Record<string, string> = {
  'default': 'inherit',
  'nanum-gothic': '"Nanum Gothic", sans-serif',
  'nanum-myeongjo': '"Nanum Myeongjo", serif',
  'nanum-pen': '"Nanum Pen Script", cursive',
  'gowun-dodum': '"Gowun Dodum", sans-serif',
  'gowun-batang': '"Gowun Batang", serif',
  'poor-story': '"Poor Story", cursive',
  'gaegu': '"Gaegu", cursive',
}

interface DiaryData {
  id: string
  user_id: string
  volume_number: number
  title: string | null
  start_date: string
  end_date: string | null
  cover_image_url: string | null
  spine_preset_id: string | null
  cover_template?: {
    image_url: string
  } | null
  paper_template?: {
    line_style: string
    line_color: string
    background_color: string
    background_image_url?: string | null
  } | null
  paper_decorations?: PlacedDecoration[]
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
  console.log('[PDF Generator v2] generateFrontCoverPDF', { cover_image_url: diary.cover_image_url })
  onProgress?.('앞표지 렌더링 중...')

  const container = createRenderContainer()
  const widthWithBleed = PRINT_SPECS.COVER_WIDTH_MM + PRINT_SPECS.BLEED_MM * 2
  const heightWithBleed = PRINT_SPECS.COVER_HEIGHT_MM + PRINT_SPECS.BLEED_MM * 2

  // Render cover at preview size (will be scaled up by pixelRatio)
  const previewWidth = 300
  const previewHeight = Math.round(previewWidth / PRINT_SPECS.PRINT_ASPECT_RATIO)

  // Add cache buster to image URL
  const cacheBuster = Date.now()
  const coverImageUrl = diary.cover_image_url
    ? `${diary.cover_image_url}${diary.cover_image_url.includes('?') ? '&' : '?'}cb=${cacheBuster}`
    : null

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
      ${coverImageUrl ? `
        <img src="${coverImageUrl}" style="
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
  const uniqueId = Math.random().toString(36).substring(7)
  console.log('[PDF Generator v2] generateBackCoverPDF - nanalogue branding', { uniqueId })
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
    <div style="width:${previewWidth}px;height:${previewHeight}px;background:${bgColor};font-family:sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;position:relative;">
      <div style="text-align:center;padding:0 40px;">
        <div style="font-size:11px;letter-spacing:4px;color:${subtextColor};margin-bottom:16px;text-transform:uppercase;">Daily Journal</div>
        <div style="font-size:32px;font-weight:700;color:${textColor};margin-bottom:8px;letter-spacing:2px;">나날로그</div>
        <div style="width:40px;height:2px;background:${subtextColor};margin:0 auto 24px auto;opacity:0.5;"></div>
        <div style="font-size:12px;color:${subtextColor};line-height:1.8;margin-bottom:40px;">
          글 쓰기 싫은 사람을 위한<br>AI 대화형 일기 서비스
        </div>
        <div style="display:flex;flex-direction:column;gap:12px;font-size:11px;color:${subtextColor};">
          <div style="display:flex;align-items:center;justify-content:center;gap:8px;">
            <span style="opacity:0.6;">✦</span> 대화로 기록하는 일기
          </div>
          <div style="display:flex;align-items:center;justify-content:center;gap:8px;">
            <span style="opacity:0.6;">✦</span> 일정까지 함께 회고
          </div>
          <div style="display:flex;align-items:center;justify-content:center;gap:8px;">
            <span style="opacity:0.6;">✦</span> 아날로그 감성 디자인
          </div>
          <div style="display:flex;align-items:center;justify-content:center;gap:8px;">
            <span style="opacity:0.6;">✦</span> 나만의 AI 파트너
          </div>
        </div>
      </div>
      <div style="position:absolute;bottom:40px;font-size:10px;color:${subtextColor};letter-spacing:1px;">nanalogue.com</div>
    </div>
  `

  console.log('[PDF Generator v2] Back cover HTML set, uniqueId:', uniqueId)

  const element = container.firstElementChild as HTMLElement
  const pngDataUrl = await captureElement(element, previewWidth, previewHeight)

  document.body.removeChild(container)

  onProgress?.('뒷표지 PDF 생성 중...')
  return pngToPdf(pngDataUrl, widthWithBleed, heightWithBleed)
}

// Generate spine PDF using spine presets
export async function generateSpinePDF(
  diary: DiaryData,
  onProgress?: (message: string) => void
): Promise<Uint8Array> {
  console.log('[PDF Generator v3] generateSpinePDF with presets', {
    spine_preset_id: diary.spine_preset_id,
  })
  onProgress?.('책등 렌더링 중...')

  const container = createRenderContainer()
  const heightWithBleed = PRINT_SPECS.COVER_HEIGHT_MM + PRINT_SPECS.BLEED_MM * 2

  // Spine preview dimensions
  const previewHeight = 400
  const previewWidth = Math.round(previewHeight * (PRINT_SPECS.SPINE_WIDTH_MM / heightWithBleed))

  // Get spine preset
  const preset = getSpinePreset(diary.spine_preset_id)
  const spineText = diary.title || `${diary.volume_number}권`
  const year = new Date(diary.start_date).getFullYear()

  // Build top band HTML
  const topBandHtml = preset.topBand ? `
    <div style="
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: ${preset.topBand.height};
      background: ${preset.topBand.color};
    "></div>
  ` : ''

  // Build bottom band HTML
  const bottomBandHtml = preset.bottomBand ? `
    <div style="
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: ${preset.bottomBand.height};
      background: ${preset.bottomBand.color};
    "></div>
  ` : ''

  // Spine content with preset styling
  const spineContent = `
    <div style="
      width: ${previewWidth}px;
      height: ${previewHeight}px;
      background: ${preset.background};
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      position: relative;
    ">
      ${topBandHtml}
      <div style="
        writing-mode: vertical-rl;
        text-orientation: upright;
        font-size: 12px;
        font-weight: 500;
        color: ${preset.textColor};
        font-family: 'Pretendard', sans-serif;
        letter-spacing: 0.1em;
        text-shadow: 0 1px 2px rgba(255,255,255,0.3), 0 -1px 2px rgba(255,255,255,0.3);
        z-index: 1;
      ">
        ${spineText.length > 10 ? spineText.slice(0, 10) : spineText}
      </div>
      <div style="
        position: absolute;
        bottom: 20px;
        font-size: 8px;
        color: ${preset.textColor};
        opacity: 0.8;
        font-family: 'Pretendard', sans-serif;
        z-index: 1;
      ">
        ${year}
      </div>
      ${bottomBandHtml}
      <div style="position: absolute; left: 0; top: 0; bottom: 0; width: 2px; background: rgba(0,0,0,0.15); z-index: 2;"></div>
      <div style="position: absolute; right: 0; top: 0; bottom: 0; width: 1px; background: rgba(255,255,255,0.3); z-index: 2;"></div>
    </div>
  `

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

// Generate HTML for a single decoration
function renderDecoration(decoration: PlacedDecoration): string {
  const { type, content, x, y, scale, rotation, z_index, text_meta } = decoration

  // Base transform and positioning
  const baseStyle = `
    position: absolute;
    left: ${x}%;
    top: ${y}%;
    transform: translate(-50%, -50%) scale(${scale}) rotate(${rotation}deg);
    z-index: ${z_index};
  `

  if (type === 'text' && text_meta) {
    const fontFamily = FONT_FAMILY_MAP[text_meta.font_family] || 'inherit'
    const fontSize = text_meta.font_size || 24
    const fontColor = text_meta.font_color || '#333333'
    const fontWeight = text_meta.font_weight || 'normal'
    const opacity = text_meta.opacity ?? 0.8

    return `
      <div style="
        ${baseStyle}
        font-family: ${fontFamily};
        font-size: ${fontSize}px;
        font-weight: ${fontWeight};
        color: ${fontColor};
        opacity: ${opacity};
        white-space: nowrap;
        pointer-events: none;
      ">
        ${content}
      </div>
    `
  }

  if (type === 'emoji' || type === 'sticker' || type === 'icon') {
    // Emoji/icon decorations
    const fontSize = 24 * scale
    return `
      <div style="
        ${baseStyle}
        font-size: ${fontSize}px;
        line-height: 1;
        pointer-events: none;
      ">
        ${content}
      </div>
    `
  }

  if (type === 'photo' && content) {
    // Photo decorations (content is the image URL)
    return `
      <img src="${content}" style="
        ${baseStyle}
        max-width: 100px;
        max-height: 100px;
        object-fit: contain;
        pointer-events: none;
      " crossorigin="anonymous" />
    `
  }

  return ''
}

// Generate HTML for all decorations
function renderDecorations(decorations: PlacedDecoration[] | undefined): string {
  if (!decorations || decorations.length === 0) return ''
  return decorations.map(renderDecoration).join('')
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
  console.log('[PDF Generator v2] generateInnerPagesPDF', {
    paper_template: diary.paper_template,
    paper_decorations: diary.paper_decorations?.length || 0,
    entriesCount: entries.length,
  })
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
  const backgroundImage = diary.paper_template?.background_image_url

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
        ${renderDecorations(diary.paper_decorations)}
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
    formData.append('file', new Blob([pdfBuffer as BlobPart], { type: 'application/pdf' }), 'file.pdf')
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

// Create ZIP file containing all publishing PDFs
export interface PublishingPDFs {
  frontCover: Uint8Array
  backCover: Uint8Array
  spine: Uint8Array
  innerPages?: Uint8Array
}

export async function createPublishingZip(
  pdfs: PublishingPDFs,
  diaryTitle: string,
  volumeNumber: number
): Promise<Uint8Array> {
  const zip = new JSZip()
  const folderName = `${diaryTitle || '일기장'}_${volumeNumber}권`
  const folder = zip.folder(folderName)

  if (!folder) {
    throw new Error('Failed to create ZIP folder')
  }

  // Add PDFs to ZIP
  folder.file('01_앞표지.pdf', pdfs.frontCover)
  folder.file('02_뒷표지.pdf', pdfs.backCover)
  folder.file('03_책등.pdf', pdfs.spine)
  if (pdfs.innerPages) {
    folder.file('04_내지.pdf', pdfs.innerPages)
  }

  // Generate ZIP
  const zipBlob = await zip.generateAsync({
    type: 'uint8array',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  })

  return zipBlob
}

// Upload ZIP file to storage
export async function uploadZipToStorage(
  zipBuffer: Uint8Array,
  path: string
): Promise<string | null> {
  try {
    const formData = new FormData()
    formData.append('file', new Blob([zipBuffer as BlobPart], { type: 'application/zip' }), 'publishing.zip')
    formData.append('path', path)

    const response = await fetch('/api/admin/publishing/upload', {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const data = await response.json()
      console.error('ZIP upload error:', data.error)
      return null
    }

    const { url } = await response.json()
    return url
  } catch (error) {
    console.error('ZIP upload error:', error)
    return null
  }
}
