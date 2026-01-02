import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib'
import { PRINT_SPECS, mmToPx } from './print-constants'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SPINE_PRESETS, SpinePreset, DEFAULT_SPINE_PRESET_ID } from '@/types/spine'

// Get spine preset by ID (server-side version without React dependencies)
function getSpinePresetServer(presetId: string | null | undefined): SpinePreset {
  if (!presetId) {
    return SPINE_PRESETS.find(p => p.id === DEFAULT_SPINE_PRESET_ID) || SPINE_PRESETS[0]
  }
  return SPINE_PRESETS.find(p => p.id === presetId) || SPINE_PRESETS[0]
}

interface DiaryWithTemplates {
  id: string
  user_id: string
  volume_number: number
  title: string | null
  status: string
  start_date: string
  end_date: string | null
  cover_template_id: string | null
  paper_template_id: string | null
  cover_decorations: unknown[]
  paper_decorations: unknown[]
  cover_image_url: string | null
  spine_preset_id: string | null
  cover_template: {
    id: string
    name: string
    image_url: string
    category: string
  } | null
  paper_template: {
    id: string
    name: string
    line_style: string
    line_color: string
    background_color: string
  } | null
}

interface DiaryEntry {
  id: string
  diary_id: string
  entry_date: string
  content: string
  summary: string | null
  emotions: string[]
  gratitude: string[]
  tomorrow_plan: string | null
  created_at: string
  session_image_url?: string | null
}

// Helper: Convert hex color to RGB values (0-1 range)
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) {
    return { r: 0.8, g: 0.8, b: 0.9 } // Default pastel purple
  }
  return {
    r: parseInt(result[1], 16) / 255,
    g: parseInt(result[2], 16) / 255,
    b: parseInt(result[3], 16) / 255,
  }
}

// Helper: Get color from gradient string
function extractColorFromGradient(gradient: string): string {
  const match = gradient.match(/#[0-9A-Fa-f]{6}/)
  return match?.[0] || '#C9B8DA'
}

// Helper: Upload buffer to Supabase storage
async function uploadToStorage(
  supabase: SupabaseClient,
  buffer: Uint8Array,
  path: string
): Promise<string | null> {
  try {
    const { error } = await supabase.storage
      .from('publishing')
      .upload(path, buffer, {
        contentType: 'application/pdf',
        upsert: true,
      })

    if (error) {
      console.error('Storage upload error:', error)
      return null
    }

    const { data: urlData } = supabase.storage.from('publishing').getPublicUrl(path)

    return urlData.publicUrl
  } catch (error) {
    console.error('Upload error:', error)
    return null
  }
}

// Generate front cover PDF
async function generateFrontCoverPDF(diary: DiaryWithTemplates): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create()

  // Page size with bleed (in points: 1 point = 1/72 inch, 1mm = 2.835 points)
  const mmToPoints = 2.835
  const pageWidth = (PRINT_SPECS.COVER_WIDTH_MM + PRINT_SPECS.BLEED_MM * 2) * mmToPoints
  const pageHeight = (PRINT_SPECS.COVER_HEIGHT_MM + PRINT_SPECS.BLEED_MM * 2) * mmToPoints

  const page = pdfDoc.addPage([pageWidth, pageHeight])

  // Get cover color
  let coverColor = { r: 0.79, g: 0.72, b: 0.85 } // Default pastel purple

  if (diary.cover_template?.image_url) {
    const imageUrl = diary.cover_template.image_url
    if (imageUrl.startsWith('solid:')) {
      coverColor = hexToRgb(imageUrl.replace('solid:', ''))
    } else if (imageUrl.startsWith('gradient:')) {
      coverColor = hexToRgb(extractColorFromGradient(imageUrl))
    }
  }

  // Draw cover background
  page.drawRectangle({
    x: 0,
    y: 0,
    width: pageWidth,
    height: pageHeight,
    color: rgb(coverColor.r, coverColor.g, coverColor.b),
  })

  // Embed cover image if available
  if (diary.cover_image_url) {
    try {
      const response = await fetch(diary.cover_image_url)
      const imageBuffer = await response.arrayBuffer()
      const uint8Array = new Uint8Array(imageBuffer)

      // Detect image type and embed
      let image
      if (diary.cover_image_url.includes('.png') || diary.cover_image_url.includes('png')) {
        image = await pdfDoc.embedPng(uint8Array)
      } else {
        image = await pdfDoc.embedJpg(uint8Array)
      }

      // Draw image scaled to fit page (with bleed area)
      const bleedPoints = PRINT_SPECS.BLEED_MM * mmToPoints
      page.drawImage(image, {
        x: bleedPoints,
        y: bleedPoints,
        width: pageWidth - bleedPoints * 2,
        height: pageHeight - bleedPoints * 2,
      })
    } catch (error) {
      console.error('Error embedding cover image:', error)
    }
  }

  // Add title text if no cover image
  if (!diary.cover_image_url && diary.title) {
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const fontSize = 24
    const textWidth = font.widthOfTextAtSize(diary.title, fontSize)

    page.drawText(diary.title, {
      x: (pageWidth - textWidth) / 2,
      y: pageHeight / 2,
      size: fontSize,
      font,
      color: rgb(0.2, 0.2, 0.3),
    })
  }

  // Add crop marks
  addCropMarks(page, pageWidth, pageHeight, PRINT_SPECS.BLEED_MM * mmToPoints)

  return pdfDoc.save()
}

