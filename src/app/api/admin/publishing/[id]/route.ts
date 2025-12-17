import { NextResponse } from 'next/server'
import { checkAdminAuth, getAdminServiceClient } from '@/lib/admin'

// GET /api/admin/publishing/[id] - Get single job status
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await checkAdminAuth()
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params
    const supabase = getAdminServiceClient()

    const { data: job, error } = await supabase
      .from('diary_publish_jobs')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    return NextResponse.json({ job })
  } catch (error) {
    console.error('Error fetching job:', error)
    return NextResponse.json({ error: 'Failed to fetch job' }, { status: 500 })
  }
}

// PATCH /api/admin/publishing/[id] - Update job (cancel or complete)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await checkAdminAuth()
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params
    const body = await request.json()
    const { action } = body

    const supabase = getAdminServiceClient()

    // Check current job status and get diary_id
    const { data: existingJob, error: fetchError } = await supabase
      .from('diary_publish_jobs')
      .select('id, status, diary_id')
      .eq('id', id)
      .single()

    if (fetchError || !existingJob) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    if (action === 'cancel') {
      // Only cancel pending or processing jobs
      if (existingJob.status !== 'pending' && existingJob.status !== 'processing') {
        return NextResponse.json(
          { error: 'Can only cancel pending or processing jobs' },
          { status: 400 }
        )
      }

      // Delete any existing failed jobs for this diary to avoid unique constraint violation
      await supabase
        .from('diary_publish_jobs')
        .delete()
        .eq('diary_id', existingJob.diary_id)
        .eq('status', 'failed')

      // Update job status to failed with cancel message
      const { data: job, error: updateError } = await supabase
        .from('diary_publish_jobs')
        .update({
          status: 'failed',
          error_message: '관리자에 의해 취소됨',
          completed_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()

      if (updateError) throw updateError

      return NextResponse.json({ job, message: 'Job cancelled successfully' })
    }

    if (action === 'complete') {
      const { front_cover_url, back_cover_url, spine_url, inner_pages_url, zip_url, page_count } = body

      // Delete any existing completed jobs for this diary to avoid unique constraint violation
      await supabase
        .from('diary_publish_jobs')
        .delete()
        .eq('diary_id', existingJob.diary_id)
        .eq('status', 'completed')

      // Update job with URLs and mark as completed
      const { data: job, error: updateError } = await supabase
        .from('diary_publish_jobs')
        .update({
          status: 'completed',
          front_cover_url,
          back_cover_url,
          spine_url,
          inner_pages_url,
          zip_url,
          page_count,
          completed_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()

      if (updateError) throw updateError

      return NextResponse.json({ job, message: 'Job completed successfully' })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Error updating job:', error)
    return NextResponse.json({ error: 'Failed to update job' }, { status: 500 })
  }
}

// DELETE /api/admin/publishing/[id] - Delete a job (completed or failed only)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await checkAdminAuth()
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params
    const supabase = getAdminServiceClient()

    // Check current job status with diary info for user_id
    const { data: existingJob, error: fetchError } = await supabase
      .from('diary_publish_jobs')
      .select(`
        id, status, front_cover_url, back_cover_url, spine_url, inner_pages_url, zip_url, diary_id,
        diary:diaries(user_id)
      `)
      .eq('id', id)
      .single()

    if (fetchError || !existingJob) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    // Only delete completed or failed jobs
    if (existingJob.status === 'pending' || existingJob.status === 'processing') {
      return NextResponse.json(
        { error: 'Cannot delete pending or processing jobs. Cancel first.' },
        { status: 400 }
      )
    }

    // Delete associated files from storage if they exist
    // Extract path from URL: https://.../storage/v1/object/public/publishing/{path}
    const extractPath = (url: string | null): string | null => {
      if (!url) return null
      const match = url.match(/\/publishing\/(.+)$/)
      return match ? match[1] : null
    }

    const filesToDelete: string[] = []
    const paths = [
      extractPath(existingJob.front_cover_url),
      extractPath(existingJob.back_cover_url),
      extractPath(existingJob.spine_url),
      extractPath(existingJob.inner_pages_url),
      extractPath(existingJob.zip_url),
    ].filter((p): p is string => p !== null)

    filesToDelete.push(...paths)

    // Delete files from storage
    if (filesToDelete.length > 0) {
      const { error: storageError } = await supabase.storage
        .from('publishing')
        .remove(filesToDelete)

      if (storageError) {
        console.error('Error deleting files from storage:', storageError)
        // Continue with job deletion even if storage delete fails
      }
    }

    // Delete the job record
    const { error: deleteError } = await supabase
      .from('diary_publish_jobs')
      .delete()
      .eq('id', id)

    if (deleteError) throw deleteError

    return NextResponse.json({ message: 'Job deleted successfully' })
  } catch (error) {
    console.error('Error deleting job:', error)
    return NextResponse.json({ error: 'Failed to delete job' }, { status: 500 })
  }
}
