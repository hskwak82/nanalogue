// Types for diary publishing feature

export type PublishJobStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface PublishJob {
  id: string
  diary_id: string
  admin_user_id: string
  status: PublishJobStatus
  front_cover_url: string | null
  back_cover_url: string | null
  spine_url: string | null
  inner_pages_url: string | null
  zip_url: string | null  // ZIP file containing all PDFs
  page_count: number | null
  error_message: string | null
  created_at: string
  completed_at: string | null
}

export interface PublishJobWithDiary extends PublishJob {
  diary: {
    id: string
    volume_number: number
    title: string | null
    user_id: string
    start_date: string
    end_date: string | null
    cover_image_url: string | null
    entry_count?: number
  }
  user?: {
    id: string
    email: string
    name: string | null
  }
}

export interface CreatePublishJobRequest {
  diary_id: string
  include_inner_pages?: boolean
  page_count?: number // Override auto-detection
}

export interface PublishJobListResponse {
  jobs: PublishJobWithDiary[]
  total: number
  page: number
  pageSize: number
}

// PDF generation options
export interface PDFGenerationOptions {
  includeCropMarks?: boolean
  includeBleed?: boolean
  colorProfile?: 'sRGB' | 'CMYK' // CMYK for professional printing
}

// Cover rendering result
export interface CoverRenderResult {
  frontCover: Buffer
  backCover: Buffer
  spine: Buffer
}

// Inner page content
export interface InnerPageContent {
  date: string
  title?: string
  content: string
  mood?: string
  weather?: string
  imageUrls?: string[]
}

// Admin diary list for publishing
export interface PublishableDiary {
  id: string
  user_id: string
  volume_number: number
  title: string | null
  status: string
  start_date: string
  end_date: string | null
  cover_image_url: string | null
  entry_count: number
  user: {
    id: string
    email: string
    name: string | null
  }
  existing_job?: PublishJob | null
}

export interface PublishableDiaryListResponse {
  diaries: PublishableDiary[]
  total: number
  page: number
  pageSize: number
}