// Generate back cover PDF (simple colored page)
async function generateBackCoverPDF(diary: DiaryWithTemplates): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create()

  const mmToPoints = 2.835
  const pageWidth = (PRINT_SPECS.COVER_WIDTH_MM + PRINT_SPECS.BLEED_MM * 2) * mmToPoints
  const pageHeight = (PRINT_SPECS.COVER_HEIGHT_MM + PRINT_SPECS.BLEED_MM * 2) * mmToPoints

  const page = pdfDoc.addPage([pageWidth, pageHeight])

  // Get cover color for back (slightly lighter)
  let coverColor = { r: 0.85, g: 0.8, b: 0.9 }

  if (diary.cover_template?.image_url) {
    const imageUrl = diary.cover_template.image_url
    if (imageUrl.startsWith('solid:')) {
      const baseColor = hexToRgb(imageUrl.replace('solid:', ''))
      coverColor = {
        r: Math.min(1, baseColor.r + 0.1),
        g: Math.min(1, baseColor.g + 0.1),
        b: Math.min(1, baseColor.b + 0.1),
      }
    } else if (imageUrl.startsWith('gradient:')) {
      const baseColor = hexToRgb(extractColorFromGradient(imageUrl))
      coverColor = {
        r: Math.min(1, baseColor.r + 0.1),
        g: Math.min(1, baseColor.g + 0.1),
        b: Math.min(1, baseColor.b + 0.1),
      }
    }
  }

  // Draw back cover background
  page.drawRectangle({
    x: 0,
    y: 0,
    width: pageWidth,
    height: pageHeight,
    color: rgb(coverColor.r, coverColor.g, coverColor.b),
  })

  // Add crop marks
  addCropMarks(page, pageWidth, pageHeight, PRINT_SPECS.BLEED_MM * mmToPoints)

  return pdfDoc.save()
}

