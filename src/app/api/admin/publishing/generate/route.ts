import { NextResponse } from 'next/server'
import { checkAdminAuth, getAdminServiceClient } from '@/lib/admin'
import { generatePublishingFiles } from '@/lib/publishing/pdf-generator'

// POST /api/admin/publishing/generate - Generate publishing files
export async function POST(request: Request) {
  const auth = await checkAdminAuth()
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { diary_id, diary_ids } = body

    // Support single or bulk generation
    const targetIds: string[] = diary_ids || (diary_id ? [diary_id] : [])

    if (targetIds.length === 0) {
      return NextResponse.json({ error: 'diary_id or diary_ids is required' }, { status: 400 })
    }

    const supabase = getAdminServiceClient()
    const results: { diary_id: string; job_id: string; status: string }[] = []

    for (const id of targetIds) {
      // Check if diary exists
      const { data: diary, error: diaryError } = await supabase
        .from('diaries')
        .select(`
          *,
          cover_template:cover_templates(*),
          paper_template:paper_templates(*)
        `)
        .eq('id', id)
        .single()

      if (diaryError || !diary) {
        results.push({ diary_id: id, job_id: '', status: 'not_found' })
        continue
      }

      // Check for existing pending/processing job
      const { data: existingJob } = await supabase
        .from('diary_publish_jobs')
        .select('id, status')
        .eq('diary_id', id)
        .in('status', ['pending', 'processing'])
        .maybeSingle()

      if (existingJob) {
        results.push({ diary_id: id, job_id: existingJob.id, status: 'already_processing' })
        continue
      }

      // Create new job
      const { data: job, error: createError } = await supabase
        .from('diary_publish_jobs')
        .insert({
          diary_id: id,
          admin_user_id: auth.userId,
          status: 'processing',
        })
        .select()
        .single()

      if (createError) {
        results.push({ diary_id: id, job_id: '', status: 'create_failed' })
        continue
      }

      // Generate files asynchronously (don't await)
      generatePublishingFiles(job.id, diary, supabase).catch((error) => {
        console.error(`Publishing generation failed for job ${job.id}:`, error)
      })

      results.push({ diary_id: id, job_id: job.id, status: 'started' })
    }

    return NextResponse.json({
      message: `Started generation for ${results.filter((r) => r.status === 'started').length} diaries`,
      results,
    })
  } catch (error) {
    console.error('Error starting generation:', error)
    return NextResponse.json({ error: 'Failed to start generation' }, { status: 500 })
  }
}