// Generate spine PDF using spine presets
async function generateSpinePDF(diary: DiaryWithTemplates): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create()

  const mmToPoints = 2.835
  const pageWidth = PRINT_SPECS.SPINE_WIDTH_MM * mmToPoints
  const pageHeight = (PRINT_SPECS.COVER_HEIGHT_MM + PRINT_SPECS.BLEED_MM * 2) * mmToPoints

  const page = pdfDoc.addPage([pageWidth, pageHeight])

  // Get spine preset
  const preset = getSpinePresetServer(diary.spine_preset_id)

  // Parse preset background color (handle gradients by taking first color)
  let spineColor = hexToRgb('#E8E0F0') // Default lavender
  if (preset.background.startsWith('linear-gradient')) {
    spineColor = hexToRgb(extractColorFromGradient(preset.background))
  } else if (preset.background.startsWith('#')) {
    spineColor = hexToRgb(preset.background)
  }

  // Draw spine background
  page.drawRectangle({
    x: 0,
    y: 0,
    width: pageWidth,
    height: pageHeight,
    color: rgb(spineColor.r, spineColor.g, spineColor.b),
  })

  // Draw top band if present
  if (preset.topBand) {
    const bandHeight = parseFloat(preset.topBand.height) / 100 * pageHeight
    const bandColor = hexToRgb(preset.topBand.color)
    page.drawRectangle({
      x: 0,
      y: pageHeight - bandHeight,
      width: pageWidth,
      height: bandHeight,
      color: rgb(bandColor.r, bandColor.g, bandColor.b),
    })
  }

  // Draw bottom band if present
  if (preset.bottomBand) {
    const bandHeight = parseFloat(preset.bottomBand.height) / 100 * pageHeight
    const bandColor = hexToRgb(preset.bottomBand.color)
    page.drawRectangle({
      x: 0,
      y: 0,
      width: pageWidth,
      height: bandHeight,
      color: rgb(bandColor.r, bandColor.g, bandColor.b),
    })
  }

  // Add spine text (vertical)
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const spineText = diary.title || `${diary.volume_number}권`
  const fontSize = 10

  // Use preset text color
  const textColor = hexToRgb(preset.textColor)

  // Draw vertical text
  page.drawText(spineText, {
    x: pageWidth / 2 - fontSize / 2,
    y: pageHeight / 2,
    size: fontSize,
    font,
    color: rgb(textColor.r, textColor.g, textColor.b),
    rotate: degrees(90),
  })

  // Add year at bottom
  const year = new Date(diary.start_date).getFullYear().toString()
  page.drawText(year, {
    x: pageWidth / 2 - font.widthOfTextAtSize(year, 8) / 2,
    y: PRINT_SPECS.BLEED_MM * mmToPoints + 10,
    size: 8,
    font,
    color: rgb(textColor.r, textColor.g, textColor.b),
  })

  return pdfDoc.save()
}

// Constants for page content limits (lines per page)
const LINES_PER_PAGE_FIRST = 35  // First page has header, so fewer lines
const LINES_PER_PAGE_CONTINUE = 45  // Continuation pages have more space

// Split wrapped lines into pages
function splitLinesIntoPages(lines: string[], isFirstPage: boolean): string[][] {
  if (lines.length === 0) return [[]]

  const pages: string[][] = []
  let remaining = [...lines]
  let firstPage = isFirstPage

  while (remaining.length > 0) {
    const limit = firstPage ? LINES_PER_PAGE_FIRST : LINES_PER_PAGE_CONTINUE
    const pageLines = remaining.slice(0, limit)
    pages.push(pageLines)
    remaining = remaining.slice(limit)
    firstPage = false
  }

  return pages
}

// Generate inner pages PDF
async function generateInnerPagesPDF(
  diary: DiaryWithTemplates,
  entries: DiaryEntry[]
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create()
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)

  const mmToPoints = 2.835
  const pageWidth = (PRINT_SPECS.COVER_WIDTH_MM + PRINT_SPECS.BLEED_MM * 2) * mmToPoints
  const pageHeight = (PRINT_SPECS.COVER_HEIGHT_MM + PRINT_SPECS.BLEED_MM * 2) * mmToPoints
  const margin = (PRINT_SPECS.SAFE_MARGIN_MM + PRINT_SPECS.BLEED_MM) * mmToPoints

  // Get paper template settings
  const lineStyle = diary.paper_template?.line_style || 'lined'
  const backgroundColor = hexToRgb(diary.paper_template?.background_color || '#FFFEF0')
  const lineColor = hexToRgb(diary.paper_template?.line_color || '#E5E7EB')

  // Sort entries by entry_date
  const sortedEntries = [...entries].sort(
    (a, b) => new Date(a.entry_date).getTime() - new Date(b.entry_date).getTime()
  )

  // Helper function to draw background elements (with lower opacity via lighter colors)
  const drawPageBackground = (
    page: ReturnType<typeof pdfDoc.addPage>
  ) => {
    // Background color
    page.drawRectangle({
      x: 0,
      y: 0,
      width: pageWidth,
      height: pageHeight,
      color: rgb(backgroundColor.r, backgroundColor.g, backgroundColor.b),
    })

    // Draw lines based on style (lighter for background effect)
    const lightLineColor = rgb(
      Math.min(1, lineColor.r + 0.3),
      Math.min(1, lineColor.g + 0.3),
      Math.min(1, lineColor.b + 0.3)
    )

    if (lineStyle === 'lined' || lineStyle === 'grid') {
      const lineSpacing = 8 * mmToPoints
      for (let y = margin; y < pageHeight - margin; y += lineSpacing) {
        page.drawLine({
          start: { x: margin, y },
          end: { x: pageWidth - margin, y },
          thickness: 0.3,
          color: lightLineColor,
        })
      }
    }

    if (lineStyle === 'grid') {
      const lineSpacing = 8 * mmToPoints
      for (let x = margin; x < pageWidth - margin; x += lineSpacing) {
        page.drawLine({
          start: { x, y: margin },
          end: { x, y: pageHeight - margin },
          thickness: 0.3,
          color: lightLineColor,
        })
      }
    }

    if (lineStyle === 'dotted') {
      const dotSpacing = 5 * mmToPoints
      for (let y = margin; y < pageHeight - margin; y += dotSpacing) {
        for (let x = margin; x < pageWidth - margin; x += dotSpacing) {
          page.drawCircle({
            x,
            y,
            size: 0.4,
            color: lightLineColor,
          })
        }
      }
    }
  }

  // Helper function to draw session image as full page background (with opacity)
  const drawSessionImage = async (
    page: ReturnType<typeof pdfDoc.addPage>,
    imageUrl: string | null | undefined
  ) => {
    if (!imageUrl) return

    try {
      const response = await fetch(imageUrl)
      const imageBuffer = await response.arrayBuffer()
      const uint8Array = new Uint8Array(imageBuffer)

      // Detect image type and embed
      let image
      if (imageUrl.includes('.png') || imageUrl.includes('png')) {
        image = await pdfDoc.embedPng(uint8Array)
      } else {
        image = await pdfDoc.embedJpg(uint8Array)
      }

      // Draw image as full page background (cover style)
      const imageAspect = image.width / image.height
      const pageAspect = pageWidth / pageHeight

      let drawWidth: number
      let drawHeight: number
      let drawX: number
      let drawY: number

      if (imageAspect > pageAspect) {
        // Image is wider - fit height, crop width
        drawHeight = pageHeight
        drawWidth = drawHeight * imageAspect
        drawX = (pageWidth - drawWidth) / 2
        drawY = 0
      } else {
        // Image is taller - fit width, crop height
        drawWidth = pageWidth
        drawHeight = drawWidth / imageAspect
        drawX = 0
        drawY = (pageHeight - drawHeight) / 2
      }

      page.drawImage(image, {
        x: drawX,
        y: drawY,
        width: drawWidth,
        height: drawHeight,
        opacity: 0.35, // Apply transparency for background effect
      })
    } catch (error) {
      console.error('Error embedding session image:', error)
    }
  }

  // Generate pages for each entry
  for (const entry of sortedEntries) {
    // Wrap all content text
    const contentLines = wrapText(entry.content, font, 10, pageWidth - margin * 2)

    // Split content into multiple pages if needed
    const contentPages = splitLinesIntoPages(contentLines, true)

    for (let pageIdx = 0; pageIdx < contentPages.length; pageIdx++) {
      const isFirstPageOfEntry = pageIdx === 0
      const pageLines = contentPages[pageIdx]

      const page = pdfDoc.addPage([pageWidth, pageHeight])

      // Draw background
      drawPageBackground(page)

      // Draw session image only on first page (as background with opacity)
      if (isFirstPageOfEntry) {
        await drawSessionImage(page, entry.session_image_url)
      }

      // Draw content on top
      let currentY = pageHeight - margin - 20

      if (isFirstPageOfEntry) {
        // Draw date header
        const dateStr = new Date(entry.entry_date).toLocaleDateString('ko-KR', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          weekday: 'long',
        })
        page.drawText(dateStr, {
          x: margin,
          y: currentY,
          size: 12,
          font,
          color: rgb(0.3, 0.3, 0.3),
        })
        currentY -= 25

        // Draw summary if present
        if (entry.summary) {
          page.drawText(entry.summary, {
            x: margin,
            y: currentY,
            size: 14,
            font,
            color: rgb(0.1, 0.1, 0.1),
          })
          currentY -= 25
        }

        // Draw emotions if present
        if (entry.emotions && entry.emotions.length > 0) {
          page.drawText(`${entry.emotions.join(' ')}`, {
            x: margin,
            y: currentY,
            size: 9,
            font,
            color: rgb(0.5, 0.5, 0.5),
          })
          currentY -= 20
        }
      } else {
        // Continuation page - show date with "(continued)"
        const dateStr = new Date(entry.entry_date).toLocaleDateString('ko-KR', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
        page.drawText(`${dateStr} (continued)`, {
          x: margin,
          y: currentY,
          size: 9,
          font,
          color: rgb(0.5, 0.5, 0.5),
        })
        currentY -= 20
      }

      // Draw content lines
      const lineHeight = 14
      for (const line of pageLines) {
        if (currentY < margin + 20) break
        page.drawText(line, {
          x: margin,
          y: currentY,
          size: 10,
          font,
          color: rgb(0.2, 0.2, 0.2),
        })
        currentY -= lineHeight
      }

      // Add crop marks
      addCropMarks(page, pageWidth, pageHeight, PRINT_SPECS.BLEED_MM * mmToPoints)
    }
  }

  // If no entries, add a blank page
  if (sortedEntries.length === 0) {
    const page = pdfDoc.addPage([pageWidth, pageHeight])
    page.drawRectangle({
      x: 0,
      y: 0,
      width: pageWidth,
      height: pageHeight,
      color: rgb(backgroundColor.r, backgroundColor.g, backgroundColor.b),
    })
  }

  return pdfDoc.save()
}

// Helper: Simple text wrapping
function wrapText(
  text: string,
  font: Awaited<ReturnType<typeof PDFDocument.prototype.embedFont>>,
  fontSize: number,
  maxWidth: number
): string[] {
  const lines: string[] = []
  const paragraphs = text.split('\n')

  for (const paragraph of paragraphs) {
    if (!paragraph.trim()) {
      lines.push('')
      continue
    }

    const words = paragraph.split(' ')
    let currentLine = ''

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word
      const textWidth = font.widthOfTextAtSize(testLine, fontSize)

      if (textWidth > maxWidth && currentLine) {
        lines.push(currentLine)
        currentLine = word
      } else {
        currentLine = testLine
      }
    }

    if (currentLine) {
      lines.push(currentLine)
    }
  }

  return lines
}

// Helper: Add crop marks to page
function addCropMarks(
  page: ReturnType<typeof PDFDocument.prototype.addPage>,
  pageWidth: number,
  pageHeight: number,
  bleed: number
) {
  const markLength = 10
  const markOffset = 3
  const markColor = rgb(0, 0, 0)

  // Top-left
  page.drawLine({
    start: { x: bleed, y: pageHeight - markOffset },
    end: { x: bleed, y: pageHeight - markOffset - markLength },
    thickness: 0.25,
    color: markColor,
  })
  page.drawLine({
    start: { x: markOffset, y: pageHeight - bleed },
    end: { x: markOffset + markLength, y: pageHeight - bleed },
    thickness: 0.25,
    color: markColor,
  })

  // Top-right
  page.drawLine({
    start: { x: pageWidth - bleed, y: pageHeight - markOffset },
    end: { x: pageWidth - bleed, y: pageHeight - markOffset - markLength },
    thickness: 0.25,
    color: markColor,
  })
  page.drawLine({
    start: { x: pageWidth - markOffset, y: pageHeight - bleed },
    end: { x: pageWidth - markOffset - markLength, y: pageHeight - bleed },
    thickness: 0.25,
    color: markColor,
  })

  // Bottom-left
  page.drawLine({
    start: { x: bleed, y: markOffset },
    end: { x: bleed, y: markOffset + markLength },
    thickness: 0.25,
    color: markColor,
  })
  page.drawLine({
    start: { x: markOffset, y: bleed },
    end: { x: markOffset + markLength, y: bleed },
    thickness: 0.25,
    color: markColor,
  })

  // Bottom-right
  page.drawLine({
    start: { x: pageWidth - bleed, y: markOffset },
    end: { x: pageWidth - bleed, y: markOffset + markLength },
    thickness: 0.25,
    color: markColor,
  })
  page.drawLine({
    start: { x: pageWidth - markOffset, y: bleed },
    end: { x: pageWidth - markOffset - markLength, y: bleed },
    thickness: 0.25,
    color: markColor,
  })
}

// Main generation function
export async function generatePublishingFiles(
  jobId: string,
  diary: DiaryWithTemplates,
  supabase: SupabaseClient
): Promise<void> {
  try {
    // Update job status to processing
    await supabase
      .from('diary_publish_jobs')
      .update({ status: 'processing' })
      .eq('id', jobId)

    // Fetch diary entries with session image
    const { data: entries, error: entriesError } = await supabase
      .from('diary_entries')
      .select(`
        *,
        daily_sessions(session_image_url)
      `)
      .eq('diary_id', diary.id)
      .order('entry_date', { ascending: true })

    if (entriesError) {
      throw new Error(`Failed to fetch entries: ${entriesError.message}`)
    }

    // Transform entries to include session_image_url from daily_sessions
    const diaryEntries = (entries || []).map((entry) => {
      const sessionData = entry.daily_sessions as { session_image_url: string | null } | null
      return {
        ...entry,
        session_image_url: sessionData?.session_image_url || null,
        daily_sessions: undefined, // Remove the nested object
      }
    }) as DiaryEntry[]
    const basePath = `${diary.user_id}/${diary.id}`

    // Generate and upload front cover
    const frontCoverBuffer = await generateFrontCoverPDF(diary)
    const frontCoverUrl = await uploadToStorage(
      supabase,
      frontCoverBuffer,
      `${basePath}/front_cover.pdf`
    )

    // Generate and upload back cover
    const backCoverBuffer = await generateBackCoverPDF(diary)
    const backCoverUrl = await uploadToStorage(
      supabase,
      backCoverBuffer,
      `${basePath}/back_cover.pdf`
    )

    // Generate and upload spine
    const spineBuffer = await generateSpinePDF(diary)
    const spineUrl = await uploadToStorage(supabase, spineBuffer, `${basePath}/spine.pdf`)

    // Generate and upload inner pages
    const innerPagesBuffer = await generateInnerPagesPDF(diary, diaryEntries)
    const innerPagesUrl = await uploadToStorage(
      supabase,
      innerPagesBuffer,
      `${basePath}/inner_pages.pdf`
    )

    // Update job with URLs
    await supabase
      .from('diary_publish_jobs')
      .update({
        status: 'completed',
        front_cover_url: frontCoverUrl,
        back_cover_url: backCoverUrl,
        spine_url: spineUrl,
        inner_pages_url: innerPagesUrl,
        page_count: diaryEntries.length,
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId)
  } catch (error) {
    console.error('Publishing generation error:', error)

    // Update job with error
    await supabase
      .from('diary_publish_jobs')
      .update({
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId)
  }
}
